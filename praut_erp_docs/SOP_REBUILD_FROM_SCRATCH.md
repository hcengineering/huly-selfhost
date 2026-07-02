# SOP: Postavení Huly PRAUT od nuly (rebuild from scratch)

Jeden souvislý postup od **prázdného serveru** po **běžící a ověřený workspace `praut`**.
Konsoliduje informace, které byly dosud roztroušené v `README.md`, `HULY_VPS_POC_RUNBOOK.md`,
`PRAUT_OPERATIONS_RUNBOOK.md`, `docs/MIGRATION-RUNBOOK.md` a `IMPORT_CHECKLIST.md`.

> **Rozsah:** čistá instalace nebo obnova celého stacku na novém stroji. Pokud přenášíš
> existující data z jiného serveru, čti primárně `docs/MIGRATION-RUNBOOK.md` (tenhle SOP je
> jeho zjednodušená, samostatná varianta „od nuly + restore ze zálohy").
>
> **Bez tajemství:** tento dokument neobsahuje žádná hesla/tokeny/klíče — jen názvy proměnných
> a odkaz, kde se skutečné hodnoty berou. Skutečné hodnoty jsou **mimo git** (viz krok 3).

---

## 0. Předpoklady (co musí být hotové před startem)

- Server: Linux (Ubuntu LTS), **≥ 4 vCPU / 16 GB RAM** (migrace/AI cílí na ≥ 8 vCPU / 16 GB / 100 GB SSD).
- Veřejná IP + kontrola nad DNS záznamem `huly.praut.cz`.
- Soukromý soubor s přístupy **mimo projekt** (viz krok 3), obsahuje IP serveru, SSH přístup,
  doménu a e-maily obou správců.
- Z internetu smí být otevřené **jen** porty `80` a `443`. Vnitřní služby (DB, fronty, úložiště) nikdy veřejně.

---

## 1. Příprava OS a Dockeru

```bash
# aktualizace systému
apt update && apt upgrade -y

# firewall: povolit jen SSH + web
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Docker + compose plugin (dle distra), poté ověřit:
docker --version
docker compose version
```

Zapni automatický start Dockeru po restartu serveru (`systemctl enable docker`).

---

## 2. Naklonování repozitáře

```bash
git clone https://github.com/PrautAutomation/huly-selfhost.git /root/huly-selfhost
cd /root/huly-selfhost
```

Ověř, že v repu jsou `compose.yml`, `.template.huly.conf`, `scripts/` a `nginx.conf`.

---

## 3. Vytvoření konfigurace `huly_v7.conf` (z šablony, BEZ tajemství v gitu)

Konfigurace vzniká z `.template.huly.conf`. **Skutečné hodnoty se do gitu NEZAPISUJÍ** — soubor
`huly_v7.conf` je gitignorovaný a leží jen na serveru (a v zálohách). Compose ho čte přes `.env`:

```bash
cp .template.huly.conf huly_v7.conf
ln -sf huly_v7.conf .env      # compose čte .env (dle setup.sh)
```

Kde se berou hodnoty jednotlivých proměnných:

| Proměnná | Odkud vzít |
|---|---|
| `HULY_VERSION`, `DOCKER_NAME` | ze šablony (`v0.7.423`, `huly_v7`) — neměnit bez důvodu |
| `HOST_ADDRESS`, `SECURE`, `TITLE`, `DEFAULT_LANGUAGE`, `TZ` | doména `huly.praut.cz`, `SECURE=true`, `TZ=Europe/Prague` |
| `DISABLE_SIGNUP` | **`true`** (povinné — vypnutá veřejná registrace, viz krok 6) |
| `SECRET` | **serverový master secret** — při čisté instalaci vygeneruje `./setup.sh --secret`; při obnově dat **musí zůstat stejný** jako ve staré instanci (jinak nesedí JWT tokeny) |
| `COCKROACH_SECRET`, `REDPANDA_SECRET`, `CR_*`, `REDPANDA_*` | generuje setup skript / soukromý env soubor |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_TLS_MODE` | SMTP údaje (Postmark server token = `SMTP_PASSWORD`) — z **`/Users/stepan/praut/huly-poc-secrets.env`** resp. správce mailu; nikdy do gitu |
| `PUSH_PUBLIC_KEY`, `PUSH_PRIVATE_KEY` | VAPID pár pro web-push: `npx web-push generate-vapid-keys` (jednou); **bez nich se `notification` služba točí v crash-loopu** |
| `GITHUB_*` | jen pokud zapínáš GitHub integraci — viz `docs/GITHUB-INTEGRATION-SETUP.md` |

> Soukromý zdroj přístupů (mimo git): `/Users/stepan/praut/huly-poc-secrets.env`
> (historicky `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env`).

Host nginx (TLS terminátor 443 → 127.0.0.1:80) + certifikát Let's Encrypt/certbot pro `huly.praut.cz`
nastav podle vzoru v `nginx.conf` (`.huly.nginx` je per-service routing uvnitř Dockeru — needituj bez důvodu).

---

## 4. Start stacku

```bash
cd /root/huly-selfhost
docker compose pull
docker compose up -d
```

Stack má ~16 služeb (+ pomocné). Klíčové služby a jejich role:

| Služba | Role |
|---|---|
| `nginx` | interní reverse proxy / routing mezi službami |
| `front` | web (statika, config.json) |
| `account` | účty, přihlášení, pozvánky, `DISABLE_SIGNUP` |
| `transactor` | jádro — transakce nad workspace daty |
| `workspace` | správa/migrace workspaců |
| `collaborator` | real-time spolupráce na dokumentech |
| `fulltext` | fulltextové indexování/hledání |
| `stats` | metriky |
| `rekoni` | extrakce textu z příloh (OCR/parse) |
| `hulypulse` | pulse/realtime kanál |
| `notification` | notifikace + **web-push (vyžaduje VAPID klíče)** |
| `mail` | odchozí e-maily (SMTP/Postmark) |
| `github` | GitHub integrace (volitelná) |
| `cockroach` | primární databáze (CockroachDB) |
| `minio` | objektové úložiště souborů/příloh |
| `redpanda` | fronta zpráv (Kafka-kompatibilní) |
| `elastic` | vyhledávací index |
| `kvs` | key-value store — **publikovat jen na `127.0.0.1`** (viz krok 6) |

---

## 5. Restart nginx (POVINNÉ po každém `up -d`)

```bash
docker compose restart nginx
```

**Proč vždy:** když `docker compose up -d` znovu vytvoří backend služby, dostanou nové IP v Docker
síti. Docker `nginx` resolvuje upstream hostnames (`proxy_pass http://account:3000/`) jen při
startu/reloadu a drží **starou IP** → vrací 502 HTML stránku. Symptom v prohlížeči:
`Unexpected token '<', "<!DOCTYPE "... is not valid JSON` (klient čeká JSON z `/_accounts`,
dostane HTML 502), přestože backend běží OK. Detail: memory `huly-deploy-nginx-stale-ip`.

> **Zapamatuj:** každý `docker compose up -d` = hned poté `docker compose restart nginx`.

---

## 6. Uzamčení přístupu (bezpečnostní invarianty)

```bash
# veřejná registrace VYPNUTA na front i account
docker compose exec -T front env   | grep '^DISABLE_SIGNUP=true$'
docker compose exec -T account env | grep '^DISABLE_SIGNUP=true$'

# kvs NESMÍ být veřejně — musí být bindnuté jen na localhost
docker compose port kvs 8094      # očekává se: 127.0.0.1:8094
```

V `compose.yml` má `kvs` publikovaný port jen na localhost:

```yaml
ports:
  - 127.0.0.1:8094:8094
```

Nesmí nastat: zapnutý public signup, `kvs` na `0.0.0.0`, anonymní/hostovský přístup bez schválení.

---

## 7. Správcovské účty (přes Huly tool, ne SQL)

Vytvoř **dva** správce (aby firma nebyla závislá na jednom člověku). Hesla ber jen ze soukromého
env souboru, **nikdy je nevypisuj do logu ani dokumentace**:

```bash
source /root/huly-poc-secrets.env
source /root/huly-selfhost/.env
docker run --rm --network "${DOCKER_NAME}_huly_net" \
  -e SERVER_SECRET="$SECRET" \
  -e ACCOUNT_DB_URL="$CR_DB_URL" -e DB_URL="$CR_DB_URL" \
  -e ACCOUNTS_URL="http://account:3000" \
  -e QUEUE_CONFIG="redpanda:9092" \
  hardcoreeng/tool:"$HULY_VERSION" \
  -- bundle.js create-account "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --first Praut --last Admin
```

Zopakuj pro `BACKUP_ADMIN_EMAIL`/`BACKUP_ADMIN_PASSWORD`. Pokud tag `hardcoreeng/tool:$HULY_VERSION`
není dostupný, použij doporučený tool image pro danou verzi a zapiš odchylku do
`HULY_DECISIONS_AND_DEVIATIONS.md`. (Při obnově dat ze zálohy — krok 8 — se účty obnoví ze zálohy
a tento krok se přeskočí.)

---

## 8. Obnova ze zálohy (pokud stavíš nad existující data)

Vzor je `scripts/praut-restore-smoke.sh` (nedestruktivní ověření) a `docs/MIGRATION-RUNBOOK.md`.
Postup s reálnou zálohou `backup-praut/<STAMP>/` (musí obsahovat adresář `cockroachdb/`, **ne** legacy
`cockroachdb.sql.gz`):

```bash
# spustit JEN úložiště, ať app služby nezaloží prázdnou DB
docker compose up -d cockroach minio

# CockroachDB — native restore
CR=$(docker compose ps -q cockroach)
docker exec "$CR" sh -c 'rm -rf /cockroach/cockroach-data/extern/restore && mkdir -p /cockroach/cockroach-data/extern/restore'
docker cp backup-praut/<STAMP>/cockroachdb/. "$CR":/cockroach/cockroach-data/extern/restore/
docker compose exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 \
  --execute="DROP DATABASE IF EXISTS defaultdb CASCADE;"
docker compose exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 \
  --execute="RESTORE DATABASE defaultdb FROM LATEST IN 'nodelocal://1/restore';"

# MinIO — soubory/přílohy do volume
MIN=$(docker compose ps -q minio)
docker cp backup-praut/<STAMP>/minio-data/. "$MIN":/data/
docker compose restart minio

# zbytek stacku
docker compose up -d
docker compose restart nginx      # POVINNÉ (viz krok 5)
```

Než pustíš firemní obsah, ověř zálohu izolovaně:

```bash
scripts/praut-restore-smoke.sh /root/huly-selfhost/backup-praut/<STAMP>
```

Restore smoke musí obnovit CockroachDB přes `RESTORE DATABASE` bez ručních schema/function oprav,
porovnat row county a ověřit MinIO soubory. Výsledek zapiš do `HULY_VALIDATION_LOG.md`.
**Dokud restore neprojde s `PASS`, neimportuj firemní obsah.**

---

## 9. Healthcheck a ověření (verifikace)

```bash
# stav služeb — vše "Up"/"running"
docker compose ps

# web odpovídá 200 (POZOR na NAT hairpin — z lokálu serveru přes doménu může vracet 000)
curl -I https://huly.praut.cz
curl -I https://huly.praut.cz/workbench/praut
# fallback při NAT hairpinu (HTTP 000 přes doménu): testuj přes loopback
curl -kI https://127.0.0.1/

# bezpečnostní invarianty (viz krok 6)
docker compose exec -T front env   | grep '^DISABLE_SIGNUP=true$'
docker compose exec -T account env | grep '^DISABLE_SIGNUP=true$'
docker compose port kvs 8094       # 127.0.0.1:8094

# souhrnný lehký monitoring (služby + HTTP 200 + disk + stáří zálohy)
scripts/praut-healthcheck.sh --dry-run
```

Očekávání: hlavní endpoint i workspace endpoint bez 5xx, `kvs` na `127.0.0.1:8094`,
`DISABLE_SIGNUP=true` na front i account, healthcheck bez problémů.

Obsahovou kontrolu (8 teamspaců, karty, leady) udělej read-only přes
`tools/huly-admin/praut-spaces-list.cjs` (viz `tools/huly-admin/README.md`).

---

## 10. Po nasazení

```bash
# zálohovací + healthcheck cron (uprav ALERT_EMAIL_TO)
crontab ops/praut-root.crontab
crontab -l
```

- Denní záloha 02:30 (retence 14 dní), healthcheck každých 15 min + denní 08:00 souhrn.
- Cutover DNS až po úspěšném ověření (viz `docs/MIGRATION-RUNBOOK.md`, krok 8).
- Completion-checklist živého workspace: `COMPLETION_CHECKLIST.md`.
- Provozní údržba a upgrady: `PRAUT_OPERATIONS_RUNBOOK.md`.
- Výpadek serveru: `docs/RUNBOOK-SERVER-DOWN.md`.

---

## Rychlý souhrn (cheat sheet)

```bash
git clone … /root/huly-selfhost && cd /root/huly-selfhost
cp .template.huly.conf huly_v7.conf && ln -sf huly_v7.conf .env   # doplnit hodnoty mimo git
docker compose pull && docker compose up -d
docker compose restart nginx                                       # VŽDY
scripts/praut-restore-smoke.sh backup-praut/<STAMP>                # pokud obnovuješ data
docker compose ps && curl -I https://huly.praut.cz                 # verifikace
crontab ops/praut-root.crontab                                     # zálohy + healthcheck
```
