// Kosmetický IN-PLACE čistič: odstraní whitespace artefakty z obsahu dokumentů,
// které opravil praut-fix-broken-docs.cjs (prázdné položky seznamů a prázdné
// odstavce vzniklé z bílých znaků mezi HTML tagy).
// Bere jen dokumenty, jejichž `content` odpovídá blob ref formátu
// `<id>-content-<timestamp>` a jejichž blob je markup JSON. Nic nemaže,
// ID dokumentů se nemění — jen nahraje vyčištěný blob a přepne `content`.
//   node praut-clean-doc-whitespace.cjs           DRY-RUN
//   node praut-clean-doc-whitespace.cjs --apply    vyčistí
globalThis.window = globalThis
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const path = require('path')
const coreMod = require('@hcengineering/core'); const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')
const { FRONT_URL } = require(path.join(__dirname, 'praut-doc-content.cjs'))

const APPLY = process.argv.includes('--apply')
const BLOB_REF_RE = /^[0-9a-f]{24}-content-\d+$/
function env (file) { const out = {}; for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim() } return out }

// Odstraní whitespace-only text uzly a bloky (paragraph/listItem), které tím zůstaly prázdné.
function cleanNode (node) {
  if (node.type === 'text') return /^\s*$/.test(node.text || '') ? null : node
  if (!Array.isArray(node.content)) return node
  const cleaned = node.content.map(cleanNode).filter((n) => n !== null)
  const dropIfEmpty = ['paragraph', 'listItem']
  const kept = cleaned.filter((n) => !(dropIfEmpty.includes(n.type) && (!n.content || n.content.length === 0)))
  return { ...node, content: kept }
}

async function main () {
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const config = await (await fetch('https://huly.praut.cz/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).filter((w) => w.url === 'praut')
  const sel = await ac.selectWorkspace(ws[0].url)
  const conn = await createClient(sel.endpoint, sel.token, [])
  const client = new TxOperations(conn, socialId)
  const wsUuid = ws[0].uuid

  const docs = await client.findAll('document:class:Document', {})
  const candidates = docs.filter((d) => typeof d.content === 'string' && BLOB_REF_RE.test(d.content))
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | kandidátů (blob ref z fixeru): ${candidates.length}\n`)

  let cleanedCount = 0
  for (const d of candidates) {
    const fileUrl = `${FRONT_URL}/files/${wsUuid}/${d.content}?file=${d.content}&workspace=${wsUuid}`
    const res = await fetch(fileUrl, { headers: { Authorization: 'Bearer ' + sel.token } })
    if (res.status !== 200) { console.log(`  ! "${d.title}": blob nedostupný (HTTP ${res.status}) — přeskakuji`); continue }
    let json
    try { json = JSON.parse(await res.text()) } catch (e) { console.log(`  ! "${d.title}": blob není JSON — přeskakuji`); continue }

    const cleaned = cleanNode(json)
    const before = JSON.stringify(json); const after = JSON.stringify(cleaned)
    if (before === after) { console.log(`  = "${d.title}": beze změny`); continue }
    if (!APPLY) { console.log(`  DRY-RUN: vyčistil bych "${d.title}" (${before.length} → ${after.length} znaků)`); cleanedCount++; continue }

    const collabId = coreMod.makeCollabId('document:class:Document', d._id, 'content')
    const blobId = coreMod.makeCollabJsonId(collabId)
    const form = new FormData()
    form.append('file', new Blob([Buffer.from(after)], { type: 'application/json' }), blobId)
    const up = await fetch(new URL('/files', FRONT_URL).toString(), { method: 'POST', headers: { Authorization: 'Bearer ' + sel.token }, body: form })
    if (up.status !== 200) { console.log(`  ❌ "${d.title}": upload HTTP ${up.status}`); continue }
    const upRes = JSON.parse(await up.text()); const first = Array.isArray(upRes) ? upRes[0] : undefined
    if (first == null || first.error != null) { console.log(`  ❌ "${d.title}": ${first != null ? first.error : 'prázdná odpověď'}`); continue }
    await client.updateDoc(d._class, d.space, d._id, { content: first.id != null ? first.id : blobId })
    cleanedCount++
    console.log(`  ✅ "${d.title}" (${before.length} → ${after.length} znaků)`)
  }
  console.log(`\n${APPLY ? 'Vyčištěno' : 'K vyčištění'}: ${cleanedCount}`)
  await conn.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
