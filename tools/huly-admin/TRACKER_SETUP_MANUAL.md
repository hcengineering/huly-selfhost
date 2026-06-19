# Tracker — manuální nastavení (UI kroky)

Tracker je hlavní nástroj pro denní operativu týmu (interní tickety, projekty, GitHub propojení).
Toto nastavení nelze udělat skriptem — vyžaduje admin session v Huly UI.

## Přístup

`https://huly.praut.cz/workbench/praut` → levý panel → **Zakázky, projekty a úkoly** → **Tracker**

## Krok 1: Nastavit stavy projektu TSK

Výchozí projekt se jmenuje **Default** (identifier `TSK`).

1. Jdi do **Tracker** → vlevo nahoře klikni na název projektu (Default) → **Settings** (ikona ozubeného kola)
2. Záložka **Issue statuses**
3. Přidej nebo ověř tyto stavy v tomto pořadí:

| Název | Kategorie | Pořadí |
|---|---|---|
| Backlog | Backlog | 1 |
| Todo | Unstarted | 2 |
| In Progress | Started | 3 |
| Review | Started | 4 |
| Blocked | Blocked | 5 |
| Done | Won | 6 |
| Cancelled | Cancelled | 7 |

Kategorie zadáš při vytváření/editaci stavu.

## Krok 2: Nastavit šablony issues

V Settings projektu TSK → záložka **Templates** → **+ New template** pro každou:

| Šablona | Popis | Výchozí assignee | Výchozí priorita |
|---|---|---|---|
| Feature | Nová funkce nebo produkt | — | Medium |
| Bug | Oprava chyby | — | High |
| Client request | Požadavek klienta | — | Medium |
| Sales follow-up | Obchodní follow-up | stepan@praut.cz | Medium |
| Review/QA | Review nebo testování | — | Medium |
| Ops/Admin | Provozní a administrativní | — | Low |

## Krok 3: GitHub propojení (konvence — zatím manuálně)

Dokud není GitHub integrace zapnutá, dodrž ručně:

- **Branch name**: `TSK-<číslo>-kratky-popis` (např. `TSK-42-fix-invoice-email`)
- **PR title**: `[TSK-42] Co jsem změnil` (max 72 znaků)
- Do Huly issue **vlož link na PR** do pole nebo komentáře

Integrace GitHub se zapíná přes **Settings → Integrations** v Huly (potřeba GitHub App).

## Krok 4: Ověření

Vytvoř testovací issue `[TEST] Setup ověřen` v Trackeru:
- Stav: `In Progress`
- Přesuň na `Done`
- Smaž

Tím ověříš, že stavy fungují správně.
