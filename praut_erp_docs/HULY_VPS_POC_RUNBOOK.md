# HULY VPS PoC Runbook

Prakticky postup pro spusteni testovaciho Huly prostredi pro PRAUT.

Tento dokument je schvaleny smer pro dalsi praci. Je psany tak, aby agent nebo technicky clovek vedel, co presne udelat, ale neobsahuje hesla ani jine tajne udaje.

## Kde jsme

- Aplikace uz bezi na VPS a verejna adresa `https://huly.praut.cz` vraci HTTP 200.
- Lokalni dokumentace je synchronizovana s VPS jako handoff zdroj, ale aktualni bezici stav je potreba overovat primo na VPS.
- Cilem je testovaci Huly Self-Hosted prostredi pro PRAUT.
- Pouzije se Huly `v0.7.423`.
- Prostredi bude jen pro pozvane nebo spravcem zalozene lidi.
- Verejna registrace musi byt vypnuta.
- V PoC se pouzivaji jen testovaci nebo fiktivni data.
- SMTP zustava odlozene, dokud nebudou doplnene odesilaci udaje.

## Bezpecnostni pravidla

- Hesla, tokeny, klice a cele konfiguracni soubory s tajnymi hodnotami se nesmi zapisovat do projektu.
- Soukromy soubor pro pristupy je mimo projekt:
  - aktualni lokalni cesta: `/Users/stepan/praut/huly-poc-secrets.env`
  - historicka cesta z predchoziho stroje: `/Users/bobbysixkiller/.praut-secrets/huly-poc-secrets.env`
- Do projektovych souboru se zapisuje jen stav, ne tajne hodnoty.
- Z internetu maji byt verejne dostupne jen webove vstupy `80` a `443`.
- Vnitrni databaze, uloziste, fronty a sluzby Huly nesmi byt verejne dostupne.
- Pred importem obsahu se musi overit zaloha a obnova.
- E-mailove odesilani je zatim odlozene a musi se dodelat pred plnym overenim pozvanek.

## Co dodat pred spustenim

Doplnit do soukromeho souboru mimo projekt:

- IP adresu testovaciho serveru.
- Uzivatele pro prihlaseni na server.
- Zpusob prihlaseni na server.
- Domenu pro Huly.
- Pristup ke sprave domeny.
- E-mail prvniho spravce Huly.
- E-mail zalozniho spravce Huly.
- Potvrzeni, ze server ma alespon 4 vCPU a 16 GB RAM.

E-mailove odesilani se zatim preskakuje. Pozdeji bude potreba doplnit:

- SMTP host.
- SMTP port.
- SMTP user.
- SMTP from.
- SMTP password.

## Faze 1: Kontrola vstupu

1. Overit, ze soukromy soubor existuje:
   - `/Users/stepan/praut/huly-poc-secrets.env`
2. Overit, ze obsahuje server, domenu a admin e-maily.
3. Overit, ze server bezi na Ubuntu LTS.
4. Overit, ze server ma alespon 4 vCPU a 16 GB RAM.
5. Overit, ze domenu lze nastavit na IP serveru.
6. Pokud chybi SMTP udaje, zapsat do logu:
   - e-mailove pozvanky nejsou v teto fazi plne overene,
   - SMTP je povinna dodelavka po zakladnim PoC.

## Faze 2: Priprava serveru

1. Prihlasit se na testovaci server.
2. Aktualizovat system.
3. Vytvorit nebo potvrdit ne-root spravcovskeho uzivatele.
4. Zapnout firewall.
5. Povolit pouze:
   - SSH pro spravu,
   - HTTP `80`,
   - HTTPS `443`.
6. Nainstalovat Docker a Docker Compose.
7. Zapnout automaticky start sluzeb po restartu serveru.
8. Pripravit zakladni kontrolu disku a logu.

V deniku pro lidi zapsat:

> Server je pripraveny tak, aby z internetu byly videt jen webove dvere, ne vnitrni casti systemu.

## Faze 3: Domena a zabezpecena adresa

1. Nastavit domenu, aby ukazovala na IP testovaciho serveru.
2. Nainstalovat a nastavit Nginx.
3. Vystavit bezpecny certifikat pres Let's Encrypt.
4. Vynutit pristup pres HTTPS.
5. Overit, ze verejna adresa funguje pres `https://<HULY_DOMAIN>`.
6. Overit, ze verejne nejsou dostupne vnitrni sluzby.

V deniku pro lidi zapsat:

> Huly bude dostupne pres bezpecnou webovou adresu.

## Faze 4: Instalace Huly

1. Na serveru stahnout `hcengineering/huly-selfhost`.
2. Nastavit verzi:
   - `HULY_VERSION=v0.7.423`
3. Nastavit verejnou adresu:
   - `FRONT_URL=https://<HULY_DOMAIN>`
4. Spustit Huly pres Docker Compose.
5. Overit, ze sluzby bezi.
6. Vytvorit prvni spravcovsky ucet.
7. Vytvorit zalozni spravcovsky ucet.
8. Overit prihlaseni obou spravcu.

Admin ucty se maji vytvaret pres Huly tool, ne rucnim SQL zasahem. Syntaxe podle lokalniho `HulyPrautplatform/dev/tool/src/index.ts` je:

```bash
create-account <email> --password <password> --first <first> --last <last>
```

Na VPS pouzit hodnoty jen ze soukromeho env souboru. Hesla nevypisovat do terminaloveho logu ani dokumentace. Sablona prikazu:

```bash
source /root/huly-poc-secrets.env
source /root/huly-selfhost/.env
docker run --rm --network "${DOCKER_NAME}_huly_net" \
  -e SERVER_SECRET="$SECRET" \
  -e STORAGE_CONFIG="minio|minio?accessKey=minioadmin&secretKey=minioadmin" \
  -e ACCOUNT_DB_URL="$CR_DB_URL" \
  -e ACCOUNTS_URL="http://account:3000" \
  -e DB_URL="$CR_DB_URL" \
  -e QUEUE_CONFIG="redpanda:9092" \
  hardcoreeng/tool:"$HULY_VERSION" \
  -- bundle.js create-account "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --first Praut --last Admin
```

Stejny postup pouzit pro `BACKUP_ADMIN_EMAIL` a `BACKUP_ADMIN_PASSWORD`. Pred spustenim na VPS overit dostupny tag tool image; pokud `hardcoreeng/tool:$HULY_VERSION` neni dostupny, pouzit odpovidajici tool image doporuceny pro nasazenou Huly verzi a zapsat odchylku do `HULY_DECISIONS_AND_DEVIATIONS.md`.

Volitelna tiskova sluzba:

- Pro PoC neni povinna.
- Pokud se zapne, musi mit nastaveno `FRONT_URL`.

V deniku pro lidi zapsat:

> Zaklad Huly bezi a existuji dva spravcovske ucty, aby firma nebyla zavisla na jednom cloveku.

## Faze 5: Uzamceni pristupu

1. Vypnout verejnou registraci pro vstupni cast Huly.
2. Vypnout verejnou registraci i na strane uctu.
3. Restartovat dotcene casti Huly.
4. Overit, ze clovek bez pozvanky nebo spravcovskeho zalozeni uctu nevytvori novy ucet.
5. Nepovolovat anonymni ani hostovsky pristup, pokud to neni vyslovne schvalene.
6. Sluzba `kvs` nema byt verejne vystavena. V `compose.yml` publikovat port jen na localhost:

   ```yaml
   ports:
     - 127.0.0.1:8094:8094
   ```

V deniku pro lidi zapsat:

> Nikdo cizi se nemuze sam zaregistrovat. Novy clovek se dostane dovnitr jen pres schvaleny postup.

## Faze 6: E-maily - odlozeno

Pro tuto chvili je e-mailove odesilani odlozene.

Dusledek:

- Zakladni Huly PoC muze pokracovat.
- Plne overeni pozvanek e-mailem nemuze byt oznaceno jako hotove.
- Pred plnym testem onboardingu se musi doplnit SMTP udaje.

Az budou SMTP udaje k dispozici:

1. Nastavit odesilani e-mailu.
2. Poslat testovaci pozvanku.
3. Overit doruceni.
4. Overit expiraci pozvanky.
5. Overit omezeni poctu pouziti pozvanky.

V deniku pro lidi zapsat:

> E-mailove pozvanky jsou odlozene. Zaklad systemu lze testovat, ale pozvanky e-mailem se musi dodelat.

## Faze 7: Zaloha a obnova pred obsahem

Aktualni overeny Docker Compose postup:

1. Spustit zalohu:

   ```bash
   cd /root/huly-selfhost
   scripts/praut-backup.sh
   ```

2. Pouzit pouze backup, ktery obsahuje adresar `cockroachdb/`, ne legacy `cockroachdb.sql.gz`.
3. Spustit izolovany restore smoke:

   ```bash
   cd /root/huly-selfhost
   scripts/praut-restore-smoke.sh /root/huly-selfhost/backup-praut/<STAMP>
   ```

4. Smoke test musi obnovit CockroachDB pres `RESTORE DATABASE` bez rucnich schema/function oprav.
5. Smoke test musi porovnat row county a overit MinIO soubory.
6. Vysledek zapsat do `HULY_VALIDATION_LOG.md`.
7. Dokud obnova neprojde s vysledkem `PASS`, neimportovat firemni obsah.

Aktualni akceptovany pre-import backup:

```text
/root/huly-selfhost/backup-praut/20260611-091342
```

Aktualni akceptovany restore vysledek:

```text
/root/huly-restore-smoke/20260611-091342/RESTORE_SMOKE_RESULT.md
```

V deniku pro lidi zapsat:

> Overili jsme, ze kdyby se neco pokazilo, umime system obnovit.

## Faze 8: Zakladni firemni mapa

Vytvorit 8 oblasti:

- `01_system`
- `02_sales_crm`
- `03_projects_tasks`
- `04_knowledge_docs`
- `05_communication`
- `06_marketing_support`
- `07_automation_ai_integrations`
- `08_management_reporting`

Nastavit vlastniky a viditelnost. Citlive oblasti nechat omezene.

V deniku pro lidi zapsat:

> V Huly vznikla zakladni mapa firmy: system, obchod, zakazky, dokumenty, komunikace, podpora, automatizace a reporting.

## Faze 9: Prvni import obsahu

Pouzit primarne:

- `huly_unified_import/`

Importovat zatim jen reprezentativni vzorek, ne vsech 80 dokumentu.

Prvni vzorek:

- System: 1, 5, 6, 7, 8, 9, 10.
- Obchod/CRM: 11, 12, 13, 16, 17, 20.
- Zakazky/projekty: 21, 22, 25, 28, 29, 30.
- Znalosti: 31, 32, 34, 38.
- Komunikace: 43, 45.
- Marketing/podpora: 52, 53, 54, 55.
- Automatizace/AI/integrace: 57, 58, 60, 61, 62, 63, 69.
- Rizeni/reporting: 73, 74, 78, 79.

Pokud automaticky import selze, pouzit rucni fallback:

- `copy_paste_import/00-import-order.md`

Chyby a rucni zasahy zapisovat do:

- `HULY_MANUAL_CLEANUP.md`

V deniku pro lidi zapsat:

> Do Huly jsme zatim nedali vsechno, ale reprezentativni vzorek pravidel a postupu, aby slo overit, ze system funguje spravne.

## Faze 10: Prvni evidence

Nejdriv overit testovaci typ:

- `Firma`
- pole `ICO`
- pole `citlivost`

Pak zalozit prvni vlnu evidenci:

- `Firma`
- `Kontakt`
- `Lead/Poptavka`
- `Obchodni prilezitost`
- `Nabidka`
- `Zakazka`
- `Faktura`
- `Projekt`
- `Zakaznicky pozadavek`

U kazde evidence:

- pridat povinna pole,
- nastavit stavy,
- vytvorit pohledy `Aktivni`, `Bez vlastnika`, `Ke schvaleni`, `Riziko`, `Obnovy do 60 dni`, `Moje`,
- vytvorit jeden testovaci zaznam,
- overit zakladni vazby.

V deniku pro lidi zapsat:

> Karty jsou evidence dulezitych veci: firmy, kontakty, leady, nabidky, zakazky, faktury, projekty a zakaznicke pozadavky.

## Faze 11: Kontrolni pruchody

Overit tyto pruchody:

1. Lead -> obchodni prilezitost -> nabidka se schvalenim -> zakazka -> faktura -> projekt.
2. Zakaznicky pozadavek -> incident -> znalostni clanek.
3. Zapis ze schuzky -> akcni polozky -> ukoly -> casovy report.

Kontroly:

- Nabidka nesmi byt povazovana za odesilatelnou bez schvalovatele.
- Faktura, upominka a storno musi vyzadovat cloveka.
- Automatizace smi zatim jen upozornovat, ne rozhodovat.

## Faze 12: Kdy je test hotovy

PoC lze oznacit za hotove, az plati:

- Huly bezi na testovaci domene.
- Existuji dva spravci.
- Verejna registrace je vypnuta.
- Pristup bez schvaleni nefunguje.
- Je overena zaloha a obnova.
- Existuje 8 firemnich oblasti.
- Je importovany prvni vzorek dokumentu.
- Existuje prvni vlna evidenci.
- Projdou kontrolni pruchody.
- Otevrene body jsou zapsane.
- E-mailove pozvanky jsou jasne zapsane jako nedodelane, pokud stale chybi SMTP.

## Aktualizace stavu po kazde fazi

Po kazde vyznamne fazi aktualizovat:

- `VYVOJOVY_DENIK.md`
- `AGENT_STATE.md`
- `PRAUT_CONTINUITY_STATUS.md`
- `HULY_SETUP_PROGRESS.md`
- `HULY_VALIDATION_LOG.md`
- `HULY_DECISIONS_AND_DEVIATIONS.md`
- `HULY_MANUAL_CLEANUP.md`

## Prvni dalsi akce

1. Uzivatel doplni soukromy soubor s pristupy mimo projekt.
2. Agent overi server a domenu.
3. Agent zacne Fazi 2: priprava serveru.
