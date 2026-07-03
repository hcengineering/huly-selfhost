// Opraví IN-PLACE dokumenty, které mají v poli `content` HTML místo blob ref
// (příznak: v UI se donekonečna načítají, collaborator loguje InvalidObjectNameError).
// Pro každý rozbitý dokument: HTML z `content` nahraje jako kolaborativní blob
// (praut-doc-content.cjs) a `content` přepíše na blob ref. ID dokumentu se NEMĚNÍ,
// odkazy zůstávají platné, nic se nemaže.
//   node praut-fix-broken-docs.cjs           DRY-RUN (jen vypíše, co by opravil)
//   node praut-fix-broken-docs.cjs --apply    opraví
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
const { uploadDocContent, isBrokenContent } = require(path.join(__dirname, 'praut-doc-content.cjs'))

const APPLY = process.argv.includes('--apply')
function env (file) { const out = {}; for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim() } return out }

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

  const spaces = await client.findAll('document:class:Teamspace', {})
  const spaceName = (id) => { const sp = spaces.find((x) => x._id === id); return sp ? sp.name : id }

  const docs = await client.findAll('document:class:Document', {})
  const broken = docs.filter((d) => isBrokenContent(d.content))
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | dokumentů: ${docs.length}, rozbitých: ${broken.length}\n`)

  let fixed = 0
  for (const d of broken) {
    const html = String(d.content)
    if (!APPLY) {
      console.log(`  DRY-RUN: opravil bych [${spaceName(d.space)}] "${d.title}" (${d._id}, ${html.length} znaků HTML)`)
      continue
    }
    try {
      const blobId = await uploadDocContent(sel.token, d._id, html)
      await client.updateDoc(d._class, d.space, d._id, { content: blobId })
      fixed++
      console.log(`  ✅ [${spaceName(d.space)}] "${d.title}" → content=${blobId}`)
    } catch (e) {
      console.log(`  ❌ [${spaceName(d.space)}] "${d.title}" (${d._id}): ${e && e.message ? e.message : e}`)
    }
  }
  if (APPLY) console.log(`\nOpraveno ${fixed}/${broken.length}.`)
  else if (broken.length > 0) console.log('\nDRY-RUN — nic nezměněno. Spusť s --apply.')
  await conn.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
