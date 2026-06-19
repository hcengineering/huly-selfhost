// Vytvoří orientační dokument "Jak začít v Huly" v teamspacu "Základ systému".
// Idempotentní: pokud dokument se stejným názvem existuje, smaže ho a vytvoří znovu.
//   node praut-create-guide.cjs           DRY-RUN
//   node praut-create-guide.cjs --apply   vytvoří/obnoví
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
const GUIDE_TITLE = 'Jak začít v Huly — průvodce pro tým PRAUT'

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// Obsah průvodce ve formátu, který Huly přijímá jako markup
const GUIDE_CONTENT = `
<h1>Jak začít v Huly — průvodce pro tým PRAUT</h1>

<p>Huly je náš interní operační systém. Tento dokument ti ukáže, kde co najdeš a jak v tom pracovat.</p>

<h2>1. Kde co v Huly je</h2>

<p>Huly má 8 oblastí (teamspaces) v levém panelu:</p>

<ul>
  <li><strong>Základ systému</strong> — pravidla, procesy, tento průvodce</li>
  <li><strong>Obchod a CRM</strong> — leady, příležitosti, nabídky</li>
  <li><strong>Zakázky, projekty a úkoly</strong> — zakázky, projekty, Tracker (denní úkoly)</li>
  <li><strong>Dokumenty a znalostní báze</strong> — návody, know-how, rozhodnutí</li>
  <li><strong>Komunikace a spolupráce</strong> — záznamy ze schůzek, předání</li>
  <li><strong>Marketing a zákaznická péče</strong> — kampaně, zákaznické požadavky, incidenty</li>
  <li><strong>Automatizace, AI a integrace</strong> — naše AI nástroje a integrace</li>
  <li><strong>Řízení firmy a reporting</strong> — KPI, rizika, change requesty</li>
</ul>

<h2>2. Cards — strukturovaná evidence</h2>

<p>Cards jsou firemní objekty: Zakázka, Faktura, Lead, Projekt, Incident, Riziko atd. Najdeš je v horní navigaci (ikona karty).</p>

<p><strong>Ukázkový workflow (DEMO karty):</strong></p>
<ol>
  <li>Přijde poptávka → vytvoříš <strong>Lead/Poptávka</strong></li>
  <li>Lead se kvalifikuje → vytvoříš <strong>Obchodní příležitost</strong></li>
  <li>Píšeme nabídku → vytvoříš <strong>Nabídka</strong> (stav: ke schválení)</li>
  <li>Klient kývne → vytvoříš <strong>Zakázka</strong> (stav: aktivní)</li>
  <li>Fakturujeme → vytvoříš <strong>Faktura</strong> (stav: vystavena)</li>
  <li>Realizujeme → vytvoříš <strong>Projekt</strong> (fáze: aktivní realizace)</li>
</ol>

<p>Podívej se na DEMO karty (prefix "DEMO -") v Cards → ukazují, jak má vypadat každý krok s vyplněnými poli.</p>

<h2>3. Pohledy — filtrovat co je důležité teď</h2>

<p>V Cards (ikona karty) máš uložené pohledy vlevo nahoře:</p>

<ul>
  <li><strong>Aktivní</strong> — vše co právě běží (nekončí)</li>
  <li><strong>Ke schválení</strong> — nabídky čekající na tvé rozhodnutí</li>
  <li><strong>V riziku</strong> — zakázky s červeným/rizikovým health</li>
  <li><strong>Po splatnosti</strong> — faktury po splatnosti</li>
  <li><strong>Nezaplacené</strong> — faktury, za které jsme ještě nedostali peníze</li>
  <li><strong>Otevřené</strong> — požadavky/incidenty/rizika bez uzavření</li>
</ul>

<p><strong>Denní rituál (každé ráno, 5 minut):</strong></p>
<ol>
  <li>Ke schválení → zkontroluj, co čeká na tebe</li>
  <li>V riziku → co potřebuje pozornost</li>
  <li>Po splatnosti → zavolej/napiš klientovi</li>
</ol>

<h2>4. Tracker — denní úkoly a projekty</h2>

<p>Tracker je náš GitHub-Issues ekvivalent pro interní úkoly. Najdeš ho v levém panelu → Zakázky, projekty a úkoly → Tracker.</p>

<p><strong>Pravidlo pro úkoly:</strong></p>
<ul>
  <li>Každý úkol má vlastníka a deadline (nebo jasný důvod proč ne)</li>
  <li>Branch name: <code>TSK-123-kratky-popis</code></li>
  <li>PR title: <code>[TSK-123] Co jsem změnil</code></li>
  <li>Do Huly issue dej link na PR ručně (dokud nemáme GitHub integraci)</li>
</ul>

<h2>5. Co kam NE</h2>

<table>
  <tr><th>Typ info</th><th>Správné místo</th><th>NE sem</th></tr>
  <tr><td>Klient, zakázka, rozhodnutí o ceně</td><td>Card</td><td>Chat</td></tr>
  <tr><td>Průvodce, pravidlo, proces</td><td>Dokument</td><td>Card</td></tr>
  <tr><td>Rychlá koordinace, dotaz</td><td>Chat</td><td>Card/Dokument</td></tr>
  <tr><td>Incident, SLA porušení</td><td>Card → Incident</td><td>Email/Slack only</td></tr>
  <tr><td>AI výstup bez kontroly</td><td>Nikam!</td><td>—</td></tr>
</table>

<h2>6. Admin a bezpečnost</h2>

<ul>
  <li>Public signup je vypnutý — nové lidi přidává admin přes invite link</li>
  <li>Zálohy běží každý den 02:30 — zálohu spustíš ručně přes SSH příkaz</li>
  <li>Před větší změnou v nastavení → vždy nejdřív záloha</li>
  <li>Admin: stepan@praut.cz (svanda@praut.cz)</li>
</ul>

<h2>7. Kde hledat pomoc</h2>

<ul>
  <li>Tento dokument (Základ systému → Jak začít v Huly)</li>
  <li>Složka Základ systému — tam jsou všechny provozní procesy</li>
  <li>PRAUT_OWNER_ADMIN_KURZ.md — strukturovaný kurz pro admina</li>
  <li>GitHub repo PrautAutomation/huly-selfhost — technická dokumentace</li>
</ul>
`

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

  // Najdi teamspace "Základ systému"
  const spaces = await client.findAll('document:class:Teamspace', {})
  console.log(`Nalezeno ${spaces.length} document teamspaces:`)
  for (const sp of spaces) console.log(`  ${sp._id} — "${sp.name}"`)

  const zakladSpace = spaces.find(sp => sp.name && (
    sp.name.includes('Základ') ||
    sp.name.toLowerCase().includes('zaklad') ||
    sp.name.includes('System') ||
    sp.name.includes('system')
  ))

  if (!zakladSpace) {
    console.log('\n⚠️  Teamspace "Základ systému" nenalezen. Dostupné spaces:')
    for (const sp of spaces) console.log(`  "${sp.name}"`)
    console.log('Zkus spustit s přesným názvem nebo si zkontroluj Huly UI.')
    await connection.close()
    process.exit(1)
  }

  console.log(`\nCílový teamspace: "${zakladSpace.name}" (${zakladSpace._id})`)

  // Zkontroluj existující průvodce
  const existing = await client.findAll('document:class:Document', { space: zakladSpace._id })
  const existingGuide = existing.find(d => d.title === GUIDE_TITLE)

  if (existingGuide) {
    if (APPLY) {
      await client.removeDoc(existingGuide._class, existingGuide.space, existingGuide._id)
      console.log(`Smazán existující průvodce (${existingGuide._id})`)
    } else {
      console.log(`DRY-RUN: průvodce "${GUIDE_TITLE}" by byl přepsán`)
    }
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN — průvodce nebyl vytvořen. Spusť s --apply.`)
    console.log(`Byl by vytvořen: "${GUIDE_TITLE}" v teamspacu "${zakladSpace.name}"`)
    await connection.close()
    process.exit(0)
  }

  // Vytvoř průvodce
  const docId = await client.createDoc('document:class:Document', zakladSpace._id, {
    title: GUIDE_TITLE,
    content: GUIDE_CONTENT,
    category: null,
    attachments: 0,
    comments: 0,
    labels: [],
    members: [],
    relations: []
  })

  console.log(`\n✅ Průvodce vytvořen: "${GUIDE_TITLE}"`)
  console.log(`   ID: ${docId}`)
  console.log(`   Space: ${zakladSpace._id} (${zakladSpace.name})`)
  console.log(`\nNajdeš ho v Huly → levý panel → ${zakladSpace.name}`)

  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
