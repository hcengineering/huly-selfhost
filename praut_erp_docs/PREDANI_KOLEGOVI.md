# Predani kolegovi - PRAUT Huly self-hosted

Tento dokument je pro kolegu, ktery prevezme praci na Huly prostredi PRAUT.

Neobsahuje hesla, tokeny, reset odkazy, SMTP hesla ani soukrome SSH klice.

## Aktualni stav k 2026-06-12

- Huly bezi jako self-hosted instalace na VPS.
- VPS IP: `72.62.156.104`.
- Verejna adresa: `https://huly.praut.cz`.
- Workspace: `Praut`, slug `praut`.
- Huly verze: `v0.7.423`.
- Verejna registrace je vypnuta v `front` i `account` pres `DISABLE_SIGNUP=true`.
- Vnitrni `kvs` port je omezen na `127.0.0.1:8094`.
- `Praut` obsahuje 8 dokumentovych prostoru a 80 dokumentu.
- `Praut` obsahuje 22 PRAUT Cards typu, 166 poli, 30 ciselniku a 24 vazeb.
- Ke kazdemu Cards typu existuje jedna testovaci karta `TEST - <typ>`.
- `VELYOS` a `sudety` nebyly importem PRAUT obsahu zmeneny.
- Finalni zaloha po rollout je `/root/huly-selfhost/backup-praut/20260612-124435`.
- Restore smoke finalni zalohy prosel: `/root/huly-restore-smoke/20260612-124435/RESTORE_SMOKE_RESULT.md`.

## Nejdulezitejsi vstupni dokumenty

Na VPS jsou dokumenty zde:

```text
/root/huly-selfhost/praut_erp_docs
```

Kolega ma zacit v tomto poradi:

```text
KOLEGA_START_HERE.md
PREDANI_KOLEGOVI.md
PRAUT_OWNER_ADMIN_KURZ.md
PRAUT_CONTINUITY_STATUS.md
PRAUT_REMAINING_WORK.md
PRAUT_OPERATIONS_RUNBOOK.md
AGENT_STATE.md
HULY_SETUP_PROGRESS.md
HULY_VALIDATION_LOG.md
VYVOJOVY_DENIK.md
```

Zdrojove podklady:

```text
PRAUT_PROSTREDI.md
IMPORT_CHECKLIST.md
copy_paste_import/09-cards-schema.md
copy_paste_import/10-control-scenarios.md
copy_paste_import/11-cards-setup-guide.md
copy_paste_import/12-automation-rules.md
huly_unified_import/
zamestnanecke_navody/
```

## Pristup na VPS

Kolega nema dostat cizi soukromy SSH klic. Spravny postup:

1. Kolega si na svem pocitaci vytvori vlastni SSH klic.
2. Posle pouze verejnou cast s priponou `.pub`.
3. Verejny klic se prida na VPS do `/root/.ssh/authorized_keys`.

Priklad vytvoreni klice u kolegy:

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/praut_huly_rsa -N "" -C "praut-huly-kolega"
```

Kolega posle obsah:

```text
~/.ssh/praut_huly_rsa.pub
```

Nikdy neposilat soubor bez `.pub`.

Po pridani klice se prihlasi:

```bash
ssh -i ~/.ssh/praut_huly_rsa root@72.62.156.104
```

## Jak pridat koleguv verejny klic

Na pocitaci, ktery uz ma pristup na VPS:

```bash
ssh root@72.62.156.104
```

Na VPS:

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
cp /root/.ssh/authorized_keys /root/.ssh/authorized_keys.backup-$(date +%Y%m%d-%H%M%S)
printf '%s\n' '<SEM_VLOZIT_VEREJNY_KLIC_KOLEGY>' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Pak z kolegova pocitace overit login pres jeho soukromy klic.

## Kde bezi Huly

Huly root:

```text
/root/huly-selfhost
```

Hlavni soubory:

```text
/root/huly-selfhost/compose.yml
/root/huly-selfhost/huly_v7.conf
/root/huly-selfhost/.huly.nginx
/root/huly-selfhost/scripts/praut-backup.sh
/root/huly-selfhost/scripts/praut-restore-smoke.sh
```

Zakladni prikazy:

```bash
cd /root/huly-selfhost
docker compose ps
docker compose logs --tail 100
docker compose port kvs 8094
```

## Co je hotove

- Self-hosted Huly bezi na VPS.
- HTTPS endpoint `https://huly.praut.cz` vraci 200.
- `/workbench/praut` vraci 200.
- Admin a backup admin login byly drive overene; hesla jsou pouze v privatnim env souboru, ne v dokumentaci.
- Verejna registrace je vypnuta.
- `kvs` neni verejne vystaveny.
- Backup format byl opraven na nativni CockroachDB backup.
- Finalni backup po rollout byl restore-smoke overen.
- Workspace `Praut` je vytvoreny a naplneny PRAUT datovou vrstvou.
- Importni titulky se neobjevily ve workspace `VELYOS` ani `sudety`.

## Co jeste neni hotove

- Dodat koleguv verejny SSH klic a pridat ho do `authorized_keys`.
- Nastavit SMTP/SES pro emailove pozvanky a emailove alerty.
- Overit invite email flow az po SMTP/SES konfiguraci.
- Doplnit ulozene Cards pohledy: `Aktivni`, `Bez vlastnika`, `Ke schvaleni`, `Riziko`, `Obnovy do 60 dni`, `Moje`.
- Doresit required-field enforcement v `Settings -> TYPES`; importer to nereprezentuje jako hotove Huly UI nastaveni.
- Zapnout jen alert-only automatizace az po rozhodnuti o dorucovani notifikaci.
- Znovu overit nebo zavest pravidelny backup plan; zatim existuji restore-tested on-demand backupy.
- Zkontrolovat a bez mazani prejmenovat, presunout nebo archivovat rucni dokument `Untitled`, pokud stale existuje.
- Projit hotove prostredi v UI s vlastnikem PRAUT.

## Co nesmazat ani nemenit bez zalohy

- `/root/huly-selfhost`
- `/root/huly-selfhost/backup-praut`
- `/root/huly-restore-smoke`
- Docker volumes a data kontejneru
- CockroachDB data
- MinIO data
- `.huly.nginx`, `compose.yml`, `huly_v7.conf`
- Cloudflare/DNS zaznamy pro `huly.praut.cz`

Pred kazdou vetsi zmenou spustit:

```bash
cd /root/huly-selfhost
scripts/praut-backup.sh
```

## Minimalni health check

```bash
cd /root/huly-selfhost
docker compose ps
curl -I https://huly.praut.cz
curl -I https://huly.praut.cz/workbench/praut
docker compose exec -T front env | grep '^DISABLE_SIGNUP=true$'
docker compose exec -T account env | grep '^DISABLE_SIGNUP=true$'
docker compose port kvs 8094
```

Ocekavani:

- oba `curl` prikazy vrati HTTP 200 nebo presmerovani na login bez 5xx chyby,
- `front` a `account` maji `DISABLE_SIGNUP=true`,
- `kvs` port je `127.0.0.1:8094`.

## Kam zapisovat dalsi postup

Po kazdem vyznamnem kroku aktualizovat:

```text
KOLEGA_START_HERE.md
PRAUT_CONTINUITY_STATUS.md
PRAUT_REMAINING_WORK.md
HULY_SETUP_PROGRESS.md
HULY_VALIDATION_LOG.md
VYVOJOVY_DENIK.md
PRAUT_OWNER_ADMIN_KURZ.md
AGENT_STATE.md
```

Pokud jde o rozhodnuti nebo odchylku od planu, aktualizovat i:

```text
HULY_DECISIONS_AND_DEVIATIONS.md
HULY_MANUAL_CLEANUP.md
```
