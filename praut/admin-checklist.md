# Admin checklist pro Praut

## Pred zmenami

- Spustit `scripts/praut-backup.sh`.
- Overit, ze existuje admin ucet.
- Overit aktualni verejnou URL a TLS rezim.
- Overit, jestli aktualni Huly image podporuje cestinu jako `DEFAULT_LANGUAGE=cs`; pokud ne, ponechat cesky obsah a UI brat jako fallback.

## Nastaveni workspace

- Nazev workspace: `Praut`.
- Pracovni tyden: pondeli az patek.
- Timezone: `Europe/Prague`.
- Mena: `CZK`.
- Verejne registrace vypnout az po vytvoreni admin uctu: `DISABLE_SIGNUP=true`.

## Opravneni

- Interni role vytvaret podle `workspace-blueprint.yaml`.
- Externista vidi pouze prirazene prostory, ukoly a dokumenty.
- Auditor ma pouze read-only rozsah.
- Finance, interni strategie, pristupy, API klice a naborove poznamky nejsou viditelne externistum.

## Import obsahu

- Vytvorit prostory.
- Vytvorit enumy a stitky.
- Vytvorit dashboardy.
- Zkopirovat sablony z `text-templates.md`.
- Vytvorit rizene dokumenty ze `standards.md`.
- Vytvorit onboardingy z `onboarding.md`.

## Smoke test

- Login admina.
- Navigace workspace.
- Vytvoreni karty.
- Vytvoreni dokumentu.
- Test omezenych opravneni externisty.
- Export backlogu.
- Zaloha konfigurace a dat.
