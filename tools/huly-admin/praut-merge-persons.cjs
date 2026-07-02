// Sloučí dvě "globální osoby" (kontakty) v workspace `praut` na ÚČTOVÉ úrovni.
// Řeší UI chybu "Nelze sloučit globální osoby": UI před sloučením volá canMergeSpecifiedPersons,
// která vrátí false, pokud SEKUNDÁRNÍ osoba má jakékoli OVĚŘENÉ social ID (verified_on != null).
// Oficiální API mergeSpecifiedAccounts (account-client) umí sloučit i ověřené ID (doMergePersons(...,true)).
//
// Po account-merge má sekundární osoba 0 social ID → v UI pak "Sloučit kontakty" (zdroj=sekundární,
// cíl=primární) projde a dokončí sloučení KARET ve workspace (kanály, atributy, smazání duplicitní karty).
//
// Použití (z HulyPrautplatform/dev/import-tool/):
//   node praut-merge-persons.cjs --search Švanda                          # vypíše kandidáty (read-only)
//   node praut-merge-persons.cjs --primary <uuid|jméno> --secondary <uuid|jméno>           # DRY-RUN diagnostika
//   node praut-merge-persons.cjs --primary <...> --secondary <...> --apply                 # provede account-merge
//
// primary = VÍTĚZ (zůstává), secondary = slučovaný (zanikne, dostane migrated_to=primary).
// Bez --apply nic nemění.

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
const { TxOperations, systemAccountUuid } = coreMod
// @hcengineering/contact není závislost import-tool → použijeme přímo stringová plugin-id.
const contact = { class: { Person: 'contact:class:Person', SocialIdentity: 'contact:class:SocialIdentity' } }
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const FRONT_URL = 'https://huly.praut.cz'
const WORKSPACE_URL = 'praut'
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
  const inp = header + '.' + body
  const sig = crypto.createHmac('sha256', secret).update(inp).digest('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return inp + '.' + sig
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function argVal (args, name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

async function gatherSocialIds (client, accountClient, person) {
  const sids = await client.findAll(contact.class.SocialIdentity, { attachedTo: person._id })
  const out = []
  let isAccount = false
  for (const s of sids) {
    const key = s.key || (s.type + ':' + s.value)
    let verifiedOn = null
    let acc = null
    try {
      const full = await accountClient.findFullSocialIdBySocialKey(key)
      if (full && full.verifiedOn != null) verifiedOn = full.verifiedOn
    } catch (e) { /* ignore */ }
    try {
      acc = await accountClient.findPersonBySocialKey(key, true) // requireAccount → vrátí accountUuid nebo undefined
    } catch (e) { /* ignore */ }
    if (acc) isAccount = true
    out.push({ key, type: s.type, value: s.value, verified: verifiedOn != null, account: acc || null })
  }
  return { socialIds: out, isAccount }
}

function describe (label, p) {
  console.log('\n--- ' + label + ' ---')
  console.log('  karta _id   :', p.person._id)
  console.log('  jméno       :', JSON.stringify(p.person.name))
  console.log('  personUuid  :', p.person.personUuid ?? '— (NENÍ globální osoba!)')
  console.log('  je účet     :', p.isAccount ? 'ANO ✅' : 'NE')
  if (p.socialIds.length === 0) console.log('  social IDs  : (žádné)')
  for (const s of p.socialIds) {
    console.log('  social ID   :', s.type + ':' + s.value, '| ověřené:', s.verified ? 'ANO ✅' : 'ne', '| účet:', s.account ? 'ANO' : 'ne')
  }
}

async function main () {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const search = argVal(args, '--search')
  const primaryArg = argVal(args, '--primary')
  const secondaryArg = argVal(args, '--secondary')

  const secret = env(SECRET_FILE).SECRET
  if (!secret) { console.log('CHYBA: SECRET nenalezen v', SECRET_FILE); process.exit(1) }
  const secrets = env(SECRETS_FILE)

  const config = await (await fetch(FRONT_URL + '/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)

  // Workspace připojení (admin login → transactor)
  const { token: adminToken, socialId } = await getAccountClient().login(secrets.ADMIN_EMAIL, secrets.ADMIN_PASSWORD)
  if (!adminToken) { console.log('LOGIN FAILED for', secrets.ADMIN_EMAIL); process.exit(1) }
  const adminAccountClient = getAccountClient(adminToken)
  const wss = await adminAccountClient.getUserWorkspaces()
  const ws = wss.find((w) => w.url === WORKSPACE_URL)
  if (!ws) { console.log('Workspace nenalezen:', WORKSPACE_URL); process.exit(1) }
  const selected = await adminAccountClient.selectWorkspace(ws.url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  // Service token pro účtové operace (findFullSocialId/findPerson/merge)
  const toolToken = signToken({ extra: { service: 'tool' }, account: systemAccountUuid }, secret)
  const toolClient = getAccountClient(toolToken)

  const allPersons = await client.findAll(contact.class.Person, {})

  // --- LIST režim ---
  if (!primaryArg || !secondaryArg) {
    const term = (search || '').toLowerCase()
    const matches = allPersons.filter((p) => term === '' || (p.name || '').toLowerCase().includes(term))
    console.log('\n========== KANDIDÁTI (read-only) ==========')
    console.log('Najdeno', matches.length, 'osob' + (term ? ' pro "' + search + '"' : '') + ':')
    for (const p of matches) {
      const info = await gatherSocialIds(client, toolClient, p)
      console.log('\n• ' + JSON.stringify(p.name))
      console.log('  _id        :', p._id)
      console.log('  personUuid :', p.personUuid ?? '—')
      console.log('  je účet    :', info.isAccount ? 'ANO' : 'ne')
      for (const s of info.socialIds) console.log('    -', s.type + ':' + s.value, s.verified ? '(ověřené)' : '')
    }
    console.log('\nDalší krok: node praut-merge-persons.cjs --primary <uuid|jméno> --secondary <uuid|jméno>')
    await connection.close()
    process.exit(0)
  }

  // --- resolvér primary/secondary ---
  function resolve (arg) {
    if (UUID_RE.test(arg)) {
      const byUuid = allPersons.filter((p) => p.personUuid === arg)
      if (byUuid.length === 1) return byUuid[0]
      throw new Error('personUuid "' + arg + '" → ' + byUuid.length + ' karet')
    }
    const t = arg.toLowerCase()
    const byName = allPersons.filter((p) => (p.name || '').toLowerCase().includes(t))
    if (byName.length === 1) return byName[0]
    throw new Error('jméno "' + arg + '" → ' + byName.length + ' shod (' + byName.map((p) => p.name).join(' / ') + '). Upřesni nebo použij personUuid.')
  }

  const primaryPerson = resolve(primaryArg)
  const secondaryPerson = resolve(secondaryArg)

  const primaryInfo = { person: primaryPerson, ...(await gatherSocialIds(client, toolClient, primaryPerson)) }
  const secondaryInfo = { person: secondaryPerson, ...(await gatherSocialIds(client, toolClient, secondaryPerson)) }

  console.log('\n========== SLOUČENÍ OSOB ==========')
  console.log('Režim:', apply ? 'APPLY (provede account-merge)' : 'DRY-RUN (jen diagnostika)')
  describe('PRIMARY (zůstává)', primaryInfo)
  describe('SECONDARY (zanikne)', secondaryInfo)

  if (primaryPerson._id === secondaryPerson._id) { console.log('\n❌ Primary i secondary je tatáž karta.'); process.exit(1) }
  if (primaryPerson.personUuid == null || secondaryPerson.personUuid == null) {
    console.log('\n❌ Některá osoba nemá personUuid (není globální). Account-merge nedává smysl — řeš jen UI sloučením karet.')
    process.exit(1)
  }

  // Co vidí UI:
  const uiCanMerge = await toolClient.canMergeSpecifiedPersons(primaryPerson.personUuid, secondaryPerson.personUuid)
  console.log('\nUI canMergeSpecifiedPersons(primary, secondary):', uiCanMerge, uiCanMerge ? '→ UI by sloučilo i samo' : '→ UI blokuje (proto tento skript)')

  // Volba větve
  const secVerified = secondaryInfo.socialIds.some((s) => s.verified)
  let branch
  if (secondaryInfo.isAccount) branch = 'mergeSpecifiedAccounts'
  else if (!secVerified) branch = 'mergeSpecifiedPersons'
  else branch = 'mergeSpecifiedAccounts' // sekundární má ověřené ID ale není účet → účtová cesta zvládne verified
  console.log('Zvolená větev:', branch)

  if (!apply) {
    console.log('\n✅ DRY-RUN OK. Pro provedení spusť znovu s --apply. (Nejdřív ZÁLOHA DB!)')
    await connection.close()
    process.exit(0)
  }

  console.log('\n--- Provádím account-merge (' + branch + ') ---')
  if (branch === 'mergeSpecifiedAccounts') {
    await toolClient.mergeSpecifiedAccounts(primaryPerson.personUuid, secondaryPerson.personUuid)
  } else {
    await toolClient.mergeSpecifiedPersons(primaryPerson.personUuid, secondaryPerson.personUuid)
  }
  console.log('✅ Account-merge hotov. Sekundární osoba teď ukazuje na primární (migrated_to), social ID přepojeny.')
  console.log('\nDALŠÍ KROK (UI): otevři "Sloučit kontakty" — zdroj =', JSON.stringify(secondaryPerson.name),
    ', cíl =', JSON.stringify(primaryPerson.name), '→ tlačítko už bude aktivní → dokončí sloučení karet.')
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
