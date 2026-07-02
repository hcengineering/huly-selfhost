// Vytvoří kurovanou sadu TYPŮ VZTAHŮ (core:class:Association) ve workspace `praut`.
// Bez nich je v UI "Přidat vztah" prázdné okno. Po vytvoření jdou kontakty/firmy/karty propojovat.
//
// Použití (z HulyPrautplatform/dev/import-tool/):
//   node praut-create-relations.cjs            # DRY-RUN: vypíše co by vytvořil / co přeskočí
//   node praut-create-relations.cjs --apply    # provede
//
// Idempotentní: stejnou dvojici classA+classB+nameA založí jen jednou. Nic nemaže.
// Card typy (Lead/Prilezitost/...) jsou card:class:MasterTag — mapují se podle názvu; nenalezené se přeskočí.

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
const serverClientPlugin = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')

const PERSON = 'contact:class:Person'
const ORG = 'contact:class:Organization'

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// normalizace názvu: bez diakritiky, lowercase, jen poslední segment za ':'
function norm (s) {
  return String(s).split(':').pop().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Kontaktní vztahy (pevné třídy)
const CONTACT_RELS = [
  { a: PERSON, b: PERSON, nameA: 'nadřízený', nameB: 'podřízený', type: '1:N' },
  { a: PERSON, b: PERSON, nameA: 'kolega', nameB: 'kolega', type: 'N:N' },
  { a: PERSON, b: ORG, nameA: 'pracuje pro', nameB: 'zaměstnává', type: 'N:N' },
  { a: PERSON, b: ORG, nameA: 'kontaktní osoba', nameB: 'kontakt firmy', type: 'N:N' },
  { a: PERSON, b: ORG, nameA: 'jednatel/vlastník', nameB: 'statutár', type: 'N:N' },
  { a: ORG, b: ORG, nameA: 'mateřská firma', nameB: 'dceřiná firma', type: '1:N' },
  { a: ORG, b: ORG, nameA: 'partner', nameB: 'partner', type: 'N:N' },
  { a: ORG, b: ORG, nameA: 'dodavatel', nameB: 'odběratel', type: 'N:N' }
]

// Vztahy na byznys karty — b je NÁZEV card typu (rozliší se za běhu na MasterTag _id)
const CARD_RELS = [
  { a: PERSON, bCard: 'lead', nameA: 'kontaktní osoba', nameB: 'kontakt', type: 'N:N' },
  { a: PERSON, bCard: 'prilezitost', nameA: 'kontaktní osoba', nameB: 'kontakt', type: 'N:N' },
  { a: PERSON, bCard: 'nabidka', nameA: 'kontaktní osoba', nameB: 'kontakt', type: 'N:N' },
  { a: PERSON, bCard: 'zakazka', nameA: 'kontaktní osoba', nameB: 'kontakt', type: 'N:N' },
  { a: PERSON, bCard: 'projekt', nameA: 'člen týmu', nameB: 'členové týmu', type: 'N:N' },
  { a: ORG, bCard: 'zakazka', nameA: 'objednatel', nameB: 'dodavatel', type: 'N:N' },
  { a: ORG, bCard: 'projekt', nameA: 'klient', nameB: 'dodavatel', type: 'N:N' }
]

async function main () {
  const apply = process.argv.includes('--apply')
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const config = await (await fetch('https://huly.praut.cz/config.json')).json()
  setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD)
  const accountClient = getAccountClient(token)
  const ws = (await accountClient.getUserWorkspaces()).find((w) => w.url === 'praut')
  const selected = await accountClient.selectWorkspace(ws.url)
  const connection = await createClient(selected.endpoint, selected.token, [])
  const client = new TxOperations(connection, socialId)

  // existující asociace (idempotence)
  const existing = await client.findAll('core:class:Association', {})
  const existKey = new Set(existing.map((e) => e.classA + '|' + e.classB + '|' + e.nameA))

  // mapa názvů karet → MasterTag _id (shoda přesná, jinak podřetězcem)
  const masterTags = await client.findAll('card:class:MasterTag', {})
  const cards = masterTags.map((t) => ({ id: t._id, label: String(t.label || t.name || t._id).split(':').pop(), n: norm(t.label || t.name || t._id) }))
  function findCard (key) {
    return cards.find((c) => c.n === key) || cards.find((c) => c.n.includes(key))
  }

  console.log('\n========== TYPY VZTAHŮ ==========')
  console.log('Režim:', apply ? 'APPLY (vytváří)' : 'DRY-RUN (jen výpis)')
  console.log('Existujících asociací:', existing.length, '| MasterTag karet:', masterTags.length)
  console.log('Nalezené byznys karty:', cards.map((c) => c.label).join(', ') || '(žádné)')

  // sestav finální seznam
  const plan = []
  for (const r of CONTACT_RELS) plan.push({ classA: r.a, classB: r.b, nameA: r.nameA, nameB: r.nameB, type: r.type, labelB: r.b.split(':').pop() })
  const missing = []
  for (const r of CARD_RELS) {
    const card = findCard(r.bCard)
    if (!card) { missing.push(r.bCard); continue }
    plan.push({ classA: r.a, classB: card.id, nameA: r.nameA, nameB: r.nameB, type: r.type, labelB: card.label })
  }

  let created = 0
  let skipped = 0
  console.log('\n--- Plán ---')
  for (const p of plan) {
    const key = p.classA + '|' + p.classB + '|' + p.nameA
    const labelA = p.classA.split(':').pop()
    const line = `${labelA} —[${p.nameA} / ${p.nameB}, ${p.type}]→ ${p.labelB}`
    if (existKey.has(key)) { console.log('  ⏭️  už existuje:', line); skipped++; continue }
    if (!apply) { console.log('  ➕ vytvořil by:', line); continue }
    await client.createDoc('core:class:Association', 'core:space:Model', {
      classA: p.classA, classB: p.classB, nameA: p.nameA, nameB: p.nameB, type: p.type
    })
    console.log('  ✅ vytvořeno:', line)
    created++
  }

  if (missing.length) console.log('\n⚠️  Nenalezené card typy (přeskočeno):', missing.join(', '))
  console.log('\n--- Souhrn ---')
  console.log(apply ? `Vytvořeno: ${created}, přeskočeno (existuje): ${skipped}` : `K vytvoření: ${plan.length - skipped}, už existuje: ${skipped}`)
  if (!apply) console.log('Pro provedení spusť znovu s --apply.')
  await connection.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
