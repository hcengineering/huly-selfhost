// Vytvoří/obnoví dva dokumenty v teamspacu "Základ systému":
//   1. "Cheat Sheet — Kde co v Huly" (krátká tabulka pro každodenní použití)
//   2. "Jak pracovat v Huly — průvodce pro tým PRAUT" (detailní průvodce)
// Idempotentní: smaže existující dokumenty se stejným názvem, pak vytvoří nové.
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

const HOME_TITLE = '🏠 PRAUT — Co dnes dělám'
const CHEAT_TITLE = 'PRAUT Huly — 4 věci které potřebuješ znát'
const GUIDE_TITLE = 'Jak pracovat v Huly — průvodce pro tým PRAUT'

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

<p><strong>Toto je tvůj průvodce. Když nevíš kam jít — začni tady.</strong></p>

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

<h2>📅 SCHŮZKA — přesně 4 kliky</h2>

<ol>
  <li>Klikni na ikonu <strong>🗃️ Cards</strong> — je vlevo nahoře, vypadá jako mřížka karet</li>
  <li>V levém panelu (seznam sekcí) klikni na <strong>Schůzky</strong> — je pod nadpisem SPACES</li>
  <li>Klikni na <strong>+</strong> — je vpravo nahoře, vedle nápisu "Schůzky"</li>
  <li>Vyplň: <strong>Název</strong> (např. "Schůzka s ekonomem 2026-06-20"), <strong>datum</strong>, <strong>rozhodnutí</strong>, <strong>akční položky</strong></li>
</ol>

<p>Hotovo. Schůzka je uložená. Najdeš ji pak v Cards → Schůzky nebo v pohledu "📅 Záznamy ze schůzek".</p>

<p><em>Vzor jak má zápis ze schůzky vypadat: Cards → Schůzky → karta "DEMO - Schůzka: Konzultace s ekonomem"</em></p>

<hr/>

<h2>⏰ ŘEDITEL — ranní kontrola (5 minut)</h2>

<p>Otevři Cards (ikona 🗃️ vlevo nahoře) a projdi tyto 3 pohledy v levém panelu:</p>

<table>
  <tr>
    <th>Pohled v Cards</th>
    <th>Co hledáš</th>
    <th>Co dělat</th>
  </tr>
  <tr>
    <td><strong>⭐ Ke schválení</strong></td>
    <td>Nabídky čekající na tvůj podpis</td>
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

<h2>🆕 NOVÁ PRÁCE — co kam jde</h2>

<table>
  <tr>
    <th>Chci vytvořit…</th>
    <th>Kde v Huly</th>
  </tr>
  <tr>
    <td>Zápis ze schůzky</td>
    <td>Cards (🗃️) → Schůzky (v levém panelu) → <strong>+</strong></td>
  </tr>
  <tr>
    <td>Nového klienta (firmu)</td>
    <td>Cards (🗃️) → <strong>+</strong> tlačítko nahoře → vyber typ <strong>Firma</strong></td>
  </tr>
  <tr>
    <td>Novou nabídku</td>
    <td>Cards (🗃️) → <strong>+</strong> → vyber typ <strong>Nabidka</strong></td>
  </tr>
  <tr>
    <td>Novou zakázku</td>
    <td>Cards (🗃️) → <strong>+</strong> → vyber typ <strong>Zakazka</strong></td>
  </tr>
  <tr>
    <td>Fakturu</td>
    <td>Cards (🗃️) → <strong>+</strong> → vyber typ <strong>Faktura</strong></td>
  </tr>
  <tr>
    <td>Vývojářský úkol</td>
    <td>Tracker (◻️) → <strong>+</strong> — ale to dělají vývojáři, ne Štěpán</td>
  </tr>
  <tr>
    <td>Firemní dokument/pravidlo</td>
    <td>Documents (📄) → Základ systemu → <strong>New Document</strong></td>
  </tr>
</table>

<hr/>

<h2>🆘 ZACHRAŇOVACÍ KROKY — když si nevíš rady</h2>

<table>
  <tr>
    <th>Problém</th>
    <th>Řešení</th>
  </tr>
  <tr>
    <td>Nevím kde jsem</td>
    <td>Klikni na ikonu 📄 Documents vlevo nahoře → Základ systemu → otevři tento dokument</td>
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
    <td>Potřebuji rychlý přehled</td>
    <td>Dokument "PRAUT Huly — 4 věci které potřebuješ znát" (tady v Základ systemu)</td>
  </tr>
  <tr>
    <td>Huly nefunguje / nejde otevřít</td>
    <td>Kontaktuj EmperorKunDis (GitHub) nebo tech tým — viz docs/RUNBOOK-SERVER-DOWN.md v repozitáři</td>
  </tr>
</table>

<hr/>

<h2>📚 Další dokumenty v Základ systemu</h2>

<ul>
  <li><strong>Rychlý start — co dělat v první den</strong> — pro nové členy týmu</li>
  <li><strong>Jak zapsat schůzku — krok za krokem</strong> — detailní postup pro schůzky</li>
  <li><strong>Role v PRAUT — kdo za co odpovídá</strong> — vlastník, schvalovatel, řešitel</li>
  <li><strong>PRAUT Huly — 4 věci které potřebuješ znát</strong> — ultra-krátký cheat sheet</li>
  <li><strong>Jak pracovat v Huly — průvodce pro tým PRAUT</strong> — kompletní průvodce</li>
</ul>
`

const CHEAT_CONTENT = `
<h1>PRAUT Huly — 4 věci které potřebuješ znát</h1>

<p>Tohle je vše co potřebuješ. Nic víc.</p>

<table>
  <tr><th>Chci…</th><th>Kam jít</th><th>Jak</th></tr>
  <tr>
    <td><strong>1. SCHŮZKA</strong><br/>Zapsat novou schůzku nebo najít staré</td>
    <td><strong>Cards → Schůzky</strong> (vlevo v panelu)</td>
    <td>Klikni na "Schůzky" → "+" vpravo nahoře → vyplň název (např. "Konzultace s ekonomem 2026-07-10"), datum, co bylo rozhodnuto, co kdo udělá</td>
  </tr>
  <tr>
    <td><strong>2. ÚKOL</strong><br/>Přidat nebo najít úkol pro tým</td>
    <td><strong>Tracker</strong> (levý panel → Zakázky, projekty a úkoly → Tracker)</td>
    <td>Klikni "+" → vyplň název, přiřaď vlastníka, nastav deadline</td>
  </tr>
  <tr>
    <td><strong>3. KLIENT nebo ZAKÁZKA</strong><br/>Přidat nového klienta nebo zakázku, nebo najít existující</td>
    <td><strong>Cards → "+"</strong> nebo pohled <strong>"Aktivní zakázky"</strong></td>
    <td>Klikni "+" → vyber typ (Firma = klient, Zakazka = aktivní práce pro klienta) → vyplň</td>
  </tr>
  <tr>
    <td><strong>4. DOKUMENT / PRAVIDLO</strong><br/>Napsat nebo najít firemní pravidlo, proces, know-how</td>
    <td><strong>Levý panel → Základ systemu</strong> (nebo jiný teamspace)</td>
    <td>Klikni na teamspace → "New Document" → napiš název a obsah</td>
  </tr>
</table>

<h2>Kde jsou schůzky?</h2>

<p>V levém panelu Cards vidíš sekci <strong>"Schůzky"</strong> — to je místo kde jsou všechny záznamy ze schůzek. Stačí tam kliknout a vidíš je. "+" přidá novou.</p>

<p>Pro přehled přes celý systém: pohled <strong>"Záznamy ze schůzek"</strong> (vlevo v Cards nad sekcemi).</p>

<h2>Co ostatní věci v Cards?</h2>

<p>Zbytek — nabídky, faktury, projekty, incidenty — je v sekci <strong>Default</strong> (v Cards vlevo). Pohled <strong>"Ke schválení"</strong> ukazuje co čeká na tvé rozhodnutí. <strong>"V riziku"</strong> ukazuje zakázky s problémem.</p>
`

const GUIDE_CONTENT = `
<h1>Jak pracovat v Huly — průvodce pro tým PRAUT</h1>

<p>Huly je náš interní operační systém. Vše důležité — zákazníci, zakázky, schůzky, úkoly, dokumenty — je tady, ne v emailu nebo chatu. Tento průvodce ti ukáže jak v tom pracovat.</p>

<p><strong>Rychlý přehled je v dokumentu "Cheat Sheet — Kde co v Huly" (tady v Základ systemu).</strong></p>

<h2>1. Jak zapsat schůzku</h2>

<p>Schůzky jsou <strong>Cards → Zapis ze schuzky</strong>. Postup krok za krokem:</p>

<ol>
  <li>Klikni na ikonu karet (Cards) v horní navigaci</li>
  <li>Klikni na <strong>"+"</strong> (nová karta) vpravo nahoře</li>
  <li>Vyber typ: <strong>Zapis ze schuzky</strong> (seznam typů je abecedně, dole)</li>
  <li>Do názvu napiš: "Schůzka: [kdo/co] (datum)" — např. "Schůzka: Konzultace s ekonomem (2026-07-10)"</li>
  <li>Vyplň atributy:
    <ul>
      <li><strong>datum</strong> — datum schůzky (formát YYYY-MM-DD)</li>
      <li><strong>projekt/klient</strong> — s kým nebo o čem (např. "AI spol. s r.o." nebo "Interní")</li>
      <li><strong>rozhodnutí</strong> — co bylo rozhodnuto (konkrétně, ne "probrali jsme")</li>
      <li><strong>akční položky</strong> — kdo co udělá do kdy (číslovaný seznam)</li>
    </ul>
  </li>
  <li>Nastav <strong>citlivost</strong>: verejne / interni / citlive</li>
  <li>Nastav <strong>stav</strong>: draft → ke kontrole → potvrzeno / akcni kroky otevrene → uzavreno</li>
</ol>

<p>Hotové záznamy najdeš: Cards → pohled <strong>"Záznamy ze schůzek"</strong> vlevo nahoře.</p>

<p>Podívej se na DEMO záznamy (prefix "DEMO - Schůzka:") jako vzorový příklad se všemi vyplněnými poli.</p>

<h2>2. Denní rituál (5 minut každé ráno)</h2>

<ol>
  <li><strong>Cards → "Ke schválení"</strong> — co čeká na tvé rozhodnutí (nabídky)</li>
  <li><strong>Cards → "V riziku"</strong> — zakázky s problémem (cerveny/v riziku health)</li>
  <li><strong>Cards → "Po splatnosti"</strong> — faktury po splatnosti (zavolej klientovi)</li>
  <li><strong>Tracker → přiřazeno mně</strong> — moje úkoly na dnešek</li>
</ol>

<h2>3. Obchodní workflow (kde co vzniká)</h2>

<p>Celý obchodní cyklus v PRAUT vypadá takto:</p>

<ol>
  <li>Přijde poptávka → vytvoříš <strong>Lead/Poptávka</strong> (Cards → +)</li>
  <li>Lead se kvalifikuje → vytvoříš <strong>Obchodní příležitost</strong></li>
  <li>Píšeme nabídku → vytvoříš <strong>Nabídka</strong> (stav: draft → ke schválení)</li>
  <li>Štěpán schválí → stav nabídky: ke schvaleni → odeslano</li>
  <li>Klient kývne → vytvoříš <strong>Zakázka</strong> (stav: aktivni, propoj s nabídkou)</li>
  <li>Fakturujeme → vytvoříš <strong>Faktura</strong> (stav: vystavena, propoj se zakázkou)</li>
  <li>Realizujeme → vytvoříš <strong>Projekt</strong> (propoj se zakázkou)</li>
  <li>Každá důležitá schůzka → <strong>Zapis ze schuzky</strong> (propoj s klientem v poli projekt/klient)</li>
</ol>

<p>Viz DEMO karty (prefix "DEMO -") — ukazují jak vypadá každý krok se skutečnými daty.</p>

<h2>4. Uložené pohledy v Cards</h2>

<p>Vlevo nahoře v Cards najdeš uložené pohledy — jsou to předdefinované filtry pro nejčastější situace:</p>

<ul>
  <li><strong>Aktivní</strong> — vše co právě běží (nabídky, zakázky, projekty, leady)</li>
  <li><strong>Ke schválení</strong> — nabídky čekající na schválení (stav: ke schvaleni)</li>
  <li><strong>V riziku</strong> — zakázky s červeným nebo rizikovým health</li>
  <li><strong>Nezaplacené</strong> — faktury, za které jsme nedostali peníze</li>
  <li><strong>Po splatnosti</strong> — faktury po termínu splatnosti</li>
  <li><strong>Záznamy ze schůzek</strong> — všechny záznamy ze schůzek (ne uzavřené)</li>
  <li><strong>Otevřené</strong> — incidenty, zákaznické požadavky, rizika bez uzavření</li>
</ul>

<h2>5. Tracker — pro vývojářský tým</h2>

<p>Tracker je pro interní denní úkoly — jako GitHub Issues. Najdeš ho vlevo v panelu → Zakázky, projekty a úkoly → Tracker.</p>

<ul>
  <li>Každý issue má <strong>vlastníka</strong> (kdo dělá) a <strong>deadline</strong> (nebo jasný důvod proč ne)</li>
  <li>Branch name: <code>TSK-123-kratky-popis</code></li>
  <li>PR title: <code>[TSK-123] Co jsem změnil</code></li>
  <li>Po mergi: aktualizuj stav issue v Trackeru</li>
</ul>

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

<h2>7. Teamspaces — co v nich najdeš</h2>

<p>Teamspaces jsou sekce v levém panelu pro dokumenty. Každý teamspace má jiné zaměření:</p>

<ul>
  <li><strong>Základ systemu</strong> — tento průvodce, Cheat Sheet, firemní procesy</li>
  <li><strong>Obchod a CRM</strong> — email šablony, návody pro obchodní tým</li>
  <li><strong>Zakázky, projekty a úkoly</strong> — metodiky projektového řízení, šablony</li>
  <li><strong>Dokumenty a znalostní báze</strong> — know-how, technické rozhodnutí (ADR), návody</li>
  <li><strong>Komunikace a spoluprace</strong> — delší protokoly ze schůzek (karty Zapis ze schuzky jsou v Cards)</li>
  <li><strong>Marketing a zákaznická péče</strong> — marketingové materiály, SLA pravidla</li>
  <li><strong>Automatizace, AI a integrace</strong> — popis AI nástrojů, integrace</li>
  <li><strong>Řízení firmy a reporting</strong> — KPI definice, reportingové šablony</li>
</ul>

<h2>8. Bezpečnost a přístupy</h2>

<ul>
  <li>Public signup je <strong>vypnutý</strong> — nové lidi přidává admin přes invite (Settings → HR)</li>
  <li>Zálohy běží každý den 02:30</li>
  <li>Admin: stepan@praut.cz (svanda@praut.cz)</li>
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
    console.log('CHYBA: teamspace "Základ systému" nenalezen')
    for (const sp of spaces) console.log(`  "${sp.name}"`)
    await connection.close()
    process.exit(1)
  }

  console.log(`Teamspace: "${zakladSpace.name}" (${zakladSpace._id})`)
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  await createOrReplaceDoc(client, zakladSpace._id, zakladSpace.name, HOME_TITLE, HOME_CONTENT, APPLY)
  await createOrReplaceDoc(client, zakladSpace._id, zakladSpace.name, CHEAT_TITLE, CHEAT_CONTENT, APPLY)
  await createOrReplaceDoc(client, zakladSpace._id, zakladSpace.name, GUIDE_TITLE, GUIDE_CONTENT, APPLY)

  if (!APPLY) {
    console.log('\nDRY-RUN — nic nebylo vytvořeno. Spusť s --apply.')
  } else {
    console.log('\nHotovo. Najdeš dokumenty v Huly → levý panel → Základ systému.')
  }

  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
