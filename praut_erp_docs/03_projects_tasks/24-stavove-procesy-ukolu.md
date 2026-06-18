# 24. Stavove procesy ukolu

**Oblast:** Zakazky, projekty a ukoly
**Soubor:** `03_projects_tasks/24-stavove-procesy-ukolu.md`

## Ucel
Stavove procesy ukolu popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
PM, tym, admin.

## Doporuceny objekt v Huly
nastaveni Tracker workflow + pravidlovy dokument.

## Povinna pole / atributy
- stav
- kategorie
- vstupni kriterium
- vystupni kriterium
- odpovedna role

## Stavovy proces
- navrh
- schvaleno
- aktivni
- zmeneno

## Vazby na jine dokumenty a karty
- 23. Prace s ukoly podukoly a prirazenim
- 28. Casove odhady a casove reporty
- 30. Kontrola dokonceni zakazky
- 65. GitHub integrace
- 67. Sablony ukolu a tiketu

## Prakticky postup
1. V hlavnim pracovnim Tracker projektu nastav stavy `Backlog`, `Todo`, `In Progress`, `Review`, `Blocked`, `Done`, `Cancelled`.
2. `Backlog` pouzij pro neschvalenou nebo neupresnenou praci; `Todo` pro praci pripravenou k reseni.
3. `In Progress` znamena, ze na issue nekdo aktivne pracuje.
4. `Review` znamena, ze vystup ceka na kontrolu, QA, klientskou kontrolu nebo GitHub review.
5. `Blocked` musi mit popis blokace, vlastnika odblokovani a dalsi krok.
6. `Done` vyzaduje vysledek, odkaz na vystup a uzavrene navazne PR nebo jasny duvod, proc PR nebylo potreba.
7. `Cancelled` vyzaduje duvod zruseni.
8. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Stavy `Review`, `Blocked`, `Cancelled` a `Done` u kritickych ukolu vyzaduji lidskou kontrolu.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- stari ve stavu
- WIP
- blokace
- preskocene revize

## Zdrojove prepisy
- `18_LipguTf1ifo.cs.txt` - How to integrate GitHub with Huly Huly Tutorials. GitHub integrace: authorization, repo-projekt mapovani, issue/PR sync, sablony, notifikace a diff.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `10_WKmpm0ms_Sg.cs.txt` - Huly Open-source replacement for Linear Jira Slack Notion. All-in-one Huly: tracker, projekty, HR, kontakty, dokumenty, chat, virtualni kancelar, inbox, Telegram.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.
