// READ-ONLY: ověří stav GitHub integrace v Huly workspace `praut`. Žádné zápisy.
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
  const WORKSPACE = 'praut'
  const config = await (await fetch(FRONT_URL + '/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)

  const unauth = getAccountClient()
  const { token, socialId } = await unauth.login(secrets.ADMIN_EMAIL, secrets.ADMIN_PASSWORD)
  if (token === undefined) { console.log('LOGIN FAILED'); process.exit(1) }
  const accountClient = getAccountClient(token)
  const all = await accountClient.getUserWorkspaces()
  const ws = all.filter((w) => w.url === WORKSPACE)
  if (ws.length < 1) { console.log('Workspace not found'); process.exit(1) }
  const selected = await accountClient.selectWorkspace(ws[0].url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  const INTEGRATION = 'github:class:GithubIntegration'
  const AUTH = 'github:class:GithubAuthentication'
  const REPO = 'github:class:GithubIntegrationRepository'
  const PROJECT_MIXIN = 'github:mixin:GithubProject'

  console.log('\n========== GITHUB INTEGRACE — STAV ==========')

  const integrations = await client.findAll(INTEGRATION, {})
  console.log('\n--- GithubIntegration (instalace App na org/účet):', integrations.length, '---')
  for (const i of integrations) {
    console.log(`  • name=${i.name}  type=${i.type}  installationId=${i.installationId}  alive=${i.alive}  repositories=${i.repositories}  byUser=${i.byUser}`)
  }

  const auths = await client.findAll(AUTH, {})
  console.log('\n--- GithubAuthentication (propojené účty):', auths.length, '---')
  for (const a of auths) {
    const orgs = a.organizations && a.organizations.nodes ? a.organizations.nodes.map(n => n.name).join(', ') : '—'
    console.log(`  • login=${a.login}  name=${a.name}  repos=${a.repositories}  orgs(${a.organizations ? a.organizations.totalCount : 0})=[${orgs}]  error=${a.error || 'none'}`)
  }

  const repos = await client.findAll(REPO, {})
  console.log('\n--- GithubIntegrationRepository (viditelná repa):', repos.length, '---')
  for (const r of repos) {
    console.log(`  • ${r.name}  id=${r.repositoryId}  enabled=${r.enabled}  private=${r.private}  mappedToProject=${r.githubProject || 'NE'}`)
  }

  let mapped = []
  try { mapped = await client.findAll(PROJECT_MIXIN, {}) } catch (e) { console.log('  (mixin query err:', e.message, ')') }
  console.log('\n--- GithubProject (Huly Tracker projekty napojené na repo):', mapped.length, '---')
  for (const p of mapped) {
    console.log(`  • project=${JSON.stringify(p.name)}  integration=${p.integration}  repositories=[${(p.repositories || []).join(', ')}]`)
  }

  console.log('\n========== ZÁVĚR ==========')
  console.log(`Instalace App: ${integrations.length}  | Účty: ${auths.length}  | Viditelná repa: ${repos.length}  | Napojené projekty: ${mapped.length}`)
  const anyMappedRepo = repos.some(r => r.githubProject)
  console.log(`Aspoň jedno repo namapované na projekt: ${anyMappedRepo ? 'ANO ✅' : 'NE ❌ (sync ještě neběží)'}`)

  await connection.close()
  console.log('\nDONE (read-only)')
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
