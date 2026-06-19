// Vytvoří sadu provozních FilteredView pohledů na klíčových card typech.
// Správný vnořený formát value = [[v,[v]]] (dle view-resources/filter.ts valueNinResult).
// Idempotentní: nejdřív smaže spravované pohledy (stejný název+typ), pak vytvoří.
// Self-check: po vytvoření spustí ekvivalentní dotaz a vypíše počet karet.
//   node praut-build-views.cjs           DRY-RUN
//   node praut-build-views.cjs --apply   vytvoří
//   node praut-build-views.cjs --delete  smaže spravované pohledy
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
const DELETE = process.argv.includes('--delete')
const _rawmap = JSON.parse(fs.readFileSync('/tmp/typemap.json', 'utf8'))
// Podpora nového formátu { typemap: {...} } i starého přímého { Nabidka: {...} }
const TYPEMAP = _rawmap.typemap || _rawmap
const MEMBERS = [
  '365e6db8-3544-44f3-b22a-bafe51bff369',
  '3ded1307-141c-4eec-95f8-4cfb017de72e',
  '84cc78fc-aad0-40fc-9ece-0770de2b2b15',
  '081c1cb6-1c08-4826-acfb-be8ca973bd34'
]
const MARK = 'praut-ops' // značka spravovaných pohledů (v poli 'tags' dat)

// SPEC: type label -> [{ name, attr (label), mode, values }]
const SPEC = {
  Nabidka: [
    { name: 'Aktivní', attr: 'stav', mode: 'Nin', values: ['vyhrano', 'prohrano'] },
    { name: 'Ke schválení', attr: 'stav', mode: 'In', values: ['interni kontrola', 'ke schvaleni'] }
  ],
  Zakazka: [
    { name: 'Aktivní', attr: 'stav', mode: 'Nin', values: ['dokonceno', 'archiv'] },
    { name: 'V riziku', attr: 'health', mode: 'In', values: ['cerveny', 'v riziku'] }
  ],
  Faktura: [
    { name: 'Nezaplacené', attr: 'stav', mode: 'Nin', values: ['zaplaceno', 'storno'] },
    { name: 'Po splatnosti', attr: 'stav', mode: 'In', values: ['po splatnosti'] }
  ],
  'Lead/Poptavka': [
    { name: 'Aktivní', attr: 'stav', mode: 'Nin', values: ['prevedeno', 'odmitnuto', 'archiv'] }
  ],
  'Obchodni prilezitost': [
    { name: 'Aktivní', attr: 'faze', mode: 'Nin', values: ['vyhrano', 'prohrano'] },
    { name: 'V riziku', attr: 'riziko', mode: 'In', values: ['vysoke'] }
  ],
  Projekt: [
    { name: 'Aktivní', attr: 'faze', mode: 'Nin', values: ['dokonceno'] }
  ],
  'Zakaznicky pozadavek': [
    { name: 'Otevřené', attr: 'stav', mode: 'Nin', values: ['vyreseno', 'uzavreno'] }
  ],
  Incident: [
    { name: 'Otevřené', attr: 'stav', mode: 'Nin', values: ['uzavreno'] }
  ],
  Riziko: [
    { name: 'Otevřená', attr: 'stav', mode: 'Nin', values: ['uzavreno'] }
  ],
  'Zapis ze schuzky': [
    { name: 'Záznamy ze schůzek', attr: 'stav', mode: 'Nin', values: ['uzavreno'] }
  ]
}

function env (file) { const out = {}; for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].trim() } return out }

function buildFilter (typeId, attrMeta, mode, values) {
  const attribute = {
    attributeOf: typeId, defaultValue: null, isCustom: true,
    label: 'embedded:embedded:' + attrMeta.label, name: attrMeta.key, space: 'core:space:Model',
    type: { _class: 'core:class:EnumOf', label: 'core:string:Enum', of: attrMeta.of },
    _id: attrMeta.attrId, _class: 'core:class:Attribute'
  }
  return {
    key: { _class: typeId, key: attrMeta.key, attribute, label: 'embedded:embedded:' + attrMeta.label, component: 'view:component:ValueFilter' },
    value: values.map((v) => [v, [v]]),
    index: 1,
    modes: ['view:filter:FilterValueIn', 'view:filter:FilterValueNin'],
    mode: mode === 'Nin' ? 'view:filter:FilterValueNin' : 'view:filter:FilterValueIn'
  }
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

  // smazat dříve vytvořené spravované pohledy (dle tagu)
  const existing = await client.findAll('view:class:FilteredView', {})
  const managed = existing.filter((v) => Array.isArray(v.tags) && v.tags.includes(MARK))
  if (DELETE || APPLY) {
    for (const v of managed) await client.removeDoc(v._class, v.space, v._id)
    console.log(`Smazáno ${managed.length} dříve spravovaných pohledů.`)
  }
  if (DELETE) { await connection.close(); console.log('HOTOVO (delete)'); process.exit(0) }

  let created = 0; const report = []
  for (const typeLabel in SPEC) {
    const t = TYPEMAP[typeLabel]
    if (!t || !t.viewlet) { report.push(`SKIP ${typeLabel}: chybí viewlet`); continue }
    for (const view of SPEC[typeLabel]) {
      const attrMeta = t.enums.find((e) => e.label === view.attr)
      if (!attrMeta) { report.push(`SKIP ${typeLabel}/${view.name}: atribut '${view.attr}' nenalezen`); continue }
      const filter = buildFilter(t.typeId, attrMeta, view.mode, view.values)
      const attrs = {
        attachedTo: 'card', filterClass: t.typeId, filters: JSON.stringify([filter]),
        location: { path: ['workbench', 'praut', 'card', 'type', t.typeId] },
        name: view.name, sharable: true, users: MEMBERS, tags: [MARK],
        viewOptions: { groupBy: ['#no_category'], orderBy: ['modifiedOn', -1], showAllVersions: false },
        viewletId: t.viewlet
      }
      // self-check: ekvivalentní dotaz
      let cnt = '?'
      try {
        const q = view.mode === 'Nin' ? { $nin: view.values } : { $in: view.values }
        const cards = await client.findAll(t.typeId, { [attrMeta.key]: q })
        cnt = cards.length
      } catch (e) { cnt = 'ERR:' + e.message }
      if (APPLY) { await client.createDoc('view:class:FilteredView', 'core:space:Workspace', attrs); created++ }
      report.push(`${APPLY ? 'OK' : 'DRY'}  ${typeLabel} / ${view.name}  [${view.attr} ${view.mode} ${view.values.join(',')}]  -> karet teď: ${cnt}`)
    }
  }
  console.log('\n' + report.join('\n'))
  console.log(`\n${APPLY ? 'Vytvořeno' : 'Plánováno'}: ${APPLY ? created : report.filter(r => r.startsWith('DRY')).length} pohledů`)
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
