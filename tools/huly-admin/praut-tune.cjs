// Drobný tuning Praut workspace přes oficiální Huly API. Vše vratné.
//   node praut-tune.cjs          DRY-RUN
//   node praut-tune.cjs --apply  provede
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}

const fs = require('fs')
const coreMod = require('@hcengineering/core')
const core = coreMod.default
const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
const UNTITLED_ID = '6a2bff17e96cc91304c335b1'
const NEW_TITLE = 'Poznámky (k doplnění)'

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
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

  console.log(`\nMód: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  // 1) Přejmenovat prázdný Untitled dokument
  const docs = await client.findAll('document:class:Document', { _id: UNTITLED_ID })
  if (docs.length === 1) {
    const d = docs[0]
    console.log(`1) Dokument ${JSON.stringify(d.title)} -> ${JSON.stringify(NEW_TITLE)}`)
    if (APPLY && d.title !== NEW_TITLE) await client.update(d, { title: NEW_TITLE })
  } else {
    console.log(`1) Untitled dokument nenalezen (${docs.length})`)
  }

  await connection.close()
  console.log(APPLY ? 'HOTOVO.' : 'DRY-RUN hotov.')
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
