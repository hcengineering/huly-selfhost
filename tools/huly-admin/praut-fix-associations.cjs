// Opraví chybové ikonky (⊘) a syrové hlavičky "$ASSOCIATIONS.<id>_A" u vztahů.
// Příčina: symetrický vztah se STEJNÝM názvem na obou stranách (nameA == nameB
// && classA == classB) — tabulka pak nerozliší stranu A od B. Fix = dát druhé
// straně (nameB) odlišný název (vzor funkčního "člen týmu / členové týmu").
// Vztahy ani existující propojení se NEMAŽOU, jen se přejmenuje nameB.
//
//   node praut-fix-associations.cjs           DRY-RUN (jen vypíše)
//   node praut-fix-associations.cjs --apply    provede přejmenování
//
// Spouštět z HulyPrautplatform/dev/import-tool s NODE_PATH na jeho node_modules.
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

// Mapování pro odlišení druhé strany u známých symetrických vztahů (nameA -> nový nameB).
// Pro neznámé symetrické vztahy se NIC nemění, jen se nahlásí (ať nehádáme).
const RENAME = {
  kolega: 'kolegové',
  partner: 'partneři'
}

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim()
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

  const all = await client.findAll(core.class.Association, {})
  const symmetric = all.filter((a) => a.nameA === a.nameB && a.classA === a.classB)
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Celkem vztahů: ${all.length}; symetrických se stejným názvem: ${symmetric.length}\n`)

  let changed = 0
  for (const a of symmetric) {
    const newB = RENAME[a.nameA]
    if (newB === undefined) {
      console.log(`SKIP  "${a.nameA}" (${a._id}) — není v mapě RENAME, nechávám beze změny.`)
      continue
    }
    if (a.nameB === newB) {
      console.log(`OK    "${a.nameA}" už má rozlišenou druhou stranu ("${newB}").`)
      continue
    }
    if (APPLY) {
      await client.updateDoc(a._class, a.space, a._id, { nameB: newB })
      changed++
      console.log(`FIXED "${a.nameA}/${a.nameA}" → "${a.nameA}/${newB}"  (${a._id})`)
    } else {
      console.log(`DRY   "${a.nameA}/${a.nameA}" → "${a.nameA}/${newB}"  (${a._id})`)
    }
  }

  console.log(`\n${APPLY ? 'Přejmenováno' : 'K přejmenování'}: ${APPLY ? changed : symmetric.filter((a) => RENAME[a.nameA] && a.nameB !== RENAME[a.nameA]).length} vztahů.`)
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
