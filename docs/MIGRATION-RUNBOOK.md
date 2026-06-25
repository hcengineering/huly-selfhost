# Migrace Huly PRAUT na vlastní server

Runbook pro přesun celého Huly stacku (`huly.praut.cz`, workspace `praut`) ze stávajícího VPS
na nový vlastní server **bez ztráty dat a s minimálním výpadkem**. Na novém serveru pak poběží
i lokální AI a self-hosted LiveKit (viz `CUSTOM-BUILD.md` a roadmapa v plánu).

> **Zlaté pravidlo:** restore si **napřed vyzkoušej nanečisto** na novém serveru (test DB),
> teprve po úspěšném ověření přepni DNS. Migrace = kopie dat, ne přesun — starý server zůstává
> beze změny, dokud nepřepneš DNS (= okamžitý rollback).

## 0. Rozhodnutí před startem
- **Sizing nového serveru** (Huly stack + zásoba na AI/LiveKit/Mongo): doporučeno **≥ 8 vCPU,
  ≥ 16 GB RAM, ≥ 100 GB SSD** (Elastic + CockroachDB + MinIO + AI rostou). Linux + Docker.
- **Veřejná IP + DNS**: kontrola nad záznamem `huly.praut.cz`; pro LiveKit navíc subdoména
  (např. `livekit.praut.cz`).
- **Topologie**: vše na jednom serveru vs. AI/LiveKit zvlášť (rozhoduje RAM/GPU).
- **Okno migrace**: nízký provoz; den předem snížit DNS TTL (viz krok 2).

## 1. Příprava nového serveru
```bash
# Docker + compose plugin (dle distra), pak:
git clone https://github.com/PrautAutomation/huly-selfhost.git /root/huly-selfhost
cd /root/huly-selfhost
# Host nginx (TLS terminátor 443 → 127.0.0.1:80) + certifikát (Let's Encrypt/certbot) pro huly.praut.cz
# (vzor host nginx je v nginx.conf; .huly.nginx je per-service routing uvnitř Dockeru)
```
Zatím **NESPOUŠTĚJ** `docker compose up` (necháme prázdné, data přijdou z restoru).

## 2. Snížit DNS TTL (den předem)
U `huly.praut.cz` nastav TTL na **300 s**, ať je pozdější přepnutí rychlé.

## 3. Čerstvá záloha na STARÉM serveru
```bash
cd /root/huly-selfhost && scripts/praut-backup.sh
# → backup-praut/<STAMP>/ obsahuje: cockroachdb/, minio-data/, huly_v7.conf,
#   compose.yml, .huly.nginx, nginx.conf, MANIFEST.txt, cockroachdb.ROW_COUNTS.tsv
```
Pozn.: pro úplnou konzistenci lze stack na pár minut zastavit (`docker compose stop`) a zálohovat
„za studena"; jinak stačí běžná záloha (Huly to zvládá za chodu).

## 4. Přenos na nový server
```bash
# ze starého (nebo přes mezistroj):
rsync -avz backup-praut/<STAMP>/ root@<NOVY_IP>:/root/huly-selfhost/backup-praut/<STAMP>/
# huly_v7.conf je v záloze; na novém ho dej do kořene repa:
cp /root/huly-selfhost/backup-praut/<STAMP>/huly_v7.conf /root/huly-selfhost/huly_v7.conf
ln -sf huly_v7.conf .env   # compose čte .env (dle setup.sh)
```
⚠️ `huly_v7.conf` obsahuje tajné klíče — přenášej bezpečně (scp/rsync přes SSH), **nikdy přes git**.
`SECRET` musí zůstat stejný (jinak nesedí JWT tokeny).

## 5. Restore dat na NOVÉM serveru
Spusť **jen úložiště**, ať app služby (workspace) nezaloží prázdnou DB:
```bash
docker compose up -d cockroach minio
```
**CockroachDB** (native restore — vzor viz `scripts/praut-restore-smoke.sh`):
```bash
CR=$(docker compose ps -q cockroach)
# nahrát zálohu do extern/restore
docker exec "$CR" sh -c 'rm -rf /cockroach/cockroach-data/extern/restore && mkdir -p /cockroach/cockroach-data/extern/restore'
docker cp backup-praut/<STAMP>/cockroachdb/. "$CR":/cockroach/cockroach-data/extern/restore/
# DB defaultdb na čerstvém clusteru existuje prázdná → dropnout a obnovit ze zálohy
docker compose exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --execute="DROP DATABASE IF EXISTS defaultdb CASCADE;"
docker compose exec -T cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 --execute="RESTORE DATABASE defaultdb FROM LATEST IN 'nodelocal://1/restore';"
```
**MinIO** (soubory/přílohy) — nakopírovat do volume:
```bash
MIN=$(docker compose ps -q minio)
docker cp backup-praut/<STAMP>/minio-data/. "$MIN":/data/
docker compose restart minio
```

## 6. Nasadit zbytek stacku
```bash
docker compose pull
docker compose up -d
docker compose restart nginx   # POVINNÉ po up -d (stale IP → jinak 502)
```

## 7. Ověření (PŘED přepnutím DNS)
- `docker compose ps` — vše „Up".
- Dočasně otestuj přes IP / hosts override; nebo `curl -k https://127.0.0.1/` na serveru = 200.
- **Počty řádků** porovnej s `backup-praut/<STAMP>/cockroachdb.ROW_COUNTS.tsv` (read-only kontrola
  přes admin skript `tools/huly-admin/praut-spaces-list.cjs` — 8 teamspaců, leady, karty sedí).
- Přihlášení funguje, dokumenty/karty/leady jsou na svém místě.

## 8. Přepnutí DNS (cutover)
Přepni `huly.praut.cz` A-záznam na IP nového serveru. Díky TTL 300 s se to propíše rychle.
Starý server zatím **nech běžet** (rollback).

## 9. Po migraci
- Nastav zálohovací cron: `crontab ops/praut-root.crontab` (uprav `ALERT_EMAIL_TO`).
- Nasaď připravené služby z roadmapy: **push+monitoring (PR #14, #15)**, **video Love + self-hosted
  LiveKit (PR #16 + `CUSTOM-BUILD.md`)**, **AI asistent (lokální LLM)**.
- ~80 pod-dokumentů s bezdiakritickými názvy: vyřeš čistým **re-importem** se správnými názvy.
- Po týdnu bezproblémového provozu starý VPS vypni.

## Rollback
DNS zpět na starý server (běží beze změny). Žádná data se na starém nemění, takže rollback je okamžitý.

## Rizika
- **`SECRET` se musí shodovat** mezi starým a novým (je v `huly_v7.conf`) — jinak neplatné tokeny.
- Restore CockroachDB nad existující DB → nejdřív `DROP DATABASE` (krok 5), proto restore dělej
  na čerstvém clusteru před spuštěním `workspace` služby.
- Vždy **test restore nanečisto** před cutover (vzor `praut-restore-smoke.sh`).
- Po každém `up -d`: `docker compose restart nginx`.
