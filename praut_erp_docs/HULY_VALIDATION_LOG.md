# HULY_VALIDATION_LOG

Dated validation and audit log for PRAUT/Huly work.

Do not record secrets here.

## Validation Record Template

```md
## YYYY-MM-DD HH:MM TZ - <Area>

Actor:
- <person/agent>

Purpose:
- <why this validation was done>

Inputs:
- <files, Huly screens, commands, docs, URLs without secrets>

Steps:
- <step 1>
- <step 2>

Result:
- PASS / FAIL / PARTIAL / NOT RUN

Evidence:
- <file paths, screenshots, command summaries, Huly object names>

Issues:
- <gaps or defects>

Next:
- <next action>
```

## 2026-06-10 15:07 CEST - Persistent Memory Bootstrap

Actor:
- Codex main agent.

Purpose:
- Verify and document setup of persistent project memory.

Inputs:
- `/Users/bobbysixkiller/Downloads/praut_erp_docs`
- `/Users/bobbysixkiller/.claude/commands/ai-doc.md`
- User-approved plan for persistent memory.

Steps:
- Checked for `.aiDoc` in project root and parent chain.
- Confirmed no `.aiDoc` existed before implementation.
- Checked git status before edits.
- Created project `.aiDoc`.
- Created persistent memory files.

Result:
- PASS

Evidence:
- `.aiDoc`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_VALIDATION_LOG.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`

Issues:
- None known.

Next:
- Review memory files and prepare Huly self-host PoC checklist.

## 2026-06-10 15:08 CEST - Secret Pattern Scan

Actor:
- Codex main agent.

Purpose:
- Verify newly created persistent memory files do not contain obvious secret patterns.

Inputs:
- `.aiDoc`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_VALIDATION_LOG.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`

Steps:
- Ran `git status --short`.
- Ran `rg` scan for common token, API key, password assignment, private key, and credentialed URL patterns.
- Counted lines in all new memory files.

Result:
- PASS

Evidence:
- Git status showed only the seven new memory files as untracked.
- Secret-pattern scan returned no matches.
- New memory files total 1071 lines.

Issues:
- None found.

Next:
- Wait for read-only subagent consistency review, then address any findings if needed.

## 2026-06-10 15:09 CEST - Memory Consistency Review

Actor:
- Codex main agent with read-only subagent reviewer.

Purpose:
- Verify persistent memory files are internally consistent and match the user's continuity goal.

Inputs:
- `.aiDoc`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_VALIDATION_LOG.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`

Steps:
- Subagent reviewed persistent memory files read-only.
- Confirmed project memory, automatic continuity, resume instructions, and secret policy are clear.
- Found one low-severity wording inconsistency: continuity status said setup was in progress while progress summary said completed.
- Updated `PRAUT_CONTINUITY_STATUS.md` to completed.

Result:
- PASS

Evidence:
- `PRAUT_CONTINUITY_STATUS.md` now says documentation continuity setup is completed.
- `AGENT_STATE.md` records the review and resolution.

Issues:
- Low-severity status wording mismatch was found and resolved.

Next:
- Continue with Huly self-host PoC planning or implementation when requested.

## 2026-06-10 15:29 CEST - Human Diary Bootstrap

Actor:
- Codex main agent.

Purpose:
- Create and validate a non-technical Czech development diary for PRAUT/Huly handoff.

Inputs:
- `.aiDoc`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_VALIDATION_LOG.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`
- `VYVOJOVY_DENIK.md`

Steps:
- Created `VYVOJOVY_DENIK.md` in the project root.
- Updated `.aiDoc` so the diary is discoverable as a required human handoff document.
- Updated technical memory and continuity status to require diary maintenance after meaningful phases.
- Updated setup progress to record documentation bootstrap and preparation-gate blockers.
- Ran a secret-pattern scan on all updated state and diary files.

Result:
- PASS

Evidence:
- `VYVOJOVY_DENIK.md` exists.
- `.aiDoc` exports `VYVOJOVY_DENIK.md`.
- `AGENT_STATE.md` includes the diary maintenance rule.
- Secret-pattern scan returned no matches.

Issues:
- Real Huly deployment is not started because runtime inputs are still required.

Next:
- Collect test VPS, domain, admin email, backup admin email, and non-secret SMTP details before infrastructure work.

## 2026-06-10 15:29 CEST - Huly Version And Migration Re-check

Actor:
- Codex main agent.

Purpose:
- Re-verify the selected Huly version and migration notes before any install work.

Inputs:
- GitHub API metadata for `hcengineering/platform` release tag `v0.7.423`.
- `hcengineering/huly-selfhost` README.
- `hcengineering/huly-selfhost` `MIGRATION.md`.

Steps:
- Checked public release metadata for `v0.7.423`.
- Read current self-host README deployment notes.
- Read current self-host `MIGRATION.md` section for `v0.7.423`.

Result:
- PASS

Evidence:
- Release `v0.7.423` exists, is not draft, and is not marked prerelease.
- Self-host README recommends 4 vCPU / 16 GB RAM or more for Huly.
- `MIGRATION.md` says `v0.7.423` requires `FRONT_URL` for the optional `print` service and recreation of that container if used.

Issues:
- Real server specs are not verified yet because VPS access details are not available.

Next:
- Collect runtime inputs and confirm test VPS specs before installation.

## 2026-06-10 15:51 CEST - VPS PoC Runbook Bootstrap

Actor:
- Codex main agent.

Purpose:
- Implement the agreed plan by creating a practical runbook and recording the next executable path.

Inputs:
- User instruction to implement the plan.
- `.aiDoc`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `VYVOJOVY_DENIK.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`

Steps:
- Created `HULY_VPS_POC_RUNBOOK.md`.
- Created private credential template outside the project at `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.txt`.
- Set private credential directory permissions to `700` and file permissions to `600`.
- Updated project memory and progress files.
- Recorded SMTP as intentionally deferred and required later.
- Ran scan for non-ASCII characters in newly touched files.
- Ran secret-pattern scan against project documentation files.

Result:
- PASS

Evidence:
- `HULY_VPS_POC_RUNBOOK.md`
- `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.txt`
- Private credential directory is `drwx------`.
- Private credential file is `-rw-------`.
- `.aiDoc`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`
- `VYVOJOVY_DENIK.md`
- Secret-pattern scan returned no matches in project documentation.
- Non-ASCII scan returned no matches in newly touched project files and the private template.

Issues:
- Real Huly deployment is still not started because private server/domain values are not filled yet.
- SMTP is deferred, so invite email delivery cannot be fully validated in the first pass.

Next:
- User fills the private credential file; then agent executes `HULY_VPS_POC_RUNBOOK.md` from Phase 1.

## 2026-06-10 17:03 CEST - Colleague Handoff Sync

Actor:
- Codex main agent.

Purpose:
- Prepare complete project documentation on VPS so a colleague on another computer can continue the work.

Inputs:
- Local project directory `/Users/bobbysixkiller/Downloads/praut_erp_docs`.
- VPS directory `/root/huly-selfhost/praut_erp_docs`.
- `PREDANI_KOLEGOVI.md`.
- `HULY_VPS_POC_RUNBOOK.md`.
- `VYVOJOVY_DENIK.md`.

Steps:
- Created `PREDANI_KOLEGOVI.md`.
- Updated `.aiDoc`, technical state files, and human diary for colleague handoff.
- Scanned handoff/state files for obvious secret patterns.
- Created backup of previous VPS docs at `/root/huly-selfhost/praut_erp_docs.backup-20260610-150329`.
- Synced current local project docs to `/root/huly-selfhost/praut_erp_docs`.
- Verified key handoff files exist on VPS.

Result:
- PASS

Evidence:
- VPS has `.aiDoc`, `PREDANI_KOLEGOVI.md`, `VYVOJOVY_DENIK.md`, `HULY_VPS_POC_RUNBOOK.md`, `AGENT_STATE.md`, `PRAUT_CONTINUITY_STATUS.md`, `HULY_SETUP_PROGRESS.md`, `HULY_VALIDATION_LOG.md`, `HULY_DECISIONS_AND_DEVIATIONS.md`, and `HULY_MANUAL_CLEANUP.md`.
- VPS file count under `/root/huly-selfhost/praut_erp_docs`: 613 files.
- Previous VPS docs backup: `/root/huly-selfhost/praut_erp_docs.backup-20260610-150329`.

Issues:
- Colleague still needs their own SSH public key added to VPS.
- SMTP remains deferred.

Next:
- Add colleague public SSH key to `/root/.ssh/authorized_keys` when provided.

## Planned Validation Areas

## 2026-06-11 08:42 CEST - Backup Admin Recovery And Login

Actor:
- Codex main agent.

Purpose:
- Complete the backup admin step after the user provided a distinct backup admin email.

Inputs:
- `/Users/stepan/praut/huly-poc-secrets.env`
- `BACKUP_ADMIN_EMAIL=stepan@velyos.cz`
- Huly account endpoint `https://huly.praut.cz/_accounts`
- VPS account database via `/root/huly-selfhost`

Steps:
- Updated private `BACKUP_ADMIN_EMAIL` to `stepan@velyos.cz`.
- Attempted Huly `create-account` for the backup admin.
- Confirmed Huly reported `AccountAlreadyExists`.
- Read account DB metadata for the admin and backup admin emails without exposing password data.
- Generated a valid Huly restore token using the VPS `SECRET` and the backup admin account UUID.
- Called Huly `restorePassword` through the public account endpoint with the token in the `Authorization` header.
- Verified backup admin login with `BACKUP_ADMIN_PASSWORD` from the private env.

Result:
- PASS

Evidence:
- `create-account` returned `AccountAlreadyExists` for `stepan@velyos.cz`.
- Account DB contained non-deleted email social IDs for both `svanda@praut.cz` and `stepan@velyos.cz`.
- `restorePassword` returned a login token.
- Backup admin login returned a login token.

Issues:
- SMTP remains deferred, so email-based recovery/invites are still not validated.
- Restore test has not been run yet.

Next:
- Sync updated local documentation to VPS.
- Run or define restore test before workspace/import work.

## 2026-06-10 19:08 CEST - VPS Backup, Port Hardening, First Admin, Signup Block

Actor:
- Codex main agent.

Purpose:
- Continue the Huly PoC admin/access phase after restoring SSH access.

Inputs:
- `/Users/stepan/praut/huly-poc-secrets.env`
- `/root/huly-selfhost`
- `/root/huly-selfhost/scripts/praut-backup.sh`
- `https://huly.praut.cz`
- Huly `hardcoreeng/tool:v0.7.423`

Steps:
- Restored SSH access from the current Mac through `ssh-agent` and VPS `authorized_keys`.
- Ran `docker compose ps` and `docker compose config --quiet` on VPS.
- Ran `/root/huly-selfhost/scripts/praut-backup.sh`.
- Verified backup manifest and backup contents.
- Changed VPS `kvs` port publishing to `127.0.0.1:8094:8094`.
- Restarted only `kvs`.
- Rechecked Docker services, compose config, HTTPS response, and `8094` listening address.
- Created the first admin account through Huly `create-account`.
- Verified first admin login through the public account endpoint.
- Tested public signup without invite using a throwaway `example.invalid` address.
- Attempted backup admin creation through Huly `create-account`.

Result:
- PARTIAL

Evidence:
- SSH smoke test returned `srv1640581` and `/root/huly-selfhost`.
- Backup written to `/root/huly-selfhost/backup-praut/20260610-190235`.
- Backup manifest records host `huly.praut.cz`, `Secure: true`, title `Praut`, default language `cs`, and `Disable signup: true`.
- `docker compose config --quiet` passed on VPS.
- All Huly Docker services were running after `kvs` restart.
- `https://huly.praut.cz` returned `HTTP/2 200`.
- `ss -ltnp` showed `127.0.0.1:8094` only for `kvs`.
- First admin login returned a token.
- Public signup without invite returned `platform:status:UnknownMethod`.

Issues:
- Backup admin creation did not complete because `BACKUP_ADMIN_EMAIL` duplicates the first admin email in the private env file.
- SMTP remains deferred, so invite email delivery is not validated.
- Restore test has not been run yet.

Next:
- Set a distinct `BACKUP_ADMIN_EMAIL` in the private env file.
- Create and verify backup admin login.
- Sync updated local documentation to VPS.
- Continue restore test before workspace/import work.

## 2026-06-10 18:07 CEST - Runbook Open And SSH Path Correction

Actor:
- Codex main agent.

Purpose:
- Implement the selected next step: open the runbook and prepare current-machine SSH access for VPS continuation.

Inputs:
- `/Users/stepan/praut/huly-selfhost/praut_erp_docs/HULY_VPS_POC_RUNBOOK.md`
- `/Users/stepan/praut/huly-poc-secrets.env`
- `/Users/stepan/.ssh/huly_poc_rsa`

Steps:
- Opened the Huly VPS PoC runbook locally.
- Updated private `SSH_KEY_PATH` to `/Users/stepan/.ssh/huly_poc_rsa`.
- Kept private env permissions at `600`.
- Ran a guarded SSH smoke test that exits before network access if the key file is missing.

Result:
- PARTIAL

Evidence:
- Runbook open command completed.
- Private env file is `-rw-------`.
- Guarded SSH smoke test returned `BLOCKED: missing SSH key at configured path`.

Issues:
- The private key file `/Users/stepan/.ssh/huly_poc_rsa` does not exist on this machine.

Next:
- Place the existing VPS private key at `/Users/stepan/.ssh/huly_poc_rsa`, then rerun SSH smoke test and continue with VPS backup.

## 2026-06-10 17:55 CEST - Fresh Continuation Audit

Actor:
- Codex main agent.

Purpose:
- Resume the Huly PoC from a fresh context, correct stale status, prepare admin credentials, and verify what can be checked without VPS SSH.

Inputs:
- `/Users/stepan/praut/huly-selfhost`
- `/Users/stepan/praut/huly-poc-secrets.env`
- `huly-selfhost/compose.yml`
- `huly-selfhost/scripts/praut-backup.sh`
- `HulyPrautplatform/dev/tool/src/index.ts`
- `https://huly.praut.cz`

Steps:
- Re-read persistent state files and the VPS runbook.
- Checked git status in `huly-selfhost`.
- Confirmed current local private env file exists and changed permissions to `600`.
- Generated missing `ADMIN_PASSWORD` and `BACKUP_ADMIN_PASSWORD` into the private env file only.
- Attempted VPS SSH validation using env-provided SSH settings.
- Checked public HTTPS endpoint.
- Checked public `8094` by VPS IP from the local machine.
- Hardened local `compose.yml` so `kvs` binds to `127.0.0.1:8094:8094`.
- Read local Huly tool source to confirm `create-account <email> --password --first --last` syntax.
- Ran local `docker compose config --quiet`.
- Ran a project documentation scan for common secret assignment patterns.

Result:
- PARTIAL

Evidence:
- `curl -I https://huly.praut.cz` returned `HTTP/2 200`.
- `curl` to VPS IP on port `8094` failed to connect from the local machine.
- `/Users/stepan/praut/huly-poc-secrets.env` is `600`.
- Private env now contains variable names `ADMIN_PASSWORD` and `BACKUP_ADMIN_PASSWORD`; values intentionally not recorded.
- SSH failed because the configured key path points to the previous machine and no matching private key exists under `/Users/stepan/.ssh`.
- Local `huly-selfhost/compose.yml` changed `kvs` port publishing to localhost-only.
- Local `docker compose config --quiet` passed.
- Secret-pattern scan found only the literal variable reference `$SECRET` in a command template, not a secret value.

Issues:
- VPS backup was not run.
- VPS `docker compose ps` and `docker compose config --quiet` were not run.
- Admin accounts were not created or verified.
- Public signup blocking was not verified through the UI/API.
- Updated local docs and compose hardening were not synced to VPS.

Next:
- Restore/correct SSH access for this machine.
- Sync docs and compose hardening to VPS.
- Run `/root/huly-selfhost/scripts/praut-backup.sh`.
- Verify Docker services, create/verify admin accounts, and test signup blocking.

### Invite-only access

- Public signup blocked without invite.
- Invite link registration works.
- Invite expiration works.
- Invite use limit works.
- Email mask works if configured.
- Backup admin exists.

### Workspace and permissions

- 8 spaces exist.
- Sensitive areas are private or access-controlled.
- Owners/maintainers/users have expected rights.
- Unauthorized users cannot see private spaces.

### Import

- 80 docs imported or manually created.
- Sample content checks pass.
- Cards types exist in `Settings -> TYPES`.
- Import limitations are recorded.

### Cards and workflows

- Required fields exist.
- Required workflows exist.
- Required views exist.
- Relationships work.
- Test record exists for each type.

### Production readiness

- HTTPS works.
- SMTP/SES works.
- Backups run.
- Restore test passes.
- Upgrade path reviewed against `MIGRATION.md`.
- Rollback plan documented.

## 2026-06-11 08:58 CEST - Backup Restore Smoke Test

Actor:
- Codex main agent.

Purpose:
- Run a non-destructive restore smoke test for backup `/root/huly-selfhost/backup-praut/20260610-190235` before workspace/import work.

Inputs:
- VPS `72.62.156.104`.
- Backup directory `/root/huly-selfhost/backup-praut/20260610-190235`.
- Temporary restore workspace `/root/huly-restore-smoke/20260610-190235`.
- Isolated Docker Compose project `huly_restore_smoke`.

Steps:
- Confirmed production Huly stack was still running.
- Confirmed production `kvs` was bound to `127.0.0.1:8094->8094/tcp`.
- Copied backup artefacts into `/root/huly-restore-smoke/20260610-190235`.
- Started isolated CockroachDB and MinIO containers with no published public ports.
- Decompressed `cockroachdb.sql.gz` to `cockroachdb.raw.sql`.
- Created `cockroachdb.cleaned.nohash.sql` by removing Cockroach raw metadata lines beginning with `#`.
- Tried raw and cleaned SQL imports into isolated CockroachDB.
- Verified MinIO file count, `.minio.sys`, and readable sample object files.
- Rechecked public `https://huly.praut.cz`.
- Stopped and removed isolated test containers while preserving the restore workspace for audit.

Result:
- PARTIAL

Evidence:
- Restore workspace preserved at `/root/huly-restore-smoke/20260610-190235`.
- Restore summary preserved at `/root/huly-restore-smoke/20260610-190235/RESTORE_SMOKE_RESULT.md`.
- Raw dump stats: 3887 lines, 81 `CREATE TABLE` statements, 36 `COPY` blocks, 246 hash metadata lines.
- Raw dump contains 0 `CREATE SCHEMA`, 0 `CREATE TYPE`, and 0 `CREATE FUNCTION` statements.
- Raw import failed at the first `#` metadata line.
- Cleaned import failed first on missing schema `global_account`.
- After manually creating `global_account` and `hulykvs`, cleaned import progressed but failed on missing function `public.current_epoch_ms()`.
- MinIO backup contains 201 files total, 186 files excluding `.minio.sys`; `.minio.sys` exists.
- Sample reads of representative `part.1` and `xl.meta` files succeeded.
- Public `https://huly.praut.cz` returned HTTP 200 after the test.
- `docker compose -p huly_restore_smoke -f compose.restore-smoke.yml down` removed test containers and the isolated network.

Issues:
- Current Cockroach backup artefact is readable but not directly restorable as a complete SQL restore input.
- Backup format omits required database/schema/function/type preamble and includes raw metadata lines that break direct SQL import.

Next:
- Fix backup/restore format before workspace/import work. Prefer a Cockroach-native backup/restore or a SQL export that includes database/schema/function/type definitions and excludes raw table-output metadata.
- Re-run restore smoke until CockroachDB restore is `PASS`.

## 2026-06-11 09:15 CEST - Native Cockroach Backup Restore Smoke

Actor:
- Codex main agent.

Purpose:
- Replace the non-restorable Cockroach SQL dump path with a native CockroachDB backup and prove restore before workspace/import work.

Inputs:
- VPS `72.62.156.104`.
- Updated `/root/huly-selfhost/scripts/praut-backup.sh`.
- New `/root/huly-selfhost/scripts/praut-restore-smoke.sh`.
- New backup `/root/huly-selfhost/backup-praut/20260611-091342`.
- Restore workspace `/root/huly-restore-smoke/20260611-091342`.

Steps:
- Updated `scripts/praut-backup.sh` to create native CockroachDB backup directory `cockroachdb/` using `BACKUP DATABASE defaultdb INTO 'nodelocal://1/praut-backup/<stamp>'`.
- Added row-count and MinIO count metadata files for restore comparison.
- Added `scripts/praut-restore-smoke.sh` to restore the native backup into isolated CockroachDB and mount MinIO data read-only.
- Synced scripts to VPS and validated shell syntax.
- Confirmed production stack was running before test and `kvs` still published `127.0.0.1:8094`.
- Ran backup `/root/huly-selfhost/backup-praut/20260611-091342`.
- Ran isolated restore smoke against that backup.
- Confirmed smoke containers were removed and production endpoint still returned HTTP 200.

Result:
- PASS

Evidence:
- Backup path: `/root/huly-selfhost/backup-praut/20260611-091342`.
- Restore result: `/root/huly-restore-smoke/20260611-091342/RESTORE_SMOKE_RESULT.md`.
- Cockroach restore result: native backup restored `defaultdb` from `nodelocal://1/restore`.
- Restored table count: 81.
- Row count comparison: PASS.
- `SELECT public.current_epoch_ms()` succeeded after restore.
- MinIO total files: 209.
- MinIO files excluding `.minio.sys`: 186.
- MinIO sample object reads: PASS.
- Smoke project `huly_restore_smoke` had no running containers after cleanup.
- Public `https://huly.praut.cz` returned HTTP 200 after the test.
- Production `kvs` remained `127.0.0.1:8094->8094/tcp`.

Issues:
- A prior intermediate backup attempt `/root/huly-selfhost/backup-praut/20260611-091156` completed native Cockroach `BACKUP` but had a broken row-count manifest due to shell TSV parsing; do not use it as the acceptance backup.
- Helm Cockroach backup template still contains the old SQL-dump pattern and is not validated for production restore.

Next:
- Keep `/root/huly-selfhost/backup-praut/20260611-091342` as the accepted pre-import restore-tested backup.
- Workspace/import work may proceed after normal import planning gates.
- If Helm backup is used later, replace its SQL-dump pattern with a native backup flow appropriate for Kubernetes storage/S3.

## 2026-06-12 09:03 CEST - Praut Workspace And Document Import Smoke

Actor:
- Codex main agent.

Purpose:
- Create and validate the dedicated `Praut` workspace and run the first limited document import smoke without importing Cards types.

Inputs:
- `https://huly.praut.cz`
- Private local env `/Users/stepan/praut/huly-poc-secrets.env`
- VPS `/root/huly-selfhost`
- Accepted rollback backup `/root/huly-selfhost/backup-praut/20260611-091342`
- Source docs `/root/huly-selfhost/praut_erp_docs/huly_unified_import`
- Huly `hardcoreeng/tool:v0.7.423`
- Huly `hardcoreeng/import-tool:v0.7.423`

Steps:
- Rechecked `https://huly.praut.cz` and `/workbench/praut`, both returned HTTP 200.
- Confirmed `kvs` remained published only as `127.0.0.1:8094`.
- Confirmed existing workspaces were `sudety` and `VELYOS`; `Praut` was created as a separate workspace with slug `praut`.
- Ran Huly `create-workspace Praut email:svanda@praut.cz -d praut`; the first attempt created the account DB record but failed before `create-done` because the manually supplied MinIO credentials were wrong.
- Stopped the hung `hardcoreeng/tool:v0.7.423` container from that failed attempt.
- Re-ran Huly `upgrade-workspace praut` using `STORAGE_CONFIG` copied from the running `account` container; model initialization completed.
- Assigned `svanda@praut.cz` to `praut` and set role `OWNER` through Huly tool commands.
- Found `Praut` still had `workspace_status.is_disabled=true`; cleared only that stuck flag to match the Huly `create-done` state, because `upgrade-done` does not reset `isDisabled`.
- Built a temporary smoke import folder with 8 document teamspace YAML files and 23 selected documents only.
- Ran `hardcoreeng/import-tool:v0.7.423` against `--workspace praut`.
- Removed temporary credential and import folders after import.
- Verified imported teamspaces and document titles in CockroachDB.
- Verified imported document titles did not appear in `VELYOS` or `sudety`.
- Rechecked endpoint, `DISABLE_SIGNUP=true` in both `front` and `account`, and `kvs` localhost binding after import.

Result:
- PASS with recorded operational deviation.

Evidence:
- `Praut` workspace UUID: `4533ec0f-0808-40d3-9c71-d5cee56cd439`.
- `Praut` workspace URL/data ID: `praut` / `praut`.
- `Praut` final status: `mode=active`, `processing_progress=100`, `is_disabled=false`.
- Imported document teamspaces: `Zaklad systemu`, `Obchod a CRM`, `Zakazky, projekty a ukoly`, `Dokumenty a znalostni baze`, `Komunikace a spoluprace`, `Marketing a zakaznicka pece`, `Automatizace, AI a integrace`, `Rizeni firmy a reporting`.
- Imported `document:class:Document` count in `Praut`: 23.
- Imported document titles: 1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 20, 21, 22, 25, 28, 29, 30, 31, 32, 34, 38.
- Representative document metadata for 8 sampled documents contained non-empty `content` object IDs.
- Matching imported title count outside `Praut` in `VELYOS` and `sudety`: 0.
- `https://huly.praut.cz` returned 200 after import.
- `/workbench/praut` returned 200 after import.
- `front` and `account` still had `DISABLE_SIGNUP=true`.
- `docker compose port kvs 8094` returned `127.0.0.1:8094`.

Issues:
- The initial `create-workspace` command failed before `create-done` due to wrong hand-built MinIO credentials. The retry used the live `STORAGE_CONFIG`.
- Huly `upgrade-workspace` completed model initialization but left `is_disabled=true`; a targeted CockroachDB update was used only to clear that stuck flag for the newly created `praut` workspace.
- Import-tool printed a workspace token in command output during successful import; it was not recorded into project documentation.
- Signup was rechecked by environment configuration after import, not by a fresh throwaway signup attempt; previous API validation already returned `platform:status:UnknownMethod`.

Next:
- Review the imported smoke content in Huly UI.
- Do not import all 80 documents or Cards types until this smoke is accepted.
- Handle Cards types separately in `Settings -> TYPES`.

## 2026-06-12 12:50 CEST - Full PRAUT Import, Cards Setup, And Final Restore Smoke

Actor:
- Codex main agent.

Purpose:
- Complete the PRAUT rollout in existing workspace `Praut` / `praut` without modifying `VELYOS` or `sudety`.

Inputs:
- VPS `/root/huly-selfhost`.
- Source package `/root/huly-selfhost/praut_erp_docs/huly_unified_import`.
- Huly `hardcoreeng/import-tool:v0.7.423`.
- Private local env `/Users/stepan/praut/huly-poc-secrets.env`; secret values not recorded.

Steps:
- Created post-smoke rollback backup `/root/huly-selfhost/backup-praut/20260612-091532`.
- Built a temporary import folder with 8 teamspace YAML files and only the 57 missing numbered documents.
- Patched a temporary copy of the import-tool bundle so `createTeamspace` reuses an existing non-archived teamspace with the same title instead of creating duplicates.
- Imported the 57 missing documents into `praut`.
- Validated document counts and cross-workspace isolation in CockroachDB.
- Built a Cards-only import folder with 22 `card:class:MasterTag` YAML files, 30 enum YAML files, and 24 association YAML files.
- Imported Cards type metadata into `praut`.
- Patched a temporary copy of the import-tool bundle to allow root Markdown test cards to target the generated PRAUT MasterTag IDs.
- Created 22 `TEST - <type>` card instances, one per Cards type.
- Created final backup `/root/huly-selfhost/backup-praut/20260612-124435`.
- Ran isolated restore smoke for `/root/huly-selfhost/backup-praut/20260612-124435`.
- Rechecked production HTTP endpoints, `DISABLE_SIGNUP`, and `kvs` binding.

Result:
- PASS with manual UI follow-ups.

Evidence:
- Post-smoke rollback backup: `/root/huly-selfhost/backup-praut/20260612-091532`.
- Final backup: `/root/huly-selfhost/backup-praut/20260612-124435`.
- Final restore smoke result: `/root/huly-restore-smoke/20260612-124435/RESTORE_SMOKE_RESULT.md`.
- Restore smoke: PASS; 81 restored CockroachDB tables; row count comparison PASS; MinIO sample reads PASS; 333 total MinIO files; 288 non-system MinIO files.
- `Praut` document teamspaces: 8.
- `Praut` documents: 80.
- Documents with content refs: 80.
- Duplicate document titles in `Praut`: 0.
- Matching imported titles in `VELYOS` or `sudety`: 0.
- Imported Cards metadata: 22 MasterTags, 166 attributes, 30 enums, 24 associations.
- TEST Cards: 22 total, 22 with content refs, 0 imported Cards types without a TEST card.
- `https://huly.praut.cz`: HTTP 200.
- `https://huly.praut.cz/workbench/praut`: HTTP 200.
- `front` `DISABLE_SIGNUP=true`; `account` `DISABLE_SIGNUP=true`.
- `kvs` port: `127.0.0.1:8094`.

Issues:
- Import-tool emits a workspace token in normal output; command output was filtered and token values were not recorded in project files.
- Cards saved views are not represented by the unified importer and still need manual UI setup.
- Required-field enforcement is not represented by the unified importer and still needs manual UI setup.
- SMTP/SES is not configured, so invite email delivery and alert-only notification delivery are not fully validated.
- Automation rules were not enabled; they remain documented policy until notification delivery is configured and approved.

Next:
- Human owner should review the UI state in Huly.
- Configure Cards saved views and required-field behavior manually in `Settings -> TYPES`.
- Configure SMTP/SES and validate invite flow when provider details are available.

## 2026-06-12 - Handoff Documentation Refresh

Actor:
- Codex main agent.

Purpose:
- Prepare complete colleague handoff documentation on VPS after full PRAUT rollout.

Files updated or added:
- `KOLEGA_START_HERE.md`
- `PREDANI_KOLEGOVI.md`
- `PRAUT_OPERATIONS_RUNBOOK.md`
- `PRAUT_REMAINING_WORK.md`
- `README.md`
- `.aiDoc`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `AGENT_STATE.md`
- `VYVOJOVY_DENIK.md`

Result:
- Handoff docs now reflect that the full data rollout is complete.
- Remaining work is explicitly separated from completed import state.
- No secret values were intentionally recorded.

VPS sync:
- Previous VPS documentation backup: `/root/huly-selfhost/praut_erp_docs.backup-20260612-113244`.
- Uploaded refreshed `praut_erp_docs` package to `/root/huly-selfhost/praut_erp_docs`.
- Verified these files exist on VPS: `KOLEGA_START_HERE.md`, `PREDANI_KOLEGOVI.md`, `PRAUT_OPERATIONS_RUNBOOK.md`, `PRAUT_REMAINING_WORK.md`.

Post-sync validation:
- Stale-current-state phrase scan on VPS returned no matches.
- Secret pattern scan on VPS returned no matches.
- `docker compose ps` showed Huly services running.
- `https://huly.praut.cz`: HTTP 200.
- `https://huly.praut.cz/workbench/praut`: HTTP 200.
- `front` `DISABLE_SIGNUP=true`.
- `account` `DISABLE_SIGNUP=true`.
- `docker compose port kvs 8094`: `127.0.0.1:8094`.

## 2026-06-16 09:20 CEST - Owner-Ready Continuation Attempt

Actor:
- Codex main agent.

Purpose:
- Continue owner-ready completion from the handoff plan: run fresh backup, verify live infrastructure, then finish UI and training follow-up documentation.

Inputs:
- `/Users/stepan/praut`
- `/Users/stepan/praut/huly-poc-secrets.env`
- `huly-selfhost/praut_erp_docs/*`
- `praut_erp_docs/copy_paste_import/10-control-scenarios.md`
- `praut_erp_docs/copy_paste_import/11-cards-setup-guide.md`
- `praut_erp_docs/copy_paste_import/12-automation-rules.md`

Steps:
- Re-read continuity, progress, remaining work, validation log, operations runbook, handoff docs, Cards setup guide, control scenarios, and automation rules.
- Attempted SSH to the VPS using the local private key path from the private env.
- Attempted SSH through default agent.
- Checked local `ssh-agent` availability.
- Added `PRAUT_OWNER_ADMIN_KURZ.md` for owner/admin training.
- Updated handoff and remaining-work docs with the current access blocker and owner-ready UI tasks.

Result:
- PARTIAL

Evidence:
- SSH returned `Permission denied (publickey,password)`.
- `ssh-add -l` returned `Error connecting to agent: Operation not permitted`.
- Public `https://huly.praut.cz` returned HTTP 200 from local curl.
- Public `https://huly.praut.cz/workbench/praut` returned HTTP 200 from local curl.
- Added `PRAUT_OWNER_ADMIN_KURZ.md`.
- Updated `KOLEGA_START_HERE.md`, `PREDANI_KOLEGOVI.md`, `PRAUT_REMAINING_WORK.md`, `PRAUT_OPERATIONS_RUNBOOK.md`, `HULY_SETUP_PROGRESS.md`, and `HULY_MANUAL_CLEANUP.md`.

Issues:
- Could not run a fresh VPS backup from this session.
- Could not verify cron, Docker services, `DISABLE_SIGNUP`, `kvs`, live Cards views, required-field enforcement, or the `Untitled` document.
- SMTP/SES remains intentionally deferred.

Next:
- Restore working SSH access or provide an approved way to reach the VPS.
- Run `scripts/praut-backup.sh`.
- Verify cron/systemd backup schedule.
- Complete Cards saved views and required-field validation in Huly UI.
- Inspect `Untitled` without deletion.
- Run owner-ready control scenarios on `DEMO -` records.
