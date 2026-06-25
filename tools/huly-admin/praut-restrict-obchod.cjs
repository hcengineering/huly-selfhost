// Oddělí obchodní data jen pro vedení ("oddělit obchod"):
//   1) vytvoří privátní CardSpace "Obchod" (členové = stejní jako prostor "Vedení"),
//   2) přesune do něj obchodní karty (Příležitost, Nabídka, Zakázka, Faktura) z Default,
//   3) Lead funnel "Potencionální zákazník" přepne na private + členy = vedení.
// Profily lidí a Firmy zůstávají v Default (sdílené). Vratné (přesun zpět / private=false).
//
//   node praut-restrict-obchod.cjs           DRY-RUN
//   node praut-restrict-obchod.cjs --apply    provede
//
// Zápisy → TxOperations se socialId. Spouštět z import-tool s NODE_PATH.
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
const COMMERCIAL = /prilezitost|nabidka|zakazka|faktura/i // bezdiakritické labely typů
const FUNNEL_ID = '6a3abfafb0b5c36dec2898f8'
const OBCHOD_SPACE_ID = 'card:space:PrautObchod'

function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('') }
function env (file) { const out = {}; for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim() } return out }

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
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  // vedení = členství z teamspace "Vedení"
  const teamspaces = await client.findAll('document:class:Teamspace', {})
  const vedeni = teamspaces.find((t) => clean(t.name) === 'Vedení')
  if (!vedeni) { console.log('NENALEZEN prostor "Vedení" — nelze zkopírovat členství.'); await connection.close(); process.exit(1) }
  const members = vedeni.members || []
  const owners = vedeni.owners || members
  console.log(`Vedení členů: ${members.length}`)

  // šablona CardSpace z "Default" (kvůli type)
  const cardSpaces = await client.findAll('card:class:CardSpace', {})
  const def = cardSpaces.find((c) => clean(c.name) === 'Default')
  let obchod = cardSpaces.find((c) => c._id === OBCHOD_SPACE_ID || clean(c.name) === 'Obchod')

  // 1) vytvořit privátní prostor "Obchod"
  if (!obchod) {
    console.log(`\n[1] Vytvořit privátní CardSpace "Obchod" (members=${members.length}, type=${def && def.type})`)
    if (APPLY) {
      await client.createDoc('card:class:CardSpace', core.space.Space, {
        name: 'Obchod', description: 'Obchodní data — jen vedení', private: true,
        members, owners, autoJoin: false, archived: false, type: def ? def.type : undefined
      }, OBCHOD_SPACE_ID)
      obchod = { _id: OBCHOD_SPACE_ID }
      console.log('   → vytvořeno: ' + OBCHOD_SPACE_ID)
    }
  } else {
    console.log(`\n[1] Prostor "Obchod" už existuje (${obchod._id})`)
  }
  const targetSpace = obchod ? obchod._id : OBCHOD_SPACE_ID

  // 2) přesun obchodních karet z Default
  const tags = await client.findAll('card:class:MasterTag', {})
  const commercialTagIds = new Set(tags.filter((t) => COMMERCIAL.test(clean(t.label || t.title || ''))).map((t) => t._id))
  const defCards = def ? await client.findAll('card:class:Card', { space: def._id }) : []
  const toMove = defCards.filter((c) => commercialTagIds.has(c._class))
  const tagLabel = {}; for (const t of tags) tagLabel[t._id] = clean(t.label || t.title || t._id)
  console.log(`\n[2] Přesun ${toMove.length} obchodních karet z Default → Obchod:`)
  for (const c of toMove) {
    console.log(`   ${APPLY ? 'MOVE' : 'DRY '} "${clean(c.title || c.name || c._id)}" [${tagLabel[c._class]}]`)
    if (APPLY) await client.updateDoc(c._class, c.space, c._id, { space: targetSpace })
  }

  // 3) Lead funnel privátní
  const funnel = await client.findOne('lead:class:Funnel', { _id: FUNNEL_ID })
  console.log(`\n[3] Lead funnel "${funnel ? clean(funnel.name) : '?'}" → private=true, members=vedení`)
  if (funnel && APPLY) {
    await client.updateDoc(funnel._class, funnel.space, funnel._id, { private: true, members, autoJoin: false })
    console.log('   → nastaveno')
  } else if (!APPLY) {
    console.log('   DRY: nastavil bych private=true + členy vedení')
  }

  console.log(`\n${APPLY ? 'HOTOVO' : 'DRY-RUN hotov'}.`)
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
