# Huly živý audit — 2026-06-18

Ověření reálného stavu produkční instance `huly.praut.cz` přímo proti běžící
CockroachDB a Docker stacku. Nahrazuje dřívější neověřené záznamy z 2026-06-16,
kdy předchozí agent neměl funkční SSH přístup a stav nemohl potvrdit.

## Metoda

- Read-only dotazy do `huly_v7-cockroach-1` (DB `defaultdb`, schémata `global_account`, `public`).
- `docker compose ps`, kontrola env proměnných běžících služeb.
- Žádný zápis do produkční DB (Huly model se mění výhradně přes transactor / UI / import-tool).

## Workspaces

| name | url | uuid |
|---|---|---|
| Praut | `praut` | `4533ec0f-0808-40d3-9c71-d5cee56cd439` |
| VELYOS | `velyos` | `d1e2612a-…` |
| sudety | `sudety` | `2c8255ee-…` |

PRAUT obsah je v workspace **Praut** (`/workbench/praut`). VELYOS a sudety jsou mimo PRAUT import.

## Datová vrstva Praut — PASS

| Cíl (PRAUT_PROSTREDI) | Cílová hodnota | Živý stav | Výsledek |
|---|---|---|---|
| Teamspaces (prostory dokumentů) | 8 | **8** (distinct `space` u `document:class:Document`) | ✅ |
| Dokumenty | ~80 | **81** (`document:class:Document`) | ✅ |
| Typy karet (MasterTag) | 22 | **22** (distinct custom `_class` v `public.card`) | ✅ |
| Karty (instance) | ~22 test | **30** | ✅ |
| Controlled Documents (QMS) | — | DocumentCategory 32, ControlledDocument 1, … | ✅ přítomno |

## Infrastruktura — PASS

- 14 Huly kontejnerů `Up` (account, front, transactor, workspace, cockroach, redpanda, minio, elastic, fulltext, collaborator, stats, kvs, rekoni, nginx).
- `DISABLE_SIGNUP=true` na běžící `account` službě → registrace invite-only.
- `kvs` port vázán na `127.0.0.1:8094` (neexponovaný).
- Denní záloha cron 02:30 (retence 14 dní); **restore smoke PASS** proti `scheduled/20260618-172259` (81 tabulek, počty řádků i 455 souborů MinIO sedí).
- Veřejný `https://huly.praut.cz` → HTTP 200 (TLS terminuje Cloudflare).

## Účty (emaily v instanci)

`svanda@praut.cz`, `stepan@velyos.cz`, `martin.k.svanda@gmail.com`, `bobeshka21@gmail.com`, `tommyhufy@gmail.com` (5 účtů celkem napříč workspaces).

## Zbývá — pouze UI konfigurace (vyžaduje admin session v prohlížeči)

Tyto kroky nelze udělat bezpečně přes DB (přímý zápis by obešel transactor a poškodil model)
ani přes import-tool (je mimo jeho rozsah). Vyžadují admina v Huly UI:

1. **6 Cards saved views**: `Aktivni`, `Bez vlastnika`, `Ke schvaleni`, `Riziko`, `Obnovy do 60 dni`, `Moje` (dle `copy_paste_import/11-cards-setup-guide.md`).
2. **Vynucení povinných polí** v `Settings → TYPES` (dle `copy_paste_import/09-cards-schema.md`): `Nabidka` bez `schvalovatel`, `Predani` bez `potvrzeni prevzeti` nesmí projít.
3. **Tracker projekt** pro operativu týmu: stavy `Backlog/Todo/In Progress/Review/Blocked/Done/Cancelled`, šablony `Feature/Bug/Client request/Sales follow-up/Review-QA/Ops-Admin`.
4. **Přejmenovat/archivovat** dokument `Untitled` (potvrzeno 1× v Praut).
5. **Automatizační pravidla** (7×, alert-only) dle `copy_paste_import/12-automation-rules.md`.
6. **Kontrolní scénáře** dle `copy_paste_import/10-control-scenarios.md`.

## Závěr

Datová a infrastrukturní vrstva PRAUT ERP v Huly je **kompletní a ověřená v provozu**.
K plnému použití týmem zbývá hands-on UI konfigurace (body výše) a onboarding lidí.
