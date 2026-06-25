// Počeští stupně Lead funnelu (CRM pipeline) z anglických defaultů na české názvy.
// Přejmenovává POUZE názvy stavů (core:class:Status.name) — _id zůstává, takže
// leady na stupních ZŮSTANOU (nic se nepřesouvá ani nemaže). 1:1 mapování.
//
//   node praut-lead-setup.cjs           DRY-RUN (jen vypíše)
//   node praut-lead-setup.cjs --apply    provede přejmenování
//
// Pozn.: stavy jsou platformní (lead:taskTypeStatus:*) — runtime přejmenování
// drží do případného upgradu modelu; na novém serveru se cementuje v kódu
// (models/lead/src/spaceType.ts). Spouštět z import-tool s NODE_PATH.
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const coreMod = require('@hcengineering/core')
const core = coreMod.default
const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')

// _id stavu -> nový český název (1:1, beze změny pořadí, bez slučování)
const RENAME = {
  'lead:taskTypeStatus:Backlog': 'Zájemce',
  'lead:taskTypeStatus:Incoming': 'Kvalifikace',
  'lead:taskTypeStatus:Negotiation': 'Vyjednávání',
  'lead:taskTypeStatus:OfferPreparing': 'Příprava nabídky',
  'lead:taskTypeStatus:MakeADecision': 'Rozhodování',
  'lead:taskTypeStatus:ContractConclusion': 'Uzavření',
  'lead:taskTypeStatus:Won': 'Vyhráno',
  'lead:taskTypeStatus:Lost': 'Prohráno'
}

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim()
  }
  return out
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

  const states = await client.findAll('core:class:Status', { ofAttribute: 'lead:attribute:State' })
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\nNalezeno stavů: ${states.length}\n`)

  let changed = 0
  for (const st of states) {
    const newName = RENAME[st._id]
    if (newName === undefined) { console.log(`SKIP  ${st._id} ("${st.name}") — není v mapě.`); continue }
    if (st.name === newName) { console.log(`OK    "${st.name}" už počeštěno.`); continue }
    if (APPLY) {
      await client.updateDoc(st._class, st.space, st._id, { name: newName })
      changed++
      console.log(`FIXED "${st.name}" → "${newName}"`)
    } else {
      console.log(`DRY   "${st.name}" → "${newName}"`)
    }
  }
  console.log(`\n${APPLY ? 'Přejmenováno' : 'K přejmenování'}: ${APPLY ? changed : states.filter((st) => RENAME[st._id] && st.name !== RENAME[st._id]).length} stavů.`)
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
