// Offboarding zaměstnance — dvoufázový.
//
// FÁZE 1 (teď): DEAKTIVACE = okamžitá ztráta přístupu, ale vratné 2 měsíce.
//   - nastaví Employee.active = false (zmizí z výběrů, nejde mu přiřazovat práci)
//   - zapíše datum deaktivace do offboarding-tracker.json
//   - vypíše SQL pro server, kterým se zablokuje přihlášení (vratné)
// RECOVER: vrátí active=true a vypíše odblokovací SQL (pro návrat do 2 měsíců).
//
// FÁZE 2 (až na novém serveru, měsíční hlídač): PURGE-SWEEP = trvalý výmaz účtů
//   deaktivovaných > GRACE_DAYS. Osoba ZŮSTANE přejmenovaná na "(bývalý zaměstnanec)",
//   takže jí vytvořený obsah zůstává s jménem + označením. Účet (login) se smaže v DB.
//   Zatím jen DRY-RUN / příprava — cron se zapne po migraci (viz docs/MIGRATION-RUNBOOK.md).
//
// Použití (z import-tool s NODE_PATH):
//   node praut-offboard-user.cjs --list
//   node praut-offboard-user.cjs --deactivate <email|personId>            (DRY-RUN)
//   node praut-offboard-user.cjs --deactivate <email|personId> --apply
//   node praut-offboard-user.cjs --recover    <email|personId> --apply
//   node praut-offboard-user.cjs --purge-sweep                            (DRY-RUN; --apply až na novém serveru)
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const path = require('path')
const coreMod = require('@hcengineering/core')
const core = coreMod.default
const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
const GRACE_DAYS = 60
const EMP_MIXIN = 'contact:mixin:Employee'
const TRACKER = path.join(__dirname, 'offboarding-tracker.json')
// Pojistka: tyto NIKDY neoffboardovat (boti/integrace/admin).
const PROTECTED_NAMES = ['huly-praut', 'huly-praut[bot]', 'Admin,Praut']

function arg (flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined }
function env (file) { const out = {}; for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim() } return out }
function loadTracker () { try { return JSON.parse(fs.readFileSync(TRACKER, 'utf8')) } catch (e) { return { offboarded: [] } } }
function saveTracker (t) { if (APPLY) fs.writeFileSync(TRACKER, JSON.stringify(t, null, 2) + '\n') }
function hulyUuid (sids, personId) { const m = sids.find((s) => s.attachedTo === personId && s.type === 'huly'); return m ? m.value : undefined }
function emailOf (sids, personId) { const m = sids.find((s) => s.attachedTo === personId && s.type === 'email'); return m ? m.value : undefined }

async function connect () {
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const config = await (await fetch('https://huly.praut.cz/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const accountClient = getAccountClient(token)
  const ws = (await accountClient.getUserWorkspaces()).filter((w) => w.url === 'praut')
  const selected = await accountClient.selectWorkspace(ws[0].url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  return { connection, client: new TxOperations(connection, socialId) }
}

// Najde právě jednu osobu podle person _id nebo e-mailu; jinak chyba (kvůli duplicitám).
function resolvePerson (persons, sids, key) {
  const byId = persons.find((p) => p._id === key)
  if (byId) return byId
  const matchIds = sids.filter((s) => s.type === 'email' && s.value === key).map((s) => s.attachedTo)
  const matches = persons.filter((p) => matchIds.includes(p._id))
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) throw new Error(`Nenalezen nikdo pro "${key}". Zadej e-mail nebo person _id.`)
  throw new Error(`Nejednoznačné — "${key}" odpovídá ${matches.length} osobám: ${matches.map((p) => p.name + ' (' + p._id + ')').join(', ')}. Zadej konkrétní person _id.`)
}

function lockSql (uuid) { return `docker compose exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database=defaultdb -e "UPDATE global_account.account SET failed_login_attempts = 999 WHERE uuid = '${uuid}';"` }
function unlockSql (uuid) { return `docker compose exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database=defaultdb -e "UPDATE global_account.account SET failed_login_attempts = 0 WHERE uuid = '${uuid}';"` }

async function main () {
  const nowIso = new Date().toISOString()
  const { connection, client } = await connect()
  const h = client.getHierarchy()
  const persons = await client.findAll('contact:class:Person', {})
  const sids = await client.findAll('contact:class:SocialIdentity', {})
  const tracker = loadTracker()
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  if (process.argv.includes('--list')) {
    console.log('=== Aktuálně offboardovaní (tracker) ===')
    if (!tracker.offboarded.length) console.log('  (žádní)')
    for (const e of tracker.offboarded) {
      const days = Math.floor((Date.parse(nowIso) - Date.parse(e.deactivatedOn)) / 86400000)
      console.log(`  ${e.name}  | deaktivován ${e.deactivatedOn.slice(0, 10)} (${days} dní)  | uuid=${e.uuid}  | purge za ${Math.max(0, GRACE_DAYS - days)} dní`)
    }
    await connection.close(); process.exit(0)
  }

  // ===== PURGE-SWEEP (pro nový server) =====
  if (process.argv.includes('--purge-sweep')) {
    console.log(`=== PURGE-SWEEP (grace ${GRACE_DAYS} dní) ===`)
    const due = tracker.offboarded.filter((e) => (Date.parse(nowIso) - Date.parse(e.deactivatedOn)) / 86400000 >= GRACE_DAYS)
    if (!due.length) console.log('  Nikdo k trvalému výmazu.')
    for (const e of due) {
      const p = persons.find((pp) => pp._id === e.personId)
      const newName = p && !/bývalý zaměstnanec/.test(p.name) ? `${p.name} (bývalý zaměstnanec)` : (p ? p.name : e.name)
      console.log(`\n• ${e.name} (uuid=${e.uuid})`)
      console.log(`  1) přejmenovat osobu → "${newName}" (obsah zůstává s označením), active=false`)
      console.log(`  2) SMAZAT účet v DB (spusť na serveru):`)
      console.log(`     docker compose exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database=defaultdb -e "DELETE FROM global_account.workspace_members WHERE account = '${e.uuid}'; DELETE FROM global_account.social_id WHERE account = '${e.uuid}'; DELETE FROM global_account.account WHERE uuid = '${e.uuid}';"`)
      console.log('     (POZN.: názvy sloupců social_id/workspace_members ověřit na serveru — viz [[huly-account-management]].)')
      if (APPLY && p) { await client.updateDoc(p._class, p.space, p._id, { name: newName }); console.log('  → osoba přejmenována (API).') }
    }
    if (APPLY) console.log('\nDB výmaz NEPROVÁDÍM odsud — spusť vypsané SQL na serveru, pak odeber z trackeru.')
    await connection.close(); process.exit(0)
  }

  // ===== DEACTIVATE / RECOVER =====
  const key = arg('--deactivate') || arg('--recover')
  if (!key) { console.log('Zadej --deactivate <email|personId> | --recover <email|personId> | --list | --purge-sweep'); await connection.close(); process.exit(2) }
  const person = resolvePerson(persons, sids, key)
  if (PROTECTED_NAMES.includes(person.name) || !h.hasMixin(person, EMP_MIXIN)) {
    throw new Error(`"${person.name}" je chráněný (bot/admin) nebo není zaměstnanec — offboarding odmítnut.`)
  }
  const uuid = hulyUuid(sids, person._id)
  const email = emailOf(sids, person._id)
  const emp = h.as(person, EMP_MIXIN)

  if (process.argv.includes('--recover')) {
    console.log(`=== RECOVER: ${person.name} ===`)
    if (APPLY) { await client.updateMixin(person._id, 'contact:class:Person', person.space, EMP_MIXIN, { active: true }); console.log('  active = true (API)') }
    else console.log('  DRY: nastavil bych active=true')
    tracker.offboarded = tracker.offboarded.filter((e) => e.personId !== person._id)
    saveTracker(tracker)
    console.log('\nOdblokuj přihlášení na serveru:')
    console.log('  ' + (uuid ? unlockSql(uuid) : '(účet bez huly UUID — nic k odblokování)'))
    await connection.close(); process.exit(0)
  }

  // deactivate
  console.log(`=== DEAKTIVACE: ${person.name} ===`)
  console.log(`  person=${person._id}  uuid=${uuid || '-'}  email=${email || '-'}  active teď=${emp.active}`)
  if (APPLY) {
    await client.updateMixin(person._id, 'contact:class:Person', person.space, EMP_MIXIN, { active: false })
    console.log('  → active = false (API) — zmizí z výběrů, nejde přiřazovat')
    if (!tracker.offboarded.find((e) => e.personId === person._id)) {
      tracker.offboarded.push({ personId: person._id, uuid, name: person.name, email, deactivatedOn: nowIso })
    }
    saveTracker(tracker)
    console.log('  → zapsáno do offboarding-tracker.json (datum deaktivace)')
  } else {
    console.log('  DRY: nastavil bych active=false a zapsal datum do trackeru')
  }
  console.log('\nZablokuj přihlášení (okamžitá ztráta přístupu) — spusť na serveru:')
  console.log('  ' + (uuid ? lockSql(uuid) : '(účet bez huly UUID — login neřešen)'))
  console.log(`\nNávrat do ${GRACE_DAYS} dní: node praut-offboard-user.cjs --recover ${email || person._id} --apply`)
  await connection.close(); process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
