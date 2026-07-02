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

## 2026-07-08 - Zjednoduseni: vypnout nepouzivane moduly, obchod = Lead

Decision:
- Vypnout per-workspace moduly (core:class:PluginConfiguration.enabled=false, vratne, bez buildu):
  card, process, hr, board, training, survey, inventory, recruit, products,
  questions, testManagement, telegram, gmail, bitrix, chat (beta), love (zapne se na novem serveru).
- Ponechat: tracker, lead, document (teamspaces), documents (QMS), drive, chunter, contact (system),
  calendar, github. (QMS a drive puvodne vypnuty, jeste tyz den vraceny na zadost Stepana.)
- Obchod se vede VYHRADNE v modulu Lead (cely pripad = jeden lead; hodnota/nabidka/dohody do leadu).
  Karty se prestavaji pouzivat; alert procesy (bezely na kartach) pozastaveny do noveho serveru.

Rationale:
- Tym realne pouziva jen Tracker, Lead, Dokumenty, Chat. Duplicita Karty vs Lead vs Tracker matla
  (stejna vec sla delat na 3 mistech); 20+ modulu v menu je pro startup neprehlednych.

Impact:
- Leve menu ma ~7 polozek. Data vypnutych modulu zustavaji v DB; toggle je vratny
  (Nastaveni -> Konfigurovat, nebo tools/huly-admin/praut-configure-apps.cjs --restore <id>).
- praut-weekly-report.cjs pocita obchod jen z leadu. Karty skripty (typemap/build-views/create-demo/
  build-processes/hide-types) jsou docasne irelevantni.
- Navody (Rychly start, role, Jak vedeme obchod, Prehled firmy) prepsany na jeden-domov-per-vec.

Owner:
- Stepan Manda (rozhodnuti), Claude (provedeni).

Source/evidence:
- tools/huly-admin/praut-configure-apps.cjs; mechanismus: plugins/setting-resources Configure.svelte,
  plugins/client-resources returnUITxes (filtruje model txy vypnutych pluginu).

Supersedes:
- Cast rozhodnuti "Cards = evidence/reporting/fakturace" z OPERATIVNI_MODEL (obchod nyni Lead-only).

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

## 2026-06-23 - Curated set of relation types (Associations)

Decision:
- Create a curated set of 15 relation types (`core:class:Association`) instead of an exhaustive all-classes-by-all-classes matrix: contact relations (Person<->Person, Person<->Organization, Organization<->Organization) plus Person/Organization links to business card types (Lead, Obchodni prilezitost, Nabidka, Zakazka, Projekt).

Rationale:
- The UI "Add relation" dialog was empty because no Association types existed.
- An exhaustive matrix would flood the relation picker and confuse users; a curated business-meaningful set covers real CRM/delivery needs.
- Existing card-to-card business-flow associations (7 found) are left untouched; the new types are additive.

Impact:
- Users can now link people, companies, and business cards via "Add relation".
- New types are created idempotently (by classA+classB+nameA) via `tools/huly-admin/praut-create-relations.cjs`.

Owner:
- PRAUT owner (Stepan Manda) / admin.

Source/evidence:
- `tools/huly-admin/praut-create-relations.cjs`
- `praut_erp_docs/VYVOJOVY_DENIK.md` (2026-06-23)

Supersedes:
- None.

## 2026-06-23 - Outbound email via SMTP (Postmark); mailboxes deferred

Decision:
- Zapnout odchozi systemove e-maily (pozvanky, reset hesla, notifikace) pres mail sluzbu (Postmark, SMTP).
- Vlastni schranky / cteni posty v Huly (mailboxes, Gmail integrace) odlozit.

Rationale:
- Odchozi e-maily odemykaji pozvanky a samoobsluzny reset hesla; plne schranky jsou samostatny vetsi krok.

Source/evidence:
- `compose.yml` (sluzba `mail`), `docs` (Mail Service), PR #13.

## 2026-06-25 - Lead modul je obchodni pipeline

Decision:
- Obchodni pipeline vedeme v modulu Lead (funnel), nikoli pres kartu "Obchodni prilezitost".
- Lead stupne pocestene (Zajemce, Kvalifikace, Vyjednavani, Priprava nabidky, Rozhodovani, Uzavreni, Vyhrano, Prohrano).
- Nabidky, zakazky, faktury, reporting a rizika zustavaji na kartach.

Rationale:
- Vlastnik preferuje prehledny funnel; zaroven chceme zachovat navaznost na evidenci a fakturaci na kartach.

Source/evidence:
- `tools/huly-admin/praut-lead-setup.cjs`, PR #18; `OPERATIVNI_MODEL_HULY_TRACKER_GITHUB.md`.

## 2026-06-25 - Video hovory: self-hosted LiveKit na vlastnim serveru

Decision:
- Audio/video (Love) pojede na vlastnim self-hosted LiveKit na novem firemnim serveru, ne na LiveKit Cloud.

Rationale:
- Pozadavek "vse u nas" - video neopusti firemni infrastrukturu.

Source/evidence:
- `compose.yml` (sluzba `love`), PR #16; `docs/CUSTOM-BUILD.md`.

## 2026-06-25 - Rizeny offboarding zamestnance

Decision:
- "Smazani" zamestnance = okamzita deaktivace (ztrata pristupu), 2 mesice vratne, pak trvaly vymaz uctu.
- Obsah, ktery vytvoril, zustava s jeho jmenem a oznacenim "byvaly zamestnanec".

Rationale:
- Bezpecny offboarding bez ztraty firemni prace; soucasne ciste odebrani pristupu a moznost navratu.

Source/evidence:
- `tools/huly-admin/praut-offboard-user.cjs`, PR #21.

## 2026-06-25 - Lehky monitoring (bez Prometheus stacku)

Decision:
- Monitoring resime jednim skriptem v cronu (kontrola sluzeb/webu/disku/zaloh) + e-mail alert, ne Prometheus/Grafana.

Rationale:
- Pro jeden server a netechnickeho vlastnika je to dostatecne a bezudrzbove.

Source/evidence:
- `scripts/praut-healthcheck.sh`, `ops/praut-root.crontab`, PR #15 (nasazeno 2026-06-25).

## 2026-06-25 - Migrace na vlastni server + vlastni build kodu

Decision:
- Tezke sluzby (lokalni AI, video, push) a vlastni upravy kodu se nasadi az na vlastnim firemnim serveru (chysta se).
- Vlastni kod pres fork -> GitHub Actions -> vlastni registr -> deploy (prepnuti `HULY_IMAGE_REGISTRY`/`HULY_VERSION`).

Rationale:
- Stavajici VPS brzy opoustime; tezke a kodove veci ma smysl stavet rovnou na cilovem serveru.

Source/evidence:
- `docs/MIGRATION-RUNBOOK.md`, `docs/CUSTOM-BUILD.md`.

## Open Decisions

Tyto zustavaji k rozhodnuti:

- SSO/OIDC provider (zatim neresime).
- Backup RPO/RTO (cilove hodnoty).
- Vlastni firemni schranky (mailboxes) - kdy a jak (zatim jen odchozi e-maily).
- Specifikace noveho serveru (sizing, OS, IP, subdomena pro LiveKit) a lokalni AI engine.

Vyreseno (drive otevrene):
- SMTP/SES provider -> Postmark (odchozi e-maily). Domena zustava `huly.praut.cz`.
- Hosting -> migrace na vlastni firemni server. Pristup -> SSH zprovoznen.
- Rozsah integraci -> GitHub (hotovo), AI (lokalni, novy server), Love/video (self-hosted), Gmail/Calendar (pozdeji).
