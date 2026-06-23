// Reset hesla + vrácení uživatele do workspace `praut` (zapomenuté heslo).
// Bez --apply = DRY-RUN: jen diagnostika (účet existuje? UUID? workspace UUID). Nic nemění.
// S --apply: restorePassword (nastaví nové heslo + znovu ověří e-mail) + assignWorkspace (role USER).
//
// Použití (z HulyPrautplatform/dev/import-tool/):
//   node praut-account-reset.cjs <email>                 # DRY-RUN
//   node praut-account-reset.cjs <email> --apply         # provede, vygeneruje dočasné heslo
//   node praut-account-reset.cjs <email> --apply --password 'Moje-Heslo'
//
// Pozadí: v Huly je globální účet (e-mail) oddělený od členství ve workspace. Smazání uživatele v UI
// odebere jen členství, účet+e-mail (social_id) zůstává → re-add hlásí AccountAlreadyExists.
// restorePassword (server/account/src/operations.ts) nastaví heslo na účet z tokenu (account=UUID,
// extra.restoreEmail=e-mail) a znovu ověří e-mail. Token = jwt-simple HS256 podepsaný serverovým SECRET.

globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}

const fs = require('fs')
const crypto = require('crypto')
const coreMod = require('@hcengineering/core')
const core = coreMod.default
const { buildSocialIdString, SocialIdType, systemAccountUuid, AccountRole } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { getAccountClient } = require('@hcengineering/server-client')

const FRONT_URL = 'https://huly.praut.cz'
const WORKSPACE_URL = 'praut'
const WORKSPACE_UUID_FALLBACK = '4533ec0f-0808-40d3-9c71-d5cee56cd439'
const SECRET_FILE = '/Users/stepan/praut/huly-selfhost/.env'
const SECRETS_FILE = '/Users/stepan/praut/huly-poc-secrets.env'

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// jwt-simple HS256 encode (Huly token), bez závislostí
function b64url (input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function signToken (payload, secret) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
  const body = b64url(JSON.stringify(payload))
  const input = header + '.' + body
  const sig = crypto.createHmac('sha256', secret).update(input).digest('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return input + '.' + sig
}

async function main () {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const email = (args.find((a) => !a.startsWith('--') && a.includes('@')) || '').trim().toLowerCase()
  const pwIdx = args.indexOf('--password')
  let newPassword = pwIdx >= 0 ? args[pwIdx + 1] : null

  if (!email) { console.log('CHYBA: zadej e-mail. Použití: node praut-account-reset.cjs <email> [--apply] [--password X]'); process.exit(1) }

  const secret = env(SECRET_FILE).SECRET
  if (!secret) { console.log('CHYBA: SECRET nenalezen v', SECRET_FILE); process.exit(1) }
  const secrets = env(SECRETS_FILE)

  const config = await (await fetch(FRONT_URL + '/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)

  const socialKey = buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  const toolToken = signToken({ extra: { service: 'tool' }, account: systemAccountUuid }, secret)
  const toolClient = getAccountClient(toolToken)

  console.log('\n========== RESET ÚČTU ==========')
  console.log('E-mail        :', email)
  console.log('Social key    :', socialKey)
  console.log('Režim         :', apply ? 'APPLY (provede změny)' : 'DRY-RUN (jen diagnostika)')

  // --- Diagnostika ---
  const personUuid = await toolClient.findPersonBySocialKey(socialKey, false)
  const accountUuid = await toolClient.findPersonBySocialKey(socialKey, true)
  console.log('\n--- Diagnostika ---')
  console.log('personUuid    :', personUuid ?? '— (e-mail v DB neexistuje)')
  console.log('účet existuje :', accountUuid ? 'ANO ✅' : 'NE ❌')

  // workspace UUID (přes admin login, fallback na známé UUID)
  let workspaceUuid = WORKSPACE_UUID_FALLBACK
  try {
    const { token } = await getAccountClient().login(secrets.ADMIN_EMAIL, secrets.ADMIN_PASSWORD)
    const wss = await getAccountClient(token).getUserWorkspaces()
    const ws = wss.find((w) => w.url === WORKSPACE_URL)
    if (ws && ws.uuid) workspaceUuid = ws.uuid
    console.log('workspace     :', WORKSPACE_URL, '→', workspaceUuid, ws ? '' : '(fallback)')
  } catch (e) {
    console.log('workspace     :', WORKSPACE_URL, '→', workspaceUuid, '(fallback, admin login selhal:', e.message, ')')
  }

  if (!personUuid) {
    console.log('\n❌ E-mail v účtové DB vůbec není → nejde resetovat heslo. Použij create-account (jiný postup).')
    process.exit(1)
  }
  if (!accountUuid) {
    console.log('\n⚠️  Účet byl smazán úplně (zůstal jen osiřelý e-mail záznam). restorePassword nepomůže —')
    console.log('    je potřeba vyčistit social_id a vytvořit účet znovu (create-account). Zastavuji.')
    process.exit(1)
  }

  if (!apply) {
    console.log('\n✅ DRY-RUN OK. Účet existuje a lze mu resetovat heslo. Spusť znovu s --apply pro provedení.')
    process.exit(0)
  }

  // --- Provedení ---
  if (!newPassword) {
    newPassword = 'Huly-' + crypto.randomBytes(6).toString('hex') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase()
  }
  console.log('\n--- Provádím ---')
  console.log('Nové heslo (zapiš si!) :', newPassword)

  // restorePassword: setPassword + re-verify e-mailu proběhnou PŘED interním zkušebním loginem.
  // Pokud je účet zamčený (failedLoginAttempts >= 5), ten interní login hodí PasswordLoginLocked,
  // ALE heslo už je v tu chvíli nastavené. Chybu tedy odchytíme a jen označíme, že je třeba odemknout.
  let locked = false
  const restoreToken = signToken({ extra: { restoreEmail: email }, account: accountUuid }, secret)
  try {
    await getAccountClient(restoreToken).restorePassword(newPassword)
    console.log('1) restorePassword ✅ — nastaveno nové heslo + znovu ověřen e-mail')
  } catch (e) {
    if (/PasswordLoginLocked/.test(e && e.message ? e.message : String(e))) {
      locked = true
      console.log('1) restorePassword ⚠️ — heslo NASTAVENO, ale účet je ZAMČENÝ (moc neúspěšných loginů). Odemknout přes DB (viz níže).')
    } else { throw e }
  }

  try {
    await toolClient.assignWorkspace(email, workspaceUuid, core.AccountRole.User)
    console.log('2) assignWorkspace ✅ — uživatel ve workspace', WORKSPACE_URL, 'jako USER')
  } catch (e) {
    console.log('2) assignWorkspace ⚠️ —', e && e.message ? e.message : e)
  }

  console.log('\n========================================')
  console.log('HOTOVO (heslo nastaveno). Předej uživateli:')
  console.log('  Login (e-mail):', email)
  console.log('  Dočasné heslo :', newPassword)
  console.log('  URL           :', FRONT_URL)
  console.log('Doporuč mu po přihlášení změnit heslo: Settings → Change password.')
  if (locked) {
    console.log('\n⚠️  ÚČET JE ZAMČENÝ — než se Martin přihlásí, ODEMKNI ho na serveru tímto příkazem:')
    console.log('  docker compose exec cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 \\')
    console.log("    --database=defaultdb -e \"UPDATE global_account.account SET failed_login_attempts = 0 WHERE uuid = '" + accountUuid + "';\"")
    console.log('  (resetuje počítadlo neúspěšných pokusů; jiný způsob odemčení bez SMTP/OTP není)')
  }
  console.log('========================================')
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
