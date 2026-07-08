// praut-diagnose-messaging.cjs — READ-ONLY diagnostika, proč se uživateli nezobrazují
// přímé zprávy (DM) v produkčním Huly (workspace `praut`). Nic nezapisuje (žádný --apply).
//
// Příčina, kterou hledáme: DM je v Huly vázaná na konkrétní IDENTITU (Person + SocialIdentity
// + account uuid). Když má uživatel duplicitní Person / víc social ID, píše se do DM napojené
// na identitu A, ale on je přihlášený pod účtem napojeným na identitu B → kanál se mu nezobrazí.
//
// Použití (z HulyPrautplatform/dev/import-tool/):
//   node praut-diagnose-messaging.cjs                 # výchozí: hledá "simon"
//   node praut-diagnose-messaging.cjs --search Šimon  # jiný uživatel
//   node praut-diagnose-messaging.cjs --all           # + plošný sken duplicit napříč všemi
//
// Výstup filtruj `grep -v "no document found"`.

globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const coreMod = require('@hcengineering/core')
const core = coreMod.default
const { TxOperations, systemAccountUuid } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

// Stringová plugin-id (contact není závislost import-tool)
const contact = { class: { Person: 'contact:class:Person', SocialIdentity: 'contact:class:SocialIdentity' } }
const chunter = { class: { DirectMessage: 'chunter:class:DirectMessage', Channel: 'chunter:class:Channel', ChatMessage: 'chunter:class:ChatMessage' } }
const notification = { class: { DocNotifyContext: 'notification:class:DocNotifyContext', InboxNotification: 'notification:class:InboxNotification' } }

const FRONT_URL = 'https://huly.praut.cz'
const WORKSPACE_URL = 'praut'
// Cesty odvozené od umístění skriptu (odolné vůči přesunu repa).
// __dirname = <repo>/tools/huly-admin → SECRET v <repo>/.env, secrets vedle <repo>.
const SECRET_FILE = path.resolve(__dirname, '../../.env')
const SECRETS_FILE = path.resolve(__dirname, '../../../huly-poc-secrets.env')

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}
function b64url (input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function signToken (payload, secret) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
  const body = b64url(JSON.stringify(payload))
  const inp = header + '.' + body
  const sig = crypto.createHmac('sha256', secret).update(inp).digest('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return inp + '.' + sig
}
function argVal (args, name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
function norm (s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }

// Person → jeho social IDs + napojený account uuid (přes account-client)
async function gatherSocialIds (client, accountClient, person) {
  const sids = await client.findAll(contact.class.SocialIdentity, { attachedTo: person._id })
  const out = []
  let isAccount = false
  for (const s of sids) {
    const key = s.key || (s.type + ':' + s.value)
    let verifiedOn = null
    let acc = null
    try { const full = await accountClient.findFullSocialIdBySocialKey(key); if (full && full.verifiedOn != null) verifiedOn = full.verifiedOn } catch (e) {}
    try { acc = await accountClient.findPersonBySocialKey(key, true) } catch (e) {} // → accountUuid | undefined
    if (acc) isAccount = true
    out.push({ key, type: s.type, value: s.value, verified: verifiedOn != null, account: acc || null })
  }
  return { socialIds: out, isAccount }
}

// Zjistí, jestli daná hodnota (member ref) odpovídá některé z identit uživatele.
// Members u DM mohou být social id (string), account uuid nebo person _id — testujeme všechny.
function memberMatchesIdentity (member, ident) {
  if (member == null) return false
  const m = String(member)
  if (m === String(ident.personId)) return true
  for (const s of ident.socialIds) {
    if (m === String(s.key) || m === String(s.value)) return true
    if (s.account && m === String(s.account)) return true
  }
  if (ident.accounts.some((a) => m === String(a))) return true
  return false
}

async function buildIdentity (client, toolClient, person) {
  const info = await gatherSocialIds(client, toolClient, person)
  const accounts = [...new Set(info.socialIds.map((s) => s.account).filter(Boolean))]
  return {
    name: person.name, personId: person._id, personUuid: person.personUuid ?? null,
    isAccount: info.isAccount, socialIds: info.socialIds, accounts
  }
}

function printIdentity (label, id) {
  console.log('\n--- ' + label + ' ---')
  console.log('  jméno       :', JSON.stringify(id.name))
  console.log('  Person _id  :', id.personId)
  console.log('  personUuid  :', id.personUuid ?? '— (NENÍ globální osoba!)')
  console.log('  je účet     :', id.isAccount ? 'ANO ✅' : 'NE ❌ (nemůže se přihlásit / přijímat)')
  console.log('  account uuid:', id.accounts.length ? id.accounts.join(', ') : '— (žádný)')
  if (!id.socialIds.length) console.log('  social IDs  : (žádné)')
  for (const s of id.socialIds) {
    console.log('  social ID   :', s.type + ':' + s.value, '| ověřené:', s.verified ? 'ANO ✅' : 'ne ❌', '| účet:', s.account ? 'ANO' : 'ne')
  }
}

async function main () {
  const args = process.argv.slice(2)
  const search = argVal(args, '--search') || 'simon'
  const scanAll = args.includes('--all')

  const secretEnv = env(SECRET_FILE)
  const secret = secretEnv.SECRET || secretEnv.HULY_SECRET
  if (!secret) { console.log('CHYBA: SECRET/HULY_SECRET nenalezen v', SECRET_FILE); process.exit(1) }
  const secrets = env(SECRETS_FILE)

  const config = await (await fetch(FRONT_URL + '/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)

  const { token: adminToken, socialId } = await getAccountClient().login(secrets.ADMIN_EMAIL, secrets.ADMIN_PASSWORD)
  if (!adminToken) { console.log('LOGIN FAILED for', secrets.ADMIN_EMAIL); process.exit(1) }
  const adminAccountClient = getAccountClient(adminToken)
  const wss = await adminAccountClient.getUserWorkspaces()
  const ws = wss.find((w) => w.url === WORKSPACE_URL)
  if (!ws) { console.log('Workspace nenalezen:', WORKSPACE_URL); process.exit(1) }
  const selected = await adminAccountClient.selectWorkspace(ws.url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)
  const toolToken = signToken({ extra: { service: 'tool' }, account: systemAccountUuid }, secret)
  const toolClient = getAccountClient(toolToken)

  const allPersons = await client.findAll(contact.class.Person, {})
  const term = norm(search)
  const matches = allPersons.filter((p) => norm(p.name).includes(term))

  console.log('\n========== 1) IDENTITY PRO "' + search + '" (read-only) ==========')
  console.log('Nalezeno', matches.length, 'Person karet.', matches.length > 1 ? '⚠️  VÍC NEŽ JEDNA = pravděpodobná duplicita!' : '')
  const targetIdents = []
  for (const p of matches) {
    const id = await buildIdentity(client, toolClient, p)
    targetIdents.push(id)
    printIdentity('Person', id)
  }

  // Diagnóza identity
  const accountful = targetIdents.filter((i) => i.isAccount)
  console.log('\n>>> Shrnutí identity:')
  if (matches.length === 0) console.log('    ❌ Nenašel jsem žádnou Person kartu — možná jiné jméno/přezdívka. Zkus --search <jméno>.')
  else if (matches.length > 1) console.log('    ⚠️  Existuje', matches.length, 'karet se jménem „' + search + '". Z toho účet (přihlášení) má:', accountful.length, '→ zprávy do „neúčtové" karty se přihlášenému nezobrazí.')
  else console.log('    Jedna karta, je účet:', accountful.length ? 'ANO' : 'NE')

  console.log('\n========== 2) PŘÍMÉ ZPRÁVY (DM) ==========')
  let dms = []
  try { dms = await client.findAll(chunter.class.DirectMessage, {}) } catch (e) { console.log('  ⚠️ Nelze načíst DirectMessage:', e.message) }
  console.log('Celkem DM v workspace:', dms.length)
  const relevant = []
  for (const dm of dms) {
    const members = dm.members || []
    const matchedIdents = targetIdents.filter((id) => members.some((m) => memberMatchesIdentity(m, id)))
    if (!matchedIdents.length) continue
    let msgCount = 0; let last = null
    try {
      const msgs = await client.findAll(chunter.class.ChatMessage, { space: dm._id })
      msgCount = msgs.length
      for (const m of msgs) if (last == null || (m.createdOn || 0) > last) last = m.createdOn || 0
    } catch (e) {}
    relevant.push({ dm, members, matchedIdents, msgCount, last })
  }
  if (!relevant.length) console.log('  Žádná DM neobsahuje hledanou identitu jako člena.')
  for (const r of relevant) {
    console.log('\n  • DM', r.dm._id, '| zpráv:', r.msgCount, '| poslední:', r.last ? new Date(r.last).toISOString() : '—')
    console.log('    members (raw):', JSON.stringify(r.members))
    for (const id of r.matchedIdents) {
      const okAccount = id.isAccount
      console.log('    → člen odpovídá kartě', JSON.stringify(id.name), '| tato karta je účet:', okAccount ? 'ANO ✅' : 'NE ❌ (adresát se NEPŘIHLÁSÍ pod touto identitou → zprávy nevidí)')
    }
  }

  console.log('\n========== 3) NOTIFIKACE (Inbox) ==========')
  for (const id of targetIdents) {
    const refs = [id.personId, ...id.accounts, ...id.socialIds.flatMap((s) => [s.key, s.value, s.account]).filter(Boolean)]
    let ctxTotal = 0; let inboxTotal = 0
    for (const ref of [...new Set(refs.map(String))]) {
      try { ctxTotal += (await client.findAll(notification.class.DocNotifyContext, { user: ref })).length } catch (e) {}
      try { inboxTotal += (await client.findAll(notification.class.InboxNotification, { user: ref })).length } catch (e) {}
    }
    console.log('  ' + JSON.stringify(id.name) + ' → DocNotifyContext:', ctxTotal, '| InboxNotification:', inboxTotal, (id.isAccount ? '' : '  (⚠️ neúčtová identita — notifikace tu nikdo nevidí)'))
  }

  if (scanAll) {
    console.log('\n========== 4) PLOŠNÝ SKEN DUPLICIT (kolik uživatelů je zasaženo) ==========')
    const byName = new Map()
    for (const p of allPersons) {
      const k = norm(p.name)
      if (!k) continue
      if (!byName.has(k)) byName.set(k, [])
      byName.get(k).push(p)
    }
    const dupNames = [...byName.entries()].filter(([, arr]) => arr.length > 1)
    console.log('Celkem Person karet:', allPersons.length, '| jmen s víc kartami:', dupNames.length)
    for (const [k, arr] of dupNames) {
      const accStates = []
      for (const p of arr) { const id = await buildIdentity(client, toolClient, p); accStates.push(id.isAccount ? 'účet' : 'BEZ účtu') }
      console.log('  ⚠️ ' + JSON.stringify(arr[0].name) + ' →', arr.length, 'karet [' + accStates.join(', ') + ']')
    }
    console.log('\n>>> ZÁVĚR SKENU: potenciálně zasažených jmen (duplicita s aspoň jednou neúčtovou kartou):',
      dupNames.length, '— stejná třída chyby jako u „' + search + '".')
  } else {
    console.log('\n(Tip: pro zjištění, kolik dalších uživatelů má stejný problém, spusť s --all)')
  }

  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('FATAL:', e && e.stack ? e.stack : e); process.exit(1) })
