// Vytvoří/obnoví DVA dokumenty v teamspacu "Základ systemu":
//   1. "🏠 PRAUT — Co dnes dělám" (HOME / rozcestník — mapa Huly + denní rutina)
//   2. "📖 Příručka PRAUT Huly" (jediný detailní dokument — schůzky, role, workflow, Tracker)
// Navíc smaže zastaralé návodové dokumenty (STALE_TITLES) — po sloučení 6 → 2.
// Idempotentní: dokument se stejným názvem smaže a vytvoří znovu.
//   node praut-create-guide.cjs           DRY-RUN
//   node praut-create-guide.cjs --apply   vytvoří/obnoví + smaže zastaralé
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

const HOME_TITLE = '🏠 PRAUT — Co dnes dělám'
const PRIRUCKA_TITLE = '📖 Příručka PRAUT Huly'

// Zastaralé dokumenty z doby 6 návodů — po sloučení je mažeme.
const STALE_TITLES = [
  'PRAUT Huly — 4 věci které potřebuješ znát',
  'Jak pracovat v Huly — průvodce pro tým PRAUT',
  'Rychlý start — co dělat v první den',
  'Jak zapsat schůzku — krok za krokem',
  'Role v PRAUT — kdo za co odpovídá'
]

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const HOME_CONTENT = `
<h1>🏠 PRAUT — Jak se v Huly vyznat</h1>

<p><strong>Toto je rozcestník. Když nevíš kam jít — začni tady.</strong> Potřebuješ detailní návod? Otevři dokument <strong>📖 Příručka PRAUT Huly</strong> (je tady v Základ systemu).</p>

<hr/>

<h2>🗺️ MAPA HULY — kde co najdeš</h2>

<p>Huly má 4 hlavní sekce. Přepínáš je ikonami <strong>v levém sloupci úplně nahoře</strong>:</p>

<table>
  <tr>
    <th>Ikona (vlevo nahoře)</th>
    <th>Sekce</th>
    <th>Co tam najdeš</th>
    <th>Pro koho</th>
  </tr>
  <tr>
    <td>🗃️ <strong>mřížka / karet</strong></td>
    <td><strong>Cards</strong></td>
    <td>Schůzky, zakázky, klienti, nabídky, faktury</td>
    <td>Všichni</td>
  </tr>
  <tr>
    <td>💬 <strong>bublina</strong></td>
    <td><strong>Chat (Chunter)</strong></td>
    <td>Zprávy, kanál #praut-denni-prehled</td>
    <td>Všichni</td>
  </tr>
  <tr>
    <td>📄 <strong>stránka s textem</strong></td>
    <td><strong>Documents</strong></td>
    <td>Tato stránka + firemní dokumenty</td>
    <td>Všichni</td>
  </tr>
  <tr>
    <td>◻️ <strong>malé čtverce</strong></td>
    <td><strong>Tracker</strong></td>
    <td>Vývojářské úkoly (GitHub Issues ekvivalent)</td>
    <td><strong>Jen vývojáři</strong></td>
  </tr>
</table>

<p>⚠️ <strong>Pokud jsi omylem v Trackeru</strong> (vidíš "New Funnel", "Backlog", "SCH-AD-1") → klikni na ikonu 📄 Documents vlevo nahoře a vrať se sem.</p>

<hr/>

<h2>⏰ DENNÍ RUTINA — ranní kontrola (5 minut)</h2>

<p>Otevři Cards (ikona 🗃️ vlevo nahoře) a projdi tyto 3 pohledy v levém panelu:</p>

<table>
  <tr>
    <th>Pohled v Cards</th>
    <th>Co hledáš</th>
    <th>Co dělat</th>
  </tr>
  <tr>
    <td><strong>⭐ Ke schválení</strong></td>
    <td>Nabídky čekající na podpis</td>
    <td>Schválit nebo odmítnout — do 48 h</td>
  </tr>
  <tr>
    <td><strong>🔴 V riziku</strong></td>
    <td>Zakázky s problémem (červený/v riziku)</td>
    <td>Zavolej PM ihned</td>
  </tr>
  <tr>
    <td><strong>💰 Po splatnosti</strong></td>
    <td>Faktury po termínu splatnosti</td>
    <td>Zavolej klientovi dnes</td>
  </tr>
</table>

<p>Všechny tři prázdné → skvělý den, jdi na kafe ☕</p>

<hr/>

<h2>🆘 KDYŽ SI NEVÍŠ RADY</h2>

<table>
  <tr><th>Problém</th><th>Řešení</th></tr>
  <tr>
    <td>Nevím kde jsem / nevím jak na to</td>
    <td>Otevři 📄 Documents → Základ systemu → <strong>📖 Příručka PRAUT Huly</strong></td>
  </tr>
  <tr>
    <td>Vidím "New Funnel" nebo "Backlog"</td>
    <td>Jsi v Trackeru (pro vývojáře). Klikni 📄 Documents vlevo nahoře.</td>
  </tr>
  <tr>
    <td>Nevidím sekci "Schůzky"</td>
    <td>Klikni 🗃️ Cards → scroll dolů v levém panelu → sekce SPACES → Schůzky</td>
  </tr>
  <tr>
    <td>Huly nefunguje / nejde otevřít</td>
    <td>Kontaktuj tech tým — viz docs/RUNBOOK-SERVER-DOWN.md v repozitáři</td>
  </tr>
</table>

<hr/>

<p><strong>👉 Vše ostatní — jak zapsat schůzku, role v týmu, obchodní workflow, Tracker — najdeš v dokumentu 📖 Příručka PRAUT Huly.</strong></p>
`

const PRIRUCKA_CONTENT = `
<h1>📖 Příručka PRAUT Huly</h1>

<p>Huly je náš interní operační systém. Vše důležité — zákazníci, zakázky, schůzky, úkoly, dokumenty — je tady, ne v emailu nebo chatu. Tato příručka je <strong>jediný detailní návod</strong>; rychlý rozcestník je dokument 🏠 PRAUT — Co dnes dělám.</p>

<hr/>

<h2>1. Jak zapsat schůzku</h2>

<p>Schůzky jsou karty typu <strong>Zapis ze schuzky</strong> v prostoru <strong>Cards → Schůzky</strong>. Postup:</p>

<ol>
  <li>Klikni na ikonu <strong>🗃️ Cards</strong> (vlevo nahoře, mřížka karet)</li>
  <li>V levém panelu klikni na sekci <strong>Schůzky</strong> (pod nadpisem SPACES)</li>
  <li>Klikni na <strong>+</strong> vpravo nahoře</li>
  <li>Do názvu napiš: <em>"Schůzka: [kdo/co] (datum)"</em> — např. "Schůzka: Konzultace s ekonomem (2026-07-10)"</li>
  <li>Vyplň pole (viz tabulka níže)</li>
</ol>

<table>
  <tr><th>Pole</th><th>Co vyplnit</th></tr>
  <tr><td><strong>datum</strong></td><td>Datum schůzky (YYYY-MM-DD)</td></tr>
  <tr><td><strong>projekt/klient</strong></td><td>S kým nebo o čem (např. "AI spol. s r.o." nebo "Interní")</td></tr>
  <tr><td><strong>rozhodnutí</strong></td><td>Co bylo rozhodnuto — konkrétně, ne "probrali jsme"</td></tr>
  <tr><td><strong>akční položky</strong></td><td>Kdo co udělá do kdy (číslovaný seznam)</td></tr>
  <tr><td><strong>citlivost</strong></td><td>verejne / interni / citlive</td></tr>
  <tr><td><strong>stav</strong></td><td>draft → ke kontrole → potvrzeno / akcni kroky otevrene → uzavreno</td></tr>
</table>

<p>Hotové záznamy: Cards → pohled <strong>📅 Záznamy ze schůzek</strong>.</p>

<hr/>

<h2>2. Role — kdo za co odpovídá</h2>

<p>U každé práce (karta, úkol, zakázka) rozlišujeme tři role:</p>

<table>
  <tr><th>Role</th><th>Co dělá</th></tr>
  <tr><td><strong>Vlastník</strong></td><td>Odpovídá za výsledek. Hlídá, aby se práce dotáhla. Nemusí ji dělat sám.</td></tr>
  <tr><td><strong>Řešitel</strong></td><td>Dělá samotnou práci. Reportuje vlastníkovi.</td></tr>
  <tr><td><strong>Schvalovatel</strong></td><td>Potvrzuje a schvaluje (typicky Štěpán u nabídek, cen a zakázek). Bez jeho OK se neodesílá ven.</td></tr>
</table>

<p><strong>Pravidlo:</strong> každá karta má vlastníka. Když vlastník chybí, práce zapadne — proto pohled „bez vlastníka" hlídá automatika.</p>

<hr/>

<h2>3. Obchodní workflow (kde co vzniká)</h2>

<p>Celý obchodní cyklus v PRAUT:</p>

<ol>
  <li>Přijde poptávka → <strong>Lead/Poptávka</strong> (Cards → +)</li>
  <li>Lead se kvalifikuje → <strong>Obchodní příležitost</strong></li>
  <li>Píšeme nabídku → <strong>Nabídka</strong> (stav: draft → ke schválení)</li>
  <li>Schvalovatel schválí → stav nabídky: ke schvaleni → odeslano</li>
  <li>Klient kývne → <strong>Zakázka</strong> (stav: aktivni, propoj s nabídkou)</li>
  <li>Fakturujeme → <strong>Faktura</strong> (propoj se zakázkou)</li>
  <li>Realizujeme → <strong>Projekt</strong> (propoj se zakázkou)</li>
  <li>Každá důležitá schůzka → <strong>Zapis ze schuzky</strong> (propoj v poli projekt/klient)</li>
</ol>

<hr/>

<h2>4. Uložené pohledy v Cards</h2>

<p>Vlevo v Cards jsou předdefinované filtry pro nejčastější situace:</p>

<ul>
  <li><strong>📅 Záznamy ze schůzek</strong> — otevřené záznamy ze schůzek</li>
  <li><strong>⭐ Ke schválení</strong> — nabídky čekající na schválení</li>
  <li><strong>📦 Aktivní zakázky</strong> — zakázky, které právě běží</li>
  <li><strong>🔴 V riziku</strong> — zakázky s červeným/rizikovým health</li>
  <li><strong>💰 Po splatnosti</strong> — faktury po termínu splatnosti</li>
</ul>

<hr/>

<h2>5. Tracker — pro vývojářský tým</h2>

<p>Tracker je pro interní denní úkoly — jako GitHub Issues. Vlevo v panelu → Zakázky, projekty a úkoly → Tracker.</p>

<ul>
  <li>Každý issue má <strong>vlastníka</strong> a <strong>deadline</strong> (nebo jasný důvod proč ne)</li>
  <li>Branch name: <code>TSK-123-kratky-popis</code></li>
  <li>PR title: <code>[TSK-123] Co jsem změnil</code></li>
  <li>Po mergi: aktualizuj stav issue v Trackeru</li>
</ul>

<hr/>

<h2>6. Co patří kam</h2>

<table>
  <tr><th>Info</th><th>Správné místo</th><th>NE sem</th></tr>
  <tr><td>Schůzka s klientem / interní</td><td>Cards → Zapis ze schuzky</td><td>Chat, email</td></tr>
  <tr><td>Klient, zakázka, nabídka</td><td>Cards (příslušný typ)</td><td>Chat, dokument</td></tr>
  <tr><td>Firemní pravidlo, proces</td><td>Základ systemu → New Document</td><td>Card, chat</td></tr>
  <tr><td>Know-how, rozhodnutí, návod</td><td>Dokumenty a znalostní báze</td><td>Card</td></tr>
  <tr><td>Rychlá koordinace, dotaz</td><td>Chat</td><td>Card, Tracker</td></tr>
  <tr><td>Incident, SLA</td><td>Cards → Incident</td><td>Email, chat only</td></tr>
  <tr><td>Denní vývojářský úkol</td><td>Tracker</td><td>Chat</td></tr>
  <tr><td>AI výstup bez lidské kontroly</td><td>Nikam!</td><td>—</td></tr>
</table>

<hr/>

<h2>7. Teamspaces — co v nich najdeš</h2>

<ul>
  <li><strong>Základ systemu</strong> — tato příručka, HOME rozcestník, firemní procesy</li>
  <li><strong>Obchod a CRM</strong> — email šablony, návody pro obchodní tým</li>
  <li><strong>Zakázky, projekty a úkoly</strong> — metodiky projektového řízení, šablony</li>
  <li><strong>Dokumenty a znalostní báze</strong> — know-how, technická rozhodnutí (ADR), návody</li>
  <li><strong>Komunikace a spoluprace</strong> — delší protokoly ze schůzek</li>
  <li><strong>Marketing a zákaznická péče</strong> — marketingové materiály, SLA pravidla</li>
  <li><strong>Automatizace, AI a integrace</strong> — popis AI nástrojů, integrace</li>
  <li><strong>Řízení firmy a reporting</strong> — KPI definice, reportingové šablony</li>
</ul>

<hr/>

<h2>8. Bezpečnost a přístupy</h2>

<ul>
  <li>Public signup je <strong>vypnutý</strong> — nové lidi přidává admin přes invite (Settings → HR)</li>
  <li>Zálohy běží každý den 02:30</li>
  <li>Admin: stepan@praut.cz</li>
  <li>GitHub repo: PrautAutomation/huly-selfhost — technická dokumentace a skripty</li>
</ul>
`

async function createOrReplaceDoc (client, spaceId, spaceName, title, content, apply) {
  const existing = await client.findAll('document:class:Document', { space: spaceId })
  const found = existing.find(d => d.title === title)
  if (found) {
    if (apply) {
      await client.removeDoc(found._class, found.space, found._id)
      console.log(`  Smazán existující: "${title}"`)
    } else {
      console.log(`  DRY-RUN: "${title}" by byl přepsán`)
      return null
    }
  }
  if (!apply) {
    console.log(`  DRY-RUN: "${title}" by byl vytvořen v "${spaceName}"`)
    return null
  }
  const docId = await client.createDoc('document:class:Document', spaceId, {
    title,
    content,
    category: null,
    attachments: 0,
    comments: 0,
    labels: [],
    members: [],
    relations: []
  })
  console.log(`  Vytvořen: "${title}" (${docId})`)
  return docId
}

async function deleteStaleDocs (client, spaceId, apply) {
  const existing = await client.findAll('document:class:Document', { space: spaceId })
  for (const title of STALE_TITLES) {
    const found = existing.find(d => d.title === title)
    if (!found) continue
    if (apply) {
      await client.removeDoc(found._class, found.space, found._id)
      console.log(`  Smazán zastaralý: "${title}"`)
    } else {
      console.log(`  DRY-RUN: zastaralý "${title}" by byl smazán`)
    }
  }
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

  const spaces = await client.findAll('document:class:Teamspace', {})
  const zakladSpace = spaces.find(sp => sp.name && (sp.name.includes('Základ') || sp.name.toLowerCase().includes('zaklad')))

  if (!zakladSpace) {
    console.log('CHYBA: teamspace "Základ systemu" nenalezen')
    for (const sp of spaces) console.log(`  "${sp.name}"`)
    await connection.close()
    process.exit(1)
  }

  console.log(`Teamspace: "${zakladSpace.name}" (${zakladSpace._id})`)
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  console.log('Sloučené dokumenty:')
  await createOrReplaceDoc(client, zakladSpace._id, zakladSpace.name, HOME_TITLE, HOME_CONTENT, APPLY)
  await createOrReplaceDoc(client, zakladSpace._id, zakladSpace.name, PRIRUCKA_TITLE, PRIRUCKA_CONTENT, APPLY)

  console.log('\nZastaralé dokumenty (mažeme po sloučení 6 → 2):')
  await deleteStaleDocs(client, zakladSpace._id, APPLY)

  if (!APPLY) {
    console.log('\nDRY-RUN — nic nebylo změněno. Spusť s --apply.')
  } else {
    console.log('\nHotovo. V Základ systemu zůstaly jen 2 návodové dokumenty: HOME + Příručka.')
  }

  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
