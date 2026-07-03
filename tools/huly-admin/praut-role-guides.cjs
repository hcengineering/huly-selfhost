// Vytvoří/obnoví 4 návody "můj den v Huly" podle role, každý do správného (privátního) prostoru:
//   👨‍💻 Vývojář & brigádník  → "Firemní dokumentace HULY" (sdílené, vidí všichni)
//   💼 Obchodník            → "Obchodní dokumenty" (privátní, vedení/obchod)
//   📣 Markeťák             → "Marketing" (privátní)
//   👔 Vedoucí              → "Řízení a reporting" (privátní)
// Idempotentní: dokument se stejným názvem se přepíše. Obsah se nahrává jako
// kolaborativní blob (praut-doc-content.cjs) — do `content` patří blob ref, NE HTML.
//
//   node praut-role-guides.cjs           DRY-RUN
//   node praut-role-guides.cjs --apply    vytvoří/obnoví
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

// Každý návod: cílový teamspace + název + HTML. Struktura: ráno / kam píšu co / povinnosti / co nesmím / pomoc.
const GUIDES = [
  { space: 'Firemní dokumentace HULY', title: '👨‍💻 Vývojář & brigádník v Huly', html: `
<h1>👨‍💻 Vývojář & brigádník v Huly</h1>
<p>Krátký návod, jak vypadá tvůj den v Huly. Přečti jednou, vrať se, když si nebudeš jistý.</p>
<h2>Co otevřu ráno</h2>
<ul>
  <li><strong>Inbox</strong> (zvoneček nahoře) — co mi přišlo, kdo mě zmínil.</li>
  <li><strong>Tracker → projekt PULS → Moje</strong> — co mám rozdělané a do kdy.</li>
</ul>
<h2>Kam píšu co</h2>
<ul>
  <li><strong>Každá práce = úkol v Trackeru</strong> (projekt PULS nebo konkrétní projekt). Ne v chatu, ne v hlavě.</li>
  <li><strong>Kód</strong> řešíš přes GitHub (PR). Do úkolu dej odkaz na PR.</li>
  <li><strong>Otázka na tým</strong> → kanál <strong>#praut-denni-prehled</strong> nebo přímá zpráva.</li>
</ul>
<h2>Moje povinnosti</h2>
<ul>
  <li>Úkol, na kterém dělám, má <strong>mě jako vlastníka</strong> a je ve stavu <em>In Progress</em>.</li>
  <li>Když je hotovo, posunu úkol na <em>Done</em>. Když se zaseknu, napíšu to (blocker).</li>
  <li>Ráno do <strong>#praut-denni-prehled</strong> 1 věta: co dnes dělám / co mě blokuje.</li>
</ul>
<h2>Co nesmím</h2>
<ul>
  <li>Sahat na produkci klientů bez souhlasu vedoucího.</li>
  <li>Zakládat práci mimo Tracker (ať se neztratí).</li>
</ul>
<h2>Potřebuju pomoc</h2>
<p>Napiš vedoucímu vývoje nebo do <strong>#praut-denni-prehled</strong>.</p>
` },
  { space: 'Obchodní dokumenty', title: '💼 Obchodník v Huly', html: `
<h1>💼 Obchodník v Huly</h1>
<p>Jak vést obchod v Huly, aby vedení vidělo reálný stav pipeline.</p>
<h2>Co otevřu ráno</h2>
<ul>
  <li><strong>Lead</strong> (funnel „Potencionální zákazník") — moje příležitosti podle fáze.</li>
  <li><strong>Inbox</strong> — reakce, zmínky, alerty (lead bez aktivity).</li>
</ul>
<h2>Kam píšu co</h2>
<ul>
  <li><strong>Nový zájemce</strong> → nový <strong>lead</strong> ve funnelu, fáze <em>Zájemce/Kvalifikace</em>.</li>
  <li><strong>Nabídka, hodnota, termín, dohody</strong> → přímo do leadu (popis + komentáře). <strong>Celý obchodní případ žije v jednom leadu</strong> — žádná jiná evidence.</li>
  <li><strong>Firmy a kontakty</strong> → <strong>Contacts</strong> (lead na firmu odkazuje).</li>
</ul>
<h2>Moje povinnosti</h2>
<ul>
  <li>Každý lead posouvám fázemi: <em>Zájemce → Kvalifikace → Vyjednávání → Příprava nabídky → Rozhodování → Uzavření → Vyhráno/Prohráno</em>.</li>
  <li><strong>Aktualizuji aspoň 1× týdně</strong> (fáze + poznámka co se stalo).</li>
  <li>U nabídky do leadu vyplním: klient, hodnota, termín, další krok.</li>
</ul>
<h2>Co nesmím</h2>
<ul>
  <li>Vést obchodní případy mimo Lead (tabulky, e-mail, hlava) — vedení pak nevidí stav.</li>
  <li>Slibovat klientovi bez schválení vedení.</li>
</ul>
<h2>Potřebuju pomoc</h2>
<p>Napiš vedení do kanálu <strong>#vedení</strong> nebo přímo.</p>
` },
  { space: 'Marketing', title: '📣 Markeťák v Huly', html: `
<h1>📣 Markeťák v Huly</h1>
<p>Jak vést marketingovou práci v Huly.</p>
<h2>Co otevřu ráno</h2>
<ul>
  <li><strong>Inbox</strong> — zadání a zmínky.</li>
  <li><strong>Tracker</strong> (marketingové úkoly) → Moje.</li>
  <li>Teamspace <strong>Marketing</strong> — plány, materiály, kalendář obsahu.</li>
</ul>
<h2>Kam píšu co</h2>
<ul>
  <li><strong>Kampaně a úkoly</strong> → Tracker (úkol s termínem a vlastníkem).</li>
  <li><strong>Materiály, strategie, brand</strong> → dokumenty v teamspace <strong>Marketing</strong>.</li>
  <li><strong>Podklady od obchodu</strong> → koordinace přes Contacts / chat.</li>
</ul>
<h2>Moje povinnosti</h2>
<ul>
  <li>Každý výstup má úkol v Trackeru s termínem.</li>
  <li>Hotové materiály ukládám do teamspace Marketing, ať je tým najde.</li>
</ul>
<h2>Co nesmím</h2>
<ul>
  <li>Publikovat navenek bez schválení (dle interních pravidel).</li>
</ul>
<h2>Potřebuju pomoc</h2>
<p>Napiš vedení nebo do <strong>#praut-denni-prehled</strong>.</p>
` },
  { space: 'Řízení a reporting', title: '👔 Vedoucí v Huly', html: `
<h1>👔 Vedoucí v Huly</h1>
<p>Jak řídit svůj tým a mít přehled.</p>
<h2>Co otevřu ráno</h2>
<ul>
  <li><strong>Týdenní přehled</strong> (v tomto prostoru) — stav projektů, obchodu, red flags.</li>
  <li><strong>Tracker</strong> — úkoly mého týmu: co je rozpracované, co bez vlastníka, co po termínu.</li>
  <li><strong>#praut-denni-prehled</strong> — denní check-in týmu, reaguji na blokery.</li>
</ul>
<h2>Co hlídám</h2>
<ul>
  <li>Každý otevřený úkol má <strong>vlastníka</strong> a termín. Úkol bez vlastníka = přiřadím.</li>
  <li>Leady bez aktivity přes týden — řeším s obchodem (vidím je v týdenním přehledu).</li>
</ul>
<h2>Moje povinnosti</h2>
<ul>
  <li>Onboarding nováčka podle checklistu (v tomto prostoru).</li>
  <li>Týdně projít přehled a rozdělit priority.</li>
  <li>Reagovat na blokery týmu do 1 dne.</li>
</ul>
<h2>Nástroje</h2>
<p>Reporty se generují automaticky (📊 Týdenní přehled). Admin úkony (pozvat/odebrat člověka) řeší správce systému.</p>
<h2>Potřebuju pomoc</h2>
<p>Napiš správci (Štěpán / Martin).</p>
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
  for (const g of GUIDES) {
    const space = teamspaces.find((t) => clean(t.name) === g.space)
    if (!space) { console.log(`  ! prostor "${g.space}" nenalezen → přeskakuji "${g.title}"`); continue }
    const content = g.html.trim()
    const existing = (await c.findAll('document:class:Document', { space: space._id })).find((d) => clean(d.title) === clean(g.title))
    console.log(`  ${existing ? '↻' : '+'} "${g.title}" → ${g.space} (${content.length} znaků)${existing ? ' [přepíšu]' : ''}`)
    if (APPLY) {
      if (existing) await c.removeDoc(existing._class, existing.space, existing._id)
      await c.createDoc('document:class:Document', space._id, {
        title: g.title, content, parent: 'document:ids:NoParent',
        category: null, attachments: 0, comments: 0, labels: [], members: [], relations: [], rank: '0|hzzzzy:'
      })
    }
  }
  console.log(`\nRežim: ${APPLY ? 'APPLIED' : 'DRY-RUN → pro zápis přidej --apply'}`)
  await conn.close(); process.exit(0)
}
main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1) })
