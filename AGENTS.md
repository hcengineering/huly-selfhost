# AGENTS.md — pravidla pro AI agenty v tomto repu

> Přečti PŘED jakoukoliv akcí. Tento repo řídí **produkční** Huly (huly.praut.cz), kde firma denně pracuje.

## Co tento repo je
Deployment config (`compose.yml`, `.template.huly.conf`) + admin nástroje (`tools/huly-admin/`) +
provozní skripty (`scripts/`) + dokumentace (`praut_erp_docs/`, `docs/`) pro self-hosted Huly.
**Zdrojový kód platformy je jinde** — fork `HulyPrautplatform` (Rush monorepo). Úpravy kódu = build
pipeline (`docs/CUSTOM-BUILD.md`), zatím jen na nový server.

## 🚨 KRITICKÉ: auto-commit hook
Repo má hook, který **sám commituje každou editaci a pushuje na aktuální větev**. Proto:
- **VŽDY nejdřív feature větev + push**, teprve pak edituj:
  `git checkout -b feat/... && git push -u origin feat/...`
- Na `main` nikdy needituj přímo (hook by pushnul na main).
- Hooky NEobcházej (`--no-verify`, přepis `.git/hooks/` = zakázáno).

## 🚨 Živá produkce = zápisy jen se souhlasem
Workspace `praut` používá firma denně. Jakýkoliv zápis do workspace/DB:
1. **Nejdřív DRY-RUN** (admin skripty bez `--apply`).
2. Ukázat výstup Štěpánovi.
3. `--apply` až po jeho souhlasu.
Prod databázi/logy nepoužívej k ladění bez svolení. Reprodukuj lokálně.

## Jak spouštět admin skripty
```bash
cd /Users/stepan/praut/HulyPrautplatform/dev/import-tool
NODE_PATH="$PWD/node_modules" node /Users/stepan/praut/huly-selfhost/tools/huly-admin/<skript>.cjs
```
- Přihlášení čtou z `/Users/stepan/praut/huly-poc-secrets.env` (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) — **nikdy netiskni, necommituj**.
- Konvence: bez `--apply` = DRY-RUN, s `--apply` provede. Většina idempotentní/vratná.
- Zápis vyžaduje `TxOperations(connection, socialId)` — `socialId` z loginu (ne `selected.account`, jinak `AccountMismatch`).
- Výstup často zašuměný `no document found` řádky — filtruj `grep -v "no document found"`.

## Server
- SSH alias `huly` (`ssh huly`). CockroachDB: `docker compose exec cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --database=defaultdb`.
- Po `docker compose up -d` **VŽDY** `docker compose restart nginx` (jinak 502 / „Unexpected token '<'").
- Healthcheck cílí na `http://127.0.0.1` (NAT hairpin — server necurluje vlastní veřejnou URL).
- Před editací `huly_v7.conf` na serveru záloha: `cp huly_v7.conf huly_v7.conf.bak-$(date +%F)`.

## Tajemství
Jen v `huly_v7.conf` na serveru / `huly-poc-secrets.env` lokálně (obojí mimo git). **Nikdy do gitu ani do chatu.**
Repo hlídá `.gitleaks.toml` (sken je zelený).

## PR pravidla
- Conventional commits (`feat`/`fix`/`docs`/`chore`…), titulek ≤72 znaků.
- Popis PR má sekci `### AI metadata` (Model / Spec / Plan / Iterace / Confidence / Cost).
- **Nemergovat vlastní PR bez pokynu Štěpána.**
- Po max 5 iteracích STOP → handover do `docs/handovers/` + label `needs-human`.
- Každá produkční změna = řádek do `praut_erp_docs/CHANGELOG.md`.
- Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Zdroje pravdy (čti podle tématu)
| Téma | Kde |
|---|---|
| Roadmapa vylepšení + zadání | `docs/improvements/ROADMAP-2026-07.md`, `docs/improvements/tasks/` |
| Admin nástroje | `tools/huly-admin/README.md` |
| Rozhodnutí a odchylky | `praut_erp_docs/HULY_DECISIONS_AND_DEVIATIONS.md` |
| Provozní model (Tracker/GitHub/Cards) | `praut_erp_docs/OPERATIVNI_MODEL_HULY_TRACKER_GITHUB.md` |
| Build z forku | `docs/CUSTOM-BUILD.md` |
| Migrace na server | `docs/MIGRATION-RUNBOOK.md` |
| Troubleshooting | `praut_erp_docs/TROUBLESHOOTING_MATRIX.md` |
| Uživatelé/přístupy | `praut_erp_docs/SOP_UZIVATELE_A_PRISTUPY.md` |
| Co zbývá | `praut_erp_docs/PRAUT_REMAINING_WORK.md` |

## Když si nejsi jistý
STOP a zeptej se Štěpána. Lepší 1 zpráva navíc než 1 nechtěná akce na produkci.
