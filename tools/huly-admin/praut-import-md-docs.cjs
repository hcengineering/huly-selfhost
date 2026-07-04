// Import .md příloh z chatu do nativních Huly Dokumentů (document:class:Document).
//
// PROČ: Huly stahuje .md soubory z chatu místo zobrazení (formátovaný náhled má jen
// u pár typů). Řešení = obsah .md naimportovat jako Dokumenty → hezký render (nadpisy,
// tabulky, seznamy), fulltext hledání, verze. Originální přílohy v chatu zůstávají.
//
// Seznam souborů (název + blobId) pochází z jednorázového read-only SQL na serveru
// (schema public.attachment) — admin je NEvidí přes API, protože není členem těch
// kanálů (transactor filtruje podle členství v prostoru). Bloby ale jdou stáhnout
// přes front /files podle blobId. Konverze: markdownToMarkup → jsonToMarkup → blob.
//
// Použití (z HulyPrautplatform/dev/import-tool s kombinovaným NODE_PATH):
//   NODE_PATH="$PWD/node_modules:$PWD/../../packages/importer/node_modules" \
//     node /…/tools/huly-admin/praut-import-md-docs.cjs            DRY-RUN
//   … node /…/praut-import-md-docs.cjs --apply                     provede
// Volby: --space "Název" (cíl, default "Podklady k tierům") | --set A|B|all (default A)
globalThis.window = globalThis
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => false
globalThis.location = { href: 'https://huly.praut.cz/', protocol: 'https:', host: 'huly.praut.cz', origin: 'https://huly.praut.cz' }
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', language: 'cs' }, configurable: true }) } catch (e) {}
try { Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true }) } catch (e) {}
const fs = require('fs')
const coreMod = require('@hcengineering/core'); const { TxOperations } = coreMod
const { setMetadata } = require('@hcengineering/platform')
const scp = require('@hcengineering/server-client').default
const { createClient, getAccountClient } = require('@hcengineering/server-client')
const { makeRank } = require('@hcengineering/rank')
const { uploadMarkdownContent } = require(require('path').join(__dirname, 'praut-doc-content.cjs'))

const APPLY = process.argv.includes('--apply')
const SECRETS = '/Users/stepan/praut/huly-poc-secrets.env'
const FRONT = 'https://huly.praut.cz'
function arg (flag, def) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : def }
const SPACE_NAME = arg('--space', 'Podklady k tierům')
const SET = (arg('--set', 'A') || 'A').toUpperCase()

// Zdroj: read-only SQL dump `public.attachment` (workspace praut, name ILIKE '%.md').
// A = kanál Terezy (produktové podklady k tierům); B = kanál „XP systém" (jiné téma).
const SETS = {
  A: [
    { name: 'README.md', blob: 'ad07aae1-a2e2-4a8d-94ba-0ad987c5bf38' },
    { name: 'prirucka-jak-na-claude.md', blob: '32cf7d77-3d24-4b85-b227-9e22c6212c52' },
    { name: 'tier1-10dni-obsah.md', blob: '01ab8a7d-0fad-49fc-bbb7-3b603e00aded' },
    { name: 'tier2-10dni-obsah.md', blob: '22ceb0f4-cf1d-4a54-8f2b-295501b7f5ef' },
    { name: 'tier2-produktova-karta.md', blob: '05e8fa53-6bbd-4fba-b456-db93c4def4d6' },
    { name: 'tier2-setup-nez-zacnes.md', blob: '28ae0128-eb0c-4c91-ac77-f756e774ec0d' },
    { name: 'tier3-10dni-obsah.md', blob: 'd6bce314-2516-4167-ba23-ea5e3cac1513' },
    { name: 'tier3-produktova-karta.md', blob: '04332b4c-7a12-483e-839f-12c2afbd5614' },
    { name: 'tier3-setup-nez-zacnes.md', blob: '680d4adc-2a43-4d1d-bb22-2229f2e92a22' },
    { name: 'tier4-10dni-obsah.md', blob: 'e6782390-dbda-4801-a349-6b0c316b4d08' },
    { name: 'tier4-produktova-karta.md', blob: '888e2ce0-72c0-4d79-a55d-51164e49e308' },
    { name: 'tier4-setup-nez-zacnes.md', blob: '7f92d13c-c8ed-42ef-88cf-1680e6cfe605' }
  ],
  B: [
    { name: 'DIAGNOSTIKA_XP_SYSTEMU.md', blob: 'b2b58dce-4c4a-4b04-965a-bf4228582192' },
    { name: 'XP_SYSTEM_POROVNANI_UCEBNICE_NEW_1_vs_2.md', blob: 'b4eaa24d-ddac-42ab-9fc3-885ad1e95e5d' }
  ]
}

function env (f) { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim() } return o }
function clean (s) { return Array.from(s || '').filter((c) => c.charCodeAt(0) >= 32).join('').trim() }
function titleOf (name) { return name.replace(/\.md$/i, '') }

async function downloadBlob (wsUuid, token, blob) {
  const url = `${FRONT}/files/${wsUuid}?file=${blob}`
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
  if (!r.ok) throw new Error(`stažení blobu ${blob} selhalo: HTTP ${r.status} ${r.statusText}`)
  return await r.text()
}

async function main () {
  const files = SET === 'ALL' ? [...SETS.A, ...SETS.B] : (SETS[SET] || SETS.A)
  const s = env(SECRETS)
  const cfg = await (await fetch(`${FRONT}/config.json`)).json(); setMetadata(scp.metadata.Endpoint, cfg.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD); const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).filter((w) => w.url === 'praut')
  if (!ws.length) throw new Error('workspace praut nenalezen')
  const sel = await ac.selectWorkspace(ws[0].url)
  const wsUuid = ws[0].uuid; const adminAccount = sel.account
  const conn = await createClient(sel.endpoint, sel.token, []); const c = new TxOperations(conn, socialId)

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | cíl teamspace: "${SPACE_NAME}" | sada: ${SET} (${files.length} souborů) | admin=${adminAccount}`)

  // --- Cílový teamspace: najít, případně vytvořit ---
  const teamspaces = await c.findAll('document:class:Teamspace', {})
  let space = teamspaces.find((t) => clean(t.name) === SPACE_NAME)
  if (!space) {
    console.log(`\nTeamspace "${SPACE_NAME}" neexistuje → ${APPLY ? 'vytvářím (privátní, vlastník admin)' : 'DRY: vytvořil bych ho'}`)
    if (APPLY) {
      const spaceId = coreMod.generateId()
      await c.createDoc('document:class:Teamspace', 'core:space:Space', {
        name: SPACE_NAME,
        description: 'Produktové podklady k tierům (import z chatu).',
        private: true,
        archived: false,
        autoJoin: false,
        members: [adminAccount],
        owners: [adminAccount],
        type: 'document:spaceType:DefaultTeamspaceType',
        icon: 'view:ids:IconWithEmoji',
        color: [128218]
      }, spaceId)
      await c.createMixin(spaceId, 'document:class:Teamspace', 'core:space:Space', 'document:mixin:DefaultTeamspaceTypeData', {})
      space = (await c.findAll('document:class:Teamspace', { _id: spaceId }))[0]
      console.log(`  → teamspace vytvořen: ${spaceId}`)
    }
  } else {
    console.log(`\nTeamspace "${SPACE_NAME}" nalezen: ${space._id}`)
  }

  // Existující dokumenty v cíli (idempotence podle titulku)
  const existingTitles = new Set()
  if (space) for (const d of await c.findAll('document:class:Document', { space: space._id })) existingTitles.add(clean(d.title))

  let created = 0; let skipped = 0; let prevRank
  console.log('\n=== soubory ===')
  for (const f of files) {
    const title = titleOf(f.name)
    if (existingTitles.has(title)) { console.log(`  ⏭  ${title}  (už existuje, přeskočeno)`); skipped++; continue }
    let md
    try { md = await downloadBlob(wsUuid, sel.token, f.blob) } catch (e) { console.log(`  ✗  ${title}  — ${e.message}`); continue }
    const imgs = (md.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length
    prevRank = makeRank(undefined, prevRank)
    if (APPLY && space) {
      const docId = coreMod.generateId()
      const blobId = await uploadMarkdownContent(sel.token, docId, md)
      await c.createDoc('document:class:Document', space._id, {
        title, content: blobId, parent: 'document:ids:NoParent',
        attachments: 0, comments: 0, labels: 0, references: 0, embeddings: 0, snapshots: 0, rank: prevRank
      }, docId)
      console.log(`  ✅ ${title}  (${md.length} znaků${imgs ? ', ' + imgs + ' obrázků – src se nemusí načíst' : ''})  → ${docId}`)
      created++
    } else {
      console.log(`  •  ${title}  (${md.length} znaků${imgs ? ', ' + imgs + ' obrázků – pozor na src' : ''})  → vytvořil bych dokument`)
    }
  }

  console.log(`\nHotovo: ${APPLY ? 'vytvořeno ' + created : 'k vytvoření ' + files.filter((f) => !existingTitles.has(titleOf(f.name))).length}, přeskočeno ${skipped}.`)
  if (!APPLY) console.log('Spusť s --apply pro provedení.')
  await conn.close(); process.exit(0)
}
main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1) })
