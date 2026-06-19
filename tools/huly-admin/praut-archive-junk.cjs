// Archivuje (reverzibilně skryje) testovací junk prostory ve workspace Praut.
// Cílí přesně podle _id, takže nemůže zasáhnout reálnou strukturu.
// Spuštění:  node praut-archive-junk.cjs          (DRY-RUN, jen vypíše)
//            node praut-archive-junk.cjs --apply  (provede archivaci)
//            node praut-archive-junk.cjs --apply --unarchive  (vrátí zpět)
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
const TARGET = process.argv.includes('--unarchive') ? false : true // archived = true/false

// Přesné _id testovacích junk prostorů (ověřeno read-only výpisem).
const JUNK = new Set([
  '6a2c0a5acdb7c222ffc8cd2a', // CardSpace  Zaznamnik.pro
  '6a2c0a85cdb7c222ffc8cd3b', // CardSpace  Pizda
  '6a2c1114ad7c7dc8e3c7886c', // CardSpace  poi
  '6a31fed60552fecae46795ba', // CardSpace  PULS
  '6a33c7d13944be5b4ac94e44', // CardSpace  SCH ekonom (4 karty)
  '6a2c0afb814f52d3c14f4b63', // Project    Zaznamnik.pro
  '6a2f06d90719a7e7ae7ff8d9', // Project    ProjZaznamnik
  '6a31ff580552fecae4679775' //  Project    puls
])

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

async function main () {
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const config = await (await fetch('https://huly.praut.cz/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId, account } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  if (token === undefined) { console.log('LOGIN FAILED'); process.exit(1) }
  const accountClient = getAccountClient(token)
  const ws = (await accountClient.getUserWorkspaces()).filter((w) => w.url === 'praut')
  const selected = await accountClient.selectWorkspace(ws[0].url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  const spaces = await client.findAll(core.class.Space, {})
  const targets = spaces.filter((sp) => JUNK.has(sp._id))
  console.log(`\nMód: ${APPLY ? (TARGET ? 'ARCHIVUJI' : 'VRACÍM Z ARCHIVU') : 'DRY-RUN (nic neměním)'}`)
  console.log(`Nalezeno cílů: ${targets.length}/${JUNK.size}\n`)
  for (const sp of targets) {
    console.log(`${TARGET ? 'archive' : 'unarchive'}  ${sp._class}  ${JSON.stringify(sp.name)}  (${sp._id})  archived nyní=${sp.archived === true}`)
    if (APPLY && sp.archived !== TARGET) {
      await client.update(sp, { archived: TARGET })
    }
  }
  const missing = [...JUNK].filter((id) => !targets.find((t) => t._id === id))
  if (missing.length) console.log('\nPOZOR nenalezeno:', missing.join(', '))
  await connection.close()
  console.log(APPLY ? '\nHOTOVO.' : '\nDRY-RUN hotov. Pro provedení přidej --apply')
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
