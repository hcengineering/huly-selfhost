# HULY_DECISIONS_AND_DEVIATIONS

Decision log and approved deviations from source documentation.

Do not record secrets here.

## Decision Record Template

```md
## YYYY-MM-DD - <Decision title>

Decision:
- <what was decided>

Rationale:
- <why>

Impact:
- <what this changes>

Owner:
- <person/role>

Source/evidence:
- <local files or external docs>

Supersedes:
- <previous decision or none>
```

## 2026-06-10 - Bind `kvs` port to localhost only

Decision:
- Publish the Huly `kvs` service as `127.0.0.1:8094:8094` instead of `8094:8094` in local `compose.yml`.

Rationale:
- `kvs` is an internal service and should not be reachable from the public internet.
- Public Huly access should go through HTTPS on `80/443` via the web entrypoint/reverse proxy.

Impact:
- Future compose sync/restart should not expose `8094` on all interfaces.
- The same hardening still needs to be synced and applied on VPS after SSH access is restored.

Owner:
- PRAUT infrastructure owner / Codex agent.

Source/evidence:
- `compose.yml`
- `HULY_VPS_POC_RUNBOOK.md`
- Fresh continuation audit in `HULY_VALIDATION_LOG.md`

Supersedes:
- Default `8094:8094` local compose mapping.

## 2026-06-10 - Use project-local persistent memory

Decision:
- Store persistent agent memory directly in `/Users/bobbysixkiller/Downloads/praut_erp_docs`.

Rationale:
- User wants future continuity even after context loss.
- Project-local files are easiest for future agents to discover and maintain.

Impact:
- New memory files are part of the project documentation package.
- Future agents should update these files automatically after meaningful work.

Owner:
- PRAUT project owner / Codex agent.

Source/evidence:
- User selected "Do projektu".
- `AGENT_STATE.md`

Supersedes:
- None.

## 2026-06-11 - Use native CockroachDB backup for Docker Compose PoC

Decision:
- Use CockroachDB native `BACKUP DATABASE`/`RESTORE DATABASE` for the Docker Compose VPS backup and restore gate.
- Treat `scripts/praut-backup.sh` native `cockroachdb/` backup directories as the accepted database backup artefact.
- Do not treat legacy `cockroachdb.sql.gz` files created from `SHOW CREATE ALL TABLES` plus ad hoc `COPY` blocks as restorable backups.

Rationale:
- Restore smoke on `/root/huly-selfhost/backup-praut/20260610-190235` showed the SQL dump contained Cockroach raw `#` metadata and lacked schema/function/type preamble.
- Native backup restored successfully from `/root/huly-selfhost/backup-praut/20260611-091342` into isolated CockroachDB.

Impact:
- Current accepted pre-import rollback point is `/root/huly-selfhost/backup-praut/20260611-091342`.
- `scripts/praut-restore-smoke.sh` is the repeatable restore smoke path for Docker Compose backups.
- The Helm Cockroach backup CronJob still contains the old SQL-dump pattern and must be redesigned before Helm backups are trusted.

Owner:
- PRAUT infrastructure owner / Codex agent.

Source/evidence:
- `scripts/praut-backup.sh`
- `scripts/praut-restore-smoke.sh`
- `/root/huly-restore-smoke/20260611-091342/RESTORE_SMOKE_RESULT.md`
- `HULY_VALIDATION_LOG.md`

Supersedes:
- Hand-rolled Cockroach SQL dump backup format.

## 2026-06-10 - Automatic state updates

Decision:
- Update persistent memory automatically after meaningful steps.

Rationale:
- User requested minimal future input.
- Handoff quality depends on current state being recorded without manual prompting.

Impact:
- Future work should update `AGENT_STATE.md` and specific logs/progress files.
- User approval is still required for risky actions, production changes, secrets, installs, migrations, deletes, and infrastructure changes.

Owner:
- Codex agent.

Source/evidence:
- User selected "Automaticky".

Supersedes:
- None.

## 2026-06-10 - Very detailed persistent memory

Decision:
- Keep persistent memory very detailed but structured.

Rationale:
- User explicitly requested maximal continuity.
- Detail helps future agents reconstruct current state after context loss.

Impact:
- Logs capture decisions, validation, files used, next steps, blockers, and safety notes.
- Secrets remain excluded.

Owner:
- Codex agent.

Source/evidence:
- User selected "Velmi detailni".

Supersedes:
- None.

## 2026-06-10 - Huly Self-Hosted is preferred

Decision:
- Prefer Huly Self-Hosted via `hcengineering/huly-selfhost` for PRAUT.

Rationale:
- Best fit for closed internal platform.
- Supports operational control over signup, data, backups, reverse proxy, and upgrade timing.
- Simpler and safer than custom building from `hcengineering/platform`.

Impact:
- Huly Cloud is not the default recommendation.
- Custom platform build is reserved for future custom development needs.

Owner:
- PRAUT project owner.

Source/evidence:
- `README.md`
- `PRAUT_PROSTREDI.md`
- `IMPORT_CHECKLIST.md`
- `01_system/10-bezpecnost-dat-a-prace-s-citlivymi-informacemi.md`
- Huly self-host docs and GitHub README.

Supersedes:
- None.

## 2026-06-10 - Use `v0.7.423` as first PoC candidate

Decision:
- Use Huly production tag `v0.7.423` as first PoC candidate.

Rationale:
- It is a production `v*` tag.
- It includes relevant Cards, process, association, and import improvements.
- It aligns with PRAUT's Cards-heavy setup.

Impact:
- Do not automatically use newer unreviewed releases.
- Read `MIGRATION.md` before upgrades.
- Fall back to older self-host tag only if PoC reveals blocker.

Owner:
- PRAUT project owner / technical implementer.

Source/evidence:
- GitHub release `hcengineering/platform` `v0.7.423`.
- Huly self-host README and migration notes.

Supersedes:
- None.

## 2026-06-10 - Public signup must be disabled in `account` and `front`

Decision:
- Configure `DISABLE_SIGNUP=true` in both Huly `account` and `front` services.

Rationale:
- Public UI and backend registration should both enforce closed access.
- Invite-only access is the primary use case.

Impact:
- First admin account must exist before final signup disablement, or an admin creation tool/process must be used.
- Invite links need expiration, use limits, and preferably company email mask.

Owner:
- Huly admin / infrastructure owner.

Source/evidence:
- Huly self-host README.
- User's main requirement: closed employee-only platform.

Supersedes:
- None.

## 2026-06-10 - Maintain a human-readable Czech development diary

Decision:
- Maintain `VYVOJOVY_DENIK.md` as the required non-technical handoff document for PRAUT/Huly work.

Rationale:
- Technical state files are useful for agents and implementers but too detailed for owners, leadership, and normal team members.
- The diary translates progress, risks, next steps, and user needs into plain Czech.

Impact:
- Every meaningful implementation phase must update both technical state files and `VYVOJOVY_DENIK.md`.
- The diary must not contain secrets, tokens, passwords, API keys, private credentialed URLs, or raw `.env` values.

Owner:
- Codex agent / PRAUT project owner.

Source/evidence:
- `VYVOJOVY_DENIK.md`
- `AGENT_STATE.md`
- `.aiDoc`

Supersedes:
- None.

## 2026-06-10 - Store PoC credentials outside project

Decision:
- Use `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.txt` for VPS PoC credentials and operational inputs.

Rationale:
- User wants the agent to execute the setup but does not want secrets in chat or project documentation.

Impact:
- Project files can reference the private file path.
- Secret values must never be copied into project files, logs, or the human diary.

Owner:
- PRAUT project owner / Codex agent.

Source/evidence:
- User selected private file outside project.
- `HULY_VPS_POC_RUNBOOK.md`

Supersedes:
- None.

## 2026-06-10 - Defer SMTP for initial VPS PoC

Decision:
- Continue with the first VPS PoC without SMTP configured.

Rationale:
- User selected "Bez e-mailu zatim" and asked to record that it must be completed later.

Impact:
- Base Huly deployment can proceed.
- Invite email delivery and notification delivery cannot be marked complete until SMTP is configured.
- SMTP remains a required follow-up before full PoC exit.

Owner:
- PRAUT project owner / Codex agent.

Source/evidence:
- User instruction in chat.
- `HULY_VPS_POC_RUNBOOK.md`
- `HULY_MANUAL_CLEANUP.md`

Supersedes:
- None.

## Open Decisions

These are unresolved and must be decided before production deployment:

- Final Huly domain.
- Test VPS IP and SSH user.
- Public HTTPS vs VPN-only.
- Admin email and backup admin email.
- SMTP/SES provider for full invite and notification validation.
- SSO/OIDC provider.
- Hosting provider/server sizing.
- Backup RPO/RTO.
- Initial integration scope: GitHub, AI, Love/video, Gmail/Calendar.
