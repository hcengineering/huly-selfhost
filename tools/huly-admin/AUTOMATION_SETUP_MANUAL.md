# Automatizace — manuální nastavení (UI kroky)

7 alert-only pravidel z `praut_erp_docs/copy_paste_import/12-automation-rules.md`.
Nastavení vyžaduje admin session v Huly UI — nelze udělat skriptem.

**Klíčové pravidlo:** Každá automatizace smí POUZE posílat upozornění.
Nikdy nesmí sama: schvalovat, posílat klientům, měnit práva, mazat data.

## Přístup

`https://huly.praut.cz/workbench/praut` → levý panel → záložka **Automation**

## 7 pravidel k nastavení

### 1. Lead bez aktivity 7 dní
- **Trigger**: Lead/Poptávka — žádná nová aktivita 7 dní
- **Podmínka**: Stav ≠ `prevedeno`, `odmitnuto`, `archiv`
- **Akce**: Upozornit vlastníka leadu
- **Zodpovědná osoba**: Vlastník leadu

### 2. Nabídka ke schválení 48 hodin
- **Trigger**: Nabídka zůstane ve stavu `ke schvaleni` déle než 48 hodin
- **Podmínka**: Schvalovatel je vyplněný AND stav ≠ `odeslano`, `vyhrano`, `prohrano`
- **Akce**: Upozornit schvalovatele
- **Zodpovědná osoba**: Schvalovatel nabídky

### 3. SLA vyprší za 24 hodin
- **Trigger**: Zákaznický požadavek — SLA termín je do 24 hodin
- **Podmínka**: Stav ≠ `vyreseno`, `uzavreno`
- **Akce**: Upozornit řešitele
- **Zodpovědná osoba**: Řešitel požadavku

### 4. Karta bez vlastníka 24 hodin
- **Trigger**: Karta bez vlastníka existuje déle než 24 hodin
- **Podmínka**: Karta není archivovaná, uzavřená ani vyřazená
- **Akce**: Upozornit admina
- **Zodpovědná osoba**: Admin (stepan@praut.cz)

### 5. Projekt v riziku
- **Trigger**: Projekt přejde do stavu/health = `v riziku` nebo `cerveny`
- **Podmínka**: Stav projektu = `aktivni realizace` nebo `revize`
- **Akce**: Upozornit PM a vedení
- **Zodpovědná osoba**: PM projektu

### 6. Zakázka s obnovou do 30 dní
- **Trigger**: Zakázka má `datum obnovy` ≤ 30 dní od dneška
- **Podmínka**: Stav ≠ `archiv`, `dokonceno`
- **Akce**: Upozornit obchodníka/PM
- **Zodpovědná osoba**: PM zakázky
- **⚠️ Poznámka**: Pole `datum obnovy` je TypeString (ne TypeDate) — trigger může vyžadovat jiné nastavení

### 7. Incident klient v triage déle než 2 hodiny
- **Trigger**: Incident s dopadem `klient` zůstane ve stavu `triage` déle než 2 hodiny
- **Podmínka**: `dopad` = `klient` AND stav = `triage`
- **Akce**: Upozornit vedení
- **Zodpovědná osoba**: Vedení (stepan@praut.cz)

## Poznámka k SMTP

Upozornění e-mailem funguje až po nastavení SMTP/SES v `huly_v7.conf`.
Do té doby jsou upozornění jen **in-app notifikace** v Huly.
