// Vytvoří Chunter kanál "#praut-denni-prehled" jako navigační hub.
// Idempotentní: pokud kanál existuje, přeskočí.
//   node praut-create-chunter.cjs           DRY-RUN (výpis existujících)
//   node praut-create-chunter.cjs --apply   vytvoří
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}

const fs = require('fs')
const coreMod = require('@hcengineering/core')
const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const scp = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
const CHANNEL_NAME = 'praut-denni-prehled'
const CHANNEL_TOPIC = 'Denní přehled — kde co v Huly najdeš'

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
  setMetadata(scp.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).find(w => w.url === 'praut')
  const sel = await ac.selectWorkspace(ws.url)
  const conn = await createClient(sel.endpoint, sel.token, [])
  const client = new TxOperations(conn, socialId)

  // Zjistit dostupné Chunter třídy
  const classes = await client.findAll('core:class:Class', {})
  const chunterClasses = classes.filter(c => c._id && c._id.includes('chunter'))
  console.log(`\nChunter třídy (${chunterClasses.length}):`)
  for (const c of chunterClasses) console.log(`  ${c._id}`)

  // Zkusit najít existující kanály
  let channels = []
  try {
    channels = await client.findAll('chunter:class:Channel', {})
    console.log(`\nExistující kanály (${channels.length}):`)
    for (const ch of channels) console.log(`  "${ch.name}" (${ch._id})`)
  } catch (e) {
    console.log(`\nfindAll chunter:class:Channel selhalo: ${e.message}`)
  }

  if (!APPLY) {
    console.log(`\nMode: DRY-RUN — nic nebylo vytvořeno.`)
    console.log(`Spusť s --apply pro vytvoření kanálu "#${CHANNEL_NAME}".`)
    await conn.close()
    process.exit(0)
  }

  const exists = channels.find(ch => ch.name === CHANNEL_NAME)
  if (exists) {
    console.log(`\nPŘESKOČEN: kanál "#${CHANNEL_NAME}" už existuje (${exists._id})`)
    await conn.close()
    process.exit(0)
  }

  // Zkusit najít správný parent space pro Chunter
  let chunterSpace = null
  try {
    const allSpaces = await client.findAll('core:class:Space', {})
    chunterSpace = allSpaces.find(sp => sp._id && sp._id.includes('chunter'))
    if (chunterSpace) console.log(`\nChunter space: ${chunterSpace._id}`)
  } catch (e) {
    console.log(`Chyba při hledání Chunter space: ${e.message}`)
  }

  if (!chunterSpace) {
    console.log('\nChunter space nenalezen — zkouším chunter:space:Chunter jako parent...')
  }

  const parentSpace = chunterSpace ? chunterSpace._id : 'chunter:space:Chunter'

  try {
    const channelId = await client.createDoc('chunter:class:Channel', parentSpace, {
      name: CHANNEL_NAME,
      topic: CHANNEL_TOPIC,
      description: 'Navigační přehled: kde co v Huly najdeš. Připnutá zpráva nahoře.',
      private: false,
      archived: false,
      members: [],
      messages: 0,
      pinned: []
    })
    console.log(`\nVytvořen kanál "#${CHANNEL_NAME}" (${channelId})`)
    console.log('→ Kanál najdeš v Huly → Chunter (levý panel → Chat)')
  } catch (e) {
    console.log(`\nCHYBA při vytváření kanálu: ${e.message}`)
    console.log('Chunter kanál musí být vytvořen ručně přes Huly UI → Chunter → "+" → New Channel')
  }

  await conn.close()
  process.exit(0)
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1) })
