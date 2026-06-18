# Operativni model Huly Tracker + GitHub

Tento dokument je aktualni zjednodusene pravidlo pro denni provoz tymu. Nerusi Cards model pro CRM, reporting, rizika a fakturaci, ale urcuje, kde se ridi bezna prace.

## Zdroj pravdy

- `Tracker Issue` = prace, odpovednost, termin, priorita a stav.
- `GitHub PR` = kodova zmena, review a historie zmen ke konkretni issue.
- `Contacts Company` = klient, firma nebo organizace.
- `Documents` = pravidla, rozhodnuti, navody a delsi text.
- `Cards` = strukturovana obchodni/provozni evidence, reporting, rizika a fakturace. Cards nejsou hlavni misto pro denni koordinaci ukolu.

## Zakladni pravidlo

Vse, co ma nekdo udelat, musi byt Huly Tracker issue. Chat, dokument, zapis ze schuzky, karta ani GitHub PR nenahrazuji vlastni issue, pokud z nich plyne prace pro konkretni osobu.

## Novy klient nebo projektovy vstup

1. Over nebo zaloz firmu v `Contacts -> Companies`.
2. Zaloz Tracker issue s vlastnikem, prioritou, terminem nebo jasnym duvodem bez terminu a popisem dalsiho kroku.
3. Pokud jde o obchodni pipeline, reporting, riziko nebo fakturaci, zaloz nebo dopln odpovidajici Card.
4. Nezakladej duplicitni `Cards -> Firma`; firma pro novy CRM workflow patri do Contacts.

## Tymove minimum v Trackeru

Pouzivej tyto stavy:

- `Backlog`
- `Todo`
- `In Progress`
- `Review`
- `Blocked`
- `Done`
- `Cancelled`

Kazda aktivni issue musi mit:

- owner/assignee,
- prioritu,
- termin nebo jasny duvod, proc termin nema,
- popis ocekavaneho vysledku,
- vazbu na klienta, projekt, dokument, Card nebo GitHub PR, pokud existuje.

## Sablony issue

Minimalni sada sablon:

- `Feature`
- `Bug`
- `Client request`
- `Sales follow-up`
- `Review/QA`
- `Ops/Admin`

## GitHub konvence

- Kazda vyvojova vetev a PR obsahuje Huly issue key, napr. `TSK-2`.
- PR title ma tvar `[TSK-2] kratky popis`.
- Huly issue ma odkaz na PR.
- PR bez Huly issue je vyjimka a issue se musi dopsat zpetne.

## Fallback bez integrace

Pokud Huly GitHub integrace neni zapnuta nebo nefunguje, staci rucni odkaz na PR vlozeny do Huly issue. Integrace je navazny ukol, ne blokace jednoducheho provozu.

## Pred live zmenami

Pred zmenou produkcniho Huly nastaveni obnov SSH pristup, spust cerstvou zalohu a zkontroluj, ze existuje pouzitelny rollback. Bez toho se meni pouze dokumentace a navody.
