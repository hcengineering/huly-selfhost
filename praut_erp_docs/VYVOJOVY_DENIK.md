# VYVOJOVY DENIK PRAUT / Huly

Tento denik je psany pro majitele firmy, vedeni a bezne cleny tymu. Ma jednoduse vysvetlit, co se s internim systemem deje, proc se to dela a co bude nasledovat.

Denik neobsahuje hesla, tokeny, API klice, tajne odkazy ani hodnoty nastaveni.

## Kde jsme ted (aktualizovano 2026-07-02)

**Huly bezi produkcne** na https://huly.praut.cz (workspace `praut`) a firma v nem denne pracuje.
Smer: Huly Self-Hosted jako uzavrene interni prostredi pro PRAUT. Provozni zaklad je hotovy —
16 sluzeb, naplneny workspace (projekty, dokumenty, kontakty, obchodni pipeline), denni zalohy,
GitHub integrace, odchozi e-maily (Postmark), lehky monitoring.

Aktualni prehled zmen je v `CHANGELOG.md`, seznam nedodelku v `PRAUT_REMAINING_WORK.md`,
roadmapa vylepseni v `../docs/improvements/ROADMAP-2026-07.md`.

> Poznamka: starsi zaznamy nize popisuji fazi pripravy a testu — jsou ponechany jako historie.
> Aktualni stav je „produkcni provoz", ne „priprava testu".

## Co budujeme

Budujeme interni pracovni prostredi pro PRAUT, kde budou na jednom miste pravidla, postupy, obchodni pripady, zakazky, projekty, faktury, pozadavky zakazniku, znalosti a zakladni firemni prehledy.

Cilem je, aby Huly slouzilo jako interni ERP a workflow system: tedy misto, kde firma ridi praci, informace, odpovednosti a navaznosti mezi obchodem, realizaci, podporou a vedenim.

## Proc to delame

Dnes je riziko, ze dulezite informace zustanou v hlavach lidi, v jednotlivych souborech nebo v ruznych nastrojich bez jasne navaznosti. Huly ma pomoci zavest jednotny zpusob prace:

- kazdy dulezity pripad ma vlastnika,
- informace jsou dohledatelne,
- obchodni a projektove kroky na sebe navazuji,
- citlive casti firmy nejsou verejne dostupne,
- automatizace pouze upozorni cloveka, ale nerozhoduji za firmu.

## Co uz je hotove

- Byla projita stavajici projektova dokumentace PRAUT.
- Byl doporucen smer Huly Self-Hosted.
- Byl vybran prvni doporuceny testovaci tag Huly: `v0.7.423`.
- Bylo potvrzeno, ze system ma byt jen pro pozvane uzivatele.
- Bylo rozhodnuto, ze verejna registrace ma byt vypnuta.
- Byla vytvorena projektova pamet pro dalsi agenty a budouci navazovani prace.
- Byl pripraven celkovy implementacni plan pro Core ERP PoC.
- Byl vytvoren tento lidsky denik jako citelny prehled pro netechnicke ctenare.
- Byla znovu overena zvolena verze Huly `v0.7.423` a byly precteny souvisejici migracni poznamky pro self-hosted provoz.
- Byl vytvoren prakticky navod pro testovaci server: `HULY_VPS_POC_RUNBOOK.md`.
- Bylo pripravene soukrome misto mimo projekt, kam se maji doplnit pristupy.
- Bylo zapsano, ze e-mailove pozvanky se zatim preskakuji a musi se dodelat pozdeji.
- Huly uz bezi na adrese `https://huly.praut.cz` a ukazuje prihlasovaci obrazovku.
- Byl pripraven predavaci navod pro kolegu: `PREDANI_KOLEGOVI.md`.
- Aktualni dokumentace byla nahrana na VPS, aby kolega mohl navazat i z jineho pocitace.
- Dnes bylo znovu overeno, ze verejna adresa `https://huly.praut.cz` odpovida.
- Hesla pro prvniho a zalozniho spravce byla pripravena pouze v soukromem souboru mimo dokumentaci.
- Lokalni konfigurace byla upravena tak, aby vnitrni sluzba na portu `8094` nebyla pri dalsim nasazeni verejne vystavena.
- Pristup z tohoto pocitace na VPS byl obnoven pres SSH.
- Pred dalsimi zmenami byla vytvorena zaloha Huly na serveru.
- Vnitrni technicky port `8094` je na serveru omezeny jen na lokalni pristup.
- Prvni spravcovsky ucet byl vytvoren a prihlaseni bylo overeno.
- Zalozni spravcovsky ucet byl obnoven pro `stepan@velyos.cz` a prihlaseni bylo overeno.
- Verejna registrace bez pozvanky byla overena jako zablokovana.
- Byl proveden bezpecny test obnovy ze zalohy v oddelenem prostredi na stejnem serveru.
- Soubory ulozene v MinIO casti zalohy jsou citelne a pocet souboru sedi: 201 souboru.
- Databazova cast zalohy je citelna, ale zatim nejde primo obnovit jako kompletni databazovy restore, protoze dump neobsahuje vsechny potrebne definice a obsahuje technicke radky, ktere import brzdi.
- Testovaci kontejnery po restore testu byly zastaveny, produkcni Huly zustalo bezet a verejna adresa po testu odpovidala.
- Zpusob databazove zalohy byl opraven: misto rucne slozeneho SQL dumpu se pouziva nativni zaloha CockroachDB.
- Nova zaloha `/root/huly-selfhost/backup-praut/20260611-091342` byla obnovena v oddelenem testu a obnova prosla.
- Po uspesnem testu zustalo produkcni Huly dostupne a vnitrni technicky port `8094` zustal omezeny jen na lokalni pristup.
- Byl zalozen samostatny workspace `Praut` se slugem `praut`, aby se testovaci obsah nemichal do existujicich prostoru `VELYOS` ani `sudety`.
- Do workspace `Praut` byl proveden prvni omezeny import: 8 dokumentovych prostoru a 23 vybranych dokumentu.
- Bylo overeno, ze importovane dokumenty nejsou ve workspace `VELYOS` ani `sudety`.
- Po importu zustala verejna adresa dostupna, verejna registrace zustala vypnuta a vnitrni port `8094` zustal omezeny jen na lokalni pristup.

## Co se prave resi

Prvni kontrolovany import probehl. Zakladni i zalozni spravcovsky ucet funguji, verejna registrace bez pozvanky je blokovana a obnova z aktualni zalohy byla overena.

Huly je spustene na serveru a ma samostatny prostor `Praut` s prvnim vzorkem dokumentace. Jeste nejsou dokoncene vsechny firemni kroky: plny import vsech dokumentu, nastaveni Cards typu, prvni evidence, kontrola uzivatelu a e-mailove pozvanky.

## Aktualizace 2026-06-12

Plny import prostredi `Praut` probehl. V Huly je ted 8 dokumentovych prostoru, 80 dokumentu, 22 typu Cards a ke kazdemu typu jedna testovaci karta `TEST - ...`.

Pred plnym importem vznikla zaloha `/root/huly-selfhost/backup-praut/20260612-091532`. Po dokonceni vznikla finalni zaloha `/root/huly-selfhost/backup-praut/20260612-124435` a jeji obnova prosla izolovanym restore smoke testem.

Overeno:

- `Praut` ma 8 aktivnich dokumentovych prostoru.
- `Praut` ma 80 dokumentu a vsechny maji obsah.
- Dokumenty se neobjevily ve workspace `VELYOS` ani `sudety`.
- Cards import vytvoril 22 typu, 166 poli, 30 ciselniku a 24 vazeb.
- Ke kazdemu typu Cards existuje jedna testovaci karta.
- `https://huly.praut.cz` i `/workbench/praut` vraci 200.
- Verejna registrace zustava vypnuta.
- Port `kvs` zustava dostupny jen lokalne na serveru.

Co jeste neni hotove:

- ulozene pohledy v Cards se musi doplnit rucne v Huly UI,
- vynuceni povinnych poli se musi doplnit rucne v `Settings -> TYPES`,
- SMTP/SES neni nastaveno, takze nejdou plne otestovat e-mailove pozvanky,
- koleguv SSH pristup porad ceka na jeho verejny klic,
- automatizace zatim nejsou zapnute; zustavaji jen jako alert-only pravidla v dokumentaci.

## Aktualizace 2026-06-12 - predani kolegovi

Predavaci dokumentace pro kolegu byla doplnena tak, aby mohl navazat bez znalosti cele historie chatu.

Nove nebo obnovene vstupni dokumenty:

- `KOLEGA_START_HERE.md` - prvni rychla orientace,
- `PREDANI_KOLEGOVI.md` - aktualni predani po full rollout,
- `PRAUT_OPERATIONS_RUNBOOK.md` - provozni prikazy, kontroly, backup a restore smoke,
- `PRAUT_REMAINING_WORK.md` - presny seznam toho, co jeste zbyva.

Predani zduraznuje, ze zakladni datova vrstva je hotova, ale SMTP/SES, koleguv SSH klic, Cards pohledy, povinna pole, alert-only automatizace a pravidelny backup plan zustavaji nasledne kroky.

## Aktualizace 2026-06-17 - zjednoduseni provozu pro tym

Dokumentace byla upravena tak, aby bezny provoz tymu nebyl rizeny pres Cards. Hlavni misto pro kazdodenní praci je Huly Tracker.

Nove pravidlo:

- Tracker issue je prace, vlastnik, priorita, termin a stav.
- GitHub PR je kodova zmena a review navazana na Tracker issue.
- Contacts jsou misto pro firmy a lidi.
- Documents jsou pravidla, rozhodnuti, navody a zapisy.
- Cards zustavaji pro obchodni a provozni evidenci, reporting, rizika a fakturaci, ale nejsou hlavni misto pro denni koordinaci ukolu.

Do dokumentace pribyl soubor `OPERATIVNI_MODEL_HULY_TRACKER_GITHUB.md`. Upravene jsou take zakladni pravidla, prace s ukoly, workflow stavy, GitHub konvence, sablony issue, skoleni tymu, kontrolni scenare a zamestnanecke navody.

V produkcnim Huly zatim nebyly provedeny zive konfiguracni zmeny. Pred zmenami v UI je potreba obnovit SSH pristup, spustit cerstvou zalohu a az potom nastavit Tracker stavy, sablony a pripadne GitHub integraci.

## Co bude dalsi krok

Dalsi krok je projit hotove prostredi primo v Huly a doplnit veci, ktere importni nastroj neumi nastavit:

- zkontrolovat vsech 8 prostoru a reprezentativni dokumenty,
- nastavit nebo overit hlavni Tracker projekt pro tymovou operativu,
- nastavit Tracker stavy `Backlog`, `Todo`, `In Progress`, `Review`, `Blocked`, `Done`, `Cancelled`,
- nastavit sablony `Feature`, `Bug`, `Client request`, `Sales follow-up`, `Review/QA`, `Ops/Admin`,
- zavest GitHub pravidlo branch/PR/title podle Huly issue key a rucni PR link jako fallback,
- v Cards doplnit pohledy `Aktivni`, `Bez vlastnika`, `Ke schvaleni`, `Riziko`, `Obnovy do 60 dni`, `Moje`,
- v Cards zapnout povinna pole tam, kde je Huly UI podporuje,
- nastavit SMTP/SES a otestovat pozvanky,
- po dodani verejneho SSH klice pridat koleguv samostatny pristup.

Jednoduse receno: zakladni datova vrstva PRAUT v Huly je hotova a obnovitelna ze zalohy, ale provozni doladeni v UI a e-mailove pozvanky jeste zbyvaji.

## Rozhodnuti

- Huly bude zatim posuzovano jako self-hosted reseni, tedy system provozovany pod kontrolou firmy.
- Prvni test ma bezet na testovacim VPS serveru, ne rovnou jako produkce.
- Pristup ma byt jen pro pozvane lidi.
- Verejna registrace ma byt vypnuta.
- GitHub, AI, video, Gmail, Calendar a SSO integrace se odkladaji az po overeni zakladniho Core ERP PoC.
- Do PoC se maji davat jen testovaci nebo fiktivni data.
- Automatizace maji ze zacatku pouze upozornovat cloveka, ne delat rozhodnuti za firmu.
- Pristupy se ulozi mimo projektovou dokumentaci.
- E-mailove pozvanky se zatim preskakuji, ale zustavaji povinnou dodelavkou.
- Kolega nema dostat cizi soukromy SSH klic; ma mit vlastni klic a vlastni pristup.
- Plny import a Cards typy byly spustene az po vytvoreni noveho rollback backupu.

## Rizika

- Pokud by verejna registrace zustala zapnuta, mohl by se pokusit prihlasit nekdo mimo firmu. Proto se bude zvlast overovat, ze registrace bez pozvanky nefunguje.
- Pokud by nebylo overene obnoveni ze zalohy, firma by pri chybe mohla prijit o praci. Proto se ma backup a obnova otestovat pred importem dulezitych dat.
- Stary databazovy dump z predchozi zalohy nebyl vhodny jako kompletni obnova. Aktualni akceptovana zaloha je az `/root/huly-selfhost/backup-praut/20260611-091342`, ktera prosla restore testem.
- Pokud by se do testu vlozila realna citliva data prilis brzy, rostlo by provozni a bezpecnostni riziko. Proto se v PoC pouzivaji testovaci data.
- Pokud by automatizace rovnou schvalovaly ceny, posilaly klientum zpravy nebo menily prava, mohly by zpusobit skodu. Proto budou ze zacatku jen upozornovat.
- Pokud by firma zavisla jen na jednom spravci, mohl by vzniknout provozni problem. Proto ma vzniknout i zalozni spravcovsky ucet.
- Pokud by vnitrni technicky port byl verejne dostupny, zvysovalo by to bezpecnostni riziko. Proto je lokalni konfigurace pripravena tak, aby tento port poslouchal jen lokalne.
- Pri zakladani workspace doslo k technicke odchylce: prvni automaticky pokus nedokoncil posledni krok aktivace workspace. Stav byl opraven jen pro novy workspace `Praut` a odchylka je zapsana v technickem logu.

## Co potrebujeme od vas

Pred skutecnym spustenim testu bude potreba dodat nebo potvrdit:

- platny SSH klic nebo spravnou cestu ke klici pro tento pocitac,
- IP adresu testovaciho VPS serveru,
- prihlasovaciho uzivatele pro spravu serveru,
- domenu, pres kterou bude Huly dostupne,
- pristup ke sprave domeny,
- e-mail prvniho spravce,
- e-mail zalozniho spravce,
- potvrzeni, ze server ma dostatecny vykon.

Hesla, tokeny a tajne hodnoty se do teto dokumentace zapisovat nemaji. E-mailove odesilani se dodela pozdeji, az budou k dispozici SMTP udaje.

## Slovnicek

**Huly**  
Nastroj pro praci tymu, dokumenty, ukoly, procesy, zakazky a firemni evidence.

**Self-hosted**  
Znamena, ze system nebezi jen jako cizi cloudova sluzba, ale firma ma vetsi kontrolu nad provozem, pristupy, zalohami a nastavenim.

**Invite-only**  
Pristup jen na pozvanku. Novy clovek se nemuze zaregistrovat sam bez schvaleni.

**SMTP**  
Technicky zpusob, jak system posila e-maily, napriklad pozvanky nebo upozorneni.

**Cards**  
Strukturovane evidence dulezitych veci, napr. firma, kontakt, lead, nabidka, zakazka, faktura nebo projekt.

**Workspace**  
Pracovni prostor v Huly, kde jsou ulozene dokumenty, karty, ukoly a nastaveni pro tym.

**Backup**  
Zaloha systemu a dat. Slouzi k tomu, aby bylo mozne system obnovit, kdyz se neco pokazi.

**Core ERP PoC**  
Prvni kontrolovany test zakladnich ERP funkci. Ma ukazat, jestli je Huly vhodne jako interni system pro PRAUT, driv nez se zacne produkcni provoz.

## Aktualizace 2026-06-16 - owner-ready priprava

Co se dnes podarilo:

- vznikl prakticky owner/admin kurz `PRAUT_OWNER_ADMIN_KURZ.md`,
- predavaci dokumenty ted jasne odkazuji na kurz,
- zbyvajici prace je rozepsana na UI kroky, kontrolni scenare, `Untitled` dokument a overeni pravidelnych zaloh,
- do technickeho logu je zapsane, ze live overeni serveru se dnes nepodarilo kvuli SSH pristupu.

Co se dnes nepodarilo overit:

- cerstva zaloha na VPS,
- `docker compose ps`,
- pravidelny backup cron nebo systemd timer,
- aktualni `DISABLE_SIGNUP` a `kvs` stav primo na serveru,
- existenci 6 ulozenych Cards pohledu,
- required-field enforcement,
- stav rucniho dokumentu `Untitled`.

Duvod:

- primy SSH login pres lokalni klic skoncil `Permission denied`,
- `ssh-agent` nebyl v teto sandboxovane relaci dostupny.

Prakticky dalsi krok:

1. Obnovit funkcni SSH pristup.
2. Spustit novou zalohu.
3. Overit cron nebo zavest pravidelny backup schedule.
4. Projit Huly UI podle `PRAUT_OWNER_ADMIN_KURZ.md`.
5. Doplnit Cards pohledy, povinna pole a owner-ready kontrolni scenare.

## Aktualizace 2026-06-23 - slouceni kontaktu a typy vztahu

Co se delo dnes:

- Opravili jsme chybu "Nelze sloucit globalni osoby" pri slucovani dvou kontaktu jednoho cloveka.
  Priciny byly dve: (1) slucovany (zdrojovy) kontakt nesmi mit overene prihlaseni; (2) v okne slouceni
  nelze jako zdroj vybrat zamestnance/ucet. Slucovat jde proto jen smerem "duplicitni kontakt -> hlavni
  kontakt (zamestnanec)". Reseni je prohozeni smeru v okne slouceni. Pro pripad, kdy by oba kontakty mely
  overene prihlaseni, vznikl pomocny nastroj `tools/huly-admin/praut-merge-persons.cjs`.
- Vytvorili jsme 15 typu vztahu (relations), aby slo v Huly propojovat osoby, firmy a byznys karty
  (napr. "pracuje pro / zamestnava", "kontaktni osoba", "dodavatel / odberatel", "materska / dcerina firma").
  Drive bylo okno "Pridat vztah" prazdne, protoze zadne typy vztahu jeste neexistovaly. Nastroj
  `tools/huly-admin/praut-create-relations.cjs` (idempotentni, DRY-RUN first).
- Vznikl audit dokumentace `praut_erp_docs/AUDIT_DOKUMENTACE_2026-06-23.md`: co je zdokumentovane, co chybi
  a jak v dokumentaci pokracovat.

Co to znamena pro vas:

- Slucovani duplicitnich kontaktu uz funguje - vzdy smerujte duplikat DO hlavniho kontaktu.
- U kontaktu, firem, leadu, prilezitosti, nabidek, zakazek a projektu lze ted pridavat vztahy
  (kontakt -> "Pridat vztah" -> vyber typ -> vyber druhou stranu).

## 2026-06-25 - Shrnuti vlny vylepseni (23. az 25. 6. 2026)

Tato sekce shrnuje praci za poslednich par dni, aby cely tym vedel, co se v systemu zmenilo.

GitHub a e-maily:
- Propojeni GitHub <-> Huly je zprovoznene (webhook uz odpovida spravne). Kodova prace na GitHubu
  (issues, PR) se da navazat na Huly.
- Zapnuli jsme odchozi firemni e-maily (sluzba SMTP): Huly uz umi posilat pozvanky, reset hesla a
  notifikace. Vlastni schranky (cteni posty primo v Huly) resime az pozdeji.
- Obnovili jsme pristup uzivateli, ktery zapomnel heslo. (Pozn.: "smazani uzivatele" v UI ucet
  nesmaze, jen odebere clenstvi - proto vznikl rizeny offboarding nize.)

Obchodni pipeline (Lead):
- Lead funnel jsme pocestili na nase faze: Zajemce -> Kvalifikace -> Vyjednavani -> Priprava nabidky
  -> Rozhodovani -> Uzavreni -> Vyhrano -> Prohrano. Existujici leady zustaly na svych mistech.
- Rozhodnuti: obchodni pipeline vedeme v modulu Lead (prehledny funnel se sloupci podle faze).
  Nabidky, zakazky, faktury a reporting zustavaji na kartach.

Vizualni uklid:
- Opravili jsme chybove ikonky (cervene "!") u nekterych vztahu - vznikaly u symetrickych vztahu se
  stejnym nazvem na obou stranach ("kolega", "partner"). Prejmenovali jsme druhou stranu
  (kolega/kolegove, partner/partneri). Vztahy ani propojeni se neztratily.
- Ocistili jsme nazvy 8 hlavnich sekci dokumentace (doplnena diakritika, odstranene skryte znaky).

Provoz a bezpecnost:
- Nasadili jsme jednoducheho hlidace (monitoring): kazdych 15 minut kontroluje, ze sluzby bezi, web
  odpovida, je misto na disku a zalohy jsou cerstve. Pri problemu posle e-mail; rano chodi souhrn.
- Vznikl nastroj na rizeny offboarding zamestnance (viz nize "Co to znamena pro vas").
- Zprovoznili jsme bezpecny SSH pristup na server.

Priprava na migraci:
- Sepsali jsme postupy (runbooky): jak prestehovat cely system na vlastni server bez ztraty dat a jak
  nasazovat vlastni upravy kodu Huly. Najdes je v `docs/MIGRATION-RUNBOOK.md` a `docs/CUSTOM-BUILD.md`.

Co to znamena pro vas:
- Obchod: pouzivejte modul Lead jako hlavni prehled prilezitosti (funnel podle faze).
- Kde co patri: ukoly a kdo co dela -> Tracker; obchodni pipeline -> Lead; firmy a lide -> Contacts;
  evidence, rizika a faktury -> Cards (karty).
- Odchod zamestnance neresime mazanim v UI - reknete spravci, provede se rizeny offboarding
  (clovek hned ztrati pristup, 2 mesice je vratny, pak se ucet smaze, ale jeho prace zustane s
  oznacenim "byvaly zamestnanec").

Co bude nasledovat:
- Stehovani na vlastni firemni server (chysta se). Tam pribude lokalni AI asistent, video hovory
  (vlastni LiveKit) a dalsi prvky "mozku firmy".
- Dorovnani diakritiky u zbyvajicich dokumentu pri re-importu behem migrace.
