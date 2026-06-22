// Vytvoří automatizační PROCESY (process plugin) přes API podle vzoru ručně
// postaveného pilotu "Nabídka uvízla ve schvalování".
// Idempotentní: proces se stejným názvem (z DEFS) nejdřív smaže (i se stavy/přechody).
// NEMAŽE pilot ani nic mimo seznam názvů v DEFS.
//   node praut-build-processes.cjs           DRY-RUN
//   node praut-build-processes.cjs --apply   vytvoří
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}

const fs = require('fs')
const coreMod = require('@hcengineering/core')
const { TxOperations, generateId } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
const MODEL = 'core:space:Model'
const ADMIN = '6a2bb13de6d4bb4df9f57ef3' // Praut Admin (person) — fallback příjemce
const RANK_S1 = '0|hzzzzz:'
const RANK_S2 = '0|i00007:'
const RANK_T1 = '0|hzzzzz:'
const RANK_T2 = '0|i00007:'

function offsetExpr (n, unit) {
  return `\${=>ExecutionStarted()=>Offset(offset=${n},offsetType="${unit}",direction="after")}`
}

// Definice procesů. kind: 'time' = časovač (OnTime+Offset), 'match' = na změnu pole (OnCardUpdate).
const DEFS = [
  {
    name: 'Lead bez aktivity 7 dní',
    masterTag: '6a2bb7f8295c2f467fa1d502',
    kind: 'time', offset: { n: 7, unit: 'days' },
    todo: 'Lead bez aktivity 7 dní — zkontroluj'
  },
  {
    name: 'SLA požadavku do 24 h',
    masterTag: '6a2bb7f8295c2f467fa1d559',
    kind: 'time', offset: { n: 1, unit: 'days' },
    todo: 'SLA požadavku se blíží (24 h) — vyřeš'
  },
  {
    name: 'Zakázka v riziku',
    masterTag: '6a2bb7f8295c2f467fa1d4bf',
    kind: 'match', matchKey: '6a2bb7f8295c2f467fa1d556', matchValue: 'v riziku', // health
    todo: 'Zakázka přešla do rizika — řeš ihned'
  }
]

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

async function deleteByName (client, name) {
  const procs = (await client.findAll('process:class:Process', {})).filter(p => p.name === name)
  for (const p of procs) {
    const states = await client.findAll('process:class:State', { process: p._id })
    const trans = await client.findAll('process:class:Transition', { process: p._id })
    if (APPLY) {
      for (const t of trans) await client.removeDoc(t._class, t.space, t._id)
      for (const st of states) await client.removeDoc(st._class, st.space, st._id)
      await client.removeDoc(p._class, p.space, p._id)
      console.log(`  Smazán existující proces "${name}" (+${states.length} stavů, ${trans.length} přechodů)`)
    } else {
      console.log(`  DRY-RUN: existující "${name}" (+${states.length} stavů, ${trans.length} přechodů) by byl smazán`)
    }
  }
}

async function buildProcess (client, def) {
  const pId = generateId()
  const s1 = generateId() // Sleduji
  const s2 = generateId() // Eskalováno
  const t1 = generateId()
  const t2 = generateId()
  const actionId = generateId()
  const ctxId = generateId()

  const triggerParams = def.kind === 'time'
    ? { value: offsetExpr(def.offset.n, def.offset.unit) }
    : { [def.matchKey]: def.matchValue }
  const trigger = def.kind === 'time' ? 'process:trigger:OnTime' : 'process:trigger:OnCardUpdate'

  const action = {
    _id: actionId,
    context: { _class: 'process:class:ProcessToDo', _id: ctxId },
    methodId: 'process:method:CreateToDo',
    params: { title: def.todo, user: ADMIN, withRollback: true }
  }
  const context = {
    [ctxId]: {
      _class: 'process:class:ProcessToDo',
      action: actionId,
      index: 1,
      name: def.todo,
      producer: t2,
      value: { id: ctxId, key: '', type: 'context' }
    }
  }

  if (!APPLY) {
    console.log(`  DRY-RUN: "${def.name}" (typ ${def.masterTag}, ${def.kind}) → 2 stavy, 2 přechody, akce CreateToDo "${def.todo}"`)
    if (def.kind === 'time') console.log(`           časovač: ${offsetExpr(def.offset.n, def.offset.unit)}`)
    else console.log(`           podmínka: ${def.matchKey} = "${def.matchValue}"`)
    return
  }

  await client.createDoc('process:class:Process', MODEL, {
    name: def.name, description: '', masterTag: def.masterTag, autoStart: true, context
  }, pId)
  await client.createDoc('process:class:State', MODEL, { process: pId, rank: RANK_S1, title: 'Sleduji' }, s1)
  await client.createDoc('process:class:State', MODEL, { process: pId, rank: RANK_S2, title: 'Eskalováno' }, s2)
  await client.createDoc('process:class:Transition', MODEL, {
    process: pId, rank: RANK_T1, from: null, to: s1, trigger: 'process:trigger:OnExecutionStart', triggerParams: {}, actions: []
  }, t1)
  await client.createDoc('process:class:Transition', MODEL, {
    process: pId, rank: RANK_T2, from: s1, to: s2, trigger, triggerParams, actions: [action]
  }, t2)
  console.log(`  ✅ Vytvořen: "${def.name}" (${pId})`)
}

async function main () {
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const config = await (await fetch('https://huly.praut.cz/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const accountClient = getAccountClient(token)
  const ws = (await accountClient.getUserWorkspaces()).filter((w) => w.url === 'praut')
  const selected = await accountClient.selectWorkspace(ws[0].url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)
  // Idempotence: smaž i nedodělaný polotovar + cokoli se stejným názvem
  const cleanup = [...DEFS.map(d => d.name), 'Lead bez aktivity 7 dní']
  console.log('Úklid existujících se stejným názvem:')
  for (const name of [...new Set(cleanup)]) await deleteByName(client, name)

  console.log('\nVytváření procesů:')
  for (const def of DEFS) await buildProcess(client, def)

  console.log(`\n${APPLY ? 'Hotovo' : 'DRY-RUN hotov'} — ${DEFS.length} procesů. Pilot "Nabídka uvízla ve schvalování" nedotčen.`)
  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
