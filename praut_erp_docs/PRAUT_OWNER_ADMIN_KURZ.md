# PRAUT Owner/Admin kurz pro Huly

Strukturovany kurz pro vlastnika PRAUT workspace. Cilem je umet Huly pouzivat pro kazdodenni rizeni firmy, ne jen rozumet technickemu importu.

Aktualni scope:
- workspace `Praut` / `praut`,
- owner-ready provoz bez SMTP/SES,
- e-mailove pozvanky a alerty jsou odlozene,
- rizikove kroky musi potvrdit clovek.

## 0. Pred startem

Otevri:
- `https://huly.praut.cz/workbench/praut`
- `PRAUT_PROSTREDI.md`
- `copy_paste_import/09-cards-schema.md`
- `copy_paste_import/10-control-scenarios.md`
- `copy_paste_import/11-cards-setup-guide.md`
- `copy_paste_import/12-automation-rules.md`

Prakticky ukol:
- Prihlas se jako owner a over, ze vidis workspace `Praut`.
- Over, ze ve workspace nepracujes omylem ve `VELYOS` nebo `sudety`.

## 1. Mental model Huly

Zakladni pojmy:
- Workspace je cela firemni instalace pro jednu organizaci nebo tym.
- Teamspace je oblast prace, napr. obchod, projekty nebo reporting.
- Dokument je znalost, proces, navod nebo dlouhodoby zaznam.
- Card je strukturovany firemni objekt, napr. Firma, Zakazka, Faktura nebo Incident.
- Task je konkretni prace s vlastnikem a terminem.
- Chat je komunikace, ne finalni evidence rozhodnuti.

Pravidlo:
- Co ma dopad na klienta, penize, pravo, pristupy, termin nebo odpovednost, nesmi zustat jen v chatu.

Prakticky ukol:
- Najdi jeden dokument v kazdem z 8 teamspace.
- Najdi jednu `TEST - <typ>` kartu.
- Vysvetli, kdy bys pouzil dokument a kdy Card.

## 2. Mapa PRAUT prostredi

PRAUT ma 8 oblasti:
- `Zaklad systemu`
- `Obchod a CRM`
- `Zakazky, projekty a ukoly`
- `Dokumenty a znalostni baze`
- `Komunikace a spoluprace`
- `Marketing a zakaznicka pece`
- `Automatizace, AI a integrace`
- `Rizeni firmy a reporting`

Pravidlo:
- Obchod patri do `Obchod a CRM`.
- Realizace, milniky, predani a faktury patri k zakazkam/projektum.
- Incidenty, AI, integrace a change requesty patri do rizene provozni evidence.
- KPI, rizika a audit patri do reportingu.

Prakticky ukol:
- Otevri `PRAUT_PROSTREDI.md`.
- Ke kazde oblasti rekni jeden priklad realne firemni informace, ktera tam patri.

## 3. Cards typy a procesy

Importovano je 22 Cards typu:
- Firma
- Kontakt
- Lead/Poptavka
- Obchodni prilezitost
- Nabidka
- Zakazka
- Faktura
- Projekt
- Milnik
- Predani
- Zapis ze schuzky
- Kampan
- Obsahova polozka
- Zakaznicky pozadavek
- Znalostni clanek
- Automatizace
- AI funkce
- Integrace
- Incident
- Change request
- Riziko
- KPI

Povinne provozni minimum pro prvni vlnu:
- Firma se pro novy CRM workflow zaklada v Contacts -> Companies. Cards -> Firma zustava jen legacy/test typ.
- Kontakt musi mit jmeno, firmu, roli nebo email, GDPR souhlas, vlastnika.
- Lead/Poptavka musi mit firmu vybranou z Contacts -> Companies, kontakt, potrebu, prioritu, stav a dalsi krok.
- Obchodni prilezitost musi mit fazi, hodnotu, pravdepodobnost, ocekavane uzavreni, riziko a vlastnika.
- Nabidka musi mit klienta, prilezitost, rozsah, cenu, platnost, verzi, schvalovatele a stav.
- Zakazka musi mit klienta, nabidku, PM, start, cilovy termin, typ spoluprace, health a stav.
- Faktura musi mit cislo faktury, zakazku, klienta, vyse, datum vystaveni, datum splatnosti, stav a vlastnika.
- Projekt musi mit zakazku, PM, fazi, deadline, blokery/rizika podle potreby.
- Zakaznicky pozadavek musi mit klienta, kontakt, typ, prioritu, SLA, vlastnika, stav a dopad.

Poznamka:
- Pokud Huly UI neumi technicky vynutit required pole pro konkretni typ pole, nastav pole jako viditelne a provozne povinne v popisu typu. Validace se pak dela pres pohled `Bez vlastnika`, ritual kontroly a owner review.

Prakticky ukol:
- Otevri `Settings -> TYPES`.
- U prvnich 9 typu over, ktera pole jsou technicky required a ktera jsou zatim jen provozne required.
- Vysledek zapis do `HULY_VALIDATION_LOG.md`.

## 4. Povinne Cards pohledy

Vytvor nebo over techto 6 pohledu:
- `Aktivni`
- `Bez vlastnika`
- `Ke schvaleni`
- `Riziko`
- `Obnovy do 60 dni`
- `Moje`

Doporucene filtry:
- `Aktivni`: stav neni archiv, uzavreno, dokonceno, prohrano, odmitnuto ani vyrazeno.
- `Bez vlastnika`: chybi vlastnik, PM, resitel, kontrolor nebo schvalovatel podle typu.
- `Ke schvaleni`: stav nebo faze obsahuje `ke schvaleni`, `interni kontrola`, `kontrola`, `klientske schvaleni`, `schvaleno` cekajici na cloveka.
- `Riziko`: riziko vysoke, health rizikove, dopad klient, citlivost vysoka nebo stav v riziku.
- `Obnovy do 60 dni`: `Zakazka` s `datum obnovy` v pristich 60 dnech a stav neni archiv ani dokonceno.
- `Moje`: aktualni uzivatel je vlastnik, PM, resitel, assignee, kontrolor nebo schvalovatel.

Prakticky ukol:
- Vytvor testovaci kartu s prefixem `DEMO -` pro kazdy relevantni pohled.
- Over, ze se objevi ve spravnem pohledu.
- Po testu ji archivuj nebo oznac jako skolici vzorek.

## 5. Kazdodenni rizeni firmy

Denne kontroluj:
- `Bez vlastnika`
- `Ke schvaleni`
- `Riziko`
- nove Lead/Poptavky
- Zakaznicke pozadavky s blizicim se SLA

Tydne kontroluj:
- obchodni pipeline,
- zakazky a projekty v riziku,
- faktury po splatnosti,
- obnovy do 60 dni,
- KPI a reporty.

Mesicne kontroluj:
- rizikovy registr,
- zastarale znalostni clanky,
- automatizace a AI funkce,
- prava uzivatelu,
- zalohy a restore evidence.

Prakticky ukol:
- Projdi vsech 6 povinnych pohledu.
- Vyber jednu kartu a urci dalsi konkretni krok, vlastnika a termin.

## 6. Pravidla zapisu

Do Cards zapisuj:
- klienty, kontakty, leady, nabidky, zakazky, faktury,
- rozhodnuti, rizika, incidenty, change requesty,
- odpovednosti, terminy, SLA, schvaleni a stav.

Do dokumentu zapisuj:
- pravidla, navody, procesy, znalostni clanky, sablony,
- dlouhodobe platne rozhodnuti a vysvetleni.

Do chatu patri:
- rychla koordinace,
- dotazy,
- upozorneni.

Do chatu nepatri jako jedine misto:
- schvaleni ceny,
- klientsky slib,
- zmena pristupu,
- incident,
- fakturacni rozhodnuti,
- AI vystup pouzity bez kontroly.

Prakticky ukol:
- Najdi posledni dulezitou informaci v chatu nebo poznamkach.
- Preved ji do dokumentu, Card nebo tasku.

## 7. Admin rezim

Owner/admin zodpovida za:
- uzivatele a role,
- pozvanky,
- public signup,
- povinna pole,
- ulozene pohledy,
- pravidelny backup,
- audit pristupu,
- schvaleni integraci.

Aktualni provozni nastaveni:
- public signup ma zustat vypnuty,
- `kvs` ma zustat jen na `127.0.0.1:8094`,
- SMTP/SES neni nakonfigurovane,
- invite e-maily nejsou validovane,
- alert-only automatizace nejsou zapnute.

Prakticky ukol:
- Over v admin UI seznam uzivatelu.
- Over, kdo je owner.
- Neposilej realne pozvanky e-mailem, dokud neni hotovy SMTP/SES test.

## 8. Provoz, zalohy a bezpecne zmeny

Pred vetsim zasahem:
- spust novou zalohu,
- zapis duvod zmeny,
- over, ze pracujes ve workspace `Praut`,
- nemen `VELYOS` ani `sudety`,
- po zmene zapis vysledek do validacniho logu.

Technicky health check na VPS:

```bash
cd /root/huly-selfhost
docker compose ps
curl -I https://huly.praut.cz
curl -I https://huly.praut.cz/workbench/praut
docker compose exec -T front env | grep '^DISABLE_SIGNUP=true$'
docker compose exec -T account env | grep '^DISABLE_SIGNUP=true$'
docker compose port kvs 8094
```

Backup:

```bash
cd /root/huly-selfhost
scripts/praut-backup.sh
```

Restore smoke:

```bash
cd /root/huly-selfhost
scripts/praut-restore-smoke.sh /root/huly-selfhost/backup-praut/<STAMP>
```

Prakticky ukol:
- Najdi posledni restore-smoke PASS.
- Zapis, jaky backup bys pouzil jako rollback point.

## 9. Owner-ready kontrolni scenare

Projdi na demo datech prefixovanych `DEMO -`:
- Lead -> Obchodni prilezitost -> Nabidka -> Zakazka -> Faktura -> Projekt.
- Zakaznicky pozadavek -> Incident -> Znalostni clanek.
- Zapis ze schuzky -> rozhodnuti -> task -> casovy report.
- Zakazka s obnovou do 60 dni a do 30 dni.

U kazdeho scenare over:
- karta ma vlastnika,
- rizikovy krok vyzaduje cloveka,
- dulezite rozhodnuti neni jen v chatu,
- vazby vedou na spravne objekty,
- karta se objevi ve spravnem pohledu.

Prakticky ukol:
- Vypln vysledek do `HULY_VALIDATION_LOG.md`.
- Demo karty po validaci archivuj nebo ponech jako skolici vzorky podle dohody s ownerem.

## 10. Co zatim neblokuje start

Owner-ready provoz muze zacit bez:
- SMTP/SES,
- e-mail alertu,
- plne automatizace,
- SSO/OIDC,
- produkcniho monitoringu.

Podminky:
- pozvanky se resi manualne pres invite link nebo administrativne,
- alerty nahrazuji ulozene pohledy a denni/tydenni ritual,
- rizikove kroky potvrzuje clovek,
- zmeny se delaji az po zaloze,
- owner vi, ktere casti jsou manualni.

## 11. Co pred ostrym provozem dodelat

Must-have pred plnym provozem:
- nove overit pristup na VPS,
- spustit a zapsat cerstvou zalohu,
- overit cron nebo zavest pravidelny backup schedule,
- nastavit 6 Cards pohledu,
- overit required-field enforcement u prvni vlny,
- vyresit `Untitled` dokument bez mazani: prejmenovat, presunout nebo archivovat,
- projit owner-ready scenare,
- rozhodnout, zda `DEMO -` a `TEST -` karty zustanou jako skolici vzorky.

Nice-to-have dalsi faze:
- SMTP/SES,
- invite e-mail flow,
- alert-only automatizace,
- SSO/OIDC,
- monitoring,
- pravidelny restore drill.
