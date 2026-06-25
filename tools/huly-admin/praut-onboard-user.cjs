// Onboarding podle ROLE: přidá (už pozvaného) uživatele do správných prostorů.
// Pozvání do workspace samotné = UI (Nastavení→Členové→Invite, e-mail přes Postmark) —
// programově nelze (vyžaduje master SECRET, blokuje classifier).
//
// Role → co uvidí:
//   vedeni      = vše (Vedení, Řízení a reporting, Obchodní dokumenty, Marketing, Obchod + pipeline) + dokumentace
//   obchodnik   = Obchod (karty) + pipeline + Obchodní dokumenty + dokumentace
//   marketak    = Marketing + dokumentace
//   vyvojar     = dokumentace + PULS (operativa)   [+ konkrétní projekt přes --projekt NÁZEV]
//   zamestnanec = jen dokumentace
// Libovolnou roli lze doplnit `--projekt NÁZEV` (přidá konkrétní projektový prostor).
//
// Použití (z import-tool s NODE_PATH):
//   node praut-onboard-user.cjs --email <e> --role obchodnik [--projekt DASTA_PREVOD]
//   ... --apply        (bez --apply = DRY-RUN)
//   node praut-onboard-user.cjs --list-roles
globalThis.window = globalThis
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const coreMod = require('@hcengineering/core'); const core = coreMod.default; const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const scp = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
function arg (f) { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined }
function env (f) { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim() } return o }
function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('').trim() }

const SHARED = 'Firemní dokumentace HULY'
const LEAD_FUNNEL_ID = '6a3abfafb0b5c36dec2898f8' // Potencionální zákazník (pipeline)

// role → prostory (názvy). + zda přidat do Lead funnelu (pipeline).
const ROLE = {
  vedeni:      { spaces: [SHARED, 'Vedení', 'Řízení a reporting', 'Obchodní dokumenty', 'Marketing', 'Obchod'], funnel: true },
  obchodnik:   { spaces: [SHARED, 'Obchod', 'Obchodní dokumenty'], funnel: true },
  marketak:    { spaces: [SHARED, 'Marketing'], funnel: false },
  vyvojar:     { spaces: [SHARED, 'PULS'], funnel: false },
  zamestnanec: { spaces: [SHARED], funnel: false }
}

async function main () {
  if (process.argv.includes('--list-roles')) {
    console.log('Role a co uvidí:')
    for (const r in ROLE) console.log(`  ${r}: ${ROLE[r].spaces.join(', ')}${ROLE[r].funnel ? ' + pipeline' : ''}`)
    process.exit(0)
  }
  const email = arg('--email'); const role = arg('--role') || arg('--team'); const projekt = arg('--projekt')
  if (!email || !role) { console.log('Zadej --email <email> --role <vedeni|obchodnik|marketak|vyvojar|zamestnanec> [--projekt NÁZEV]'); process.exit(2) }
  const def = ROLE[role]
  if (!def) { console.log('Neznámá role:', role, '— povolené:', Object.keys(ROLE).join(', ')); process.exit(2) }
  const targetNames = [...def.spaces]
  if (projekt) targetNames.push(projekt)

  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const cfg = await (await fetch('https://huly.praut.cz/config.json')).json(); setMetadata(scp.metadata.Endpoint, cfg.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD); const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).filter((w) => w.url === 'praut'); const sel = await ac.selectWorkspace(ws[0].url)
  const conn = await createClient(sel.endpoint, sel.token, []); const c = new TxOperations(conn, socialId)

  const persons = await c.findAll('contact:class:Person', {}); const sids = await c.findAll('contact:class:SocialIdentity', {})
  const sid = sids.find((x) => x.type === 'email' && x.value === email)
  const person = sid ? persons.find((p) => p._id === sid.attachedTo) : undefined
  const acc = person && person.personUuid
  console.log('\n========== ONBOARDING =========='); console.log(APPLY ? '*** OSTRÝ ZÁPIS ***' : '*** DRY-RUN ***')
  console.log('E-mail:', email, '| osoba:', person ? clean(person.name) : 'NENALEZENA', '| účet:', acc || '—', '| role:', role, projekt ? '| projekt: ' + projekt : '')
  if (!person || !acc) { console.log('\n❌ Uživatel není členem workspace (nemá účet). Nejdřív ho pozvi v UI: Nastavení→Členové→Invite (' + email + '). Pak spusť znovu.'); await conn.close(); process.exit(1) }

  const spaces = await c.findAll('core:class:Space', {})
  console.log('\nPřidat do prostorů:')
  for (const nm of targetNames) {
    const sp = spaces.find((x) => clean(x.name) === clean(nm))
    if (!sp) { console.log('  ! ' + nm + ' — prostor nenalezen, přeskakuji'); continue }
    const has = (sp.members || []).includes(acc)
    console.log('  ' + (has ? '= ' : '+ ') + clean(sp.name) + (has ? ' (už je členem)' : ''))
    if (APPLY && !has) await c.update(sp, { members: [...(sp.members || []), acc] })
  }
  // pipeline (Lead funnel) pro role s funnel:true
  if (def.funnel) {
    const funnel = spaces.find((x) => x._id === LEAD_FUNNEL_ID)
    if (funnel) {
      const has = (funnel.members || []).includes(acc)
      console.log('  ' + (has ? '= ' : '+ ') + 'Pipeline (Lead funnel)' + (has ? ' (už je členem)' : ''))
      if (APPLY && !has) await c.update(funnel, { members: [...(funnel.members || []), acc] })
    } else console.log('  ! Lead funnel nenalezen, přeskakuji')
  }
  console.log('\nRežim:', APPLY ? 'APPLIED' : 'DRY-RUN → pro zápis přidej --apply')
  await conn.close(); process.exit(0)
}
main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1) })
