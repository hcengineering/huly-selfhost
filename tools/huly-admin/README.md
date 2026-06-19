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

## Skripty

| Skript | Co dělá |
|---|---|
| `praut-typemap.cjs` | **Spusť jako první.** Generuje `/tmp/typemap.json` — runtime cache metadat všech 22 card typů (atributy, enum hodnoty, viewlety). Spusť znovu po každé změně datového modelu. |
| `praut-spaces-list.cjs` | READ-ONLY výpis všech prostorů (název, třída, archived, _id). |
| `praut-archive-junk.cjs` | Archivuje/odarchivuje testovací junk prostory (cílí přesně podle _id). `--apply` provede, `--unarchive` vrátí. |
| `praut-tune.cjs` | Drobné úpravy obsahu (např. přejmenování prázdného dokumentu). `--apply` provede. |
| `praut-build-views.cjs` | Vytvoří 13 uložených pohledů (`FilteredView`) na klíčových card typech. Idempotentní (nejdřív smaže své dříve vytvořené pohledy přes tag `praut-ops`). Vyžaduje `/tmp/typemap.json` z `praut-typemap.cjs`. |
| `praut-create-demo.cjs` | Vytvoří/obnoví 7 DEMO karet (Firma→Lead→Příležitost→Nabídka→Zakázka→Faktura+Projekt). Ukazuje ukázkový obchodní workflow s vyplněnými poli a vazbami. `--apply` vytvoří, `--delete` smaže. |
| `praut-create-guide.cjs` | Vytvoří/obnoví dva dokumenty v Základ systemu: "Cheat Sheet — Kde co v Huly" (přehledová tabulka) + "Jak pracovat v Huly" (detailní průvodce s krok-za-krokem pro schůzky, obchodní workflow). `--apply` vytvoří. |
| `praut-create-teamspace-docs.cjs` | Vytvoří dokument "Co sem patří — přehled" v každém ze 7 teamspaces (kromě Základ systemu). `--apply` vytvoří. |

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
