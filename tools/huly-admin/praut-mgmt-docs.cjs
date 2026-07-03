// Vytvoří/obnoví 3 manažerské/provozní dokumenty (idempotentně, přepis dle názvu):
//   🏠 Přehled firmy (rozcestník)        → "Řízení a reporting"  [T07]
//   📈 Jak vedeme obchod                 → "Obchodní dokumenty"  [T08]
//   ✅ Onboarding nováčka — checklist    → "Řízení a reporting"  [T11]
// Vše do PRIVÁTNÍCH prostorů (jen vedení). Obsah se nahrává jako kolaborativní
// blob (praut-doc-content.cjs) — do pole `content` patří blob ref, NE HTML.
//
//   node praut-mgmt-docs.cjs           DRY-RUN
//   node praut-mgmt-docs.cjs --apply    vytvoří/obnoví
globalThis.window = globalThis
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const coreMod = require('@hcengineering/core'); const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const scp = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
function env (f) { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim() } return o }
function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('').trim() }

const DOCS = [
  { space: 'Řízení a reporting', title: '🏠 Přehled firmy', html: `
<h1>🏠 Přehled firmy</h1>
<p>Rozcestník pro vedení — odsud se doklikáš na vše podstatné. (Odkazy otevírej v Huly; některé moduly najdeš v levém panelu.)</p>
<h2>Obchod</h2>
<ul>
  <li><strong>Lead</strong> — CELÝ obchod na jednom místě (funnel „Potencionální zákazník"), fáze Zájemce → … → Vyhráno/Prohráno. Hodnoty a dohody přímo v leadu.</li>
  <li>Návod: <em>📈 Jak vedeme obchod</em> (v „Obchodní dokumenty").</li>
</ul>
<h2>Práce a projekty</h2>
<ul>
  <li><strong>Tracker → PULS</strong> — hlavní operativa (úkoly, vlastníci, termíny).</li>
  <li><strong>Tracker → další projekty</strong> — konkrétní zakázky.</li>
</ul>
<h2>Reporty</h2>
<ul>
  <li><strong>📊 Týdenní přehled</strong> (tento prostor) — generuje se automaticky každé pondělí: stav projektů, obchod, lidé, red flags.</li>
</ul>
<h2>Lidé</h2>
<ul>
  <li><strong>Contacts</strong> — firmy, kontakty i zaměstnanci (HR modul je vypnutý — nepoužíváme).</li>
  <li>Onboarding nováčka: <em>✅ Onboarding nováčka — checklist</em> (tento prostor).</li>
</ul>
<h2>Znalosti</h2>
<ul>
  <li><strong>Firemní dokumentace HULY</strong> — sdílené návody, pravidla, rychlý start.</li>
  <li>Návody per role (vývojář/obchodník/markeťák/vedoucí).</li>
</ul>
<h2>Zjednodušení systému (2026-07-08)</h2>
<p>Vypnuli jsme nepoužívané moduly (Karty, HR, Drive, Boards, procesy…) — <strong>obchod = Lead, práce = Tracker, znalosti = Dokumenty, komunikace = Chat</strong>. Data vypnutých modulů zůstávají v DB; moduly jde kdykoliv zapnout zpět (Nastavení → Konfigurovat). Automatické alerty a AI funkce přijdou po migraci na vlastní server.</p>
` },
  { space: 'Obchodní dokumenty', title: '📈 Jak vedeme obchod', html: `
<h1>📈 Jak vedeme obchod</h1>
<p>Závazný postup, aby obchodní pipeline žila a vedení vidělo reálný stav. Vše v privátních prostorech (vidí jen vedení/obchod).</p>
<h2>Jedno místo: Lead</h2>
<p><strong>Celý obchodní případ = jeden lead ve funnelu „Potencionální zákazník".</strong> Od prvního kontaktu po výhru/prohru. Žádné karty, žádné tabulky bokem — všechno (hodnota, nabídka, dohody, další krok) se píše přímo do leadu (popis + komentáře).</p>
<ul>
  <li><strong>Nový zájemce</strong> → obchodník založí lead hned, jak se ozve. Lead odkazuje na firmu v Contacts.</li>
  <li><strong>Nabídka</strong> → do leadu: klient, hodnota, termín, číslo nabídky (konvence <code>N-2026-001</code>); PDF nabídky jako příloha leadu.</li>
  <li><strong>Výhra</strong> → fáze Vyhráno + založit realizační úkoly v Trackeru. <strong>Prohra</strong> → fáze Prohráno + 1 věta proč.</li>
</ul>
<h2>Fáze leadu</h2>
<p>Zájemce → Kvalifikace → Vyjednávání → Příprava nabídky → Rozhodování → Uzavření → Vyhráno / Prohráno.</p>
<h2>Pravidla</h2>
<ul>
  <li>Každý lead <strong>aktualizuj aspoň 1× týdně</strong> (fáze + poznámka co se stalo). Leady bez aktivity vidí vedení v týdenním přehledu.</li>
  <li>Každý lead má <strong>vlastníka a další krok</strong> — lead bez dalšího kroku je mrtvý lead.</li>
  <li>Fakturace se zatím eviduje mimo Huly (účetnictví); po migraci na nový server zvážíme napojení.</li>
</ul>
` },
  { space: 'Řízení a reporting', title: '✅ Onboarding nováčka — checklist', html: `
<h1>✅ Onboarding nováčka — checklist</h1>
<p>Pro vedení. Odškrtej při přijetí nového člověka — nic se nezapomene.</p>
<h2>Kroky</h2>
<ul>
  <li>☐ <strong>Poslat pozvánku</strong>: Nastavení → Členové → Pozvat → „Získat odkaz na pozvánku" (role „Uživatel") → poslat nováčkovi.</li>
  <li>☐ <strong>Po přihlášení přiřadit roli</strong> (přidá do správných prostorů). Z <code>HulyPrautplatform/dev/import-tool</code>:<br>
    <code>NODE_PATH="$PWD/node_modules" node …/praut-onboard-user.cjs --email NOVACEK@… --role vyvojar --apply</code><br>
    (role: <em>vedeni / obchodnik / marketak / vyvojar / zamestnanec</em>; vývojář na projekt: <code>--projekt NÁZEV</code>).</li>
  <li>☐ <strong>Ověřit přístupy</strong> — vidí jen to, co má (viz <code>--list-roles</code>).</li>
  <li>☐ <strong>Poslat odkazy</strong>: Rychlý start + jeho role návod (👨‍💻/💼/📣/👔).</li>
  <li>☐ <strong>Přidat do kanálu</strong> #praut-denni-prehled (má autoJoin — mělo by se stát samo).</li>
  <li>☐ <strong>Přidat do týmu v role návodu</strong> — poslat mu odkaz na jeho tým (HR modul je vypnutý, tým = role + prostory).</li>
  <li>☐ <strong>První úkol v Trackeru</strong> — vlastník = nováček (ať si systém osahá).</li>
</ul>
<h2>Odchod zaměstnance</h2>
<p>Offboarding: <code>praut-offboard-user.cjs --deactivate EMAIL --apply</code> (okamžitá deaktivace + 2 měsíce grace). Postup viz SOP „Uživatelé a přístupy".</p>
` }
]

async function main () {
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const cfg = await (await fetch('https://huly.praut.cz/config.json')).json(); setMetadata(scp.metadata.Endpoint, cfg.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD); const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).filter((w) => w.url === 'praut'); const sel = await ac.selectWorkspace(ws[0].url)
  const conn = await createClient(sel.endpoint, sel.token, []); const c = new TxOperations(conn, socialId)
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)
  const teamspaces = await c.findAll('document:class:Teamspace', {})
  for (const d of DOCS) {
    const space = teamspaces.find((t) => clean(t.name) === d.space)
    if (!space) { console.log(`  ! prostor "${d.space}" nenalezen → přeskakuji "${d.title}"`); continue }
    const content = d.html.trim()
    const existing = (await c.findAll('document:class:Document', { space: space._id })).find((x) => clean(x.title) === clean(d.title))
    console.log(`  ${existing ? '↻' : '+'} "${d.title}" → ${d.space} (${content.length} znaků)${existing ? ' [přepíšu]' : ''}`)
    if (APPLY) {
      if (existing) await c.removeDoc(existing._class, existing.space, existing._id)
      await c.createDoc('document:class:Document', space._id, {
        title: d.title, content, parent: 'document:ids:NoParent',
        category: null, attachments: 0, comments: 0, labels: [], members: [], relations: [], rank: '0|hzzzzx:'
      })
    }
  }
  console.log(`\nRežim: ${APPLY ? 'APPLIED' : 'DRY-RUN → pro zápis přidej --apply'}`)
  await conn.close(); process.exit(0)
}
main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1) })
