# Praut Workspace Pack

Tento adresar je verzovany zdroj pravdy pro upravu Huly workspace na interni operacni system Praut. Neobsahuje produkcni data ani tajne klice.

## Co je implementovano v selfhost konfiguraci

- `TITLE=Praut`
- `DEFAULT_LANGUAGE=cs`
- `LAST_NAME_FIRST=false`
- `TZ=Europe/Prague`
- `PLATFORM_REPOSITORY=https://github.com/PrautAutomation/HulyPrautplatform.git`
- `PLATFORM_REF=develop`
- `HULY_IMAGE_REGISTRY`, ktery prepina Huly service images mezi upstream Docker Hub registry a Praut buildem
- pripraveny prepinac `DISABLE_SIGNUP`, ktery se ma zapnout az po vytvoreni prvniho admin uctu
- `compose.yml` predava Praut metadata a invite-only prepinac sluzbam `front` a `account`
- `scripts/praut-backup.sh` vytvari lokalni zalozni balicek konfigurace, databaze CockroachDB a MinIO souboru, pokud stack bezi

## Vazba na Praut platform fork

Zdrojovy fork platformy je `https://github.com/PrautAutomation/HulyPrautplatform.git`, branch `develop`.

`docker compose` ale nepousti platform source code primo. Selfhost taha hotove Docker images. Pokud Praut platform fork zacne publikovat vlastni images, nastav v `huly_v7.conf`:

```bash
HULY_IMAGE_REGISTRY=ghcr.io/prautautomation/hulyprautplatform
```

Potom spust:

```bash
docker compose pull front account workspace transactor collaborator fulltext stats rekoni kvs
docker compose up -d
```

Dokud Praut fork nepublikuje vlastni image registry, zustava bezpecny default:

```bash
HULY_IMAGE_REGISTRY=hardcoreeng
```

## Poradi nasazeni

1. Vytvorit prvni admin ucet, pokud jeste neexistuje.
2. Spustit zalohu:

   ```bash
   scripts/praut-backup.sh
   ```

3. Restartovat sluzby, ktere cteni metadat pouzivaji:

   ```bash
   docker compose up -d account workspace transactor front
   ```

4. Zkontrolovat prihlaseni a vytvorit workspace s nazvem `Praut`.
5. Podle `workspace-blueprint.yaml` vytvorit prostory, role, enumy, vztahy, stitky a dashboardy.
6. Do Huly textovych sablon zkopirovat sablony z `text-templates.md`.
7. Vytvorit dokumenty a standardy podle `standards.md`.
8. Po overeni admin uctu nastavit v `huly_v7.conf`:

   ```bash
   DISABLE_SIGNUP=true
   ```

   a znovu spustit `docker compose up -d account front`.

## Admin potvrzeni

Nasledujici kroky vyzaduji admina v Huly, proto nejsou provedeny primym zasahem do databaze:

- zapnuti povinneho 2FA, pokud ho aktualni Huly image podporuje
- finalni role a opravneni pro externisty a auditory
- vytvoreni/uprava trid, enumu a vztahu v modelu
- pridani vlastnich emoji
- automatizace, ktere vytvari incidenty, projekty, checklisty nebo notifikace
- import dashboardu a rizeni viditelnosti citlivych prostoru

## Overovaci smoke test

- prihlaseni pres admin ucet
- viditelny nazev instance `Praut`
- workspace navigace
- vytvoreni pracovni karty
- vytvoreni dokumentu ze sablony
- overeni, ze externista vidi pouze prirazene prostory
- export backlogu nebo dokumentace
- spusteni `scripts/praut-backup.sh`
