// READ-ONLY scanner: najde dokumenty, které mají v poli `content` HTML
// místo blob ref (MarkupBlobRef) → v UI se donekonečna načítají
// (collaborator: InvalidObjectNameError).
//   node praut-scan-broken-docs.cjs
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
const { isBrokenContent } = require(path.join(__dirname, 'praut-doc-content.cjs'))

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

  console.log(`Dokumentů celkem: ${docs.length}, rozbitých (HTML v content): ${broken.length}\n`)
  for (const d of broken) {
    console.log(`- [${spaceName(d.space)}] "${d.title}" (${d._id}) — content ${String(d.content).length} znaků, začíná: ${String(d.content).trim().slice(0, 60).replace(/\n/g, ' ')}`)
  }
  await conn.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
