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
| `praut-spaces-list.cjs` | READ-ONLY výpis všech prostorů (název, třída, archived, _id). |
| `praut-archive-junk.cjs` | Archivuje/odarchivuje testovací junk prostory (cílí přesně podle _id). `--apply` provede, `--unarchive` vrátí. |
| `praut-tune.cjs` | Drobné úpravy obsahu (např. přejmenování prázdného `Untitled` dokumentu). `--apply` provede. |
| `praut-build-views.cjs` | Vytvoří sadu uložených pohledů (`FilteredView`) na klíčových card typech. Idempotentní (nejdřív smaže své dříve vytvořené pohledy přes tag `praut-ops`), self-check spustí ekvivalentní dotaz a vypíše počet karet před vytvořením. Vyžaduje `/tmp/typemap.json` vygenerovaný `praut-typemap.cjs` (není v repu, je to jen runtime cache). |

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

## Použití

```bash
cd HulyPrautplatform/dev/import-tool
cp <repo>/tools/huly-admin/praut-archive-junk.cjs .
node praut-archive-junk.cjs            # DRY-RUN, nic nemění
node praut-archive-junk.cjs --apply    # provede
```

Vždy nejdřív DRY-RUN, ověř cíle, pak `--apply`. Před většími zásahy spusť zálohu
(`scripts/praut-backup.sh` na VPS).

## Historie zásahů

- 2026-06-18: archivováno 8 testovacích prostorů (Card: Pizda, poi, PULS, SCH ekonom,
  Zaznamnik.pro; Tracker: Zaznamnik.pro, ProjZaznamnik, puls). Reverzibilní.
- 2026-06-18: přejmenován prázdný dokument `Untitled` → `Poznámky (k doplnění)`.
