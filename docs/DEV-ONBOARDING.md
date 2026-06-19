# Dev onboarding — huly-selfhost

Průvodce pro vývojáře přispívající do repozitáře `PrautAutomation/huly-selfhost`.

## Přístupy

Repozitář: `github.com/PrautAutomation/huly-selfhost`

Aktuální collaborators (8):

| GitHub | Oprávnění |
|--------|-----------|
| EmperorKunDis | admin (full control) |
| Kaspis77 | maintain |
| Skinnyas | write |
| Bobehska21 | write |
| CesuCashew | write |
| TerSva | write |
| stepanmanda | write |
| Danko-w | write |

Nový člen? Požádej EmperorKunDis o přidání do GitHub org `PrautAutomation`.

## Git workflow

```
main           ← produkce (chráněná větev, vyžaduje PR review)
feat/*         ← nová funkcionalita
fix/*          ← oprava bugu
chore/*        ← maintenance, deps, konfigurace
```

Conventional commits (povinné):
```
feat(huly-admin): add new filtered view
fix(scripts): correct browser shim pattern
chore(deps): bump huly version to v0.7.424
docs(runbook): add VPS restart steps
```

## Deploy na VPS po mergi do main

```bash
ssh root@72.62.156.104
cd /root/huly-selfhost
git pull origin main
# Hotovo — Huly běží bez restartu, skripty jsou aktuální
```

Huly Docker stack se při `git pull` nerestartuje. Skripty v `tools/huly-admin/`
se spouštějí manuálně (viz níže).

## Admin skripty (`tools/huly-admin/`)

Skripty mění data přímo v živém Huly workspace přes oficiální API
(`@hcengineering/server-client` + `TxOperations`).

### Prerekvizity

```bash
# node_modules jsou v HulyPrautplatform/dev/import-tool/ (NENÍ v tomto repo)
# Naklonuj si HulyPrautplatform vedle huly-selfhost:
git clone https://github.com/PrautAutomation/HulyPrautplatform.git
cd HulyPrautplatform/dev/import-tool && npm install

# Admin credentials (NIKDY necommitovat):
# /Users/<tvuj-username>/praut/huly-poc-secrets.env
# Obsah:
# ADMIN_EMAIL=stepan@praut.cz
# ADMIN_PASSWORD=***
```

### Spouštění skriptů

```bash
# Zkopíruj skript do import-tool (kvůli node_modules)
cp tools/huly-admin/praut-XYZ.cjs ../HulyPrautplatform/dev/import-tool/
cd ../HulyPrautplatform/dev/import-tool/

# Vždy nejdřív DRY-RUN (nic nemění)
node praut-XYZ.cjs

# Pak provést
node praut-XYZ.cjs --apply
```

### Přehled skriptů

| Skript | Popis |
|--------|-------|
| `praut-typemap.cjs` | Generuje `/tmp/typemap.json` — nutný pro ostatní skripty |
| `praut-build-views.cjs` | Vytvoří/obnoví 5 FilteredView pohledů |
| `praut-create-guide.cjs` | Vytvoří/obnoví 3 dokumenty v Základ systemu (HOME, Cheat Sheet, Průvodce) |
| `praut-import-guides.cjs` | Importuje 3 zaměstnanecké návody do Základ systemu |
| `praut-create-demo.cjs` | Vytvoří/obnoví 10 DEMO karet |
| `praut-create-spaces.cjs` | Vytvoří CardSpace "Schůzky" |
| `praut-create-chunter.cjs` | Vytvoří Chunter kanál #praut-denni-prehled |
| `praut-create-teamspace-docs.cjs` | Vytvoří "Co sem patří" v 7 teamspaces |
| `praut-archive-junk.cjs` | Archivuje testovací prostory |
| `praut-spaces-list.cjs` | READ-ONLY výpis prostorů |

### Kritické technické detaily

```javascript
// Browser shim — localStorage MUSÍ být undefined (ne objekt!)
try {
  Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })
} catch (e) {}

// FilteredView value formát — MUSÍ být vnořené pole [[v,[v]]], NE plochý [v]
// Plochý formát vytvoří pohled bez funkčního filtru
value: values.map((v) => [v, [v]])   // ✅ správně
value: values                         // ❌ špatně
```

## Struktura repozitáře

```
compose.yml                    Docker Compose konfigurace (14 služeb)
huly_v7.conf → .env            Konfigurace (gitignorovaná, na VPS a v backupu)
nginx.conf                     Nginx config (generovaný, gitignorovaný)
tools/huly-admin/              Admin skripty pro PRAUT workspace
scripts/                       Backup/restore skripty
praut_erp_docs/                Zdrojová dokumentace (ERP procesy, návody, YAML modely)
docs/                          Operační dokumentace (tento soubor, runbook)
praut/                         Workspace blueprint, standardy, onboarding
```

## Zálohy a databáze

```bash
# Manuální záloha
cd /root/huly-selfhost
scripts/praut-backup.sh backup-praut/$(date +%Y%m%d-%H%M%S)

# Zálohy jsou v: /root/huly-selfhost/backup-praut/
# Automatické zálohy: každý den 02:30 (cron), uchovávají se 14 dní

# Smoke test zálohy (bezpečné — nespouští produkci)
scripts/praut-restore-smoke.sh backup-praut/STAMP
```

Databáze: CockroachDB (SQL, kontejner `cockroach`)
Soubory: MinIO S3 (kontejner `minio`)

## VPS informace

- Provider: Digital Ocean
- IP: 72.62.156.104
- OS: Ubuntu 24.04
- Root adresář Huly: `/root/huly-selfhost`
- Huly verze: v0.7.423 (viz `HULY_VERSION` v `huly_v7.conf`)

## Co dělat při výpadku

Viz `docs/RUNBOOK-SERVER-DOWN.md`.
