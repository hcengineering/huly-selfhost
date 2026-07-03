# Huly admin tooling (PRAUT)

Skripty pro správu produkčního Huly workspace `praut` přes **oficiální Huly API**
(`@hcengineering/server-client` + `TxOperations`). Posílají změny živě transactoru —
bez výpadku, bez zásahu do DB, plně přes podporované rozhraní.

## Proč to existuje

Část konfigurace Huly (archivace prostorů, přejmenování dokumentů, …) jde jinak udělat
jen ručním klikáním v UI. Tyto skripty to dělají programově a opakovatelně.

## Předpoklady

- Běží **z checkoutu** `HulyPrautplatform/dev/import-tool/` (kvůli `node_modules`
  s `@hcengineering/*` balíčky). Zkopíruj skript tam, nebo spouštěj odtud.
- Node 18+ (testováno i na 25). Skripty si shimují browser globály a vypínají
  IndexedDB model-cache (v Node není) tím, že `localStorage` nastaví na `undefined`.
- Admin přihlášení čtou z `/Users/stepan/praut/huly-poc-secrets.env`
  (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) — soubor je mimo git.

## ⚠️ Obsah dokumentů — POVINNÝ vzor (od 2026-07-03)

Pole `content` u `document:class:Document` je **blob ref** (odkaz na kolaborativní
obsah v úložišti), **NE HTML**. HTML v `content` = dokument se v UI donekonečna
načítá (collaborator: `InvalidObjectNameError`). Incident 2026-07-03: takhle bylo
rozbitých 18 dokumentů, opraveno in-place.

Správně (viz `praut-doc-content.cjs` a použití v `praut-quickstart-doc.cjs`):

```js
const { uploadDocContent } = require(require('path').join(__dirname, 'praut-doc-content.cjs'))
const docId = coreMod.generateId()
const blobId = await uploadDocContent(sel.token, docId, HTML)   // workspace token!
await client.createDoc('document:class:Document', space._id, { ..., content: blobId }, docId)
```

Diagnostika/oprava:
- `praut-scan-broken-docs.cjs` — READ-ONLY, najde dokumenty s HTML v `content`
- `praut-fix-broken-docs.cjs` — in-place oprava (HTML → blob, ID dokumentu zůstává)
- `praut-clean-doc-whitespace.cjs` — dočistí whitespace artefakty po konverzi

## Aktuální stav workspace (2026-06-22)

### Živé v huly.praut.cz

| Co | Stav |
|---|---|
| Typy karet | ✅ zjednodušeno 22 → **8** (Firma, Kontakt, Příležitost, Nabídka, Zakázka, Projekt, Schůzka, Faktura); 14 skryto přes `removed` (vratné) |
| CardSpace "Schůzky" | ✅ aktivní (ID: `6a35824737b43c4db539494a`) |
| 7 FilteredViews s emoji | ✅ 🏢 Klienti, 🤝 Aktivní příležitosti, 📅 Záznamy, ⭐ Ke schválení, 📦 Aktivní, 🔴 V riziku, 💰 Po splatnosti |
| DEMO karty | ❌ smazány (workspace ukazuje jen reálná data) |
| Chunter #praut-denni-prehled | ✅ vytvořen |
| Návody | ✅ 🏠 HOME (rozcestník) + 📖 Příručka — **4-krokový workflow** (Klient→Příležitost→Nabídka→Zakázka) + příklad krok za krokem |
| "Co sem patří" v 7 teamspaces | ✅ aktivní |

### Tracker (2026-06-22)

| Co | Stav |
|---|---|
| Junk issues (TSK-1/2/3) | ❌ smazány (`praut-clean-tracker.cjs`) |
| 6 šablon issues | ✅ vytvořeny přes API (`praut-tracker-templates.cjs`) |
| Stavy projektu | ✅ ponecháno 5 defaultních (Backlog/Todo/In Progress/Done/Cancelled) — extra stavy = riziko na sdíleném ProjectType |

### Automatizace / Procesy (2026-06-22)

Realizováno přes plugin „Process" (workflow engine). Akce = in-app upozornění (ToDo)
adminovi — in-app funguje hned, e-mail až po SMTP. Pilot postaven ručně v UI
(kvůli ověření offset formátu), zbytek replikován přes API (`praut-build-processes.cjs`).

| Proces | Typ karty | Spouštěč | Stav |
|---|---|---|---|
| Nabídka uvízla ve schvalování | Nabidka | stav=ke schvaleni → +2 dny | ✅ pilot (UI) |
| Lead bez aktivity 7 dní | Lead/Poptávka | +7 dní od startu | ✅ API |
| SLA požadavku do 24 h | Zákaznický požadavek | +1 den od startu | ✅ API |
| Zakázka v riziku | Zakazka | health=v riziku → ihned | ✅ API |

**Nerealizováno (záměrně):**
- *Incident v triage 2 h* — Huly neumí hodinové offsety (jen dny/týdny/měsíce).
- *Zakázka obnova 30 dní* — pole „datum obnovy" je text, ne Date → offset nelze.
- *Projekt v riziku* — typ Projekt nemá rizikové pole (přemapováno na Zakázka health).
- *Karta bez vlastníka* — detekce prázdného pole netriviální.

Příjemce všech upozornění je zatím Praut Admin (pole „schvalovatel" je text, ne odkaz
na uživatele → nelze adresovat dynamicky).

**⚠️ Neověřeno runtime:** že časovač reálně spustí akci po N dnech nelze bez čekání ověřit;
ověřena jen shoda struktury s funkčním pilotem (dumpem).

## Skripty

| Skript | Co dělá |
|---|---|
| `praut-typemap.cjs` | **Spusť jako první.** Generuje `/tmp/typemap.json` — runtime cache metadat všech 22 card typů (atributy, enum hodnoty, viewlety). Spusť znovu po každé změně datového modelu. |
| `praut-spaces-list.cjs` | READ-ONLY výpis všech prostorů (název, třída, archived, _id). |
| `praut-github-check.cjs` | READ-ONLY diagnostika GitHub integrace: instalace App (GithubIntegration), propojené účty (GithubAuthentication), viditelná repa a napojené Tracker projekty. Závěr říká, jestli sync běží. Nic nemění. |
| `praut-archive-junk.cjs` | Archivuje/odarchivuje testovací junk prostory (cílí přesně podle _id). `--apply` provede, `--unarchive` vrátí. |
| `praut-tune.cjs` | Drobné úpravy obsahu (např. přejmenování prázdného dokumentu). `--apply` provede. |
| `praut-build-views.cjs` | Vytvoří 5 uložených pohledů (`FilteredView`) s emoji. Idempotentní (tag `praut-ops`). Vyžaduje `/tmp/typemap.json`. |
| `praut-create-demo.cjs` | Vytvoří/obnoví 10 DEMO karet (Firma→Lead→Příležitost→Nabídka→Zakázka→Faktura+Projekt+3× schůzka). `--apply` vytvoří, `--delete` smaže. *(Karty jsou aktuálně smazané.)* |
| `praut-create-guide.cjs` | Vytvoří/obnoví **2** dokumenty v Základ systemu: 🏠 HOME (rozcestník) + 📖 Příručka PRAUT Huly (jediný detailní návod). Navíc smaže 5 zastaralých návodů (`STALE_TITLES`). `--apply` provede. |
| `praut-create-teamspace-docs.cjs` | Vytvoří dokument "Co sem patří — přehled" v každém ze 7 teamspaces. `--apply` vytvoří. |
| `praut-create-spaces.cjs` | Vytvoří CardSpace "Schůzky" (viditelná v levém panelu Cards). `--apply` vytvoří. |
| `praut-create-chunter.cjs` | Vytvoří Chunter kanál #praut-denni-prehled jako navigační hub. `--apply` vytvoří. |
| `praut-clean-tracker.cjs` | Smaže testovací junk issues z Trackeru (cílí podle názvu). `--apply` smaže. |
| `praut-tracker-templates.cjs` | Vytvoří/obnoví 6 šablon issues (Feature, Bug, Client request, Sales follow-up, Review/QA, Ops/Admin) v projektu Default. Idempotentní. `--apply` provede. |
| `praut-build-processes.cjs` | Vytvoří/obnoví 3 automatizační procesy (Lead 7 dní, SLA 1 den, Zakázka v riziku) dle vzoru ručního pilotu. Idempotentní, pilot nedotčen. `--apply` provede. |
| `praut-hide-types.cjs` | Skryje 14 nadbytečných typů karet (`removed=true`) — zůstane 8 workflow typů. Vratné `--restore`. Nemaže karty. `--apply` provede. |
| `praut-account-reset.cjs` | Reset hesla + vrácení uživatele do workspace `praut` (zapomenuté heslo). DRY-RUN bez `--apply`. Přes `restorePassword` (nastaví heslo + znovu ověří e-mail) + `assignWorkspace`. Pozor: zamčený účet (5+ neúspěšných loginů) jde odemknout jen DB UPDATE `global_account.account SET failed_login_attempts=0` na serveru — skript vypíše přesný příkaz. |
| `praut-weekly-report.cjs` | **(T06)** Vygeneruje dokument „📊 Týdenní přehled — DATUM" do teamspace „Řízení a reporting" (jen vedení): stav projektů, obchod, lidé, red flags za 7 dní. DRY-RUN vytiskne do konzole. Cron: `praut-weekly-report.sh` (pondělí 07:00). |
| `praut-role-guides.cjs` | **(T09)** Vytvoří/obnoví 4 návody „můj den v Huly" per role (vývojář→sdílené, obchodník→Obchodní dokumenty, markeťák→Marketing, vedoucí→Řízení a reporting). Idempotentní. `--apply` provede. |
| `praut-daily-channel.cjs` | **(T10)** Oživí kanál #praut-denni-prehled: přidá všechny aktivní zaměstnance, zapne autoJoin, nastaví topic s denním ritualem. Jen přidává členy. `--apply` provede. |
| `praut-mgmt-docs.cjs` | **(T07/T08/T11)** Vytvoří/obnoví 3 dokumenty do privátních prostorů: „🏠 Přehled firmy" + „✅ Onboarding nováčka" (Řízení a reporting), „📈 Jak vedeme obchod" (Obchodní dokumenty). Idempotentní. `--apply` provede. |
| `praut-merge-persons.cjs` | Sloučí duplicitní osoby (account-merge). `--search <jméno>` = read-only výpis kandidátů; `--primary <uuid\|jméno> --secondary <uuid\|jméno>` = DRY-RUN; `--apply` provede. Volí `mergeSpecifiedAccounts`/`mergeSpecifiedPersons` dle stavu. **Pozor:** account-merge NEpřepojí workspace `SocialIdentity.attachedTo` — po merge může zbýt chyba „Confirmed social identity is attached to the wrong person" (nutno přepojit identity na cílovou osobu). Nejdřív ZÁLOHA DB. |
| `praut-create-relations.cjs` | Hromadně vytvoří typy vztahů (Association) mezi kartami/kontakty — řeší prázdné „Přidat vztah". DRY-RUN bez `--apply`. |
| `praut-configure-apps.cjs` | **Zjednodušení menu:** vypne nepoužívané moduly per workspace (`core:class:PluginConfiguration.enabled=false`) — bez buildu, vratné (`--restore <pluginId>`), data zůstávají. DRY-RUN vypíše všechny pluginy + plán. Rozhodnutí 2026-07-08: obchod = Lead, karty/HR/drive/procesy… vypnuty. |

> ⚠️ **Od 2026-07-08 jsou moduly Karty + Process vypnuté** (viz `praut-configure-apps.cjs` a DECISIONS).
> Karty skripty (`praut-typemap`, `praut-build-views`, `praut-create-demo`, `praut-build-processes`,
> `praut-hide-types`, `praut-create-spaces`) jsou dočasně irelevantní — před použitím moduly zapnout zpět.

## Důležitý detail formátu filtru

`FilteredView.filters[].value` pro `FilterValueIn`/`FilterValueNin` **musí** být vnořené
pole `[[hodnota, [hodnota]]]`, ne plochý seznam `[hodnota]` — Huly klient interně dělá
`filter.value.map(p => p[1]).flat()` (viz `plugins/view-resources/src/filter.ts`,
funkce `valueInResult`/`valueNinResult`). Plochý formát vytvoří pohled, který v UI
nic nefiltruje (filtr se "ztratí").

## Spouštění mimo prohlížeč (Node)

Huly klient očekává browser globály. Skripty řeší shimem:
```js
globalThis.window = globalThis
globalThis.addEventListener = () => {}
// localStorage MUSÍ být typeof 'undefined' (ne shim objekt!), jinak klient
// spustí IndexedDB model-cache, která v Node neexistuje:
Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
```
A `createClient(endpoint, token, [])` — třetí parametr (prázdný model) vynutí
in-memory model store místo IndexedDB persistence.

## Manuální návody (UI-only kroky)

| Dokument | Co pokrývá |
|---|---|
| `TRACKER_SETUP_MANUAL.md` | Nastavení stavů (Backlog/Review/Blocked/…) a šablon v Tracker projektu TSK |
| `AUTOMATION_SETUP_MANUAL.md` | 7 alert-only automatizačních pravidel (nastavení v Huly Automation UI) |

## Použití

```bash
cd HulyPrautplatform/dev/import-tool
# 1. Typemapa (nutná pro build-views a create-demo)
cp <repo>/tools/huly-admin/praut-typemap.cjs .
node praut-typemap.cjs

# 2. Jakýkoliv jiný skript
cp <repo>/tools/huly-admin/praut-build-views.cjs .
node praut-build-views.cjs             # DRY-RUN, nic nemění
node praut-build-views.cjs --apply     # provede
```

Vždy nejdřív DRY-RUN, ověř cíle, pak `--apply`. Před většími zásahy spusť zálohu
(`scripts/praut-backup.sh` na VPS).

## Historie zásahů

- 2026-06-18: archivováno 8 testovacích prostorů (Card: Pizda, poi, PULS, SCH ekonom,
  Zaznamnik.pro; Tracker: Zaznamnik.pro, ProjZaznamnik, puls). Reverzibilní.
- 2026-06-18: přejmenován prázdný dokument `Untitled` → `Poznámky (k doplnění)`.
- 2026-06-19: vytvořeno 13 uložených pohledů na 9 klíčových typech (Nabidka, Zakazka,
  Faktura, Lead/Poptavka, Obchodni prilezitost, Projekt, Zakaznicky pozadavek, Incident,
  Riziko). Sdíleno všem 4 členům workspace.
- 2026-06-19: vytvořeno 7 DEMO karet (Firma→Lead→Příležitost→Nabídka→Zakázka→Faktura+Projekt)
  ukazující ukázkový obchodní workflow s vyplněnými poli a vazbami.
- 2026-06-19: vytvořen orientační dokument "Jak začít v Huly" v teamspacu Základ systemu.
- 2026-06-19: přidán pohled "Záznamy ze schůzek" (FilteredView pro Zapis ze schuzky — stav ≠ uzavreno).
- 2026-06-19: přidány 3 DEMO záznamy ze schůzek (kick-off, konzultace s ekonomem, interní operativa).
- 2026-06-19: přepsán průvodce na Cheat Sheet + detailní průvodce s krok-za-krokem pro schůzky.
- 2026-06-19: vytvořen dokument "Co sem patří — přehled" v 7 teamspaces.
- 2026-06-19: dashboard — přejmenováno 5 pohledů s emoji, HOME dokument, Chunter kanál.
- 2026-06-19: kompletní UX přestavba — nový HOME s navigační mapou UI, 3 zaměstnanecké
  návody importovány do Základ systemu, docs/RUNBOOK-SERVER-DOWN.md, docs/DEV-ONBOARDING.md.

### Nedotaženo (vyžaduje UI nebo změnu datového modelu)

- **`Bez vlastníka`**: pole `vlastnik`/`PM`/`schvalovatel` jsou `TypeString` (freeform text),
  ne enum — "je prázdné" nelze detekovat ValueFilterem. Řešení: změnit pole na `RefTo:Member`
  v `Settings → TYPES → <typ>`.
- **`Moje`**: vyžaduje dynamický `$me` filtr vázaný na přihlášeného uživatele — v Huly API
  jde nastavit jen na konkrétní UUID, ne per-session dynamicky.
- **`Obnovy do 60 dní`**: pole `datum obnovy` na Zakazka je `TypeString`, ne `TypeDate`.
  Date-range filtr nelze spustit, dokud se pole nepřetypuje v `Settings → TYPES → Zakazka`.
- **Automatizace** (7 pravidel): viz `AUTOMATION_SETUP_MANUAL.md` — nastavení přes Huly UI.
- **Tracker stavy/šablony**: viz `TRACKER_SETUP_MANUAL.md` — nastavení přes Huly UI.
