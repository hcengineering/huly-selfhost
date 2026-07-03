// Týdenní přehled pro vedení: vygeneruje dokument "📊 Týdenní přehled — YYYY-MM-DD"
// do teamspace "Řízení a reporting" (privátní, vidí jen vedení). Sesbírá stav projektů,
// obchodu, lidí a red-flagů z živého workspace. Idempotence NENÍ — každý běh = nový datovaný
// dokument (historie přehledů zůstává).
//
// Použití (z HulyPrautplatform/dev/import-tool s NODE_PATH):
//   node praut-weekly-report.cjs           DRY-RUN (vytiskne report do konzole, nic nezapíše)
//   node praut-weekly-report.cjs --apply    vytvoří dokument v "Řízení a reporting"
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
const { uploadDocContent } = require(require('path').join(__dirname, 'praut-doc-content.cjs'))

const APPLY = process.argv.includes('--apply')
const REPORT_SPACE = 'Řízení a reporting'
const WEEK_MS = 7 * 24 * 3600 * 1000
function env (f) { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim() } return o }
function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('').trim() }
function esc (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

async function main () {
  const now = Date.now(); const weekAgo = now - WEEK_MS
  const today = new Date(now).toISOString().slice(0, 10)
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const cfg = await (await fetch('https://huly.praut.cz/config.json')).json(); setMetadata(scp.metadata.Endpoint, cfg.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD); const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).filter((w) => w.url === 'praut'); const sel = await ac.selectWorkspace(ws[0].url)
  const conn = await createClient(sel.endpoint, sel.token, []); const c = new TxOperations(conn, socialId); const h = c.getHierarchy()

  // --- Projekty a issues ---
  const projects = await c.findAll('tracker:class:Project', {})
  const issues = await c.findAll('tracker:class:Issue', {})
  const statuses = await c.findAll('tracker:class:IssueStatus', {})
  // Kategorie stavů (task:statusCategory:*): Won=Done, Lost=Cancelled/zrušeno, Active=In Progress,
  // ToDo/UnStarted=nezačato. „Uzavřené" = Won|Lost; „rozpracované" = Active.
  const stCat = {}; for (const st of statuses) stCat[st._id] = String(st.category || '')
  const isDone = (id) => /:(Won|Lost)$/i.test(stCat[id] || '')
  const isStarted = (id) => /:Active$/i.test(stCat[id] || '')
  const projById = {}; for (const p of projects) projById[p._id] = p
  const projRows = []
  for (const p of projects) {
    const list = issues.filter((i) => i.space === p._id)
    const open = list.filter((i) => !isDone(i.status))
    const noOwner = open.filter((i) => !i.assignee)
    const started = open.filter((i) => isStarted(i.status))
    const closedWeek = list.filter((i) => isDone(i.status) && (i.modifiedOn || 0) >= weekAgo)
    const newWeek = list.filter((i) => (i.createdOn || 0) >= weekAgo)
    projRows.push({ name: clean(p.name), total: list.length, open: open.length, noOwner: noOwner.length, started: started.length, closedWeek: closedWeek.length, newWeek: newWeek.length })
  }

  // --- Obchod: leady (Karty modul je vypnutý — obchod = jen Lead, rozhodnutí 2026-07-08) ---
  const leads = await c.findAll('lead:class:Lead', {})
  const leadStatuses = await c.findAll('core:class:Status', { ofAttribute: 'lead:attribute:State' })
  const lsName = {}; for (const st of leadStatuses) lsName[st._id] = clean(st.name)
  const leadByStage = {}; for (const l of leads) { const k = lsName[l.status] || '—'; leadByStage[k] = (leadByStage[k] || 0) + 1 }
  const newLeadsWeek = leads.filter((l) => (l.createdOn || 0) >= weekAgo).length

  // --- Lidé ---
  const persons = await c.findAll('contact:class:Person', {})
  let active = 0; const newPeople = []
  for (const p of persons) {
    if (h.hasMixin(p, 'contact:mixin:Employee') && h.as(p, 'contact:mixin:Employee').active) {
      active++; if ((p.createdOn || 0) >= weekAgo) newPeople.push(clean(p.name))
    }
  }

  // --- Red flags ---
  const flags = []
  const inProgNoOwner = issues.filter((i) => isStarted(i.status) && !isDone(i.status) && !i.assignee)
  if (inProgNoOwner.length) flags.push(`${inProgNoOwner.length} rozpracovaných úkolů (In Progress) BEZ vlastníka`)
  const staleLeads = leads.filter((l) => (l.modifiedOn || 0) < weekAgo && !/Vyhráno|Prohráno/i.test(lsName[l.status] || ''))
  if (staleLeads.length) flags.push(`${staleLeads.length} leadů bez aktivity déle než 7 dní`)
  const bigNoOwner = projRows.filter((r) => r.noOwner > 0)
  if (bigNoOwner.length) flags.push(`Otevřené úkoly bez vlastníka: ${bigNoOwner.map((r) => r.name + ' (' + r.noOwner + ')').join(', ')}`)

  // --- HTML ---
  const projTable = projRows.map((r) =>
    `<tr><td>${esc(r.name)}</td><td>${r.open}</td><td>${r.started}</td><td>${r.noOwner}</td><td>${r.closedWeek}</td><td>${r.newWeek}</td></tr>`).join('')
  const leadTable = Object.keys(leadByStage).map((k) => `<tr><td>${esc(k)}</td><td>${leadByStage[k]}</td></tr>`).join('') || '<tr><td>—</td><td>0</td></tr>'
  const flagsHtml = flags.length ? '<ul>' + flags.map((f) => `<li>⚠️ ${esc(f)}</li>`).join('') + '</ul>' : '<p>✅ Žádné akutní problémy.</p>'
  const CONTENT = `
<h1>📊 Týdenní přehled — ${today}</h1>
<p>Automaticky vygenerováno z živého workspace. Pokrývá posledních 7 dní.</p>
<h2>🎯 Red flags (co řešit)</h2>
${flagsHtml}
<h2>📁 Projekty</h2>
<table><thead><tr><th>Projekt</th><th>Otevřené</th><th>Rozpracované</th><th>Bez vlastníka</th><th>Zavřeno/týden</th><th>Nové/týden</th></tr></thead><tbody>${projTable}</tbody></table>
<h2>📈 Obchod</h2>
<p>Leady podle fáze:</p>
<table><thead><tr><th>Fáze</th><th>Počet</th></tr></thead><tbody>${leadTable}</tbody></table>
<p>Nové leady za týden: <strong>${newLeadsWeek}</strong> · leadů celkem: <strong>${leads.length}</strong></p>
<h2>👥 Lidé</h2>
<p>Aktivních zaměstnanců: <strong>${active}</strong>${newPeople.length ? ' · noví za týden: ' + esc(newPeople.join(', ')) : ''}</p>
`.trim()

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | ${today}`)
  console.log('--- projekty ---'); projRows.forEach((r) => console.log(`  ${r.name}: open=${r.open} inProgress=${r.started} bezVlastnika=${r.noOwner} zavreno7d=${r.closedWeek} nove7d=${r.newWeek}`))
  console.log('--- obchod ---', JSON.stringify(leadByStage), 'noveLeady7d=' + newLeadsWeek)
  console.log('--- lidé --- aktivní=' + active, newPeople.length ? 'noví=' + newPeople.join(',') : '')
  console.log('--- red flags ---'); flags.forEach((f) => console.log('  ⚠️ ' + f)); if (!flags.length) console.log('  (žádné)')

  const teamspaces = await c.findAll('document:class:Teamspace', {})
  const space = teamspaces.find((t) => clean(t.name) === REPORT_SPACE)
  if (!space) { console.log('\nCHYBA: teamspace nenalezen:', REPORT_SPACE); await conn.close(); process.exit(1) }
  if (APPLY) {
    const docId = coreMod.generateId()
    const blobId = await uploadDocContent(sel.token, docId, CONTENT)
    await c.createDoc('document:class:Document', space._id, {
      title: `📊 Týdenní přehled — ${today}`, content: blobId, parent: 'document:ids:NoParent',
      category: null, attachments: 0, comments: 0, labels: [], members: [], relations: [], rank: '0|hzzzzz:'
    }, docId)
    console.log('\n✅ Vytvořeno:', docId, '| do:', REPORT_SPACE, '| znaků:', CONTENT.length)
  } else {
    console.log(`\nDRY-RUN: vytvořil bych dokument v "${REPORT_SPACE}" (${CONTENT.length} znaků HTML). Spusť s --apply.`)
  }
  await conn.close(); process.exit(0)
}
main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1) })
