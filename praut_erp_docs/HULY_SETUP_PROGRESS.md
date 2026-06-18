# HULY_SETUP_PROGRESS

Checklist-style progress tracker for setting up PRAUT in Huly.

Legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` completed
- `[!]` blocked or needs decision
- `[?]` unknown, needs verification

## Documentation And Memory Bootstrap

- `[x]` Create project `.aiDoc`.
- `[x]` Create persistent technical memory files.
- `[x]` Create `VYVOJOVY_DENIK.md` for human-readable handoff.
- `[x]` Register `VYVOJOVY_DENIK.md` in `.aiDoc`.
- `[x]` Update `AGENT_STATE.md` with diary maintenance rule.
- `[x]` Update `PRAUT_CONTINUITY_STATUS.md` with diary as active handoff area.
- `[x]` Verify new and updated documentation has no obvious secrets.
- `[x]` Create `HULY_VPS_POC_RUNBOOK.md`.
- `[x]` Create private credential template outside project.
- `[x]` Create `PREDANI_KOLEGOVI.md`.
- `[x]` Create `KOLEGA_START_HERE.md`.
- `[x]` Create `PRAUT_OPERATIONS_RUNBOOK.md`.
- `[x]` Create `PRAUT_REMAINING_WORK.md`.
- `[x]` Create `PRAUT_OWNER_ADMIN_KURZ.md`.
- `[x]` Sync current documentation to VPS `/root/huly-selfhost/praut_erp_docs`.

## Environment And Access

- `[x]` Choose PoC environment: test VPS for Core ERP PoC.
- `[x]` Choose private credential storage outside project.
- `[x]` Decide agent will configure domain if credentials are provided.
- `[x]` Record SMTP as deferred follow-up.
- `[x]` Collect test VPS IP and SSH user.
- `[x]` Choose Huly domain.
- `[x]` Collect admin email and backup admin email.
- `[x]` Fill `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env`.
- `[x]` Confirm current local private env path `/Users/stepan/praut/huly-poc-secrets.env`.
- `[x]` Set current local private env permissions to `600`.
- `[x]` Generate `ADMIN_PASSWORD` and `BACKUP_ADMIN_PASSWORD` into the private env file only.
- `[x]` Confirm working VPS SSH access as `root`.
- `[x]` Confirm Huly login screen at `https://huly.praut.cz`.
- `[x]` Restore current-machine SSH access through local ssh-agent and VPS `authorized_keys`.
- `[!]` Add colleague public SSH key for independent access.
- `[!]` Later collect SMTP host/port/user/from details.
- `[!]` Later store SMTP password outside this repo.
- `[!]` Confirm Ubuntu LTS with at least 4 vCPU / 16 GB RAM.
- `[x]` Re-verify `v0.7.423` and read Huly `MIGRATION.md` before install.
- `[!]` Confirm whether optional `print` service is needed; if yes, configure `FRONT_URL`.
- `[x]` Configure reverse proxy.
- `[x]` Configure HTTPS through Cloudflare Flexible mode.
- `[ ]` Configure SMTP/SES.
- `[x]` Create first admin account.
- `[x]` Create or recover backup admin account.
- `[x]` Set `DISABLE_SIGNUP=true` in `account`.
- `[x]` Set `DISABLE_SIGNUP=true` in `front`.
- `[x]` Restart/recreate affected services after signup change.
- `[x]` Verify public HTTPS endpoint returns HTTP 200.
- `[x]` Harden local `kvs` compose publishing to `127.0.0.1:8094:8094`.
- `[?]` Public `8094` access check from local machine failed to connect by IP; verify on VPS firewall/compose once SSH is restored.
- `[x]` Verify first admin login with private env password.
- `[x]` Verify backup admin login with private env password.
- `[x]` Verify public signup is blocked.
- `[ ]` Verify invite link registration works.
- `[ ]` Verify invite expiration/limit/email mask.
- `[ ]` Verify workspace owner/maintainer roles.
- `[ ]` Verify private spaces are not visible to unauthorized users.

## Workspace Structure

- `[x]` Create `01_system` - Zaklad systemu.
- `[x]` Create `02_sales_crm` - Obchod a CRM.
- `[x]` Create `03_projects_tasks` - Zakazky, projekty a ukoly.
- `[x]` Create `04_knowledge_docs` - Dokumenty a znalostni baze.
- `[x]` Create `05_communication` - Komunikace a spoluprace.
- `[x]` Create `06_marketing_support` - Marketing a zakaznicka pece.
- `[x]` Create `07_automation_ai_integrations` - Automatizace, AI a integrace.
- `[x]` Create `08_management_reporting` - Rizeni firmy a reporting.

Source:
- `PRAUT_PROSTREDI.md`
- `IMPORT_CHECKLIST.md`
- `huly_unified_import/README.md`

## Document Import

- `[x]` Choose import route: Huly Import Tool, custom importer, or manual copy-paste.
- `[x]` Import 80 documents from `huly_unified_import/`.
- `[x]` Import first smoke sample: 23 selected documents into workspace `praut`.
- `[x]` Verify 2 random documents from each imported smoke area.
- `[~]` Verify document ownership/status/revision metadata where applicable.
- `[ ]` Verify employee guide layer is available after setup.
- `[x]` Prepare owner/admin course for Huly operation.

Source:
- `00_index.md`
- `HULY_IMPORT_RUNBOOK.md`
- `huly_unified_import/`
- `copy_paste_import/00-import-order.md`

## Cards Type Setup: First Wave

Goal:
- Prove business, delivery, invoicing, project, and support flows before full rollout.

- `[x]` Firma.
- `[x]` Kontakt.
- `[x]` Lead/Poptavka.
- `[x]` Obchodni prilezitost.
- `[x]` Nabidka.
- `[x]` Zakazka.
- `[x]` Faktura.
- `[x]` Projekt.
- `[x]` Zakaznicky pozadavek.

For each type:

- `[x]` Create/import as Cards types, not as normal Cards instances.
- `[x]` Add generated fields.
- `[x]` Add workflow/status enum values where represented by source schema.
- `[!]` Add required views manually in Huly UI.
- `[x]` Create one TEST record.
- `[x]` Verify generated relationships.
- `[!]` Verify owner/required-field visibility manually in Huly UI.
- `[ ]` Record validation in `HULY_VALIDATION_LOG.md`.

Source:
- `copy_paste_import/09-cards-schema.md`
- `copy_paste_import/11-cards-setup-guide.md`

## Cards Type Setup: Second Wave

- `[x]` Milnik.
- `[x]` Predani.
- `[x]` Zapis ze schuzky.
- `[x]` Kampan.
- `[x]` Obsahova polozka.
- `[x]` Znalostni clanek.
- `[x]` Automatizace.
- `[x]` AI funkce.
- `[x]` Integrace.
- `[x]` Incident.
- `[x]` Change request.
- `[x]` Riziko.
- `[x]` KPI.

For each type:

- `[x]` Create/import in Cards type model.
- `[x]` Add generated fields.
- `[x]` Add workflow/status enum values where represented by source schema.
- `[!]` Add required views manually in Huly UI.
- `[x]` Create one TEST record.
- `[x]` Verify generated relationships.
- `[ ]` Record validation.

## Required Views

Each relevant Cards type needs:

- `[ ]` Aktivni.
- `[ ]` Bez vlastnika.
- `[ ]` Ke schvaleni.
- `[ ]` Riziko.
- `[ ]` Obnovy do 60 dni.
- `[ ]` Moje.

## Tracker Operating Model

- `[x]` Document simplified Tracker/GitHub operating model in `OPERATIVNI_MODEL_HULY_TRACKER_GITHUB.md`.
- `[x]` Update employee and process documentation so Tracker is the main daily work layer.
- `[ ]` Create or verify one main Tracker project for team operations in Huly UI.
- `[ ]` Configure Tracker statuses: `Backlog`, `Todo`, `In Progress`, `Review`, `Blocked`, `Done`, `Cancelled`.
- `[ ]` Configure issue templates: `Feature`, `Bug`, `Client request`, `Sales follow-up`, `Review/QA`, `Ops/Admin`.
- `[ ]` Verify active issues require owner/assignee, priority, deadline or explicit no-deadline reason.
- `[ ]` Verify Cards and Contacts are not used as duplicate daily task coordination layers.

## GitHub Operating Convention

- `[x]` Document PR/branch/title convention and manual fallback.
- `[ ]` Verify Huly GitHub integration can be enabled for the relevant repositories.
- `[ ]` If integration is not ready, use manual PR links in Huly issues.
- `[ ]` Verify PR title format `[TSK-2] kratky popis`.
- `[ ]` Verify Huly issue contains PR link before issue moves from `Review` to `Done`.

## Required Relationships

- `[ ]` Firma -> Kontakty, Leady, Prilezitosti, Zakazky, Zakaznicke pozadavky.
- `[ ]` Lead/Poptavka -> Obchodni prilezitost.
- `[ ]` Obchodni prilezitost -> Schuzky, Nabidky, Follow-up ukoly.
- `[ ]` Nabidka -> Zakazka.
- `[ ]` Zakazka -> Projekt, Milniky, Predani, Faktury, Casove reporty, Klientska dokumentace.
- `[ ]` Faktura -> Zakazka, Firma, Projekt.
- `[ ]` Projekt -> Ukoly, Milniky, Rizika, Incidenty, Reporty.
- `[ ]` Kampan -> Obsahove polozky, Leady, Vyhodnoceni.
- `[ ]` Zakaznicky pozadavek -> Incident, Znalostni clanek, Eskalace.
- `[ ]` Automatizace/AI/Integrace/Incident/Change request -> Riziko, Audit.

## Control Scenarios

- `[ ]` Scenario 1: Novy klient `Novak stavby` -> Contacts Company -> Tracker issue s vlastnikem/deadline -> bez duplicitni `Cards -> Firma`.
- `[ ]` Scenario 2: Vyvojova prace -> Huly issue -> branch/PR s issue key -> PR link v issue -> `Review` -> `Done`.
- `[ ]` Scenario 3: Tymovy prehled -> owner vidi praci, blokace, review a po-termine issue v Trackeru.
- `[ ]` Scenario 4: Fallback bez integrace -> rucni PR link v Huly issue staci k dohledatelnosti.

Source:
- `copy_paste_import/10-control-scenarios.md`

## Automation Rules

All automations must be alert-only until explicitly approved otherwise.

- `[ ]` Rule 1 from `copy_paste_import/12-automation-rules.md`.
- `[ ]` Rule 2 from `copy_paste_import/12-automation-rules.md`.
- `[ ]` Rule 3 from `copy_paste_import/12-automation-rules.md`.
- `[ ]` Rule 4 from `copy_paste_import/12-automation-rules.md`.
- `[ ]` Rule 5 from `copy_paste_import/12-automation-rules.md`.
- `[ ]` Rule 6 from `copy_paste_import/12-automation-rules.md`.
- `[ ]` Rule 7 from `copy_paste_import/12-automation-rules.md`.

## Backup And Rollback

- `[x]` Define backup scope for PoC: CockroachDB `defaultdb`, MinIO files, compose/config audit artefacts.
- `[x]` Define PoC RPO/RTO: manual on-demand backup before import; automated daily production backup remains future work.
- `[x]` Run `scripts/praut-backup.sh` on VPS before live admin/import changes.
- `[x]` Test backup before real import: accepted native backup written to `/root/huly-selfhost/backup-praut/20260611-091342`.
- `[x]` Test restore before production data: CockroachDB and MinIO restore smoke passed in `/root/huly-restore-smoke/20260611-091342`.
- `[x]` Record rollback steps: use accepted pre-import backup `/root/huly-selfhost/backup-praut/20260611-091342` and restore with `scripts/praut-restore-smoke.sh` for smoke validation; do not use intermediate `/root/huly-selfhost/backup-praut/20260611-091156`.
- `[x]` Create post-smoke rollback backup `/root/huly-selfhost/backup-praut/20260612-091532`.
- `[x]` Create final post-rollout backup `/root/huly-selfhost/backup-praut/20260612-124435`.
- `[x]` Restore-smoke final backup `/root/huly-selfhost/backup-praut/20260612-124435`: PASS.
- `[ ]` Read `MIGRATION.md` before any version upgrade.
- `[?]` Verify daily backup cron or systemd timer on VPS.

## Current Progress Summary

As of 2026-06-11:

- Documentation continuity: completed.
- Human-readable development diary: completed and must be maintained.
- VPS PoC runbook: completed.
- Private credential template: completed outside project.
- Colleague handoff guide: completed.
- Documentation synced to VPS: completed.
- Huly deployment: running on VPS.
- Huly PoC: infrastructure running; backup, first admin, signup-blocking, and `kvs` port hardening completed.
- Restore smoke test: PASS for `/root/huly-selfhost/backup-praut/20260611-091342`. Native CockroachDB backup restored 81 tables with matching row counts; MinIO backup had 209 files and sample reads passed.
- Current blocker: no restore blocker remains; first workspace/import smoke passed.
- Workspace import: full 80-document import completed in dedicated workspace `Praut` / `praut`.
- Cards setup: 22 Cards types, generated fields/enums/associations, and one TEST card per type completed.
- Validation: public HTTPS endpoint verified; VPS Docker/compose validation passed; backups completed; first admin and backup admin login passed; signup without invite blocked; isolated restore smoke passed; `kvs` remains localhost-only; `Praut` has 8 document teamspaces and 80 documents.

## 2026-06-12 Smoke Import Notes

- `[x]` Created dedicated workspace `Praut` with slug `praut`.
- `[x]` Set `svanda@praut.cz` as `OWNER` for `praut`.
- `[x]` Imported 8 document teamspaces and 23 selected smoke documents.
- `[x]` Verified imported titles do not appear in `VELYOS` or `sudety`.
- `[x]` Verified `front` and `account` still have `DISABLE_SIGNUP=true`.
- `[!]` Operational deviation: initial `create-workspace` failed before `create-done`; `is_disabled` had to be cleared for `praut` after `upgrade-workspace`.

## 2026-06-12 Full Rollout Notes

- `[x]` Created post-smoke rollback backup `/root/huly-selfhost/backup-praut/20260612-091532`.
- `[x]` Imported remaining 57 documents into the existing 8 `Praut` teamspaces.
- `[x]` Verified `Praut` has 8 active document teamspaces and 80 documents with content refs.
- `[x]` Verified no duplicate document titles in `Praut`.
- `[x]` Verified imported titles do not appear in `VELYOS` or `sudety`.
- `[x]` Imported 22 Cards types, 166 generated attributes, 30 enums, and 24 associations.
- `[x]` Created 22 `TEST - <type>` card records, one for each Cards type.
- `[x]` Verified every imported Cards type has one TEST record with content ref.
- `[x]` Final backup `/root/huly-selfhost/backup-praut/20260612-124435` restore smoke passed.
- `[!]` Saved Cards views and required-field enforcement remain manual UI follow-up because the unified importer does not represent them.
- `[!]` SMTP/SES, invite email validation, colleague SSH key, and automated backup schedule remain follow-ups.
- `[x]` Refreshed colleague handoff documentation after full rollout.
