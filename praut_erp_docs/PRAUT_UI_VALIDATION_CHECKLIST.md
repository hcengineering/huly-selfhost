# PRAUT UI Validation Checklist

Checklist pro rucni kontrolu hotoveho Huly prostredi `Praut`.

Stav k 2026-06-12:

- Technicky overeno v databazi: dokumenty, Cards typy, pole, enumy, vazby a TEST karty.
- Rucne v Huly UI jeste overit: saved views, required fields, realny pruchod kontrolnimi scenari a lidska schvaleni.

## Vstup

URL:

```text
https://huly.praut.cz/workbench/praut
```

Workspace:

```text
Praut / praut
```

Pred zmenami:

```bash
cd /root/huly-selfhost
scripts/praut-backup.sh
```

## Technicky overeno

Datova validace probehla primo nad CockroachDB pro workspace `Praut`.

Overeno:

- workspace `Praut` ma `allow_guest_sign_up=false`,
- dokumentova vrstva ma 80 dokumentu,
- vsech 80 dokumentu ma content ref,
- v `Praut` nejsou duplicitni dokumentove titulky,
- importovane PRAUT titulky nejsou ve workspace `VELYOS` ani `sudety`,
- existuje 8 dokumentovych teamspace,
- existuje 22 PRAUT Cards typu,
- existuje 166 poli,
- existuje 30 ciselniku,
- existuje 24 vazeb,
- existuje 22 testovacich karet `TEST - <typ>`,
- vsech 22 testovacich karet ma content ref.

## Co UI musi potvrdit

UI validace ma potvrdit, ze to neni jen datove ulozene, ale pouzitelne pro lidi.

Potvrdit:

- clovek vidi workspace `Praut`,
- vidi 8 dokumentovych prostoru,
- umi otevrit reprezentativni dokumenty,
- vidi 22 Cards typu,
- umi otevrit kazdou testovaci kartu,
- pole jsou citelna a smysluplne pojmenovana,
- vazby jsou dostupne pri editaci karty,
- saved views jsou vytvorene a filtruji spravne,
- required-field chovani je zapnute tam, kde to Huly UI podporuje,
- rizikove kroky zustavaji na lidskem schvaleni.

## Dokumenty

V Huly otevrit dokumentove prostory a zkontrolovat reprezentativne:

- `Zaklad systemu`: dokumenty 1, 5, 8, 10.
- `Obchod a CRM`: dokumenty 11, 13, 17, 20.
- `Zakazky, projekty a ukoly`: dokumenty 21, 22, 25, 28, 30.
- `Dokumenty a znalostni baze`: dokumenty 31, 34, 37.
- `Komunikace a spoluprace`: dokumenty 39, 41, 43, 45.
- `Marketing a zakaznicka pece`: dokumenty 46, 52, 53, 56.
- `Automatizace, AI a integrace`: dokumenty 57, 61, 63, 69, 70.
- `Rizeni firmy a reporting`: dokumenty 73, 74, 78, 80.

Pro kazdy otevreny dokument potvrdit:

- titulek odpovida,
- obsah neni prazdny,
- text je citelny,
- dokument je ve spravnem prostoru,
- dokument neni duplicitni.

## Cards Typy

V Cards otevrit kazdy typ a zkontrolovat pole:

- `Firma`: nazev, ICO, web, segment, stav vztahu, vlastnik, citlivost.
- `Kontakt`: jmeno, firma, role, email, telefon, GDPR souhlas, vlastnik.
- `Lead/Poptavka`: zdroj, firma, kontakt, potreba, rozpocet, termin, priorita, stav, dalsi krok.
- `Obchodni prilezitost`: faze, hodnota, pravdepodobnost, ocekavane uzavreni, riziko, vlastnik.
- `Nabidka`: klient, prilezitost, rozsah, cena, platnost, verze, schvalovatel, stav.
- `Zakazka`: klient, nabidka, PM, start, cilovy termin, rozpocet hodin, datum obnovy, typ spoluprace, health, stav.
- `Faktura`: cislo faktury, zakazka, klient, vyse, datum vystaveni, datum splatnosti, datum zaplaceni, stav, vlastnik.
- `Projekt`: zakazka, PM, faze, deadline, skutecny cas, blokery, rizika.
- `Milnik`: projekt, vlastnik, termin, stav, vystupy, akceptacni kriterium.
- `Predani`: from role, to role, projekt, deadline, otevrene otazky, potvrzeni prevzeti, stav.
- `Zapis ze schuzky`: datum, ucastnici, projekt/klient, rozhodnuti, akcni polozky, citlivost, stav.
- `Kampan`: cil, segment, platformy, start, konec, rozpocet, stav, KPI.
- `Obsahova polozka`: kampan, format, platforma, autor, termin, stav, publikovana URL.
- `Zakaznicky pozadavek`: klient, kontakt, typ, priorita, SLA, vlastnik, stav, dopad.
- `Znalostni clanek`: tema, kategorie, stav, vlastnik, posledni revize, souvisejici pozadavky.
- `Automatizace`: spoustec, vstup, akce, vystup, autonomie, riziko, fallback, vlastnik, stav.
- `AI funkce`: vstup, vystup, autonomie, kontrolor, citlivost, omezeni, stav.
- `Integrace`: system, ucel, data, smer synchronizace, vlastnik, opravneni, riziko, stav.
- `Incident`: zavaznost, dopad, system, vlastnik, workaround, pricina, napravna akce, stav.
- `Change request`: duvod, dopad, riziko, schvalovatel, test, nasazeni, rollback, stav.
- `Riziko`: oblast, pravdepodobnost, dopad, vlastnik, mitigace, stav, termin kontroly.
- `KPI`: definice, zdroj dat, vlastnik, frekvence, cil, trend, akce pri odchylce.

Pro kazdy typ potvrdit:

- typ je viditelny,
- karta `TEST - <typ>` existuje,
- testovaci karta jde otevrit,
- pole jsou viditelna,
- stavove/select hodnoty davaji smysl,
- vazby na souvisejici typy jsou dostupne pri editaci.

## Saved Views

Vytvorit nebo potvrdit tyto pohledy tam, kde davaji smysl pro dany typ.

Overeny vstup do filtrovani:

- v Cards otevrit konkretni typ,
- pouzit ikonu trychtyre v horni liste,
- nastavit filtr podle pole,
- ulozit filtrovane zobrazeni, pokud UI nabidne ulozeni,
- nepouzivat pro tyto pohledy stitky.

### Aktivni

Ucel:
- vse, co neni archiv, uzavreno, prohrano, vyrazeno, dokonceno nebo storno.

Pouzit hlavne pro:
- Firma,
- Kontakt,
- Lead/Poptavka,
- Obchodni prilezitost,
- Nabidka,
- Zakazka,
- Projekt,
- Milnik,
- Zakaznicky pozadavek,
- Incident,
- Change request,
- Riziko.

### Bez vlastnika

Ucel:
- zaznamy, kde chybi vlastnik, PM, kontrolor nebo schvalovatel.

Pouzit pro vsechny typy, ktere maji jedno z poli:

- vlastnik,
- PM,
- kontrolor,
- schvalovatel.

### Ke schvaleni

Ucel:
- rizikove nebo obchodne citlive veci cekajici na cloveka.

Minimalni filtry:

- `Nabidka.stav = ke schvaleni`,
- `Change request.stav = analyza` nebo `schvaleno`,
- `AI funkce.stav = povoleno se schvalenim`,
- `Predani.stav = ke kontrole`,
- `Zapis ze schuzky.stav = ke kontrole`,
- `Obsahova polozka.stav = kontrola`,
- `Projekt.faze = klientske schvaleni`.

### Riziko

Ucel:
- zaznamy s vysokym rizikem, citlivosti nebo dopadem na klienta.

Minimalni filtry:

- `Riziko.stav != uzavreno`,
- `Projekt.rizika` neni prazdne,
- `Incident.stav` neni `uzavreno`,
- `Zakaznicky pozadavek.dopad` neni prazdny,
- `AI funkce.citlivost = vysoka`,
- `Integrace.riziko` neni prazdne,
- `Change request.riziko` neni prazdne.

### Obnovy do 60 dni

Ucel:
- `Zakazka` s blizicim se datem obnovy.

Pouzit pro:
- `Zakazka`.

Filtr:

- `datum obnovy` je v pristich 60 dnech,
- `stav` neni `dokonceno`,
- `stav` neni `archiv`.

### Moje

Ucel:
- zaznamy, kde jsem odpovedny clovek.

Filtr podle dostupneho pole:

- `vlastnik = ja`,
- nebo `PM = ja`,
- nebo `kontrolor = ja`,
- nebo `schvalovatel = ja`,
- nebo `autor = ja`.

## Required Fields

V `Settings -> TYPES` otevrit kazdy PRAUT typ a zapnout required-field enforcement tam, kde to Huly UI podporuje.

Priorita 1:

- Firma: nazev, ICO, vlastnik.
- Kontakt: jmeno, firma, email, vlastnik.
- Lead/Poptavka: firma, kontakt, potreba, priorita, stav, dalsi krok.
- Obchodni prilezitost: faze, hodnota, pravdepodobnost, vlastnik.
- Nabidka: klient, prilezitost, cena, platnost, schvalovatel, stav.
- Zakazka: klient, PM, start, cilovy termin, datum obnovy, typ spoluprace, stav.
- Faktura: cislo faktury, zakazka, klient, vyse, datum splatnosti, stav, vlastnik.
- Projekt: zakazka, PM, faze, deadline.
- Zakaznicky pozadavek: klient, kontakt, typ, priorita, SLA, vlastnik, stav.

Priorita 2:

- Milnik: projekt, vlastnik, termin, stav.
- Predani: from role, to role, projekt, deadline, potvrzeni prevzeti, stav.
- Zapis ze schuzky: datum, ucastnici, rozhodnuti, akcni polozky, stav.
- Incident: zavaznost, dopad, system, vlastnik, stav.
- Change request: duvod, dopad, riziko, schvalovatel, test, rollback, stav.
- Riziko: oblast, pravdepodobnost, dopad, vlastnik, mitigace, stav.

Priorita 3:

- Kampan: cil, segment, start, konec, rozpocet, stav.
- Obsahova polozka: kampan, format, platforma, autor, termin, stav.
- Znalostni clanek: tema, kategorie, stav, vlastnik, posledni revize.
- Automatizace: spoustec, vstup, akce, vystup, autonomie, riziko, fallback, vlastnik, stav.
- AI funkce: vstup, vystup, autonomie, kontrolor, citlivost, omezeni, stav.
- Integrace: system, ucel, data, smer synchronizace, vlastnik, opravneni, riziko, stav.
- KPI: definice, zdroj dat, vlastnik, frekvence, cil, trend.

Pokud Huly UI required-field enforcement pro nektere pole nepodporuje:

- nezapisovat to jako hotove,
- zapsat omezeni do `HULY_VALIDATION_LOG.md`,
- pouzit saved view `Bez vlastnika` nebo kontrolni pohled jako nahradni kontrolu.

## Kontrolni Scenare

### Scenar 1: Lead -> zakazka -> faktura -> projekt

Technicky pripraveno:

- typy existuji: Firma, Kontakt, Lead/Poptavka, Obchodni prilezitost, Nabidka, Zakazka, Faktura, Projekt, Milnik, Predani,
- vazby existuji:
  - Firma -> Kontakt,
  - Firma -> Lead/Poptavka,
  - Firma -> Obchodni prilezitost,
  - Firma -> Zakazka,
  - Lead/Poptavka -> Obchodni prilezitost,
  - Obchodni prilezitost -> Nabidka,
  - Nabidka -> Zakazka,
  - Zakazka -> Faktura,
  - Zakazka -> Projekt,
  - Zakazka -> Milnik,
  - Zakazka -> Predani.

Rucne v UI projit:

- zalozit testovaci Firmu a Kontakt,
- zalozit Lead/Poptavku s vazbou na Firmu a Kontakt,
- vytvorit Obchodni prilezitost,
- vytvorit Nabidku ve stavu `ke schvaleni`,
- potvrdit, ze cenu a odeslani schvaluje clovek,
- vytvorit Zakazku s `datum obnovy` a `typ spoluprace`,
- vytvorit Fakturu,
- vytvorit Projekt, Milnik a Predani.

### Scenar 2: Zakaznicky pozadavek -> incident -> znalostni clanek

Technicky pripraveno:

- typy existuji: Zakaznicky pozadavek, Incident, Znalostni clanek,
- vazby existuji:
  - Zakaznicky pozadavek -> Incident,
  - Zakaznicky pozadavek -> Znalostni clanek.

Rucne v UI projit:

- zalozit Zakaznicky pozadavek s prioritou a SLA,
- vytvorit Incident pri provoznim dopadu,
- vytvorit Znalostni clanek po vyreseni,
- potvrdit, ze klientskou komunikaci a uzavreni potvrzuje clovek.

### Scenar 3: Meeting -> ukoly -> casovy report

Technicky pripraveno:

- typ existuje: Zapis ze schuzky,
- dokumenty existuji: `43. Zapisy ze schuzek`, `34. Akcni polozky v dokumentech`, `28. Casove odhady a casove reporty`.

Rucne v UI projit:

- zalozit Zapis ze schuzky,
- doplnit rozhodnuti a akcni polozky,
- prevod na ukoly overit v Huly task/project funkcich,
- doplnit skutecny cas,
- potvrdit, ze dulezita rozhodnuti jsou v dokumentu nebo kartach, ne pouze v chatu.

Poznamka:
- Samostatny PRAUT typ `Casovy report` nebyl v importovanem schema definovan. Casovy reporting je zatim pokryty dokumentem a poli na projektu.

### Scenar 4: Obnovy a fakturace

Technicky pripraveno:

- `Zakazka` ma pole `datum obnovy`,
- `Zakazka` ma pole `stav`,
- `Faktura` ma stavy: draft, vystavena, odeslano, zaplaceno, po splatnosti, storno.

Rucne v UI projit:

- zalozit Zakazku s obnovou do 60 dni,
- overit pohled `Obnovy do 60 dni`,
- zalozit Zakazku s obnovou do 30 dni,
- alert obchodnikovi odlozit do doby, kdy bude SMTP/notification delivery hotove.

### Scenar 5: Automation pravidla

Technicky pripraveno:

- pravidla jsou zdokumentovana v `copy_paste_import/12-automation-rules.md`,
- potrebna pole pro alert-only pravidla jsou v datovem modelu z vetsiny pritomna.

Rucne nebo pozdeji overit:

- alerty nezapinat, dokud neni rozhodnute dorucovani notifikaci,
- zadne pravidlo nesmi samo schvalovat,
- zadne pravidlo nesmi samo odesilat klientum,
- zadne pravidlo nesmi samo menit prava,
- zadne pravidlo nesmi mazat data.

## Zapis Vysledku

Po UI kontrole aktualizovat:

- `HULY_VALIDATION_LOG.md`,
- `HULY_SETUP_PROGRESS.md`,
- `PRAUT_REMAINING_WORK.md`,
- `VYVOJOVY_DENIK.md`.

Minimalni vysledek zapsat jako:

```text
UI validation date:
Reviewer:
Workspace:
Documents:
Cards types:
Saved views:
Required fields:
Control scenarios:
Issues:
Next:
```
