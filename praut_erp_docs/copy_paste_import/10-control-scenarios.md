# Kontrolni scenare po importu

Tyto scenare projdi po zalozeni prostoru, dokumentu, Tracker workflow a Cards. Cilem je overit, ze prace je ridena pres Tracker, informace nezustavaji jen v chatu, GitHub PR jsou dohledatelne z issue a rizikove kroky vyzaduji lidske schvaleni.

## 1. Novy klient bez duplicitni Cards firmy
- [ ] Zalozit nebo overit `Novak stavby` v `Contacts -> Companies`.
- [ ] Zalozit kontaktni osobu v `Contacts -> People` a propojit ji s firmou.
- [ ] Zalozit Tracker issue s dalsim krokem, vlastnikem, prioritou a deadline.
- [ ] Overit, ze pro beznou praci nevznikla duplicitni `Cards -> Firma`.
- [ ] Pokud jde o obchodni pipeline, zalozit Lead/Poptavku nebo Obchodni prilezitost a firmu vybrat z Contacts.

## 2. Vyvojova prace Huly issue -> GitHub PR
- [ ] Zalozit Huly issue pred zacatkem prace.
- [ ] Vytvorit branch s issue key, napr. `TSK-2-fix-login`.
- [ ] Vytvorit PR s titulkem ve formatu `[TSK-2] kratky popis`.
- [ ] Vlozit PR link do Huly issue nebo overit automatickou integraci.
- [ ] Posunout issue do `Review`, po review a merge do `Done`.
- [ ] Pokud integrace nefunguje, overit, ze rucni PR link v issue staci k dohledatelnosti.

## 3. Tymovy prehled v Trackeru
- [ ] Otevrit hlavni Tracker projekt.
- [ ] Overit, ze owner vidi, kdo co dela.
- [ ] Overit pohled nebo filtr pro `Blocked`.
- [ ] Overit pohled nebo filtr pro `Review`.
- [ ] Overit, ze issue po terminu jsou dohledatelne.
- [ ] Overit, ze aktivni issue maji owner/assignee, prioritu a termin nebo jasny duvod bez terminu.

## 4. Lead -> zakazka -> faktura -> projekt
- [ ] Zalozit testovaci firmu v Contacts a kontakt v Contacts.
- [ ] Zalozit Lead/Poptavku s vazbou na Firmu a Kontakt.
- [ ] Prevest Lead na Obchodni prilezitost.
- [ ] Vytvorit Nabidku.
- [ ] Overit, ze cena a odeslani nabidky vyzaduji lidske schvaleni.
- [ ] Po vyhre zalozit Zakazku s polem `datum obnovy` a `typ spoluprace`.
- [ ] Zalozit Fakturu navazanou na Zakazku, Firmu a Projekt.
- [ ] Overit, ze Faktura umi stavy draft, vystavena, odeslano, zaplaceno, po splatnosti a storno.
- [ ] Overit, ze odeslani, upominku a storno Faktury potvrzuje clovek.
- [ ] Zalozit Projekt, prvni Milnik a Predani.
- [ ] Overit, ze Projekt ma vlastnika, stav, vazbu na Zakazku a navazne Tracker issues.

## 5. Zakaznicky pozadavek -> incident -> znalostni clanek
- [ ] Zalozit Zakaznicky pozadavek s prioritou a SLA.
- [ ] Eskalovat problem podle pravidel pro zakaznicke problemy.
- [ ] Pokud ma provozni dopad, zalozit Incident.
- [ ] Po vyreseni vytvorit Znalostni clanek.
- [ ] Navazat Znalostni clanek na puvodni pozadavek a Incident.
- [ ] Overit, ze klientskou komunikaci a uzavreni potvrzuje clovek.

## 6. Meeting -> ukoly -> casovy report
- [ ] Zalozit Zapis ze schuzky.
- [ ] Doplnit rozhodnuti a akcni polozky.
- [ ] Prevest akcni polozky na Tracker issues.
- [ ] Naplanovat ukol v osobnim planovaci.
- [ ] Po dokonceni doplnit skutecny cas.
- [ ] Overit casovy report a vazbu na projekt.
- [ ] Overit, ze dulezita rozhodnuti jsou v dokumentu nebo kartach, ne pouze v chatu.

## 7. Obnovy a fakturace
- [ ] Zalozit Zakazku s datumem obnovy do 60 dni.
- [ ] Overit pohled `Obnovy do 60 dni`.
- [ ] Zalozit Zakazku s datumem obnovy do 30 dni.
- [ ] Overit alert obchodnikovi podle automation pravidla.
- [ ] Overit, ze dokoncena nebo archivovana Zakazka v pohledu obnov neni.

## 8. Automation pravidla
- [ ] Lead bez aktivity 7 dni posle alert vlastnikovi.
- [ ] Nabidka ve stavu `ke schvaleni` dele nez 48 hodin posle alert schvalovateli.
- [ ] SLA zakaznickeho pozadavku, ktera vyprsi za 24 hodin, posle alert resiteli.
- [ ] Karta bez vlastnika dele nez 24 hodin posle alert adminovi.
- [ ] Projekt ve stavu `v riziku` posle alert PM a vedeni.
- [ ] Zakazka s datem obnovy do 30 dni posle alert obchodnikovi.
- [ ] Incident s dopadem `klient` v triage dele nez 2 hodiny posle alert vedeni.
- [ ] Overit, ze vsechna pravidla pouze posilaji alert a neprovadeji rizikove rozhodnuti.
