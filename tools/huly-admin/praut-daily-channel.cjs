// Oživí kanál #praut-denni-prehled: přidá VŠECHNY aktivní zaměstnance, zapne autoJoin
// (noví se přidají sami) a nastaví topic s denním ritualem. Jen PŘIDÁVÁ členy (nikoho neodebírá).
//
//   node praut-daily-channel.cjs           DRY-RUN
//   node praut-daily-channel.cjs --apply    provede
globalThis.window = globalThis
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const coreMod = require('@hcengineering/core'); const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const scp = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
const CHANNEL = 'praut-denni-prehled'
const TOPIC = 'Denní check-in: do 9:30 napiš 1 zprávu — co dnes dělám / co mě blokuje. Vedoucí reaguje na blokery.'
function env (f) { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim() } return o }
function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('').trim() }

async function main () {
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const cfg = await (await fetch('https://huly.praut.cz/config.json')).json(); setMetadata(scp.metadata.Endpoint, cfg.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD); const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).filter((w) => w.url === 'praut'); const sel = await ac.selectWorkspace(ws[0].url)
  const conn = await createClient(sel.endpoint, sel.token, []); const c = new TxOperations(conn, socialId); const h = c.getHierarchy()

  const persons = await c.findAll('contact:class:Person', {})
  const active = persons.filter((p) => p.personUuid && h.hasMixin(p, 'contact:mixin:Employee') && h.as(p, 'contact:mixin:Employee').active)
  const wantUuids = active.map((p) => p.personUuid)

  const channels = await c.findAll('chunter:class:Channel', {})
  const ch = channels.find((x) => clean(x.name) === CHANNEL)
  if (!ch) { console.log('CHYBA: kanál nenalezen:', CHANNEL); await conn.close(); process.exit(1) }

  const current = new Set(ch.members || [])
  const toAdd = wantUuids.filter((u) => !current.has(u))
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Kanál "${CHANNEL}": členů teď=${current.size}, aktivních zaměstnanců=${active.length}, přidám=${toAdd.length}`)
  for (const p of active) console.log(`  ${current.has(p.personUuid) ? '=' : '+'} ${clean(p.name)}`)
  console.log(`autoJoin: ${ch.autoJoin ? 'už zapnuto' : '→ zapnu (true)'}`)
  console.log(`topic → "${TOPIC}"`)

  if (APPLY) {
    const merged = Array.from(new Set([...(ch.members || []), ...wantUuids]))
    await c.update(ch, { members: merged, autoJoin: true, topic: TOPIC })
    console.log(`\n✅ Hotovo: členů=${merged.length}, autoJoin=true, topic nastaven.`)
  } else {
    console.log('\nDRY-RUN → pro zápis přidej --apply')
  }
  await conn.close(); process.exit(0)
}
main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1) })
