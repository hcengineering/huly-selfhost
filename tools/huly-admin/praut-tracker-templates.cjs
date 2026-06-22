// Vytvoří/obnoví 6 šablon issues (IssueTemplate) v projektu Default (TSK).
// Idempotentní: šablonu se stejným názvem smaže a vytvoří znovu.
//   node praut-tracker-templates.cjs           DRY-RUN
//   node praut-tracker-templates.cjs --apply    vytvoří/obnoví
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

const PROJECT = 'tracker:project:DefaultProject'
const KIND = 'tracker:taskTypes:Issue'
// IssuePriority: NoPriority=0, Urgent=1, High=2, Medium=3, Low=4
const TEMPLATES = [
  { title: 'Feature', priority: 3 },           // Nová funkce nebo produkt
  { title: 'Bug', priority: 2 },               // Oprava chyby
  { title: 'Client request', priority: 3 },    // Požadavek klienta
  { title: 'Sales follow-up', priority: 3 },   // Obchodní follow-up
  { title: 'Review/QA', priority: 3 },         // Review nebo testování
  { title: 'Ops/Admin', priority: 4 }          // Provozní a administrativní
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

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\nProjekt: ${PROJECT}\n`)
  const existing = await client.findAll('tracker:class:IssueTemplate', { space: PROJECT })

  for (const t of TEMPLATES) {
    const found = existing.find(e => e.title === t.title)
    if (found) {
      if (APPLY) {
        await client.removeDoc(found._class, found.space, found._id)
        console.log(`  Smazán existující: "${t.title}"`)
      } else {
        console.log(`  DRY-RUN: "${t.title}" by byl přepsán`)
        continue
      }
    }
    if (!APPLY) {
      console.log(`  DRY-RUN: "${t.title}" (priorita ${t.priority}) by byl vytvořen`)
      continue
    }
    const id = await client.createDoc('tracker:class:IssueTemplate', PROJECT, {
      title: t.title,
      description: '',
      priority: t.priority,
      assignee: null,
      component: null,
      milestone: null,
      estimation: 0,
      labels: [],
      kind: KIND,
      children: [],
      comments: 0,
      attachments: 0,
      relations: []
    })
    console.log(`  Vytvořen: "${t.title}" (${id})`)
  }

  console.log(`\n${APPLY ? 'Hotovo' : 'DRY-RUN hotov'} — ${TEMPLATES.length} šablon.`)
  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
