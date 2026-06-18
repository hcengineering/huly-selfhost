# PRAUT Remaining Work

Aktualni seznam nedodelku po full rollout importu 2026-06-12.

## Hotovo a nevracet zpet

- Workspace `Praut` / `praut` existuje.
- Dokumentova vrstva je hotova pro PoC gate: 8 prostoru, 80 dokumentu.
- Cards datova vrstva je hotova pro PoC gate: 22 typu, 166 poli, 30 ciselniku, 24 vazeb.
- Dokumentacni provozni model byl zjednodusen: hlavni zdroj pravdy pro denni praci je Huly Tracker; GitHub zustava pro kod/PR/review; Contacts jsou zdroj pravdy pro firmy; Cards zustavaji pro strukturovanou evidenci, reporting, rizika a fakturaci.
- Existuje 22 testovacich karet `TEST - <typ>`.
- `VELYOS` a `sudety` zustaly mimo import PRAUT obsahu.
- Finalni backup `/root/huly-selfhost/backup-praut/20260612-124435` ma PASS restore smoke.

## Zbyva bez externich udaju

1. Projit hotove prostredi v Huly UI s vlastnikem PRAUT.
2. Nastavit nebo overit hlavni Tracker projekt pro tymovou operativu:
   - stavy `Backlog`, `Todo`, `In Progress`, `Review`, `Blocked`, `Done`, `Cancelled`,
   - sablony `Feature`, `Bug`, `Client request`, `Sales follow-up`, `Review/QA`, `Ops/Admin`,
   - povinne provozni hodnoty owner/assignee, priorita, termin nebo jasny duvod bez terminu.
3. Zavest GitHub konvenci pro vyvoj:
   - branch a PR obsahuji Huly issue key,
   - PR title ma tvar `[TSK-2] kratky popis`,
   - Huly issue obsahuje PR link,
   - rucni PR link je platny fallback, dokud neni zapnuta integrace.
4. Doplnit Cards saved views:
   - `Aktivni`
   - `Bez vlastnika`
   - `Ke schvaleni`
   - `Riziko`
   - `Obnovy do 60 dni`
   - `Moje`
5. Overit required-field visibility a enforcement v `Settings -> TYPES`.
6. Projit kontrolni scenare z `copy_paste_import/10-control-scenarios.md`.
7. Zkontrolovat dokument `Untitled` a bez mazani ho prejmenovat, presunout nebo archivovat.
8. Overit existenci denniho backup cronu; pokud neexistuje, zavest pravidelny backup schedule.
9. Projit `PRAUT_OWNER_ADMIN_KURZ.md` s vlastnikem a splnit prakticke ukoly.
10. Aktualizovat `HULY_SETUP_PROGRESS.md` a `HULY_VALIDATION_LOG.md` po kazde validaci.

## Blokovane aktualnim pristupem

### VPS SSH z teto relace

Blokace:
- 2026-06-16 selhal primy SSH login pres lokalni klic z private env s `Permission denied`.
- `ssh-agent` neni v sandboxovane relaci dostupny.

Potrebny vstup:
- znovu nacist spravny klic do lokalniho `ssh-agent`, nebo
- pridat verejnou cast aktualniho klice do `/root/.ssh/authorized_keys`, nebo
- dodat funkcni samostatny pristup.

Dokonceni:
- spustit cerstvou zalohu,
- overit `docker compose ps`,
- overit cron,
- overit endpointy, `DISABLE_SIGNUP` a `kvs`,
- aplikovat zjednoduseny Tracker/GitHub provozni model v UI az po zaloze,
- zapsat vysledek do `HULY_VALIDATION_LOG.md`.

## Blokovane externimi udaji

### Koleguv SSH pristup

Blokace:
- chybi koleguv verejny SSH klic.

Potrebny vstup:
- obsah souboru `*.pub`, ne soukromy klic.

Dokonceni:
- pridat verejny klic do `/root/.ssh/authorized_keys`,
- overit koleguv login,
- zapsat do `HULY_VALIDATION_LOG.md`.

### SMTP/SES

Blokace:
- SMTP hodnoty v lokalnim env byly prazdne,
- SES hodnoty nebyly dodane.

Potrebny vstup:
- SMTP host, port, username, password, sender,
- nebo SES access key, secret key, region, sender.

Dokonceni:
- pridat `mail` service,
- nastavit `MAIL_URL`,
- restartovat dotcene sluzby,
- otestovat invite email flow.

## Automatizace

Pravidla z `copy_paste_import/12-automation-rules.md` zustavaji pouze alert-only:

1. Lead bez aktivity 7 dni.
2. Nabidka ke schvaleni 48 hodin.
3. SLA vyprsi za 24 hodin.
4. Karta bez vlastnika 24 hodin.
5. Projekt v riziku.
6. Zakazka s obnovou do 30 dni.
7. Incident klient v triage dele nez 2 hodiny.

Automatizace nesmi sama:

- schvalovat,
- posilat klientum,
- menit prava,
- mazat data,
- prepisovat vlastniky bez schvaleni.

## Acceptance pro predani kolegovi

Kolega muze navazat, kdyz:

- precte `KOLEGA_START_HERE.md`,
- ma samostatny SSH pristup,
- vidi `Praut` na `https://huly.praut.cz/workbench/praut`,
- potvrdi finalni backup a restore smoke evidence,
- rozumi zbyvajicim blokacim v tomto dokumentu.
