// Importuje 3 vybrané zaměstnanecké návody z praut_erp_docs/zamestnanecke_navody/ do Základ systemu.
// Idempotentní: smaže existující, pak vytvoří nové.
//   node praut-import-guides.cjs           DRY-RUN
//   node praut-import-guides.cjs --apply   vytvoří/obnoví
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
const scp = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// 3 návody které importujeme do Základ systemu
const GUIDES = [
  {
    title: 'Rychlý start — co dělat v první den',
    content: `
<h1>Rychlý start — co dělat v první den</h1>

<h2>Kdy tento postup použít</h2>
<p>Použij ho první den v Praut Huly nebo kdykoliv, když nevíš, kam v systému zapsat informaci.</p>

<h2>Co má být výsledkem</h2>
<p>Po přečtení víš, kde hledat práci, kam zapisovat nové informace a kdy vytvořit kartu, dokument nebo úkol.</p>

<h2>Postup krok za krokem</h2>
<ol>
  <li>Otevři hlavní prostory Praut podle oblasti, ve které pracuješ.</li>
  <li>Zkontroluj svůj inbox a přiřazené úkoly.</li>
  <li>Otevři hlavní Tracker projekt a zkontroluj svoje issue ve stavech <strong>Todo</strong>, <strong>In Progress</strong>, <strong>Review</strong> a <strong>Blocked</strong>.</li>
  <li>Podívej se na karty, které vlastníš nebo kde jsi uvedený jako PM, schvalovatel nebo kontrolor.</li>
  <li>Pokud řešíš klienta, najdi nejdřív jeho firmu v Contacts a související Zakázku nebo Projekt.</li>
  <li>Pokud vznikne práce pro konkrétní osobu, založ Tracker issue.</li>
  <li>Pokud vznikne rozhodnutí, zapiš ho do dokumentu, karty nebo zápisu ze schůzky.</li>
</ol>

<h2>Co vyplnit u nové práce</h2>
<p>U každé nové práce v Trackeru vyplň minimálně: název, vlastníka, prioritu, stav, termín (nebo důvod bez termínu), související firmu/projekt a krátký popis očekávaného výsledku.</p>

<h2>Kdo je vlastník a kdo schvaluje</h2>
<table>
  <tr><th>Role</th><th>Co dělá</th></tr>
  <tr><td><strong>Vlastník</strong></td><td>Odpovídá za další krok — jeden člověk, vždy</td></tr>
  <tr><td><strong>Schvalovatel</strong></td><td>Potvrzuje: cenu, nabídku, externí komunikaci, změnu oprávnění, AI výstup</td></tr>
  <tr><td><strong>Řešitel</strong></td><td>Fyzicky dělá úkol (může být jiný než vlastník)</td></tr>
</table>

<h2>Co nedělat</h2>
<ul>
  <li>Nenechávej domluvy jen v chatu — zapiš do karty nebo dokumentu</li>
  <li>Nevytvářej duplicitní firmu, zakázku nebo projekt bez kontroly</li>
  <li>Neposílej klientovi cenu nebo termín bez schválení</li>
  <li>Neuzavírej issue, pokud chybí výsledek nebo odkaz na výstup</li>
</ul>

<h2>Příklad</h2>
<p>Klient napíše nový požadavek → najdi firmu v Cards → založ Tracker issue s prioritou a vlastníkem → propoj s Projektem → založ Zákaznický požadavek pro evidenci.</p>

<h2>Kontrola před uzavřením</h2>
<p>Věc má vlastníka, stav, výsledek, vazbu na klienta/projekt a případné rozhodnutí je dohledatelné.</p>
`
  },
  {
    title: 'Jak zapsat schůzku — krok za krokem',
    content: `
<h1>Jak zapsat schůzku — krok za krokem</h1>

<h2>Kde jsou schůzky v Huly</h2>
<p><strong>Cards</strong> (ikona 🗃️ vlevo nahoře) → v levém panelu sekce <strong>Schůzky</strong> → klikni <strong>+</strong> vpravo nahoře.</p>
<p>Typ karty: <strong>Zapis ze schuzky</strong> (typ se vybere automaticky v sekci Schůzky).</p>

<h2>Postup krok za krokem</h2>
<ol>
  <li>Před schůzkou připrav agendu nebo odkaz na související projekt.</li>
  <li>Po schůzce otevři Cards → Schůzky → <strong>+</strong></li>
  <li>Napiš název: <strong>"Schůzka: [kdo/co] (datum)"</strong> — např. "Schůzka: Konzultace s ekonomem (2026-06-20)"</li>
  <li>Zapiš <strong>účastníky</strong>, <strong>datum</strong>, <strong>kontext</strong> (o čem to bylo)</li>
  <li>Zapiš <strong>rozhodnutí</strong> — co bylo rozhodnuto (konkrétně, ne jen "probrali jsme")</li>
  <li>Zapiš <strong>akční položky</strong> — kdo co udělá do kdy (číslovaný seznam)</li>
  <li>Nastav <strong>citlivost</strong>: verejne / interni / citlive</li>
  <li>Nastav <strong>stav</strong>: draft → ke kontrole → potvrzeno</li>
  <li>Důležitá rozhodnutí propoj s klientem, zakázkou nebo change requestem</li>
</ol>

<h2>Co vyplnit v kartě</h2>
<table>
  <tr><th>Pole</th><th>Co napsat</th></tr>
  <tr><td><strong>datum</strong></td><td>Datum schůzky (formát YYYY-MM-DD)</td></tr>
  <tr><td><strong>projekt/klient</strong></td><td>S kým nebo o čem (např. "AI spol. s r.o." nebo "Interní")</td></tr>
  <tr><td><strong>rozhodnutí</strong></td><td>Co bylo rozhodnuto — konkrétně</td></tr>
  <tr><td><strong>akční položky</strong></td><td>1. Štěpán zajistí smlouvu do 2026-06-25<br/>2. Marek připraví odhad do 2026-06-22</td></tr>
  <tr><td><strong>citlivost</strong></td><td>interni (výchozí), citlive (jen pro vedení), verejne</td></tr>
  <tr><td><strong>stav</strong></td><td>draft → ke kontrole → potvrzeno → uzavreno</td></tr>
</table>

<h2>Kde najdu staré schůzky</h2>
<ul>
  <li><strong>Cards → Schůzky</strong> (levý panel) — všechny schůzky v prostoru</li>
  <li><strong>Cards → pohled "📅 Záznamy ze schůzek"</strong> — cross-space filtrovaný pohled</li>
</ul>

<h2>Kdo je vlastník a kdo schvaluje</h2>
<p>Vlastníkem zápisu je organizátor schůzky nebo určený zapisovatel. Každá akční položka má vlastního řešitele. Změna rozsahu, ceny nebo termínu vyžaduje schválení.</p>

<h2>Co nedělat</h2>
<ul>
  <li>Nenechávej rozhodnutí jen v chatu nebo videohovoru</li>
  <li>Nezapisuj akční položku bez vlastníka a termínu</li>
  <li>Neměň závazek vůči klientovi bez schválení</li>
  <li>Tracker NENÍ pro záznamy ze schůzek — je pro vývojářské úkoly</li>
</ul>

<h2>Vzorový záznam</h2>
<p>Podívej se na kartu <strong>"DEMO - Schůzka: Konzultace s ekonomem"</strong> v Cards → Schůzky — ukazuje jak má zápis vypadat se všemi vyplněnými poli.</p>

<h2>Kontrola před uzavřením</h2>
<p>Zápis je hotový, když má: rozhodnutí, akční položky s vlastníky a termíny, vazby na související karty.</p>
`
  },
  {
    title: 'Role v PRAUT — kdo za co odpovídá',
    content: `
<h1>Role v PRAUT — kdo za co odpovídá</h1>

<h2>Základní pravidlo</h2>
<p>Každá karta, úkol nebo projekt musí mít <strong>jednoho vlastníka</strong>. Bez vlastníka se věci ztrácí.</p>

<h2>Tři klíčové role</h2>
<table>
  <tr><th>Role</th><th>Co dělá</th><th>Kdo to typicky je</th></tr>
  <tr>
    <td><strong>Vlastník</strong></td>
    <td>Odpovídá za celý proces nebo výstup. Ví, že věc existuje a sleduje ji.</td>
    <td>PM, obchodník, nebo vedení</td>
  </tr>
  <tr>
    <td><strong>Řešitel</strong></td>
    <td>Fyzicky dělá konkrétní úkol. Může se měnit v průběhu.</td>
    <td>Vývojář, analytik, kdo dostane úkol</td>
  </tr>
  <tr>
    <td><strong>Schvalovatel</strong></td>
    <td>Musí potvrdit rizikové kroky. Bez jeho souhlasu nelze pokračovat.</td>
    <td>Vedení nebo pověřený člověk</td>
  </tr>
</table>

<h2>Kdo schvaluje co</h2>
<table>
  <tr><th>Situace</th><th>Schvalovatel</th></tr>
  <tr><td>Cena v nabídce</td><td>Vedení (Štěpán nebo pověřený)</td></tr>
  <tr><td>Závazek vůči klientovi</td><td>Vedení</td></tr>
  <tr><td>Změna rozsahu zakázky</td><td>PM + vedení</td></tr>
  <tr><td>Sdílení citlivých dat s klientem</td><td>Vlastník procesu</td></tr>
  <tr><td>Incident s dopadem na klienta</td><td>Vedení</td></tr>
  <tr><td>AI výstup použitý pro důležité rozhodnutí</td><td>Odpovědný člověk, vždy</td></tr>
  <tr><td>Změna oprávnění v systému</td><td>Admin (EmperorKunDis)</td></tr>
</table>

<h2>Odpovědnosti podle oblasti</h2>
<table>
  <tr><th>Oblast</th><th>Vlastník</th></tr>
  <tr><td>Obchodní případ (lead, nabídka)</td><td>Obchodník</td></tr>
  <tr><td>Projekt a delivery</td><td>PM</td></tr>
  <tr><td>Zákaznický požadavek</td><td>Podpora / přiřazený řešitel</td></tr>
  <tr><td>Oprávnění a technické nastavení</td><td>Admin</td></tr>
  <tr><td>Cena, závazek, riziko, klient</td><td>Vedení (Štěpán)</td></tr>
</table>

<h2>Postup při předání práce</h2>
<ol>
  <li>Urči vlastníka procesu nebo karty</li>
  <li>Urči řešitele konkrétního úkolu</li>
  <li>Pokud jde o rizikový krok, doplň schvalovatele</li>
  <li>Pokud se práce předává, vytvoř kartu Předání nebo úkol s popisem</li>
  <li>Udržuj odpovědnosti aktuální při změně stavu</li>
</ol>

<h2>Co nedělat</h2>
<ul>
  <li>Nenechávej kartu bez vlastníka</li>
  <li>Nepředávej práci jen slovně nebo v chatu</li>
  <li>Nepředpokládej, že souhlas v chatu stačí pro rizikové rozhodnutí</li>
</ul>

<h2>Příklad</h2>
<p>Obchod vyhraje nabídku → Obchodník zůstává vlastníkem obchodní historie → PM přebírá realizaci → vzniká karta Předání s otevřenými otázkami, rozsahem, termíny a potvrzením převzetí.</p>

<h2>Kontrola</h2>
<p>Každá otevřená položka musí mít člověka, který ví, že ji vlastní.</p>
`
  }
]

async function createOrReplaceDoc (client, spaceId, spaceName, title, content, apply) {
  const existing = await client.findAll('document:class:Document', { space: spaceId })
  const found = existing.find(d => d.title === title)
  if (found) {
    if (apply) {
      await client.removeDoc(found._class, found.space, found._id)
      console.log(`  Přepsán: "${title}"`)
    } else {
      console.log(`  DRY-RUN: "${title}" by byl přepsán v "${spaceName}"`)
      return null
    }
  } else {
    if (!apply) {
      console.log(`  DRY-RUN: "${title}" by byl vytvořen v "${spaceName}"`)
      return null
    }
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
  setMetadata(scp.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).find(w => w.url === 'praut')
  const sel = await ac.selectWorkspace(ws.url)
  const conn = await createClient(sel.endpoint, sel.token, [])
  const client = new TxOperations(conn, socialId)

  const spaces = await client.findAll('document:class:Teamspace', {})
  const zakladSpace = spaces.find(sp => sp.name && (sp.name.includes('Základ') || sp.name.toLowerCase().includes('zaklad')))

  if (!zakladSpace) {
    console.log('CHYBA: teamspace "Základ systemu" nenalezen')
    for (const sp of spaces) console.log(`  "${sp.name}"`)
    await conn.close()
    process.exit(1)
  }

  console.log(`Teamspace: "${zakladSpace.name}" (${zakladSpace._id})`)
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)
  console.log(`Importuji ${GUIDES.length} návodů:`)

  for (const guide of GUIDES) {
    await createOrReplaceDoc(client, zakladSpace._id, zakladSpace.name, guide.title, guide.content, APPLY)
  }

  if (!APPLY) {
    console.log('\nDRY-RUN — nic nebylo vytvořeno. Spusť s --apply.')
  } else {
    console.log('\nHotovo. Najdeš dokumenty v Huly → levý panel → Základ systemu.')
  }

  await conn.close()
  process.exit(0)
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1) })
