// Smaže testovací junk issues z Trackeru (projekt Default / TSK).
// Cílí přesně podle názvu — nemůže zasáhnout reálné úkoly.
//   node praut-clean-tracker.cjs           DRY-RUN (jen vypíše)
//   node praut-clean-tracker.cjs --apply   smaže
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

// Přesné názvy junk issues k smazání (ověřeno ze screenshotu Trackeru 2026-06-22).
const JUNK_TITLES = [
  'Huf si musi koupit boty',
  'DEMO - Zjistit rozpocet pro web Novak stavby',
  'Zjistit rozpočet SCH ekonom'
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

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)
  const issues = await client.findAll('tracker:class:Issue', {})
  let hit = 0
  for (const issue of issues) {
    if (JUNK_TITLES.includes(issue.title)) {
      hit++
      if (APPLY) {
        await client.removeDoc(issue._class, issue.space, issue._id)
        console.log(`  🗑️  Smazán: ${issue.title}`)
      } else {
        console.log(`  DRY-RUN: smazal by se "${issue.title}"`)
      }
    }
  }
  console.log(`\n${APPLY ? 'Smazáno' : 'Nalezeno'} ${hit} junk issues.`)
  if (hit < JUNK_TITLES.length) {
    console.log(`POZOR: nenalezeny všechny (${JUNK_TITLES.length} očekáváno) — možná už smazané.`)
  }
  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
