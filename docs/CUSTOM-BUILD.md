# Vlastní úpravy kódu Huly (fork → build → deploy)

Jak nasadit **upravený kód platformy** místo hotových `hardcoreeng/*` images. Slouží pro úpravy,
které nejdou udělat konfigurací na běžící instanci (např. defaultní stupně Lead funnelu v kódu,
nová pole napevno, vlastní UI komponenty, oprava chování).

> **Kdy to NEpotřebuješ:** přejmenování stupňů/polí/pohledů, automatizace, branding, vztahy —
> to vše jde **config-level** přímo na běžící Huly (viz `tools/huly-admin/*.cjs`). Kód stav až když
> narazíš na strop konfigurace.

## Stavební díly (zjištěno průzkumem)
- **Fork zdrojáku:** `https://github.com/PrautAutomation/HulyPrautplatform` (Rush monorepo,
  pnpm, Node 20+, ~43 Dockerfilů, verze `0.7.423`, branch `develop`).
- **CI:** `.github/workflows/main.yml` umí `rush docker:build` a na tagu `v*` i `docker:push`.
- **Deploy přepínač:** `compose.yml` bere image jako `${HULY_IMAGE_REGISTRY:-hardcoreeng}/<svc>:${HULY_VERSION}`.
  Přepnutím `HULY_IMAGE_REGISTRY` + `HULY_VERSION` v `huly_v7.conf` se nasadí vlastní image.
- **Pozn.:** Dockerfily stojí na base images `hardcoreeng/*-base:v20250916` — pokud upravuješ jen
  app vrstvu (front/transactor/…), base se rebuildovat nemusí.

## Doporučená cesta: build přes GitHub Actions (bez výkonného lokálu)
1. **Úprava ve forku** `HulyPrautplatform` na feature větvi. Příklady:
   - Lead stupně napevno: `models/lead/src/spaceType.ts` (+ `models/lead/src/plugin.ts`).
   - Oprava vykreslení symetrických vztahů: `plugins/view-resources/src/utils.ts`
     (`getRelationPresenter`) — ať není nutný data-fix přejmenováním stran.
2. **Registr (jednou):** použij **GHCR** `ghcr.io/prautautomation/...` (přihlášení přes GitHub).
   V CI nastav push do GHCR a potřebné secrets (`GITHUB_TOKEN`/PAT s `write:packages`).
3. **Build + push:** vytvoř tag `v0.7.423-praut1` (nebo dle konvence) → workflow `main.yml`
   postaví a pushne image. (Lokální fallback: `rush install && rush build && rush bundle &&
   rush docker:build` na stroji s ≥ 16 GB RAM, ~30–60 min.)
4. **Deploy** na serveru — v `huly_v7.conf`:
   ```
   HULY_IMAGE_REGISTRY=ghcr.io/prautautomation/hulyprautplatform
   HULY_VERSION=0.7.423-praut1
   ```
   ```bash
   docker compose pull && docker compose up -d && docker compose restart nginx
   ```
   Tip: dá se přepnout jen **vybraná služba** (necháš ostatní na `hardcoreeng` a přepíšeš image
   jen u `front`/`transactor` v compose), ať nemusíš stavět celý stack.

## Údržba (důležité)
- **Re-merge upstream:** když vyjde nová verze Huly, je nutné slít upstream do forku a vyřešit
  konflikty ve vašich úpravách → znovu build. Drž úpravy **malé a izolované**, ať je merge snadný.
- Verzuj vlastní image konzistentně (`<huly>-prautN`), ať víš, co běží.

## Bezpečnost
- GHCR/registry secrets a `huly_v7.conf` mimo git.
- Vlastní image nepublikuj veřejně, pokud obsahují interní úpravy.

## Vztah k migraci
Tahle pipeline se zapíná **na novém serveru** (viz `MIGRATION-RUNBOOK.md`), kde poběží i lokální AI
a self-hosted LiveKit. Do té doby běží stávající VPS na oficiálních `hardcoreeng` images.
