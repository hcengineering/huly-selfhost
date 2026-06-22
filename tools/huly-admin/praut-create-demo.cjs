// Vytvoří ukázkový obchodní řetězec DEMO karet: Firma → Lead → Příležitost → Nabídka → Zakázka → Faktura + Projekt + 3× Zápis ze schůzky.
// Idempotentní: nejdřív odstraní existující DEMO karty (dle prefixu "DEMO - "), pak vytvoří nové.
//   node praut-create-demo.cjs           DRY-RUN (pouze vypíše co by vytvořil)
//   node praut-create-demo.cjs --apply   vytvoří/obnoví
//   node praut-create-demo.cjs --delete  smaže existující DEMO karty
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

const APPLY = process.argv.includes('--apply')
const DELETE = process.argv.includes('--delete')
const SPACE = 'card:space:Default'
// Schůzky CardSpace — vytvořen skriptem praut-create-spaces.cjs
const SCHUZKY_SPACE = '6a35824737b43c4db539494a'
const DEMO_PREFIX = 'DEMO - '

// ─── Konstanty z typemapy ────────────────────────────────────────────────────
// UUID klíče jsou skutečné property names na dokumentech (ne lidsky čitelné etikety)
const T = {
  Firma:          '6a2bb7f8295c2f467fa1d4c1',
  Lead:           '6a2bb7f8295c2f467fa1d502',
  Prilezitost:    '6a2bb7f8295c2f467fa1d519',
  Nabidka:        '6a2bb7f8295c2f467fa1d517',
  Zakazka:        '6a2bb7f8295c2f467fa1d4bf',
  Faktura:        '6a2bb7f8295c2f467fa1d4bd',
  Projekt:        '6a2bb7f8295c2f467fa1d50f',
  ZapisSch:       '6a2bb7f8295c2f467fa1d565',
}

// Attr klíče — UUID property names na kartách
const ATTR = {
  // Firma
  firma_stav_vztahu:       '6a2bb7f8295c2f467fa1d4cf',
  firma_citlivost:         '6a2bb7f8295c2f467fa1d4d1',
  firma_nazev:             '6a2bb7f8295c2f467fa1d4ca',
  firma_ICO:               '6a2bb7f8295c2f467fa1d4cb',
  firma_web:               '6a2bb7f8295c2f467fa1d4cc',
  firma_segment:           '6a2bb7f8295c2f467fa1d4cd',
  firma_vlastnik:          '6a2bb7f8295c2f467fa1d4d0',
  // Lead
  lead_priorita:           '6a2bb7f8295c2f467fa1d50a',
  lead_stav:               '6a2bb7f8295c2f467fa1d50c',
  lead_zdroj:              '6a2bb7f8295c2f467fa1d503',
  lead_firma:              '6a2bb7f8295c2f467fa1d504',
  lead_potreba:            '6a2bb7f8295c2f467fa1d506',
  lead_dalsi_krok:         '6a2bb7f8295c2f467fa1d50d',
  // Obchodní příležitost
  pril_faze:               '6a2bb7f8295c2f467fa1d523',
  pril_riziko:             '6a2bb7f8295c2f467fa1d527',
  pril_ocekavane_uzavreni: '6a2bb7f8295c2f467fa1d526',
  pril_vlastnik:           '6a2bb7f8295c2f467fa1d528',
  // Nabídka
  nab_stav:                '6a2bb7f8295c2f467fa1d521',
  nab_klient:              '6a2bb7f8295c2f467fa1d518',
  nab_prilezitost:         '6a2bb7f8295c2f467fa1d51a',
  nab_rozsah:              '6a2bb7f8295c2f467fa1d51b',
  nab_platnost:            '6a2bb7f8295c2f467fa1d51d',
  nab_verze:               '6a2bb7f8295c2f467fa1d51e',
  nab_schvalovatel:        '6a2bb7f8295c2f467fa1d51f',
  // Zakázka
  zak_typ:                 '6a2bb7f8295c2f467fa1d554',
  zak_health:              '6a2bb7f8295c2f467fa1d556',
  zak_stav:                '6a2bb7f8295c2f467fa1d558',
  zak_PM:                  '6a2bb7f8295c2f467fa1d54e',
  zak_start:               '6a2bb7f8295c2f467fa1d54f',
  zak_termin:              '6a2bb7f8295c2f467fa1d550',
  zak_obnova:              '6a2bb7f8295c2f467fa1d552',
  zak_klient:              '6a2bb7f8295c2f467fa1d54c',
  zak_nabidka:             '6a2bb7f8295c2f467fa1d54d',
  // Faktura
  fak_stav:                '6a2bb7f8295c2f467fa1d4c8',
  fak_cislo:               '6a2bb7f8295c2f467fa1d4be',
  fak_zakazka:             '6a2bb7f8295c2f467fa1d4c0',
  fak_klient:              '6a2bb7f8295c2f467fa1d4c2',
  fak_datum_vystaveni:     '6a2bb7f8295c2f467fa1d4c4',
  fak_datum_splatnosti:    '6a2bb7f8295c2f467fa1d4c5',
  fak_vlastnik:            '6a2bb7f8295c2f467fa1d4c9',
  // Projekt
  proj_faze:               '6a2bb7f8295c2f467fa1d53e',
  proj_PM:                 '6a2bb7f8295c2f467fa1d53c',
  proj_deadline:           '6a2bb7f8295c2f467fa1d53f',
  proj_zakazka:            '6a2bb7f8295c2f467fa1d53b',
  // Zápis ze schůzky
  sch_citlivost:           '6a2bb7f8295c2f467fa1d56b',
  sch_stav:                '6a2bb7f8295c2f467fa1d56d',
  sch_datum:               '6a2bb7f8295c2f467fa1d566',
  sch_klient:              '6a2bb7f8295c2f467fa1d568',
  sch_rozhodnuti:          '6a2bb7f8295c2f467fa1d569',
  sch_akcni:               '6a2bb7f8295c2f467fa1d56a',
}

function env (file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

async function createCard (client, typeId, title, attrs, dryRun, space) {
  const data = { title, ...attrs }
  if (!dryRun) {
    const id = await client.createDoc(typeId, space || SPACE, data)
    return id
  }
  return 'dry-run-id'
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

  // ── Najdi a smaž existující DEMO karty ──────────────────────────────────────
  const allDemoTypes = Object.values(T)
  let deleted = 0
  for (const typeId of allDemoTypes) {
    try {
      const existing = await client.findAll(typeId, {})
      for (const card of existing) {
        if (card.title && card.title.startsWith(DEMO_PREFIX)) {
          if (DELETE || APPLY) {
            await client.removeDoc(card._class, card.space, card._id)
            deleted++
            console.log(`  🗑️  Smazán: ${card.title}`)
          } else {
            console.log(`  DRY-RUN mazání: ${card.title}`)
          }
        }
      }
    } catch (e) {
      // typ nemusí mít karty
    }
  }
  if (DELETE) {
    console.log(`\nSmazáno ${deleted} DEMO karet.`)
    await connection.close()
    process.exit(0)
  }

  // ── Vytvoř DEMO karty ────────────────────────────────────────────────────────
  console.log('\n=== Vytváření DEMO karet ===')
  const dryRun = !APPLY

  // 1. Firma
  const firmaId = await createCard(client, T.Firma, 'DEMO - Klient AI spol. s r.o.', {
    [ATTR.firma_stav_vztahu]: 'aktivni',
    [ATTR.firma_citlivost]: 'interni',
    [ATTR.firma_nazev]: 'AI spol. s r.o.',
    [ATTR.firma_ICO]: '12345678',
    [ATTR.firma_web]: 'https://example.com',
    [ATTR.firma_segment]: 'B2B SaaS',
    [ATTR.firma_vlastnik]: 'stepan@praut.cz',
  }, dryRun)
  console.log(`✅ Firma: "DEMO - Klient AI spol. s r.o." (${firmaId})`)

  // 2. Lead
  const leadId = await createCard(client, T.Lead, 'DEMO - Poptávka na AI agenta pro zákaznický servis', {
    [ATTR.lead_priorita]: 'vysoka',
    [ATTR.lead_stav]: 'kvalifikace',
    [ATTR.lead_zdroj]: 'LinkedIn outreach',
    [ATTR.lead_firma]: firmaId,
    [ATTR.lead_potreba]: 'Automatizace odpovědí na zákaznické dotazy pomocí AI chatbota',
    [ATTR.lead_dalsi_krok]: 'Svolat discovery call do 3 dnů, připravit demo',
  }, dryRun)
  console.log(`✅ Lead: "DEMO - Poptávka na AI agenta..." (${leadId})`)

  // 3. Obchodní příležitost
  const prilId = await createCard(client, T.Prilezitost, 'DEMO - AI Customer Service Agent — AI spol.', {
    [ATTR.pril_faze]: 'nabidka',
    [ATTR.pril_riziko]: 'stredni',
    [ATTR.pril_ocekavane_uzavreni]: '2026-09-30',
    [ATTR.pril_vlastnik]: 'stepan@praut.cz',
  }, dryRun)
  console.log(`✅ Obchodní příležitost: "DEMO - AI Customer Service Agent..." (${prilId})`)

  // 4. Nabídka
  const nabId = await createCard(client, T.Nabidka, 'DEMO - Nabídka #N-2026-01 — AI Customer Service Agent', {
    [ATTR.nab_stav]: 'ke schvaleni',
    [ATTR.nab_klient]: firmaId,
    [ATTR.nab_prilezitost]: prilId,
    [ATTR.nab_rozsah]: '160 hodin — návrh, implementace, testování, nasazení, 30 dní podpory',
    [ATTR.nab_platnost]: '2026-08-15',
    [ATTR.nab_verze]: 'v1.2',
    [ATTR.nab_schvalovatel]: 'stepan@praut.cz',
  }, dryRun)
  console.log(`✅ Nabídka: "DEMO - Nabídka #N-2026-01..." (${nabId})`)

  // 5. Zakázka
  const zakId = await createCard(client, T.Zakazka, 'DEMO - Zakázka Z-2026-01 — AI Customer Service Agent', {
    [ATTR.zak_typ]: 'projekt',
    [ATTR.zak_health]: 'zeleny',
    [ATTR.zak_stav]: 'aktivni',
    [ATTR.zak_PM]: 'stepan@praut.cz',
    [ATTR.zak_start]: '2026-07-01',
    [ATTR.zak_termin]: '2026-10-31',
    [ATTR.zak_obnova]: '2027-10-31',
    [ATTR.zak_klient]: firmaId,
    [ATTR.zak_nabidka]: nabId,
  }, dryRun)
  console.log(`✅ Zakázka: "DEMO - Zakázka Z-2026-01..." (${zakId})`)

  // 6. Faktura
  const fakId = await createCard(client, T.Faktura, 'DEMO - Faktura F-2026-001 (záloha 50 %)', {
    [ATTR.fak_stav]: 'vystavena',
    [ATTR.fak_cislo]: 'F-2026-001',
    [ATTR.fak_zakazka]: zakId,
    [ATTR.fak_klient]: firmaId,
    [ATTR.fak_datum_vystaveni]: '2026-07-01',
    [ATTR.fak_datum_splatnosti]: '2026-07-15',
    [ATTR.fak_vlastnik]: 'stepan@praut.cz',
  }, dryRun)
  console.log(`✅ Faktura: "DEMO - Faktura F-2026-001..." (${fakId})`)

  // 7. Projekt
  const projId = await createCard(client, T.Projekt, 'DEMO - Projekt: Implementace AI agenta', {
    [ATTR.proj_faze]: 'aktivni realizace',
    [ATTR.proj_PM]: 'stepan@praut.cz',
    [ATTR.proj_deadline]: '2026-10-31',
    [ATTR.proj_zakazka]: zakId,
  }, dryRun)
  console.log(`✅ Projekt: "DEMO - Projekt: Implementace AI agenta" (${projId})`)

  // 8-10. Záznamy ze schůzek → jdou do CardSpace "Schůzky" (ne Default)
  const schSpace = dryRun ? SCHUZKY_SPACE : SCHUZKY_SPACE

  await createCard(client, T.ZapisSch, 'DEMO - Schůzka: Kick-off AI Customer Service Agent (2026-07-01)', {
    [ATTR.sch_citlivost]: 'interni',
    [ATTR.sch_stav]: 'akcni kroky otevrene',
    [ATTR.sch_datum]: '2026-07-01',
    [ATTR.sch_klient]: 'AI spol. s r.o. — Zakázka Z-2026-01',
    [ATTR.sch_rozhodnuti]: 'Projekt spouštíme 2026-07-01, PM je Štěpán, deliverable do 2026-10-31.',
    [ATTR.sch_akcni]: '1. Štěpán: nastavit GitHub repo do 2026-07-03 | 2. AI spol.: dodat přístup do CRM do 2026-07-05',
  }, dryRun, schSpace)
  console.log('✅ Zápis ze schůzky: "DEMO - Schůzka: Kick-off..." → space: Schůzky')

  await createCard(client, T.ZapisSch, 'DEMO - Schůzka: Konzultace s ekonomem (2026-07-10)', {
    [ATTR.sch_citlivost]: 'citlive',
    [ATTR.sch_stav]: 'ke kontrole',
    [ATTR.sch_datum]: '2026-07-10',
    [ATTR.sch_klient]: 'Interní — ekonomický poradce',
    [ATTR.sch_rozhodnuti]: 'Mzdové náklady zmrazeny do konce Q3. Nákupy nad 50 tis. Kč schvaluje Štěpán.',
    [ATTR.sch_akcni]: '1. Štěpán: zaslat ekonomovi Q2 výkazy do 2026-07-15 | 2. Ekonom: připravit Q3 plán do 2026-07-30',
  }, dryRun, schSpace)
  console.log('✅ Zápis ze schůzky: "DEMO - Schůzka: Konzultace s ekonomem..." → space: Schůzky')

  await createCard(client, T.ZapisSch, 'DEMO - Schůzka: Interní operativní schůzka (2026-07-08)', {
    [ATTR.sch_citlivost]: 'interni',
    [ATTR.sch_stav]: 'potvrzeno',
    [ATTR.sch_datum]: '2026-07-08',
    [ATTR.sch_klient]: 'Interní — týmová operativa',
    [ATTR.sch_rozhodnuti]: 'Týdenní operativní meeting každé úterý 10:00. Záznamy jdou jako Zapis ze schuzky v Huly.',
    [ATTR.sch_akcni]: '1. Všichni: doplnit stavy zakázek do Huly do pátku | 2. Štěpán: sdílet odkaz na Huly všem',
  }, dryRun, schSpace)
  console.log('✅ Zápis ze schůzky: "DEMO - Schůzka: Interní operativní schůzka..." → space: Schůzky')

  // ── Shrnutí ──────────────────────────────────────────────────────────────────
  console.log('\n=== SHRNUTÍ ===')
  if (dryRun) {
    console.log('DRY-RUN — žádné karty nebyly vytvořeny. Spusť s --apply pro vytvoření.')
    console.log('\nByly by vytvořeny:')
  } else {
    console.log('✅ Vytvořeno 10 DEMO karet v card:space:Default')
    console.log('\nVytvořeny:')
  }
  console.log('  1. DEMO - Klient AI spol. s r.o.               (Firma)')
  console.log('  2. DEMO - Poptávka na AI agenta...             (Lead/Poptávka)')
  console.log('  3. DEMO - AI Customer Service Agent — AI spol. (Obchodní příležitost)')
  console.log('  4. DEMO - Nabídka #N-2026-01...                (Nabídka)')
  console.log('  5. DEMO - Zakázka Z-2026-01...                 (Zakázka)')
  console.log('  6. DEMO - Faktura F-2026-001...                (Faktura)')
  console.log('  7. DEMO - Projekt: Implementace AI agenta      (Projekt)')
  console.log('  8. DEMO - Schůzka: Kick-off AI CSA...          (Zapis ze schuzky — akcni kroky)')
  console.log('  9. DEMO - Schůzka: Konzultace s ekonomem...    (Zapis ze schuzky — ke kontrole)')
  console.log(' 10. DEMO - Schůzka: Interní operativní...       (Zapis ze schuzky — potvrzeno)')
  console.log('\nSchůzky najdeš: Cards → pohled "Záznamy ze schůzek" (nebo filtr typ Zapis ze schuzky)')
  console.log('Obchodní řetězec: Lead → Příležitost → Nabídka → Zakázka → Faktura + Projekt')

  await connection.close()
  process.exit(0)
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1) })
