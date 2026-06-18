# PRAUT_CONTINUITY_STATUS

Current continuity status for PRAUT/Huly work.

## Current Phase

Phase:
- Huly VPS is running; backup, admin accounts, signup blocking, `kvs` hardening, restore smoke, dedicated `Praut` workspace creation, full 80-document import, Cards type import, and one TEST card per type are complete for the current PoC gate.

Status:
- In progress on 2026-06-17. Data layer rollout is complete; owner/admin course is prepared; documentation now defines Tracker as the main daily work layer; live VPS verification and UI follow-up configuration remain.

Last completed major work:
- Huly deployment option audit completed.
- Persistent memory plan approved by user.
- Persistent memory files created.
- Human-readable Czech development diary created as `VYVOJOVY_DENIK.md`.
- Practical VPS PoC runbook created as `HULY_VPS_POC_RUNBOOK.md`.
- Private credential file template created outside the project.
- Huly login screen is reachable at `https://huly.praut.cz`.
- Colleague handoff guide created as `PREDANI_KOLEGOVI.md` and refreshed after full rollout.
- Fresh local continuation path is `/Users/stepan/praut`.
- Public HTTPS endpoint was rechecked on 2026-06-10 and returned HTTP 200.
- Private env file for this machine is `/Users/stepan/praut/huly-poc-secrets.env`; permissions are `600`.
- `SSH_KEY_PATH` in the private env now points to `/Users/stepan/.ssh/huly_poc_rsa`.
- Admin and backup admin passwords were generated only into the private env file.
- Local compose has been hardened so `kvs` binds `127.0.0.1:8094:8094`.
- Previous SSH access from the current machine worked through the local ssh-agent. In this 2026-06-16 sandboxed session, direct SSH with the local key returned `Permission denied` and `ssh-agent` was not available, so live VPS verification is blocked until access is restored.
- VPS backup completed at `/root/huly-selfhost/backup-praut/20260610-190235`.
- VPS `kvs` port now binds `127.0.0.1:8094` only.
- First admin account was created with Huly `create-account`, and login with the private env password passed.
- Public signup without invite was tested and blocked with `platform:status:UnknownMethod`.
- `BACKUP_ADMIN_EMAIL` was changed to `stepan@velyos.cz`.
- Existing backup admin account was recovered through Huly `restorePassword` using a valid reset token; login with the private env password passed.
- Non-destructive restore smoke test ran on the same VPS in isolated workspace `/root/huly-restore-smoke/20260610-190235`.
- Restore smoke preserved audit summary at `/root/huly-restore-smoke/20260610-190235/RESTORE_SMOKE_RESULT.md`.
- Restore smoke result was PARTIAL: MinIO backup is readable and has 201 files; CockroachDB dump is readable but not directly restorable.
- CockroachDB restore blocker: dump includes raw `#` metadata lines and omits required `CREATE SCHEMA`, `CREATE FUNCTION`, and type preamble such as `public.current_epoch_ms()`.
- Public `https://huly.praut.cz` returned HTTP 200 after restore smoke.
- Backup format was fixed on 2026-06-11 to use native CockroachDB `BACKUP DATABASE` instead of the hand-rolled SQL dump.
- Accepted restore-tested backup is `/root/huly-selfhost/backup-praut/20260611-091342`.
- Accepted restore workspace is `/root/huly-restore-smoke/20260611-091342`.
- Restore smoke result for `20260611-091342` is PASS: 81 CockroachDB tables restored, row counts matched, `public.current_epoch_ms()` worked, MinIO had 209 files total and sample reads passed.
- Public `https://huly.praut.cz` returned HTTP 200 after the PASS restore smoke, and `kvs` remained bound to `127.0.0.1:8094`.
- Dedicated workspace `Praut` / `praut` was created on 2026-06-12.
- The first smoke import completed on 2026-06-12: 8 document teamspaces and 23 selected documents were imported into `praut`.
- `svanda@praut.cz` is `OWNER` of `praut`.
- Imported smoke titles were verified absent from `VELYOS` and `sudety`.
- Post-import checks: `https://huly.praut.cz` and `/workbench/praut` returned HTTP 200; `front` and `account` still had `DISABLE_SIGNUP=true`; `kvs` remained `127.0.0.1:8094`.
- Operational deviation: initial Huly `create-workspace` failed before `create-done` because of wrong hand-built MinIO credentials; after `upgrade-workspace`, only the stuck `is_disabled` flag for `praut` was cleared to finish the same state expected from `create-done`.
- Owner/admin course added as `PRAUT_OWNER_ADMIN_KURZ.md` on 2026-06-16.
- Simplified operations model documented on 2026-06-17: Tracker is the source of truth for work, GitHub for code/PR/review, Contacts for companies/people, Documents for rules/decisions/how-to content, and Cards only for structured evidence/reporting/risks/invoicing rather than daily task coordination.

Current recommended Huly path:
- Huly Self-Hosted via `hcengineering/huly-selfhost`.
- Application tag candidate: `v0.7.423`.
- Access model: invite-only, public signup disabled.
- `v0.7.423` was re-verified on 2026-06-10; self-host migration notes require `FRONT_URL` for optional `print` service.

## Completed

### Local project analysis

Completed:
- Read project README and core docs.
- Identified PRAUT target state:
  - 8 teamspaces,
  - 80 documents,
  - 22 Cards types,
  - 6 required Card views,
  - 7 alert-only automation rules.
- Identified important governance constraints:
  - AI is advisory only.
  - Human approval required for sensitive decisions.
  - Permissions and external sharing require human approval.
  - Onboarding requires admin/mentor confirmation.

Evidence:
- `README.md`
- `PRAUT_PROSTREDI.md`
- `IMPORT_CHECKLIST.md`
- `HULY_IMPORT_RUNBOOK.md`
- `01_system/05-role-odpovednosti-a-opravneni.md`
- `01_system/10-bezpecnost-dat-a-prace-s-citlivymi-informacemi.md`
- `07_automation_ai_integrations/70-administrace-erp.md`
- `07_automation_ai_integrations/71-onboarding-noveho-uzivatele.md`

### Huly option audit

Completed:
- Compared Huly Cloud, `huly-selfhost`, and custom build from `platform`.
- Recommended self-hosted Huly for internal-only PRAUT.
- Recommended production `v*` tag `v0.7.423` as first PoC candidate.
- Identified `DISABLE_SIGNUP=true` in both `account` and `front` as key invite-only setting.

Evidence:
- Huly docs: self-hosting, workspace setup, roles, GitHub integration.
- GitHub: `hcengineering/huly-selfhost`
- GitHub: `hcengineering/platform`

### Persistent memory system

Completed:
- User selected:
  - location: project root,
  - update policy: automatic,
  - detail level: very detailed.
- Memory docs created in project root.
- Read-only subagent consistency review completed.
- Low-severity status wording inconsistency resolved.

### Human development diary

Completed:
- Created `VYVOJOVY_DENIK.md` in the project root.
- Added it to `.aiDoc` as a required human handoff document.
- Updated agent memory so future agents maintain the diary after meaningful work.
- Diary explains the current phase, what is done, what is missing, risks, next steps, and what is needed from the user.

Evidence:
- `VYVOJOVY_DENIK.md`
- `.aiDoc`
- `AGENT_STATE.md`

### Preparation gate evidence

Completed:
- Re-verified `hcengineering/platform` release `v0.7.423`.
- Read current `hcengineering/huly-selfhost` `MIGRATION.md` section for `v0.7.423`.
- Confirmed current self-host README recommends at least 4 vCPU / 16 GB RAM for Huly.

Evidence:
- GitHub API release metadata for `hcengineering/platform` tag `v0.7.423`.
- `hcengineering/huly-selfhost` README.
- `hcengineering/huly-selfhost` `MIGRATION.md`.

## In Progress

- Colleague handoff documentation has been refreshed locally, but sync to VPS is blocked until SSH access is restored.
- Full document import and generated Cards type import passed. Cards saved views, required-field enforcement, and final human walkthrough remain follow-ups.
- Tracker/GitHub operating model is documented locally; Huly UI status/template setup remains follow-up after fresh backup.
- Waiting for colleague public SSH key before independent colleague access can be enabled.
- SMTP is intentionally deferred and recorded as a follow-up.

## Next Safe Actions

1. Restore working VPS SSH access.
2. Run a fresh backup before any live Huly UI/configuration changes.
3. Sync refreshed documentation to VPS.
4. Review the full `Praut` workspace in Huly UI with a human owner.
5. Configure Tracker statuses/templates and GitHub issue/PR convention.
6. Configure Cards saved views and required-field behavior in `Settings -> TYPES`.
7. Finish SMTP/SES and validate invite links after provider details are available.
8. Add colleague SSH public key when provided.

## Blocked Or Needs User Decision

Before real Huly deployment:

- Colleague public SSH key.
- SMTP/SES provider is deferred but required before full invite email validation.
- SSO/OIDC provider.
- Automated backup schedule and production RPO/RTO.
- Whether GitHub integration is in initial PoC or second phase. Until then, manual PR links in Huly issues are the documented fallback.
- Whether AI/Love/video/collaboration extras are in initial PoC or second phase.

## Safety Gate

Ask user before:

- installing Huly,
- cloning repos into non-temp project paths,
- starting Docker services,
- exposing any URL publicly,
- changing DNS,
- creating production credentials,
- importing data into production,
- running migrations,
- deleting or cleaning objects,
- changing permissions,
- enabling integrations with real tokens.

## Resume Instruction

If work resumes after context loss:

1. Read `.aiDoc`.
2. Read `AGENT_STATE.md`.
3. Read `VYVOJOVY_DENIK.md`.
4. Read `HULY_VPS_POC_RUNBOOK.md`.
5. Read this file.
6. Continue from `Next Safe Actions`.
7. If asked to implement infrastructure, first check whether the private credential file has the required values.

## 2026-06-12 Rollout Result

Completed:
- Created post-smoke rollback backup `/root/huly-selfhost/backup-praut/20260612-091532`.
- Imported the remaining 57 numbered documents into existing `Praut` document teamspaces using a patched import-tool bundle that reused existing teamspaces by title.
- Verified `Praut` has 8 active document teamspaces, 80 documents, 80 non-empty content refs, no duplicate document titles, and no imported title matches in `VELYOS` or `sudety`.
- Imported 22 PRAUT Cards types as `card:class:MasterTag`, plus 166 attributes, 30 enums, and 24 associations.
- Created one `TEST - <type>` card instance for each of the 22 PRAUT Cards types.
- Created final backup `/root/huly-selfhost/backup-praut/20260612-124435`.
- Restore smoke for final backup passed at `/root/huly-restore-smoke/20260612-124435/RESTORE_SMOKE_RESULT.md`.
- Final production checks passed: `https://huly.praut.cz` 200, `/workbench/praut` 200, `front` and `account` `DISABLE_SIGNUP=true`, `kvs` `127.0.0.1:8094`.

Remaining:
- UI-only Cards saved views (`Aktivni`, `Bez vlastnika`, `Ke schvaleni`, `Riziko`, `Obnovy do 60 dni`, `Moje`) are not represented by the unified importer and still need manual UI setup.
- Required-field enforcement is not represented by the unified importer and still needs manual UI setup in `Settings -> TYPES`.
- Automation rules remain policy/documented only; no alert automations were enabled because SMTP/notification delivery is not configured.
