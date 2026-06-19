// Generuje /tmp/typemap.json — runtime cache s metadaty custom card typů pro PRAUT.
// Spouštěj kdykoli se změnil datový model (nový typ, atribut, enum).
//   node praut-typemap.cjs
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
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const config = await (await fetch('https://huly.praut.cz/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const accountClient = getAccountClient(token)
  const ws = (await accountClient.getUserWorkspaces()).filter((w) => w.url === 'praut')
  const selected = await accountClient.selectWorkspace(ws[0].url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  // 1. Najdi všechny custom card typy (MasterTag)
  const masterTags = await client.findAll('card:class:MasterTag', {})
  console.log(`Nalezeno ${masterTags.length} MasterTag typů`)

  // 2. Načti všechny atributy najednou
  const allAttrs = await client.findAll('core:class:Attribute', {})
  console.log(`Načteno ${allAttrs.length} atributů celkem`)

  // 3. Načti všechny enumy najednou
  const allEnums = await client.findAll('core:class:Enum', {})
  console.log(`Načteno ${allEnums.length} enumů celkem`)
  const enumById = {}
  for (const e of allEnums) enumById[e._id] = e

  // 4. Načti viewlety pro card typy
  const viewlets = await client.findAll('view:class:Viewlet', {})
  console.log(`Načteno ${viewlets.length} viewletů celkem`)

  // 5. Najdi card spaces
  const cardSpaces = await client.findAll('card:class:CardSpace', {})
  console.log(`Nalezeno ${cardSpaces.length} CardSpace prostorů`)

  // 6. Zjisti skutečné ID card:space:Default
  const defaultSpace = cardSpaces.find(s => s._id === 'card:space:Default') ||
    cardSpaces.find(s => s.name === 'Default') ||
    cardSpaces[0]
  console.log(`Default card space: ${defaultSpace?._id} (${defaultSpace?.name})`)

  // 7. Postav typemapu
  const typemap = {}
  for (const tag of masterTags) {
    const rawLabel = tag.label || tag.name || tag._id
    // Extrahuj krátký název: "embedded:embedded:Nabidka" → "Nabidka", nebo "Nabidka" → "Nabidka"
    const label = String(rawLabel).split(':').pop()
    const typeId = tag._id

    // Atributy tohoto typu
    const attrs = allAttrs.filter(a => a.attributeOf === typeId)

    // Helper: label z IntlString "embedded:embedded:stav" → "stav"
    const lbl = (s) => (typeof s === 'string' ? s.split(':').pop() : s)

    // Enum atributy
    const enums = []
    for (const attr of attrs) {
      if (attr.type && attr.type._class === 'core:class:EnumOf' && attr.type.of) {
        const enumDef = enumById[attr.type.of]
        enums.push({
          key: attr.name,
          label: lbl(attr.label),
          attrId: attr._id,
          of: attr.type.of,
          values: enumDef ? (enumDef.enumValues || []).map(v => (typeof v === 'string' ? v : v.value || JSON.stringify(v))) : []
        })
      }
    }

    // String atributy
    const strings = attrs
      .filter(a => a.type && a.type._class === 'core:class:TypeString')
      .map(a => ({ key: a.name, attrId: a._id, label: lbl(a.label) }))

    // Ref atributy (pro asociace a linky)
    const refs = attrs
      .filter(a => a.type && (a.type._class === 'core:class:RefTo' || a.type._class === 'core:class:TypeRef'))
      .map(a => ({ key: a.name, attrId: a._id, to: a.type.to || a.type._class, label: lbl(a.label) }))

    // Date atributy
    const dates = attrs
      .filter(a => a.type && a.type._class === 'core:class:TypeDate')
      .map(a => ({ key: a.name, attrId: a._id, label: lbl(a.label) }))

    // Number atributy
    const numbers = attrs
      .filter(a => a.type && a.type._class === 'core:class:TypeNumber')
      .map(a => ({ key: a.name, attrId: a._id, label: lbl(a.label) }))

    // Viewlet pro tento typ (preferuj list descriptor)
    const typeViewlets = viewlets.filter(v => v.attachTo === typeId)
    const viewlet = typeViewlets.find(v => v.descriptor && v.descriptor.includes('List')) ||
      typeViewlets.find(v => v.descriptor && v.descriptor.includes('Table')) ||
      typeViewlets[0]

    typemap[label] = {
      typeId,
      label,
      fullLabel: rawLabel,
      viewlet: viewlet?._id || null,
      allViewlets: typeViewlets.map(v => ({ id: v._id, descriptor: v.descriptor })),
      enums,
      strings,
      refs,
      dates,
      numbers,
      attrCount: attrs.length
    }
  }

  // 8. Metadata
  const meta = {
    generatedAt: new Date().toISOString(),
    defaultSpaceId: defaultSpace?._id || 'card:space:Default',
    cardSpaces: cardSpaces.map(s => ({ id: s._id, name: s.name, archived: s.archived })),
    typemap
  }

  fs.writeFileSync('/tmp/typemap.json', JSON.stringify(meta, null, 2))
  console.log('\n=== HOTOVO ===')
  console.log('Typy s viewletem:')
  for (const [label, t] of Object.entries(typemap)) {
    if (t.viewlet) console.log(`  ✅ ${label}: ${t.enums.length}× enum, ${t.strings.length}× string, ${t.dates.length}× date, viewlet=${t.viewlet}`)
    else console.log(`  ⚠️  ${label}: ${t.enums.length}× enum, ${t.strings.length}× string — bez viewletu`)
  }
  console.log(`\nUloženo do /tmp/typemap.json`)
  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
