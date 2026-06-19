// READ-ONLY: přihlásí se jako admin a vypíše card spaces + tracker projekty.
// Žádné zápisy. Slouží k ověření připojení před úklidem.
// Shim browser globálů, které Huly klient očekává (běžíme v Node, ne v prohlížeči).
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
// localStorage MUSÍ být typeof "undefined", jinak Huly klient spustí IndexedDB (které v Node není).
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const coreMod = require('@hcengineering/core')
const core = coreMod.default
const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

async function main () {
  const secrets = env('/Users/stepan/praut/huly-poc-secrets.env')
  const FRONT_URL = 'https://huly.praut.cz'
  const USER = secrets.ADMIN_EMAIL
  const PASSWORD = secrets.ADMIN_PASSWORD
  const WORKSPACE = 'praut'

  const config = await (await fetch(FRONT_URL + '/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
  console.log('Accounts URL:', config.ACCOUNTS_URL)

  const unauth = getAccountClient()
  const { account, token, socialId } = await unauth.login(USER, PASSWORD)
  if (token === undefined) { console.log('LOGIN FAILED for', USER); process.exit(1) }
  console.log('Login OK, account:', account)

  const accountClient = getAccountClient(token)
  const all = await accountClient.getUserWorkspaces()
  const ws = all.filter((w) => w.url === WORKSPACE)
  if (ws.length < 1) { console.log('Workspace not found:', WORKSPACE, '— available:', all.map(w => w.url)); process.exit(1) }
  const selected = await accountClient.selectWorkspace(ws[0].url)
  console.log('Transactor endpoint:', selected.endpoint)

  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  const spaces = await client.findAll(core.class.Space, {})
  console.log('\n=== SPACES (', spaces.length, ') ===')
  for (const s of spaces) {
    console.log([s._class, JSON.stringify(s.name), 'archived=' + (s.archived === true), s._id].join('  |  '))
  }
  await connection.close()
  console.log('\nDONE (read-only)')
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
