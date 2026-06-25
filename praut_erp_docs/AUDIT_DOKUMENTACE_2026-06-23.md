# Audit dokumentace PRAUT / Huly — 2026-06-23

Tento dokument odpovídá na otázku: **„Je někde popsané, jak byla platforma postavená a co děláme?"**
a navrhuje, jak v dokumentaci pokračovat.

## Krátká odpověď

Dokumentace **existuje a je rozsáhlá**, ale je rozdělená podle účelu:

- **Uvnitř Huly (huly.praut.cz):** ~80 byznys dokumentů + 14 zaměstnaneckých návodů v 8 teamspaces.
  Popisují **JAK se systém používá** (obchod, zakázky, podpora, marketing, reporting). Není to návod,
  „jak platformu postavit".
- **V git repu (`huly-selfhost/`):** popis **JAK byla platforma postavená a provozovaná** — deployment,
  architektura, migrace, runbooky, admin skripty a průběžný vývojový deník. Sem patří „co děláme".

Takže: pro netechnické uživatele je vše potřebné uvnitř Huly; pro znovupostavení/správu platformy je
zdroj pravdy **git repo**, ne Huly.

## Kde co je (inventura)

| Téma | Soubor / místo |
|---|---|
| Nasazení (Docker, nginx, služby, volumes) | `README.md`, `ARCHITECTURE_OVERVIEW.md` |
| Upgrade verzí, migrace Mongo→Cockroach | `MIGRATION.md` |
| Infrastruktura VPS (doména, SSH, zálohy) | `praut_erp_docs/HULY_VPS_POC_RUNBOOK.md` |
| Provoz živého workspace | `praut_erp_docs/PRAUT_OPERATIONS_RUNBOOK.md`, `docs/RUNBOOK-SERVER-DOWN.md` |
| Specifikace prostředí (8 spaces, 22 typů karet, procesy) | `praut_erp_docs/PRAUT_PROSTREDI.md` |
| Postup importu / nastavení | `praut_erp_docs/IMPORT_CHECKLIST.md`, `HULY_IMPORT_RUNBOOK.md` |
| Admin skripty (správa workspace přes API) | `tools/huly-admin/README.md` |
| Rozhodnutí a odchylky | `praut_erp_docs/HULY_DECISIONS_AND_DEVIATIONS.md` |
| Postup / stav prací | `praut_erp_docs/HULY_SETUP_PROGRESS.md`, `PRAUT_CONTINUITY_STATUS.md` |
| Vývojový deník (pro netechnické) | `praut_erp_docs/VYVOJOVY_DENIK.md` |
| Live audit stavu serveru | `praut_erp_docs/HULY_LIVE_AUDIT_2026-06-18.md` |
| Byznys dokumenty + návody (uvnitř Huly) | 8 teamspaces, start = teamspace **Zaklad systemu** → „HOME" |

## Co chybí (mezery)

**MUST (blokuje nového správce/operátora):**
1. **„Rebuild od nuly" SOP** — jeden souvislý postup od prázdného serveru po živý workspace
   (dnes je informace rozdrobená přes README + VPS runbook + import checklist + operations runbook).
2. **Completion-checklist živého workspace** — které ruční UI kroky jsou hotové a které zbývají
   (uložené pohledy, povinná pole, stavy Trackeru, automatizační pravidla, kontrolní scénáře).
3. **Troubleshooting matrix** — „workspace je pomalý / karty se neukládají / hledání nenajde / uživatel
   zamčený / kontejner se restartuje" s postupem diagnostiky.
4. **SOP pro uživatele a přístupy** — jak založit účet, poslat pozvánku, ověřit e-mail, přidělit roli,
   dát přístup do teamspace.

**SHOULD (pomáhá pochopit záměr):**
5. **Byznys strategie / vize ERP** — proč ta struktura existuje, co je povinné vs. volitelné, co je úspěch.
6. **Stav integrací** — GitHub, Gmail, Calendar, Telegram, LiveKit, AI: zapnuto/vypnuto, kde je config.
7. **Bezpečnost a compliance** — politika hesel, audit log, GDPR, retence dat.
8. **Kapacitní limity** — kolik uživatelů/karet/spojení systém unese.

**NICE:**
9. **Technical-debt log** — proč se některá rozhodnutí udělala, známá omezení.
10. **Change log** — datová řada změn struktury/modelu/automatizací (kdo/proč/kdy).

## Jak pokračovat (doporučené pořadí)

1. **Rebuild SOP** (mezera #1) — nejvyšší hodnota: bez něj nikdo platformu znovu nepostaví.
2. **Completion-checklist** (#2) — dotáhnout a zaznamenat zbývající ruční UI kroky.
3. **SOP uživatelé/přístupy** (#4) a **Troubleshooting matrix** (#3) — denní provoz.
4. Zbytek (strategie, integrace, bezpečnost, limity) podle potřeby.

Každý z těchto dokumentů je samostatná práce — řekni který chceš jako další a sepíšu ho.

## Co bylo uděláno dnes (2026-06-23)

- Opravena chyba slučování kontaktů „Nelze sloučit globální osoby" (směr slučování + filtr na zaměstnance);
  vznikl nástroj `tools/huly-admin/praut-merge-persons.cjs`.
- Vytvořeno 15 typů vztahů (Associations), aby šlo propojovat osoby/firmy/karty; nástroj
  `tools/huly-admin/praut-create-relations.cjs`. Detail viz `VYVOJOVY_DENIK.md` (2026-06-23).
