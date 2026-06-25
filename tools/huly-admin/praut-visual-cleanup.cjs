// Vizuální úklid (config/data-level, bez buildu):
//  1) Přejmenuje 8 hlavních sekcí dokumentace ve „Firemní dokumentace HULY" —
//     odstraní neviditelné řídicí znaky () a doplní diakritiku.
//     Pořadí drží `rank`, takže přejmenování ho nemění.
//  2) Archivuje prázdný defaultní Lead funnel „Funnel" (0 leadů) — méně zmatku.
//
//   node praut-visual-cleanup.cjs           DRY-RUN
//   node praut-visual-cleanup.cjs --apply    provede
//
// Spouštět z import-tool s NODE_PATH. Zápisy → TxOperations se socialId.
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
const DOCS_SPACE = '6a3bc49cbd215240cb445446' // Firemní dokumentace HULY
const EMPTY_FUNNEL = 'lead:space:DefaultFunnel'

// cleaned current title -> správný název s diakritikou (jen 8 hlavních sekcí)
const TITLE_MAP = {
  'Zaklad systemu': 'Základ systému',
  'Obchod a CRM': 'Obchod a CRM',
  'Zakazky, projekty a ukoly': 'Zakázky, projekty a úkoly',
  'Dokumenty a znalostni baze': 'Dokumenty a znalostní báze',
  'Komunikace a spoluprace': 'Komunikace a spolupráce',
  'Marketing a zakaznicka pece': 'Marketing a zákaznická péče',
  'Automatizace, AI a integrace': 'Automatizace, AI a integrace',
  'Rizeni firmy a reporting': 'Řízení firmy a reporting'
}

function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('').trim() }
function env (file) { const out = {}; for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim() } return out }

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

  // 1) hlavní sekce (top-level dokumenty bez rodiče)
  const docs = await client.findAll('document:class:Document', { space: DOCS_SPACE })
  const tops = docs.filter((d) => d.attachedTo === 'document:ids:NoParent' || d.parent === 'document:ids:NoParent')
  let renamed = 0
  console.log('— Hlavní sekce dokumentace —')
  for (const d of tops) {
    const cur = clean(d.title)
    const target = TITLE_MAP[cur]
    if (target === undefined) { console.log(`  SKIP "${cur}" (není v mapě)`); continue }
    if (d.title === target) { console.log(`  OK   "${target}" už čisté`); continue }
    if (APPLY) { await client.updateDoc(d._class, d.space, d._id, { title: target }); renamed++; console.log(`  FIXED "${cur}" → "${target}"`) }
    else { console.log(`  DRY  "${cur}" → "${target}"`) }
  }

  // 2) archivace prázdného funnelu
  console.log('\n— Prázdný Lead funnel —')
  const funnel = await client.findOne('lead:class:Funnel', { _id: EMPTY_FUNNEL })
  if (!funnel) { console.log('  funnel nenalezen') }
  else {
    const leads = await client.findAll('lead:class:Lead', { space: EMPTY_FUNNEL })
    if (leads.length > 0) { console.log(`  SKIP — funnel má ${leads.length} leadů, NEarchivuji`) }
    else if (funnel.archived === true) { console.log('  OK — už archivován') }
    else if (APPLY) { await client.updateDoc(funnel._class, funnel.space, funnel._id, { archived: true }); console.log('  ARCHIVED prázdný funnel "Funnel"') }
    else { console.log('  DRY — archivoval bych prázdný funnel "Funnel"') }
  }

  console.log(`\n${APPLY ? 'Hotovo' : 'DRY-RUN hotov'} — sekcí k přejmenování: ${APPLY ? renamed : tops.filter((d) => TITLE_MAP[clean(d.title)] && d.title !== TITLE_MAP[clean(d.title)]).length}.`)
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
