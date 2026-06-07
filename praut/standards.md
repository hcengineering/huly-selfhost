# Rizene dokumenty a standardy

## Coding standard

- Kazda zmena ma vlastnika, kartu a jasny vystup.
- Kod musi projit lokalni dostupnou validaci pred review.
- Kriticke a datove zmeny potrebuji popis dopadu.

## AI development standard

- AI agent nebo workflow musi mit ucel, vstupy, vystupy, testy, limity, fallback a vlastnika.
- Prompt a evaluace musi byt verzovane.
- Data s citlivosti `Citlive` nebo `Tajne` nesmi byt pouzita bez explicitniho schvaleni.

## Prompt standard

- Prompt musi mit typ, vlastnika, verzi, cilovy model a eval kriteria.
- Zmeny promptu se hodnoti na testovacich scenarich pred produkcnim pouzitim.

## Security policy

- 2FA je povinne pro interni uzivatele a externisty, pokud aktualni Huly image podporuje vynuceni.
- Zadny sdileny ucet.
- API klice se neukladaji do dokumentu ani karet.
- Externista nikdy nevidi finance, interni strategii, cizi citlive projekty, pristupy, API klice, osobni data mimo rozsah ani naborove poznamky mimo vlastni proces.

## Data handling policy

- Kazdy objekt ma citlivost dat.
- Citlive a tajne informace patri pouze do prostoru s omezenym pristupem.
- Exporty musi mit vlastnika a ucel.

## Definition of Done

### Vyvojova karta

- Splnuje zadani.
- Ma splnena akceptacni kriteria, pokud byla potreba.
- Prosla review.
- Je otestovana.
- Nema kriticky bug.
- Ma aktualizovanou dokumentaci, pokud je relevantni.
- Ma zkontrolovany dopad na data a bezpecnost.
- Je jasne, zda jde do release.
- Ma uzavrene souvisejici subtasky.
- Ma zapsany vysledek.

### AI agent nebo AI workflow

- Ma jasne definovany ucel.
- Ma popsane vstupy a vystupy.
- Ma prompt nebo instrukce ve verzovane podobe.
- Ma testovaci scenare.
- Ma definovane limity.
- Ma fallback nebo rucni zasah.
- Ma vyresenou praci s daty.
- Ma dokumentaci.
- Ma vlastnika.

### Integrace

- Ma vlastnika a ucel.
- Ma dokumentovane endpointy nebo webhooky.
- Ma testovaci a produkcni nastaveni.
- Ma bezpecne ulozene klice.
- Ma logovani.
- Ma monitoring nebo kontrolni mechanismus.
- Ma fallback.
- Prosla testem.

### Dokument

- Ma vlastnika a ucel.
- Ma aktualni verzi.
- Ma datum posledni aktualizace.
- Ma vazbu na projekt, proces nebo oblast.
- Je srozumitelny cilove skupine.
- Neobsahuje tajne klice ani citlive udaje v nechranene podobe.

## Release checklist

- Zaloha pred releasem.
- Stav QA je zeleny nebo explicitne schvaleny.
- Migrace jsou popsane.
- Rollback plan existuje.
- Monitoring je pripraveny.
- Release notes jsou zverejnene interne.

## Incident process

- Kriticky incident ma vlastnika.
- Je zapsany dopad a casova osa.
- Mitigace ma dalsi krok.
- Po uzavreni vznikne postmortem.

## Git workflow

- Prace zacina z karty.
- Pull request odkazuje na kartu.
- Review kontroluje zadani, testy, bezpecnost, data a dokumentaci.

## Documentation standard

- Dokument ma vlastnika, stav, verzi, oblast a posledni aktualizaci.
- Dokument starsi nez urceny interval se presouva do stavu `K revizi`.
