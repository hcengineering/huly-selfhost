---
class: document:class:Document
title: "23. Prace s ukoly podukoly a prirazenim"
---
# 23. Prace s ukoly podukoly a prirazenim

**Oblast:** Zakazky, projekty a ukoly
## Ucel
Prace s ukoly podukoly a prirazenim popisuje, jak ma PRAUT pouzivat ERP/Huly v dane oblasti tak, aby byl proces dohledatelny, meritelny a prakticky pouzitelny. Dokument prevadi principy PRAUT na konkretni provozni pravidla: co evidovat, kdo za to odpovida, co smi delat system, kde muze pomoct AI a kde musi rozhodnout clovek.

## Kdo dokument pouziva
cely tym, PM, QA.

## Doporuceny objekt v Huly
Huly Tracker issue + sub-issue. Tracker je hlavni provozni prehled prace tymu.

## Povinna pole / atributy
- nazev
- popis
- projekt
- assignee
- collaborators
- priorita
- stitky
- termin
- odhad

## Stavovy proces
- Backlog
- Todo
- In Progress
- Review
- Blocked
- Done
- Cancelled

## Vazby na jine dokumenty a karty
- 22. Projektove rizeni v PRAUT
- 24. Stavove procesy ukolu
- 25. Milniky projektu
- 26. Planovani prace v osobnim planovaci
- 28. Casove odhady a casove reporty
- 65. GitHub integrace

## Prakticky postup
1. Kazdou praci pro konkretni osobu zaloz jako Tracker issue.
2. Vypln vlastnika/assignee, prioritu, termin nebo jasny duvod bez terminu, popis ocekavaneho vysledku a vazbu na klienta/projekt/dokument/Card.
3. Pokud jde o vyvoj, zaloz vetev a PR s issue key, napr. `TSK-2`, a vloz PR link zpet do issue.
4. Sub-issue pouzij jen kdyz cast prace ma samostatneho vlastnika, termin nebo kontrolu.
5. Stav udrzuj aktualni: `Blocked` musi obsahovat blokaci a dalsi krok; `Review` musi mit reviewera.
6. Cards pouzij az pro obchodni/provozni evidenci, reporting, riziko nebo fakturaci, ne misto issue.
7. Pri zmene s dopadem na klienta, cenu, termin, data, opravneni nebo reputaci vyzadej lidske schvaleni.
8. Po dokonceni uloz vysledek a odkazy do issue; pokud vzniklo rozhodnuti, zapiš ho i do dokumentu nebo relevantni karty.

## Automatizace
- Automaticky vytvorit navazujici ukol, upozorneni nebo checklist, pokud objekt prejde do stavu, ktery vyzaduje dalsi akci.
- Automaticky upozornit vlastnika, pokud chybi povinne pole, objekt nema vazbu nebo zustava dlouho ve stejnem stavu.
- Automaticky zahrnout objekt do reportingu, pokud ma prirazeny projekt, klienta, kampan, integraci nebo metriku.

## AI podpora a limity
- AI muze pripravit shrnuti, navrhnout vyplneni poli, rozpoznat chybejici informace, navrhnout dalsi krok nebo vytvorit koncept dokumentu.
- AI nesmi samostatne menit cenu, obchodni podminky, opravneni, stav rizikoveho incidentu, klientskou komunikaci ani finalni rozhodnuti.
- U citlivych dat musi byt AI vystup overen clovekem a musi zustat dohledatelne, z jakych vstupu vychazel.

## Lidska kontrola a schvalovani
Kriticke ukoly, blokace a finalni revizi kontroluje PM.

Povinne lidske schvaleni plati vzdy pro cenu, smluvni nebo obchodni zavazek, pravne citlivy text, reputacni riziko, externi sdileni, zmenu opravneni, incident s dopadem na klienta a AI vystup pouzity jako zaklad duleziteho rozhodnuti.

## Rizika a fallback
- Riziko: nevyplnena pole, chybejici vlastnik, izolovana informace bez vazeb, rozhodnuti ponechane pouze v chatu, neovereny AI vystup.
- Fallback: zastavit dalsi automaticky krok, zalozit eskalacni ukol, doplnit chybejici data a vyzadat potvrzeni vlastnika.
- Pokud je vstup nejasny nebo citlivy, system nesmi pokracovat bez cloveka.

## Metriky uspechu
- ukoly bez vlastnika
- blokovane ukoly
- issue bez terminu nebo bez duvodu bez terminu
- PR bez Huly issue key
- reopen rate
- prumerny cas dokonceni

## Zdrojove prepisy
- `13_1_bb3N2UT04.cs.txt` - Quick Tip - Add collaborators to issues. Spolupracovnici na issues a notifikace pri zmenach.
- `16_oUjfAh9p7cE.cs.txt` - New Release Action items Drive chat performance more. Release novinky: akcni polozky, Drive, chat, vykon, prejmenovani task na action item.
- `23_ljpz0bZ75JA.cs.txt` - How to track tasks with Huly Huly Tutorials. Task tracking: projekty, issues, priority, sub-issues, stavy, planovac, soukrome poznamky.
- `24_g2i_TL5r2k4.cs.txt` - How to get started with Huly Huly Tutorials. Getting started: workspace, projekty, pozvani clenu, issues, planovac, dokumenty, tymovy kalendar.

## Kriteria dokonceni
- Dokument ma vlastnika, stav, datum posledni revize a vazby na souvisejici objekty.
- Povinna pole jsou definovana a pouzitelna pro filtrovani nebo reporting.
- Je jasne, co dela system automaticky, co muze pripravit AI a co schvaluje clovek.
- Existuji metriky, podle kterych lze poznat, zda proces PRAUTu setri cas, snizuje chyby nebo zlepsuje rozhodovani.
