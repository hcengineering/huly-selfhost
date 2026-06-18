# AGENT_STATE

Persistent operating memory for all future PRAUT/Huly work in this project.

This file is intentionally detailed. Every future agent must read it before acting, so work can resume even after context loss.

## Resume Here

Objective:
- Build and operate an internal PRAUT ERP/workflow environment in Huly.
- Keep Huly closed to the public: no open signup, access only through invite/admin-controlled onboarding.
- Maintain persistent state in this repository so future work can continue with minimal user input.

Current status:
- Local project inspected: `/Users/bobbysixkiller/Downloads/praut_erp_docs`.
- Huly option audit completed on 2026-06-10.
- Recommended Huly variant: self-hosted Huly using `hcengineering/huly-selfhost`.
- Recommended application version/tag: `v0.7.423` from `hcengineering/platform`.
- Recommended production access mode: invite-only, with public signup disabled.
- Persistent memory system created in this project on 2026-06-10.
- Human-readable Czech development diary created as `VYVOJOVY_DENIK.md` on 2026-06-10.
- `v0.7.423` re-verified on 2026-06-10 as a public non-prerelease GitHub release; self-host `MIGRATION.md` section read.
- Practical VPS PoC runbook created as `HULY_VPS_POC_RUNBOOK.md` on 2026-06-10.
- User selected private credential storage outside the project: `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env`.
- User selected that the agent should configure DNS/domain access if credentials are provided.
- User selected to skip SMTP for now and record it as a required follow-up.
- Huly is running on VPS `72.62.156.104` and shows login at `https://huly.praut.cz`.
- Working VPS SSH access is `root` with local private key `/Users/bobbysixkiller/.ssh/huly_poc_rsa`.
- Colleague handoff guide created as `PREDANI_KOLEGOVI.md`.
- Current project documentation synced to VPS at `/root/huly-selfhost/praut_erp_docs`.
- Fresh continuation on 2026-06-10 is running from `/Users/stepan/praut`.
- Current local private env file is `/Users/stepan/praut/huly-poc-secrets.env`; permissions were corrected to `600`.
- `ADMIN_PASSWORD` and `BACKUP_ADMIN_PASSWORD` were generated only into the private env file; do not copy their values into docs or chat.
- Current-session VPS SSH access is blocked as of 2026-06-16: direct SSH with `/Users/stepan/.ssh/huly_poc_rsa` returned `Permission denied`, and `ssh-agent` was not available in the sandboxed session. Previous sessions had working access through ssh-agent.
- Public HTTPS check from the current machine returned HTTP 200 for `https://huly.praut.cz`.
- VPS backup completed at `/root/huly-selfhost/backup-praut/20260610-190235`.
- VPS `kvs` now publishes `127.0.0.1:8094:8094` instead of all interfaces.
- First admin account was created with Huly `create-account`; login with private env password passed.
- Public signup without invite is blocked.
- Backup admin email is `stepan@velyos.cz`; existing account was recovered via Huly `restorePassword`, and login with private env password passed.
- CockroachDB backup format was fixed on 2026-06-11 to use native `BACKUP DATABASE`; the old hand-rolled SQL dump path is not the accepted restore path.
- Accepted pre-import backup is `/root/huly-selfhost/backup-praut/20260611-091342`.
- Accepted restore smoke workspace is `/root/huly-restore-smoke/20260611-091342`.
- Restore smoke for `20260611-091342` passed: 81 CockroachDB tables restored with matching row counts, `public.current_epoch_ms()` worked, MinIO had 209 files total, sample reads passed, smoke containers were removed, production still returned HTTP 200, and `kvs` stayed localhost-only.
- Dedicated workspace `Praut` / `praut` now contains 8 active document teamspaces, 80 documents, 22 Cards types, and 22 TEST card instances.
- Post-smoke rollback backup is `/root/huly-selfhost/backup-praut/20260612-091532`.
- Final post-rollout backup is `/root/huly-selfhost/backup-praut/20260612-124435`.
- Restore smoke for `20260612-124435` passed: 81 CockroachDB tables restored with matching row counts, MinIO sample reads passed, smoke containers were removed, production still returned HTTP 200, and `kvs` stayed localhost-only.
- Owner/admin course was added as `PRAUT_OWNER_ADMIN_KURZ.md` on 2026-06-16.
- Documentation was updated on 2026-06-17 to simplify daily operations: Tracker is the main source of truth for work, GitHub remains source of truth for code/PR/review, Contacts are source of truth for companies/people, and Cards are limited to structured business/operations evidence, reporting, risks, and invoicing.

Next safe action:
- Restore working VPS SSH access or provide another approved live access path.
- Run a fresh backup and verify cron/systemd backup schedule.
- Sync updated docs to VPS.
- Apply the simplified Tracker/GitHub operating model in the Huly UI after a fresh backup.
- Review the finished `Praut` workspace in Huly UI.
- Configure UI-only Cards saved views and required-field enforcement in `Settings -> TYPES`.
- Configure Tracker statuses and templates documented in `OPERATIVNI_MODEL_HULY_TRACKER_GITHUB.md`.
- Inspect the reported `Untitled` document without deleting it.
- Configure SMTP/SES and validate invite email flow when provider details are available.

Blocked on user:
- Colleague access needs colleague's public SSH key.
- Current-session VPS verification is blocked until SSH/agent access is restored.
- SMTP is intentionally deferred; invite email delivery cannot be fully validated until SMTP details are provided.

Do not do:
- Do not write secrets into this repository.
- Do not run production installs, migrations, deletes, or config changes without explicit user approval.
- Do not assume the newest Huly release is automatically the best production choice.
- Do not expose public signup.
- Do not record values from `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env` in project files or chat.

Validation needed:
- Verify new memory docs contain no secrets.
- Verify next Huly PoC tests include signup-disabled and invite-link checks.
- Keep restore-tested backup evidence linked when starting workspace/import work.

## Standing Startup Protocol

At the start of every future task in this project:

1. Look for `.aiDoc` in the project root and parents up to home.
2. Read `.aiDoc` first if present.
3. Read this `AGENT_STATE.md`.
4. Read `PRAUT_CONTINUITY_STATUS.md`.
5. Read `VYVOJOVY_DENIK.md` for the current human-facing state.
6. Read the relevant status/log file for the active task.
7. Run `git status --short` before any edit.
8. Determine whether the task is read-only, planning, or implementation.
9. Continue from the first safe unfinished next action.

If state files and real files disagree:

- Trust real files and current environment first.
- Update the state files to reflect verified reality.
- Record the correction in `HULY_VALIDATION_LOG.md` or `HULY_DECISIONS_AND_DEVIATIONS.md` if it affects the plan.

## Current Objective

Prepare PRAUT for a controlled Huly deployment:

- internal-only workspace,
- 8 teamspaces,
- 80 documents,
- 22 Cards types,
- 6 required Card views,
- 7 alert-only automation rules,
- strict human approval for sensitive decisions,
- repeatable import, validation, backup, rollback, and handoff.

## Key Decisions

### 2026-06-10: Persistent memory location

Decision:
- Store persistent project memory directly in `/Users/bobbysixkiller/Downloads/praut_erp_docs`.

Rationale:
- The state travels with the project.
- Future agents can resume without relying on external conversation context.
- User explicitly selected project-local memory.

### 2026-06-10: Persistent memory update policy

Decision:
- Automatically update persistent memory after every meaningful step.

Rationale:
- User wants minimal future input.
- Context loss must not break continuity.

Meaningful step means:
- architecture/security/deployment decision,
- task completed or blocked,
- new evidence discovered,
- validation performed,
- user preference clarified,
- work stopped with unfinished context,
- any change touching permissions, invite-only behavior, hosting, backups, migration, GitHub integration, AI, or data handling.

Every meaningful implementation phase must also update `VYVOJOVY_DENIK.md` in plain Czech for non-technical readers. Keep technical details in the state and validation files; use the diary to explain what changed, why it matters, what is done, what is not done, the next step, and what is needed from the user.

### 2026-06-10: Persistent memory detail level

Decision:
- Use very detailed persistent memory.

Rationale:
- User requested maximum continuity even after severe context loss.
- Detail is acceptable as long as it stays structured and excludes secrets.

### 2026-06-10: Recommended Huly variant

Decision:
- Recommend Huly Self-Hosted via `hcengineering/huly-selfhost`.

Rationale:
- Better control over closed access, data, reverse proxy, backups, upgrade timing, and operations than Huly Cloud.
- Lower operational/build complexity than custom build from `hcengineering/platform`.
- Matches local PRAUT requirements for security, auditability, onboarding, integrations, and controlled access.

### 2026-06-10: Recommended Huly version

Decision:
- Use production `v*` tag `v0.7.423` as the first PoC candidate.

Rationale:
- It is a production release tag, not a development tag.
- Release includes relevant Cards/process/import improvements.
- It better matches the project need for Cards-heavy workflows than older tags.

Fallback:
- Use older self-host tag `v0.7.242` only if `v0.7.423` fails PoC or deployment validation.

Re-verification:
- On 2026-06-10, GitHub API confirmed `hcengineering/platform` release `v0.7.423` exists, is not a draft, and is not marked prerelease.
- Current `hcengineering/huly-selfhost` README still says to use production `v*` tags for self-hosted deployments.
- Current self-host `MIGRATION.md` has a `v0.7.423` section: if optional `print` service is deployed, `FRONT_URL` is required and the `print` container must be recreated.

### 2026-06-10: Invite-only access mode

Decision:
- Configure invite-only mode by setting `DISABLE_SIGNUP=true` in both `account` and `front` services.

Rationale:
- UI and backend must both prevent public registration.
- Invite links should be the only onboarding path after the first admin account exists.

### 2026-06-10: Credential handling for VPS PoC

Decision:
- Store operational credentials outside the project in `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env`.

Rationale:
- User wants the agent to do the work, but secrets must not be written into project docs or chat.

Impact:
- Project files may reference this path but must not copy values from it.
- The file may contain server, domain, and future SMTP access details.

### 2026-06-10: SMTP deferred for first infrastructure pass

Decision:
- Continue Core VPS PoC without SMTP for now.

Rationale:
- User selected "Bez e-mailu zatim" and explicitly asked to record that it must be finished later.

Impact:
- Huly can be installed and locked down.
- Invite email delivery, invite expiration by email flow, and notification delivery cannot be marked complete until SMTP is configured.
- SMTP remains a required follow-up before full PoC exit.

## Deployment Plan Snapshot

Recommended deployment path:

1. Non-production PoC first.
2. Use `hcengineering/huly-selfhost`.
3. Set `HULY_VERSION=v0.7.423`.
4. Create first admin and workspace.
5. Disable public signup in both `account` and `front`.
6. Configure SMTP/SES for invites and notifications.
7. Validate public signup is blocked.
8. Validate invite links with expiration, use limits, and email mask.
9. Import a minimal PRAUT slice.
10. Validate Cards, views, relationships, and control scenarios.
11. Keep backup and rollback evidence current before production use.

Recommended production architecture:

- Single VPS/cloud server for first production phase.
- Ubuntu LTS.
- Docker Compose.
- Reverse proxy: Nginx or Traefik.
- HTTPS via Let's Encrypt.
- Public exposure only through HTTPS proxy.
- Internal service ports not exposed publicly.
- SMTP/SES required for invite and notification flow.
- SSO/OIDC recommended before broader rollout if an IdP exists.
- VPN/firewall recommended for admin access and non-public services.
- Daily backup automation is still future work, but the PoC pre-import restore gate passed on `/root/huly-selfhost/backup-praut/20260611-091342`.

## Repo Map

Primary source-of-truth files:

- `README.md`: project orientation and where to start.
- `KOLEGA_START_HERE.md`: first handoff document for colleague orientation.
- `PRAUT_OPERATIONS_RUNBOOK.md`: health checks, backup, restore smoke, and safety invariants.
- `PRAUT_REMAINING_WORK.md`: open items after full rollout.
- `PRAUT_PROSTREDI.md`: target state for the Huly environment.
- `IMPORT_CHECKLIST.md`: step-by-step setup checklist.
- `PROCESY_PRO_PREDANI.md`: process handoff and end-to-end workflow map.
- `HULY_IMPORT_RUNBOOK.md`: practical import runbook.
- `HULY_VPS_POC_RUNBOOK.md`: practical VPS PoC execution runbook.
- `PREDANI_KOLEGOVI.md`: colleague handoff guide.
- `00_index.md`: catalog of all 80 documents.

Cards and setup references:

- `copy_paste_import/09-cards-schema.md`: canonical Cards schema.
- `copy_paste_import/10-control-scenarios.md`: manual validation scenarios.
- `copy_paste_import/11-cards-setup-guide.md`: Cards setup guide.
- `copy_paste_import/12-automation-rules.md`: alert-only automation rules.
- `huly_unified_import/README.md`: import package scope and limitations.
- `huly_cards_import_report.md`: generated Cards import report and known limitations.

Persistent memory files:

- `AGENT_STATE.md`: main resume and operating state.
- `PRAUT_CONTINUITY_STATUS.md`: current phase, next steps, blockers.
- `HULY_SETUP_PROGRESS.md`: setup checklist status.
- `HULY_VALIDATION_LOG.md`: validation/audit log.
- `HULY_DECISIONS_AND_DEVIATIONS.md`: decisions and approved deviations.
- `HULY_MANUAL_CLEANUP.md`: cleanup and incomplete/manual follow-up log.
- `VYVOJOVY_DENIK.md`: human-readable Czech development diary and handoff.

Private files outside project:

- `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env`: private credential/input file for VPS PoC. Never copy values into project docs.

Employee-facing layer:

- `zamestnanecke_navody/`: end-user instructions after environment is ready.

Historical/generated reports:

- `huly_docs_import_report.md`: historical/generated import report.
- `huly_import_report.md`: historical/generated import report.

## Known Constraints

- User wants minimal questions and maximum autonomous continuity.
- User permits questions only when needed for correct outcome.
- No secrets may be written to project docs.
- Public registration must not be enabled in production.
- Huly deployment must support internal company use only.
- Huly Cloud is not recommended as primary option because of lower operational control.
- Custom platform build is not recommended unless future custom modules require it.
- Production upgrades require `MIGRATION.md` review and tested backup/rollback.
- Development `s*` tags are not production default candidates.

## Open Questions

These are not blockers for documentation continuity, but are blockers before production deployment:

- Final domain for Huly.
- Test VPS IP and SSH user in the private credential file.
- Domain provider access in the private credential file.
- Colleague public SSH key for independent VPS access.
- SMTP/SES provider for invites and notifications is deferred.
- Whether SSO/OIDC will be used from day one.
- Backup RPO/RTO target.
- Production server/cloud provider.
- Whether video/Love, AI bot, Gmail/Calendar, and GitHub OAuth are in PoC scope or later rollout.
- Whether optional `print` service will be deployed in PoC; if yes, include `FRONT_URL` in its environment.

## Next Actions

Safe without user input:

1. Keep documentation and diary current.
2. Keep `KOLEGA_START_HERE.md`, `PREDANI_KOLEGOVI.md`, and runbooks synced to VPS.
3. Add colleague's public SSH key when provided.
4. Continue Huly PoC follow-ups from `PRAUT_REMAINING_WORK.md` and `PRAUT_OPERATIONS_RUNBOOK.md`.

Requires user approval:

1. Use credentials from `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env`.
2. Clone or install Huly repositories on the VPS.
3. Start Docker services.
4. Configure real domain/DNS/HTTPS.
5. Configure SMTP/SES or OAuth credentials.
5. Run migrations or restore backups.
6. Import into a real Huly workspace.
7. Change production access rules.

## Validation Checklist

Documentation continuity:

- `.aiDoc` exists in project root.
- `AGENT_STATE.md` has current objective and resume instructions.
- `VYVOJOVY_DENIK.md` exists and explains the current state for non-technical readers.
- `PRAUT_CONTINUITY_STATUS.md` has current phase and next action.
- Decision and validation logs exist.
- No secrets are present.

Huly PoC:

- Public URL loads only expected entrypoints.
- Public signup without invite fails.
- Invite link registration succeeds.
- Expired invite link fails.
- Invite use limit works.
- Email mask blocks non-company email if configured.
- First admin and backup admin exist.
- Workspace owner/maintainer roles are correct.
- Private spaces are not visible to non-members.
- Import of minimal docs/cards succeeds.
- Control scenarios pass.
- Backup and restore test passes before production data.

## Sensitive Data Policy

Never write these values:

- passwords,
- API keys,
- OAuth client secrets,
- tokens,
- private keys,
- cookies,
- session values,
- full database URLs containing credentials,
- complete `.env` contents.

Allowed:

- environment variable names,
- provider names,
- required secret descriptions,
- redacted values,
- non-secret URLs,
- file paths,
- operational notes that do not reveal secret values.

If a secret is encountered, record only:

`Secret required: <NAME>. Location: <vault/env/provider>. Value intentionally not recorded.`

## Subagent Protocol

Use subagents only when they materially help:

- parallel documentation inventory,
- deployment option comparison,
- Huly source/release research,
- security risk checklist,
- validation checklist drafting,
- log/progress consistency review.

Rules:

- Give each subagent a narrow task.
- Prefer read-only tasks unless explicit implementation is requested.
- Require file/source references for claims.
- Do not let subagents decide final architecture alone.
- Main agent integrates and records final state.

## Work Log

### 2026-06-10 15:07 CEST

Actor:
- Codex main agent.

Task:
- Implemented persistent memory plan requested by user.

Completed:
- Verified no `.aiDoc` existed in project root or parent chain.
- Verified git tree was clean before edits.
- Created project `.aiDoc`.
- Created persistent memory document set.

Files added:
- `.aiDoc`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_VALIDATION_LOG.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`

Safety:
- No secrets recorded.
- No Huly install, import, migration, deletion, or configuration change performed.

Validation:
- Ran `git status --short`; new memory files are untracked additions only.
- Ran secret-pattern scan across all new memory files; no matches found.
- Counted new file sizes: 7 files, 1071 total lines.
- Ran read-only subagent consistency review.
- Resolved low-severity status wording mismatch between `PRAUT_CONTINUITY_STATUS.md` and `HULY_SETUP_PROGRESS.md`.

### 2026-06-12 12:50 CEST

Actor:
- Codex main agent.

Task:
- Complete full PRAUT import and Cards rollout in existing workspace `Praut` / `praut`.

Completed:
- Created post-smoke rollback backup `/root/huly-selfhost/backup-praut/20260612-091532`.
- Imported the remaining 57 documents into existing `Praut` teamspaces.
- Used a temporary patched import-tool bundle only to reuse existing teamspaces by title and avoid duplicate teamspaces.
- Verified `Praut` has 8 active document teamspaces and 80 documents; all 80 documents have content refs.
- Verified duplicate document titles in `Praut`: 0.
- Verified matching imported titles in `VELYOS` and `sudety`: 0.
- Imported Cards metadata: 22 `card:class:MasterTag` types, 166 attributes, 30 enums, and 24 associations.
- Created 22 `TEST - <type>` card instances, one for each imported Cards type.
- Verified every Cards type has a TEST card with a content ref.
- Created final backup `/root/huly-selfhost/backup-praut/20260612-124435`.
- Restore smoke for final backup passed: `/root/huly-restore-smoke/20260612-124435/RESTORE_SMOKE_RESULT.md`.
- Final production checks passed: root and `/workbench/praut` HTTP 200, `DISABLE_SIGNUP=true` in `front` and `account`, `kvs` `127.0.0.1:8094`.

Safety:
- `VELYOS` and `sudety` were not modified.
- Import-tool emitted a workspace token in command output; output was filtered and no token value was recorded in project files.
- Temporary import folders and patched bundles were kept under `/tmp` on the VPS.

Remaining:
- Manual UI follow-up: Cards saved views and required-field enforcement in `Settings -> TYPES`.
- Operational follow-up: SMTP/SES invite validation, colleague public SSH key, automated backup schedule.

### 2026-06-12 Handoff Documentation Refresh

Actor:
- Codex main agent.

Task:
- Prepare complete VPS handoff documentation for colleague continuation.

Completed:
- Added `KOLEGA_START_HERE.md` as the first document for colleague orientation.
- Rewrote `PREDANI_KOLEGOVI.md` to reflect the full rollout state instead of the older pre-import state.
- Added `PRAUT_OPERATIONS_RUNBOOK.md` with health checks, backup, restore smoke, and safety invariants.
- Added `PRAUT_REMAINING_WORK.md` with explicit remaining work and external blockers.
- Updated document entrypoints and continuity references.

Safety:
- No secrets recorded.
- No production data, Docker config, or Huly workspace data changed.
