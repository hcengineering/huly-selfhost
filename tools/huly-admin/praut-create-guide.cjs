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

<p>Otevři Cards (ikona 🗃️ vlevo nahoře) a projdi tyto pohledy v levém panelu:</p>

<table>
  <tr>
    <th>Pohled v Cards</th>
    <th>Co hledáš</th>
    <th>Co dělat</th>
  </tr>
  <tr>
    <td><strong>🤝 Aktivní příležitosti</strong></td>
    <td>Rozjednané obchody — kde to vázne?</td>
    <td>Posuň další krok, naplánuj schůzku</td>
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

<p>Chceš přehled klienta? Pohled <strong>🏢 Klienti</strong> → klikni na firmu → vidíš u ní navázané příležitosti, nabídky i zakázky pohromadě.</p>

<p>Vše prázdné → skvělý den, jdi na kafe ☕</p>

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

<p><strong>👉 Celý postup od zájemce k zakázce (4 kroky), schůzky, podklady, role i Tracker — najdeš v dokumentu 📖 Příručka PRAUT Huly. Je tam i příklad krok za krokem.</strong></p>
`

const PRIRUCKA_CONTENT = `
<h1>📖 Příručka PRAUT Huly</h1>

<p>Huly je náš interní operační systém pro firmu na <strong>software na míru</strong>. Vše o klientech, obchodu a zakázkách je tady, ne v emailu. Tato příručka je <strong>jediný detailní návod</strong>; rychlý rozcestník je dokument 🏠 PRAUT — Co dnes dělám.</p>

<hr/>

<h2>🎯 OBCHODNÍ WORKFLOW — 4 kroky od zájemce k hotové zakázce</h2>

<p>Když přijde nový zájemce, vždy jdeš těmito 4 kroky. Každý krok = jedna karta v Cards (ikona 🗃️ vlevo nahoře, tlačítko <strong>+</strong> a vyber typ):</p>

<table>
  <tr><th>Krok</th><th>Typ karty</th><th>Co sem patří</th></tr>
  <tr><td><strong>1. KLIENT</strong></td><td>Firma (+ Kontakt)</td><td>Kdo to je: název, IČO, web. Osoba = Kontakt (jméno, email, telefon).</td></tr>
  <tr><td><strong>2. PŘÍLEŽITOST</strong></td><td>Obchodní příležitost</td><td>Co chce, fáze vyjednávání, <strong>podklady (přílohy)</strong>, schůzky.</td></tr>
  <tr><td><strong>3. NABÍDKA</strong></td><td>Nabídka</td><td>„Kolik to bude stát" — rozsah, cena, verze. Štěpán schvaluje.</td></tr>
  <tr><td><strong>4. ZAKÁZKA + PROJEKT</strong></td><td>Zakázka, Projekt</td><td>Realizace softwaru. Projekt = práce týmu (vývoj, design).</td></tr>
</table>

<p>✨ <strong>Karty jsou propojené.</strong> U klienta (Firma) automaticky vidíš všechny jeho příležitosti, nabídky i zakázky pohromadě. Pohled <strong>🏢 Klienti</strong> → klikni na firmu → záložky s navázanými kartami.</p>

<hr/>

<h2>📖 PŘÍKLAD KROK ZA KROKEM (reálný případ)</h2>

<p><em>„V úterý přišel zaměstnanec jedné firmy, chce software na míru. Zítra máme schůzku o ceně a rozsahu."</em> Takhle to zapíšeš:</p>

<ol>
  <li><strong>Založ klienta:</strong> Cards → + → <strong>Firma</strong> → název firmy, IČO, web. Pak + → <strong>Kontakt</strong> → ten zaměstnanec (jméno, email, telefon), navázaný na firmu.</li>
  <li><strong>Založ příležitost:</strong> Cards → + → <strong>Obchodní příležitost</strong> → název (např. „Web na míru — Novák s.r.o."), fáze = <em>kvalifikace</em>, navaž na firmu. Sem nahraješ <strong>podklady jako přílohy</strong> (zadání, poznámky) — tlačítko přílohy na kartě.</li>
  <li><strong>Naplánuj zítřejší schůzku:</strong> v <strong>Kalendáři</strong> (ikona kalendáře vlevo) → nová událost → datum zítra, název „Schůzka Novák — cena a rozsah", pozvi účastníky. <em>Tady vidíš KDY schůzka je.</em></li>
  <li><strong>Po schůzce zapiš výsledek:</strong> Cards → + → <strong>Zápis ze schůzky</strong> → datum, rozhodnutí (co jste dohodli), akční položky (kdo co udělá), navaž na příležitost. <em>Tady je CO se domluvilo a podklady.</em></li>
  <li><strong>Pošli nabídku:</strong> Cards → + → <strong>Nabídka</strong> → rozsah, cena, navázaná na příležitost. Štěpán schválí (stav → ke schválení → odesláno).</li>
  <li><strong>Klient kývne → zakázka:</strong> Cards → + → <strong>Zakázka</strong> + <strong>Projekt</strong> → realizace, tým dostane úkoly v Trackeru.</li>
</ol>

<p>👉 Kdykoli pak otevřeš klienta nebo příležitost, máš <strong>totální přehled</strong>: kdy byla/bude schůzka, o čem byla, jaké jsou podklady, v jaké fázi obchod je.</p>

<hr/>

<h2>📅 SCHŮZKA: kalendář vs. zápis</h2>

<table>
  <tr><th></th><th>Kdy použít</th><th>Co obsahuje</th></tr>
  <tr><td><strong>Kalendář (událost)</strong></td><td>PŘED schůzkou — naplánovat</td><td>Kdy, kde, kdo přijde</td></tr>
  <tr><td><strong>Zápis ze schůzky (karta)</strong></td><td>PO schůzce — zaznamenat</td><td>Rozhodnutí, akční kroky, podklady</td></tr>
</table>

<p>Hotové zápisy: Cards → pohled <strong>📅 Záznamy ze schůzek</strong>.</p>

<hr/>

<h2>👥 ROLE — kdo za co odpovídá</h2>

<table>
  <tr><th>Role</th><th>Co dělá</th></tr>
  <tr><td><strong>Vlastník</strong></td><td>Odpovídá za výsledek. Hlídá, aby se práce dotáhla. Nemusí ji dělat sám.</td></tr>
  <tr><td><strong>Řešitel</strong></td><td>Dělá samotnou práci (vývojář, designer). Reportuje vlastníkovi.</td></tr>
  <tr><td><strong>Schvalovatel</strong></td><td>Potvrzuje (typicky Štěpán u nabídek, cen a zakázek). Bez jeho OK se neodesílá ven.</td></tr>
</table>

<hr/>

<h2>💻 TÝM A VÝVOJ — Tracker (+ GitHub)</h2>

<p>Práci vývojářů a designérů řídí <strong>Tracker</strong> (vlevo → Zakázky, projekty a úkoly → Tracker) — jako GitHub Issues:</p>
<ul>
  <li>Každý úkol má <strong>vlastníka</strong> a <strong>deadline</strong>. Šablony: Feature, Bug, Client request, Sales follow-up, Review/QA, Ops/Admin.</li>
  <li>Branch: <code>TSK-123-kratky-popis</code> · PR: <code>[TSK-123] Co jsem změnil</code></li>
  <li><strong>GitHub propojení</strong> (až bude zapnuté): úkol v Trackeru ↔ issue/PR na GitHubu — designer i vývojář vidí, co kdo dělá, bez přepínání nástrojů.</li>
</ul>

<hr/>

<h2>🗂️ CO PATŘÍ KAM</h2>

<table>
  <tr><th>Info</th><th>Správné místo</th></tr>
  <tr><td>Klient, příležitost, nabídka, zakázka</td><td>Cards (příslušný typ)</td></tr>
  <tr><td>Naplánovaná schůzka (kdy)</td><td>Kalendář</td></tr>
  <tr><td>Výsledek schůzky (co se dohodlo)</td><td>Cards → Zápis ze schůzky</td></tr>
  <tr><td>Podklady k obchodu</td><td>Přílohy na kartě Příležitost</td></tr>
  <tr><td>Vývojářský / designérský úkol</td><td>Tracker</td></tr>
  <tr><td>Firemní pravidlo, know-how</td><td>Documents → teamspace</td></tr>
  <tr><td>Rychlá koordinace</td><td>Chat</td></tr>
</table>

<hr/>

<h2>🔒 BEZPEČNOST</h2>

<ul>
  <li>Public signup je <strong>vypnutý</strong> — nové lidi přidává admin přes invite (Settings → HR)</li>
  <li>Zálohy běží každý den 02:30</li>
  <li>Admin: stepan@praut.cz · GitHub repo: PrautAutomation/huly-selfhost</li>
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
