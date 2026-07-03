// Vytvoří krátký dokument "Co sem patří" v každém teamspacu (kromě Základ systemu, který obsluhuje praut-create-guide.cjs).
// Idempotentní: přepíše existující dokumenty se stejným názvem.
//   node praut-create-teamspace-docs.cjs           DRY-RUN
//   node praut-create-teamspace-docs.cjs --apply   vytvoří/obnoví
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
const { uploadDocContent } = require(require('path').join(__dirname, 'praut-doc-content.cjs'))

const APPLY = process.argv.includes('--apply')
const DOC_TITLE = 'Co sem patří — přehled'

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// Obsah pro každý teamspace (klíč = název hledaný v sp.name)
const DOCS = [
  {
    match: ['Komunikace', 'komunikace'],
    content: `
<h1>Komunikace a spolupráce — co sem patří</h1>

<h2>SEM patří (dokumenty)</h2>
<ul>
  <li>Delší protokoly ze schůzek (vícesetřádkové dokumenty se záznamem celého jednání)</li>
  <li>Šablony pro komunikaci s klienty (email šablony pro nabídky, onboarding, eskalaci)</li>
  <li>Pravidla pro interní komunikaci (jak a kde komunikujeme — Slack, email, Huly chat)</li>
  <li>Předávací dokumenty při rotaci projektů</li>
</ul>

<h2>SEM nepatří</h2>
<ul>
  <li>Krátké záznamy ze schůzek → ty patří do <strong>Cards → Zapis ze schuzky</strong></li>
  <li>Úkoly a follow-upy → ty patří do <strong>Tracker</strong></li>
  <li>Firemní pravidla a procesy → <strong>Základ systemu</strong></li>
</ul>

<p><strong>Tip:</strong> Záznamy ze schůzek jsou v Huly Cards (typ "Zapis ze schuzky"), ne tady. Tady jsou pouze delší, formální protokoly.</p>
`
  },
  {
    match: ['Obchod', 'obchod', 'CRM'],
    content: `
<h1>Obchod a CRM — co sem patří</h1>

<h2>SEM patří (dokumenty)</h2>
<ul>
  <li>Email šablony pro obchodní komunikaci (cold outreach, follow-up, odmítnutí)</li>
  <li>Pravidla pro scoring a kvalifikaci leadů</li>
  <li>Ceníky a podmínky (rámcové smlouvy, SLA standardy)</li>
  <li>Profily zákaznických segmentů (ICP — Ideal Customer Profile)</li>
</ul>

<h2>SEM nepatří</h2>
<ul>
  <li>Konkrétní klienti, leady, nabídky → ty patří do <strong>Cards</strong> (typ Firma, Lead, Nabídka)</li>
  <li>Schůzky s klienty → <strong>Cards → Zapis ze schuzky</strong></li>
  <li>Zakázky a projekty → <strong>Cards</strong> (typ Zakazka, Projekt)</li>
</ul>

<p><strong>Tip:</strong> Klienty, leady a nabídky najdeš v Cards (horní navigace), ne tady. Tady jsou jen šablony a pravidla pro obchodní tým.</p>
`
  },
  {
    match: ['Zakázky', 'Zakazky', 'zakazky', 'projekty'],
    content: `
<h1>Zakázky, projekty a úkoly — co sem patří</h1>

<h2>SEM patří (dokumenty)</h2>
<ul>
  <li>Metodika projektového řízení PRAUT (jak vedeme projekt od kick-off po předání)</li>
  <li>Šablony projektové dokumentace (kick-off dokument, status report, handover)</li>
  <li>Pokyny pro Tracker (jak psát issues, šablony, naming konvence)</li>
  <li>Archiv uzavřených projektů — závěrečné zprávy a lessons learned</li>
</ul>

<h2>SEM nepatří</h2>
<ul>
  <li>Konkrétní zakázky a projekty → ty jsou v <strong>Cards</strong> (typ Zakazka, Projekt)</li>
  <li>Denní úkoly → <strong>Tracker</strong></li>
  <li>Schůzky k projektům → <strong>Cards → Zapis ze schuzky</strong></li>
</ul>

<p><strong>Tip:</strong> Tracker (denní úkoly, issues) je dostupný přímo z tohoto teamspacu v levém panelu.</p>
`
  },
  {
    match: ['Dokumenty', 'znalostní', 'znalostni'],
    content: `
<h1>Dokumenty a znalostní báze — co sem patří</h1>

<h2>SEM patří (dokumenty)</h2>
<ul>
  <li>Technická dokumentace (architektura, rozhodnutí ADR, API popisy)</li>
  <li>Návody a how-to (pro vývojáře, pro klienty, pro onboarding)</li>
  <li>Firemní know-how (jak stavíme AI agenty, naše metodiky)</li>
  <li>Rozhodnutí a jejich zdůvodnění (proč TypeScript a ne Python, proč Huly a ne Notion)</li>
</ul>

<h2>SEM nepatří</h2>
<ul>
  <li>Firemní pravidla a procesy → <strong>Základ systemu</strong></li>
  <li>Záznamy ze schůzek → <strong>Cards → Zapis ze schuzky</strong></li>
  <li>Konkrétní karty (klienti, zakázky) → <strong>Cards</strong></li>
</ul>

<p><strong>Tip:</strong> Pokud nevíš jestli to sem patří, zkus otázku: "Je to trvalé know-how, které bude platit i za rok?" Pokud ano → patří sem.</p>
`
  },
  {
    match: ['Marketing', 'zákaznická', 'zakaznicka'],
    content: `
<h1>Marketing a zákaznická péče — co sem patří</h1>

<h2>SEM patří (dokumenty)</h2>
<ul>
  <li>Marketingová strategie a plán (cíle, kanály, rozpočet)</li>
  <li>Obsahové šablony (LinkedIn posty, blog články, case studies)</li>
  <li>SLA pravidla (definice úrovní služby, eskalační procedury)</li>
  <li>Customer success playbook (co dělat při obnově, churnu, eskalaci)</li>
</ul>

<h2>SEM nepatří</h2>
<ul>
  <li>Konkrétní zákaznické požadavky a incidenty → <strong>Cards</strong> (typ Zakaznicky pozadavek, Incident)</li>
  <li>Kampaně jako karty → <strong>Cards</strong> (typ Kampan)</li>
  <li>Schůzky s klienty → <strong>Cards → Zapis ze schuzky</strong></li>
</ul>
`
  },
  {
    match: ['Automatizace', 'AI a integrace', 'integrace'],
    content: `
<h1>Automatizace, AI a integrace — co sem patří</h1>

<h2>SEM patří (dokumenty)</h2>
<ul>
  <li>Popis AI agentů a nástrojů (co dělají, jak jsou nasazeny, jak se spravují)</li>
  <li>Integrace s externími systémy (CRM klientů, Slack, GitHub, fakturační systémy)</li>
  <li>Automatizační pravidla a jejich logika (triggery, podmínky, akce)</li>
  <li>AI guidelines (co AI smí/nesmí dělat, jak kontrolujeme výstupy)</li>
</ul>

<h2>SEM nepatří</h2>
<ul>
  <li>Konkrétní AI funkce jako karty → <strong>Cards</strong> (typ AI funkce, Automatizace, Integrace)</li>
  <li>Úkoly na vývoj AI nástrojů → <strong>Tracker</strong></li>
</ul>

<p><strong>Tip:</strong> Tady jsou pravidla a popisy. Konkrétní instance AI funkcí/automatizací jsou v Cards.</p>
`
  },
  {
    match: ['Řízení', 'rizeni', 'reporting'],
    content: `
<h1>Řízení firmy a reporting — co sem patří</h1>

<h2>SEM patří (dokumenty)</h2>
<ul>
  <li>KPI definice (co měříme, jak počítáme, kde bereme data)</li>
  <li>Reportingové šablony (týdenní, měsíční, kvartální)</li>
  <li>Finanční přehledy a prognózy (ne účetnictví — to je u ekonoma)</li>
  <li>OKR a strategické cíle (firemní cíle na rok/kvartál)</li>
  <li>Change requesty — schválené změny ve firemní strategii nebo procesech</li>
</ul>

<h2>SEM nepatří</h2>
<ul>
  <li>Konkrétní KPI hodnoty jako karty → <strong>Cards</strong> (typ KPI)</li>
  <li>Konkrétní rizika → <strong>Cards</strong> (typ Riziko)</li>
  <li>Zakázky a jejich stav → <strong>Cards</strong></li>
</ul>
`
  }
]

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

  const spaces = await client.findAll('document:class:Teamspace', {})
  console.log(`Nalezeno ${spaces.length} teamspaces. Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  let created = 0
  for (const docSpec of DOCS) {
    const sp = spaces.find(s => docSpec.match.some(m => s.name && s.name.includes(m)))
    if (!sp) {
      console.log(`SKIP: teamspace nenalezen pro match [${docSpec.match.join(', ')}]`)
      continue
    }

    const existing = await client.findAll('document:class:Document', { space: sp._id })
    const found = existing.find(d => d.title === DOC_TITLE)

    if (found) {
      if (APPLY) {
        await client.removeDoc(found._class, found.space, found._id)
        console.log(`  Přepsán: "${sp.name}" → "${DOC_TITLE}"`)
      } else {
        console.log(`  DRY-RUN: "${sp.name}" → "${DOC_TITLE}" by byl přepsán`)
        continue
      }
    }

    if (APPLY) {
      await client.createDoc('document:class:Document', sp._id, {
        title: DOC_TITLE,
        content: docSpec.content,
        category: null,
        attachments: 0,
        comments: 0,
        labels: [],
        members: [],
        relations: []
      })
      created++
      console.log(`  Vytvořen: "${sp.name}" → "${DOC_TITLE}"`)
    } else {
      console.log(`  DRY-RUN: "${sp.name}" → "${DOC_TITLE}" by byl vytvořen`)
    }
  }

  if (APPLY) {
    console.log(`\nHotovo — vytvořeno/přepsáno ${created} dokumentů.`)
  } else {
    console.log('\nDRY-RUN — nic nebylo vytvořeno. Spusť s --apply.')
  }

  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
