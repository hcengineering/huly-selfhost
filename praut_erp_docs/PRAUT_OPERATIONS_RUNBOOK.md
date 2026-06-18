# PRAUT Operations Runbook

Provozni runbook pro Huly self-hosted PRAUT na VPS.

Neobsahuje hesla, tokeny ani privatni klice.

## Zakladni fakta

- VPS: `72.62.156.104`
- Huly URL: `https://huly.praut.cz`
- Workspace URL: `https://huly.praut.cz/workbench/praut`
- Huly root na VPS: `/root/huly-selfhost`
- Dokumentace na VPS: `/root/huly-selfhost/praut_erp_docs`
- Finalni restore-tested backup: `/root/huly-selfhost/backup-praut/20260612-124435`

## Health check

```bash
cd /root/huly-selfhost
docker compose ps
curl -I https://huly.praut.cz
curl -I https://huly.praut.cz/workbench/praut
docker compose port kvs 8094
```

Ocekavani:

- hlavni Huly endpoint nema 5xx chybu,
- workspace endpoint nema 5xx chybu,
- `kvs` vypise `127.0.0.1:8094`.

## Bezpecnostni invarianty

```bash
cd /root/huly-selfhost
docker compose exec -T front env | grep '^DISABLE_SIGNUP=true$'
docker compose exec -T account env | grep '^DISABLE_SIGNUP=true$'
docker compose port kvs 8094
```

Nesmi nastat:

- public signup zapnuty,
- `kvs` publikovany na `0.0.0.0`,
- zapsane secrets v dokumentaci,
- zmena `VELYOS` nebo `sudety` pri praci na `Praut`.

## Logy

```bash
cd /root/huly-selfhost
docker compose logs --tail 100
docker compose logs --tail 100 front
docker compose logs --tail 100 account
docker compose logs --tail 100 transactor
docker compose logs --tail 100 workspace
```

## Backup pred zmenou

Pred vetsimi zasahy:

```bash
cd /root/huly-selfhost
scripts/praut-backup.sh
```

Backup uklada:

- resolve compose konfiguraci,
- Huly konfiguraci,
- PRAUT dokumentaci,
- nativni CockroachDB backup,
- MinIO soubory.

## Pravidelny backup schedule

Stav pravidelneho cronu musi byt pred owner-ready predanim overen na VPS:

```bash
crontab -l
systemctl list-timers --all | grep -i praut
```

Pokud pravidelny backup neni zavedeny, owner-ready rezim se opira pouze o on-demand backupy a restore smoke evidence. V takovem pripade zapis gap do `HULY_VALIDATION_LOG.md` a `PRAUT_REMAINING_WORK.md`.

## Restore smoke

Pouzivej restore smoke jako nedestruktivni overeni backupu v izolovanem prostredi:

```bash
cd /root/huly-selfhost
scripts/praut-restore-smoke.sh /root/huly-selfhost/backup-praut/<STAMP>
```

Finalni overeny backup:

```text
/root/huly-selfhost/backup-praut/20260612-124435
```

Finalni vysledek restore smoke:

```text
/root/huly-restore-smoke/20260612-124435/RESTORE_SMOKE_RESULT.md
```

## Kontrola importniho stavu

Aktualni overeny stav:

- `Praut` ma 8 aktivnich dokumentovych teamspace.
- `Praut` ma 80 dokumentu s content refs.
- V `Praut` nejsou duplicitni dokumentove titulky.
- Importni titulky nejsou ve `VELYOS` ani `sudety`.
- Je 22 PRAUT Cards typu.
- Ke kazdemu typu existuje jedna `TEST - <typ>` karta.

Pri dalsi validaci zapis vysledek do `HULY_VALIDATION_LOG.md`.

## SMTP/SES

Mail service neni zapnuta. Lokalne byly SMTP promenne nalezeny, ale hodnoty byly prazdne. Pro dokonceni je potreba:

- vybrat SMTP nebo SES,
- ulozit secrets mimo dokumentaci,
- pridat `mail` sluzbu do compose,
- pridat `MAIL_URL=http://mail:8097` do `account` a `transactor`,
- restartovat dotcene sluzby,
- otestovat invite email flow.

Nepouzivat dokumentaci pro ulozeni SMTP hesla.

## Automatizace

Pravidla jsou zatim pouze policy v `copy_paste_import/12-automation-rules.md`.

Povoleny smer:

- alert-only,
- bez automatickeho schvalovani,
- bez automatickeho odesilani klientum,
- bez automatickych zmen opravneni.

## Upgrade pravidlo

Pred upgradem Huly:

1. precist aktualni `MIGRATION.md`,
2. udelat backup,
3. udelat restore smoke backupu,
4. overit `DISABLE_SIGNUP=true`,
5. overit `kvs` localhost binding,
6. provest upgrade,
7. zopakovat health check.

Bez restore-tested backupu neupgradovat.
