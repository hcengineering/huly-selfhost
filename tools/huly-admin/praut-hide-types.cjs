// Skryje nepotřebné typy karet (MasterTag) z UI nastavením removed=true.
// Reverzibilní: --restore vrátí removed=false. NEMAŽE žádné karty — jen skryje typ
// z "+" nabídky a navigátoru (Huly to dělá stejně, viz card-resources TypeSelector).
//   node praut-hide-types.cjs            DRY-RUN
//   node praut-hide-types.cjs --apply    skryje (removed=true)
//   node praut-hide-types.cjs --apply --restore   vrátí (removed=false)
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}

const fs = require('fs')
const coreMod = require('@hcengineering/core')
const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
const RESTORE = process.argv.includes('--restore')
const TARGET = RESTORE ? false : true // removed = true/false

// Typy ke skrytí (14) — cílíme podle přesného _id (label má prefix embedded:embedded:).
// Ponechané (NEskrývat): Firma, Kontakt, Obchodni prilezitost, Nabidka,
//                        Zakazka, Projekt, Zapis ze schuzky, Faktura.
const HIDE = [
  ['6a2bb7f8295c2f467fa1d502', 'Lead/Poptavka'],
  ['6a2bb7f8295c2f467fa1d559', 'Zakaznicky pozadavek'],
  ['6a2bb7f8295c2f467fa1d49c', 'AI funkce'],
  ['6a2bb7f8295c2f467fa1d4a7', 'Automatizace'],
  ['6a2bb7f8295c2f467fa1d4b3', 'Change request'],
  ['6a2bb7f8295c2f467fa1d4d2', 'Incident'],
  ['6a2bb7f8295c2f467fa1d4d5', 'Integrace'],
  ['6a2bb7f8295c2f467fa1d4e6', 'KPI'],
  ['6a2bb7f8295c2f467fa1d4f0', 'Kampan'],
  ['6a2bb7f8295c2f467fa1d50e', 'Milnik'],
  ['6a2bb7f8295c2f467fa1d529', 'Obsahova polozka'],
  ['6a2bb7f8295c2f467fa1d532', 'Predani'],
  ['6a2bb7f8295c2f467fa1d543', 'Riziko'],
  ['6a2bb7f8295c2f467fa1d56e', 'Znalostni clanek']
]

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
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const accountClient = getAccountClient(token)
  const ws = (await accountClient.getUserWorkspaces()).filter((w) => w.url === 'praut')
  const selected = await accountClient.selectWorkspace(ws[0].url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  console.log(`Mode: ${APPLY ? (RESTORE ? 'APPLY RESTORE (removed=false)' : 'APPLY HIDE (removed=true)') : 'DRY-RUN'}\n`)
  const tags = await client.findAll('card:class:MasterTag', {})
  let hit = 0
  for (const label of HIDE_LABELS) {
    const tag = tags.find(t => t.label === label)
    if (!tag) { console.log(`  ⚠️  NENALEZEN: "${label}"`); continue }
    hit++
    if (APPLY) {
      await client.update(tag, { removed: TARGET })
      console.log(`  ${TARGET ? '🙈 skryt' : '👁️  vrácen'}: "${label}"`)
    } else {
      console.log(`  DRY-RUN: "${label}" → removed=${TARGET}`)
    }
  }
  console.log(`\n${APPLY ? 'Hotovo' : 'DRY-RUN hotov'} — ${hit}/${HIDE_LABELS.length} typů. Ponecháno 8 workflow typů. Žádná karta nesmazána.`)
  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
