# KOLEGA START HERE - PRAUT Huly

Toto je prvni dokument pro kolegu, ktery prevezme Huly prostredi PRAUT.

Neobsahuje zadna hesla, tokeny ani soukrome klice.

## 15min rychla orientace

1. Prihlas se na VPS:

```bash
ssh -i <tvuj_soukromy_klic> root@72.62.156.104
```

2. Otevri dokumenty:

```bash
cd /root/huly-selfhost/praut_erp_docs
less PREDANI_KOLEGOVI.md
less PRAUT_CONTINUITY_STATUS.md
less PRAUT_REMAINING_WORK.md
```

3. Over Huly:

```bash
cd /root/huly-selfhost
docker compose ps
curl -I https://huly.praut.cz
curl -I https://huly.praut.cz/workbench/praut
```

4. Over bezpecnostni invarianty:

```bash
docker compose exec -T front env | grep '^DISABLE_SIGNUP=true$'
docker compose exec -T account env | grep '^DISABLE_SIGNUP=true$'
docker compose port kvs 8094
```

Ocekavani:

- `https://huly.praut.cz` funguje,
- `/workbench/praut` funguje,
- verejna registrace je vypnuta,
- `kvs` je jen `127.0.0.1:8094`.

## Stav prostredi

- Huly bezi na `https://huly.praut.cz`.
- Workspace je `Praut` / `praut`.
- Data layer je hotova pro aktualni PoC gate:
  - 8 dokumentovych prostoru,
  - 80 dokumentu,
  - 22 Cards typu,
  - 166 poli,
  - 30 ciselniku,
  - 24 vazeb,
  - 22 testovacich karet.
- Finalni backup po rollout je `/root/huly-selfhost/backup-praut/20260612-124435`.
- Restore smoke finalniho backupu prosel.

## Co mas cist podle role

- Rychle navazani: `PREDANI_KOLEGOVI.md`.
- Provoz a kontroly: `PRAUT_OPERATIONS_RUNBOOK.md`.
- Co zbyva: `PRAUT_REMAINING_WORK.md`.
- Owner/admin kurz: `PRAUT_OWNER_ADMIN_KURZ.md`.
- Technicka pamet pro agenta: `AGENT_STATE.md`.
- Lidske shrnuti pro majitele: `VYVOJOVY_DENIK.md`.
- Canonicky cil prostredi: `PRAUT_PROSTREDI.md`.
- Cards schema: `copy_paste_import/09-cards-schema.md`.
- Kontrolni scenare: `copy_paste_import/10-control-scenarios.md`.

## Co nedelat bez zalohy

Bez noveho backupu nemen:

- Docker compose konfiguraci,
- Huly verzi,
- databazi,
- MinIO data,
- workspace strukturu,
- opravneni,
- signup/invite nastaveni,
- integrace se skutecnymi tokeny.

Backup:

```bash
cd /root/huly-selfhost
scripts/praut-backup.sh
```

Restore smoke pro overeni backupu:

```bash
cd /root/huly-selfhost
scripts/praut-restore-smoke.sh /root/huly-selfhost/backup-praut/<STAMP>
```

## Aktualni blokery

- Neni dodan koleguv verejny SSH klic, pokud jeste nemas samostatny pristup.
- SMTP/SES neni nakonfigurovane, takze emailove pozvanky a emailove alerty nejsou validovane.
- Cards saved views a required-field enforcement nejsou dokoncene v Huly UI.
- Alert-only automatizace nejsou zapnute.
- Pravidelny backup cron je nutne znovu overit na VPS; bez overeni se spolehej jen na restore-tested on-demand backupy.

Detaily jsou v `PRAUT_REMAINING_WORK.md`.
