// Vytvoří/obnoví dokument "🚀 Rychlý start" ve sdílené dokumentaci (vidí celý tým).
// Obsah se nahrává jako kolaborativní blob přes praut-doc-content.cjs — do pole
// `content` patří blob ref, NE HTML (HTML v content = věčně se načítající dokument).
// Idempotentní: dokument se stejným názvem se přepíše.
//   node praut-quickstart-doc.cjs           DRY-RUN
//   node praut-quickstart-doc.cjs --apply    vytvoří/obnoví
globalThis.window = globalThis
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const coreMod = require('@hcengineering/core'); const core = coreMod.default; const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')
const { uploadDocContent } = require(require('path').join(__dirname, 'praut-doc-content.cjs'))

const APPLY = process.argv.includes('--apply')
const TITLE = '🚀 Rychlý start — jak pracovat v Huly'
const SHARED_TEAMSPACE = 'Firemní dokumentace HULY'
function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('').trim() }
function env (file) { const out = {}; for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim() } return out }

const CONTENT = `
<h1>🚀 Rychlý start — jak pracovat v Huly</h1>
<p>Huly je náš firemní systém. Všechno o úkolech, obchodu, klientech a zakázkách je <strong>tady</strong>, ne v e-mailu. Tahle stránka tě nastartuje za 5 minut.</p>

<h2>Začni den (3 kroky, 2 minuty)</h2>
<ol>
  <li><strong>Inbox</strong> (zvoneček nahoře) — co mi přišlo, kdo mě zmínil.</li>
  <li><strong>Tracker → Moje</strong> — co mám rozdělané a do kdy. Hotovo? Posuň stav: <em>Todo → In Progress → Done</em>.</li>
  <li>Do <strong>#praut-denni-prehled</strong> napiš 1 větu: co dnes dělám / co mě blokuje.</li>
</ol>

<h2>Kde co dělám (každá věc má jeden domov)</h2>
<ul>
  <li><strong>Úkoly (co mám udělat)</strong> → <strong>Tracker</strong>, projekt <strong>PULS</strong>. Každá práce = jeden úkol.</li>
  <li><strong>Obchod (celý — zájemci, nabídky, dohody)</strong> → <strong>Lead</strong> (funnel podle fází). <em>(vidí vedení / obchod)</em></li>
  <li><strong>Firmy a lidé</strong> → <strong>Contacts</strong> (adresář klientů a kontaktů).</li>
  <li><strong>Pravidla, návody, znalosti</strong> → <strong>Dokumenty</strong> (jsi tu).</li>
  <li><strong>Komunikace</strong> → <strong>Chat</strong>; schůzky → <strong>Kalendář</strong>.</li>
</ul>
<p><em>Nic víc nehledej — nepoužívané moduly jsme vypnuli, ať je menu přehledné. Kdyby ti i tak něco překáželo, v přepínači aplikací si můžeš appky skrýt jen pro sebe.</em></p>

<h2>Zlaté pravidlo</h2>
<p><strong>Cokoliv má někdo udělat, je úkol v Trackeru.</strong> Chat ani dokument úkol nenahrazují. Když z porady nebo zprávy plyne práce → založ úkol s vlastníkem a termínem.</p>

<h2>Jak na základní věci</h2>
<ul>
  <li><strong>Nový úkol:</strong> Tracker → <em>New issue</em> → název, vlastník (já/kolega), priorita, termín.</li>
  <li><strong>Najít cokoliv:</strong> lupa nahoře — hledá napříč úkoly, dokumenty i kontakty.</li>
  <li><strong>Zeptat se týmu:</strong> Chat → kanál <strong>#praut-denni-prehled</strong> nebo přímá zpráva.</li>
</ul>

<h2>Kdo co vidí</h2>
<p>Dokumentaci, kontakty a své projekty vidí všichni. <strong>Obchodní pipeline (Lead) vidí jen vedení a obchod.</strong></p>

<h2>Potřebuju pomoc</h2>
<p>Napiš správci (Štěpán / Martin) v chatu, nebo do kanálu <strong>#praut-denni-prehled</strong>.</p>
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
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  const teamspaces = await client.findAll('document:class:Teamspace', {})
  const space = teamspaces.find((t) => clean(t.name) === SHARED_TEAMSPACE)
  if (!space) { console.log('CHYBA: sdílený teamspace nenalezen:', SHARED_TEAMSPACE); await connection.close(); process.exit(1) }

  const existing = (await client.findAll('document:class:Document', { space: space._id })).find((d) => clean(d.title) === clean(TITLE))
  if (existing) {
    console.log(`Existující "${TITLE}" → ${APPLY ? 'přepíšu (smazat+vytvořit)' : 'by byl přepsán'}`)
    if (APPLY) await client.removeDoc(existing._class, existing.space, existing._id)
  }
  if (APPLY) {
    const docId = coreMod.generateId()
    const blobId = await uploadDocContent(selected.token, docId, CONTENT)
    await client.createDoc('document:class:Document', space._id, {
      title: TITLE, content: blobId, parent: 'document:ids:NoParent',
      category: null, attachments: 0, comments: 0, labels: [], members: [], relations: [], rank: '0|h00000:'
    }, docId)
    console.log('Vytvořeno:', docId, '| obsah znaků:', CONTENT.length, '| blob:', blobId)
  } else {
    console.log(`DRY-RUN: vytvořil bych "${TITLE}" v "${SHARED_TEAMSPACE}" (${CONTENT.length} znaků HTML)`)
  }
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
