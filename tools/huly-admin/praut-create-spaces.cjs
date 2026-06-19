// Vytvoří pojmenované CardSpaces pro PRAUT workspace (viditelné v levém panelu Cards).
// Idempotentní: pokud space se stejným názvem existuje, přeskočí.
//   node praut-create-spaces.cjs           DRY-RUN
//   node praut-create-spaces.cjs --apply   vytvoří
//   node praut-create-spaces.cjs --list    pouze vypíše existující spaces
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}
globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}

const fs = require('fs')
const { TxOperations } = require('@hcengineering/core')
const { setMetadata } = require('@hcengineering/platform')
const scp = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const APPLY = process.argv.includes('--apply')
const LIST = process.argv.includes('--list')
const PARENT = 'core:space:Space'

// Spaces, které chceme vytvořit
const SPACES_TO_CREATE = [
  { name: 'Schůzky', description: 'Záznamy ze schůzek — interní i s klienty' },
]

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

  // Existující spaces (vč. archivovaných)
  const existing = await client.findAll('card:class:CardSpace', {})
  console.log(`\nExistující CardSpaces (${existing.length}):`)
  for (const sp of existing) {
    console.log(`  [${sp.archived ? 'ARCHIV' : 'ACTIVE'}] "${sp.name}" (${sp._id})`)
  }

  if (LIST) { await conn.close(); process.exit(0) }

  console.log(`\nMode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const created = []
  for (const spec of SPACES_TO_CREATE) {
    const exists = existing.find(sp => sp.name === spec.name && !sp.archived)
    if (exists) {
      console.log(`\nPŘESKOČEN: "${spec.name}" už existuje (${exists._id})`)
      created.push({ name: spec.name, id: exists._id, wasNew: false })
      continue
    }

    if (!APPLY) {
      console.log(`\nDRY-RUN: "${spec.name}" by byl vytvořen v ${PARENT}`)
      continue
    }

    const spaceId = await client.createDoc('card:class:CardSpace', PARENT, {
      name: spec.name,
      description: spec.description || '',
      private: false,
      archived: false,
      members: []
    })
    console.log(`\nVytvořen: "${spec.name}" (${spaceId})`)
    created.push({ name: spec.name, id: spaceId, wasNew: true })
  }

  if (APPLY && created.length > 0) {
    console.log('\n=== VÝSLEDEK ===')
    for (const c of created) {
      if (c.wasNew) {
        console.log(`  NOVÝ: "${c.name}" → ID: ${c.id}`)
        console.log(`  → Uživatel vidí "${c.name}" v levém panelu Cards`)
        console.log(`  → Pro přesun DEMO schůzek: spusť praut-create-demo.cjs --apply --space=${c.id}`)
      } else {
        console.log(`  EXISTUJÍCÍ: "${c.name}" → ID: ${c.id}`)
      }
    }
  }

  if (!APPLY) {
    console.log('\nDRY-RUN — nic nebylo vytvořeno. Spusť s --apply.')
  }

  await conn.close()
  process.exit(0)
}

main().catch(e => { console.error('ERROR:', e.message || e); process.exit(1) })
