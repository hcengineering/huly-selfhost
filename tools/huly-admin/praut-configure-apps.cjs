// Zjednodušení Huly: vypne nepoužívané moduly (celé aplikace) per workspace — BEZ buildu, VRATNĚ.
// Mechanismus: core:class:PluginConfiguration (_id = plugin-configuration-<pluginId>), pole `enabled`.
// Klient (plugins/client-resources) odfiltruje model txy vypnutých pluginů → aplikace zmizí z menu
// všem uživatelům (UI se jim samo přenačte). Data se NEmažou; zpětné zapnutí = --restore.
//
// Rozhodnutí Štěpána 2026-07-08: nechat jen Tracker · Lead · Dokumenty · Chat · Contacts · Kalendář · GitHub.
// Vypnout: karty, process, HR, drive, board, training, survey, QMS docs, inventory, recruit, products,
// questions, test management, telegram, gmail, bitrix, beta chat, love (Love až na novém serveru).
//
//   node praut-configure-apps.cjs                 DRY-RUN: vypíše všechny PluginConfiguration + co by vypnul
//   node praut-configure-apps.cjs --apply          vypne DISABLE seznam
//   node praut-configure-apps.cjs --restore <id>   zapne zpět jeden plugin (např. --restore card)
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

const APPLY = process.argv.includes('--apply')
function arg (f) { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined }
const RESTORE = arg('--restore')
function env (f) { const o = {}; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim() } return o }

// Explicitní seznam k vypnutí (pluginId). Záměrně NE „vypni vše ostatní" — systémové pluginy nesahat.
const DISABLE = [
  'card',            // Karty — nepoužívané, duplicita s Lead/Tracker (rozhodnutí 2026-07-08)
  'process',         // alert procesy jedou na kartách → bez karet mrtvé (vrátí se na novém serveru)
  'hr',              // oddělení/dovolené — nepoužívané
  'board',           // kanban Board — nepoužívaný
  'training',        // školení modul — nepoužívaný
  'survey',          // ankety — nepoužívané
  'inventory',       // sklad — nepoužívaný
  'recruit',         // nábor — nepoužívaný
  'products',        // produkty — nepoužívané
  'questions',       // kvízy — nepoužívané
  'testManagement',  // test management — nepoužívaný (přesné ID ověří DRY-RUN výpis; zkusí se i 'test-management')
  'telegram',        // integrace — nepoužívaná
  'gmail',           // integrace — nepoužívaná
  'bitrix',          // migrace z Bitrixu — nepoužívané
  'chat',            // beta AI chat (hidden) — nepoužívaný
  'love'             // virtuální kancelář — zapne se na novém serveru s LiveKit
]
// Tyto NIKDY nevypínat (jádro + používané) — jen pojistka pro kontrolu překlepů v DISABLE:
const NEVER = ['tracker', 'lead', 'document', 'chunter', 'contact', 'calendar', 'github', 'notification',
  'workbench', 'setting', 'view', 'activity', 'attachment', 'core', 'login', 'guest', 'time']

async function main () {
  const bad = DISABLE.filter((d) => NEVER.includes(d))
  if (bad.length) { console.log('CHYBA: DISABLE obsahuje chráněné pluginy:', bad.join(', ')); process.exit(2) }
  const s = env('/Users/stepan/praut/huly-poc-secrets.env')
  const cfg = await (await fetch('https://huly.praut.cz/config.json')).json(); setMetadata(scp.metadata.Endpoint, cfg.ACCOUNTS_URL)
  const { token, socialId } = await getAccountClient().login(s.ADMIN_EMAIL, s.ADMIN_PASSWORD); const ac = getAccountClient(token)
  const ws = (await ac.getUserWorkspaces()).filter((w) => w.url === 'praut'); const sel = await ac.selectWorkspace(ws[0].url)
  const conn = await createClient(sel.endpoint, sel.token, []); const c = new TxOperations(conn, socialId)

  const all = await c.findAll('core:class:PluginConfiguration', {})
  console.log(`Mode: ${RESTORE ? 'RESTORE ' + RESTORE : (APPLY ? 'APPLY' : 'DRY-RUN')} | PluginConfiguration celkem: ${all.length}\n`)

  if (RESTORE) {
    const doc = all.find((x) => x.pluginId === RESTORE)
    if (!doc) { console.log('Plugin nenalezen:', RESTORE); await conn.close(); process.exit(1) }
    await c.updateDoc(doc._class, doc.space, doc._id, { enabled: true })
    console.log(`✅ "${RESTORE}" zapnut zpět (enabled=true). Uživatelům se přenačte UI.`)
    await conn.close(); process.exit(0)
  }

  // výpis všech (ověření ID) + plán
  const rows = all.map((x) => ({ id: x.pluginId, enabled: x.enabled !== false, system: x.system === true, inDisable: DISABLE.includes(x.pluginId) }))
  rows.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  for (const r of rows) {
    const mark = r.inDisable ? (r.enabled ? '→ VYPNOUT' : '= už vypnuto') : (NEVER.includes(r.id) ? '(ponechat — jádro/používané)' : '(nechávám být)')
    console.log(`  ${String(r.id).padEnd(18)} enabled=${r.enabled}${r.system ? ' SYSTEM' : ''}  ${mark}`)
  }
  const missing = DISABLE.filter((d) => !all.some((x) => x.pluginId === d))
  if (missing.length) console.log('\n⚠️ V DISABLE, ale v DB nenalezeno (zkontroluj ID):', missing.join(', '))

  const targets = all.filter((x) => DISABLE.includes(x.pluginId) && x.enabled !== false && x.system !== true)
  console.log(`\nK vypnutí teď: ${targets.length}`)
  if (APPLY) {
    for (const t of targets) { await c.updateDoc(t._class, t.space, t._id, { enabled: false }); console.log('  ✗ vypnuto:', t.pluginId) }
    console.log('\n✅ Hotovo. Všem přihlášeným se UI přenačte. Vrácení: --restore <pluginId>.')
  } else {
    console.log('DRY-RUN → pro provedení přidej --apply')
  }
  await conn.close(); process.exit(0)
}
main().catch((e) => { console.error('ERR', e.stack || e.message); process.exit(1) })
