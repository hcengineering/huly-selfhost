# Vlna 2 — nálezy diagnostiky (T03, T04, T13, T14)

> Read-only diagnostika 2026-07-02. Prod zásahy (archiv, sloučení) čekají na souhlas Štěpána.

## T03 — Tracker hygiena
**Stav lepší, než čekáno:** 0 otevřených úkolů bez vlastníka napříč všemi projekty.
- **PULS:** 4 otevřené (všechny mají vlastníka).
- **DASTA_PREVOD:** 1 otevřený z 34 (33 hotových) → **kandidát na archivaci projektu**.
- **Default:** 3 otevřené (mají vlastníka) — reálné úkoly, ponechat.

**Akce k souhlasu:** archivovat DASTA_PREVOD (dořešit/zavřít 1 zbylý úkol), pravidlo „In Progress = má vlastníka" zapsat do dokumentace. Žádné hromadné přiřazování vlastníků není potřeba.

## T04 — HR oddělení
**Potvrzená duplicita:** „Vývojové oddělení" a „IT development" mají **identické 4 členy** i vedoucího (Martin Švanda) → jedno je nadbytečné.
- Ostatní: „Designové oddělení" (1), „Marketingové oddělení" (1), kořen „PRAUT" (vedoucí Štěpán).
- **Glitch:** kořen „PRAUT" má v poli členů **duplicitní záznamy** (několik osob 2×) → vyčistit na unikátní seznam aktivních.

**Akce k souhlasu:** sloučit „IT development" do „Vývojové oddělení" (nebo naopak — Štěpán vybere název), druhé smazat; deduplikovat členy kořene „PRAUT" a odebrat neaktivní.

## T13 — Alert pravidla (procesy)
**Běží 4 procesy** (autoStart=true): Nabídka uvízla ve schvalování · Lead bez aktivity 7 dní · SLA požadavku do 24 h · Zakázka v riziku.
- Zbylé 3 z manuálu (Incident 2 h, Zakázka obnova 30 dní, Karta bez vlastníka) jsou **záměrně nerealizované** — Huly neumí hodinové offsety a některá pole jsou text místo Date/Ref (viz `tools/huly-admin/README.md` sekce „Nerealizováno"). **Čekají na úpravu kódu (nový server, T22)**, nejde o chybějící konfiguraci.

**Akce:** ověřit doručení alertu (vytvořit testovací entitu splňující podmínku, ověřit, že upozornění dorazí; testovací data pak smazat) — vyžaduje zápis do prod, k souhlasu. Doručení dnes míří na účet Praut Admin (pole „schvalovatel" je text, ne odkaz na uživatele).

## T14 — GitHub integrace
**Funguje na úrovni App:** instalace App = 1, viditelných repozitářů = 44, napojené projekty = 2 (PULS ↔ repo, DASTA_PREVOD ↔ repo; navíc huly-selfhost a puls-akademie mapované).
- „Účty: 0" = jednotliví vývojáři si nepropojili **osobní** GitHub účty (pro atribuci commitů) — **nepovinné**, integrace i bez toho syncuje.

**Akce (bez prod zápisu):** zdokumentovat workflow PR↔úkol do návodu pro vývojáře (doplněno do role návodu T09 / lze rozšířit). Volitelně: vývojáři si propojí účty v Nastavení → Integrace → GitHub.

---

## Souhrn: co čeká na souhlas Štěpána (prod zápisy)
1. **T03** archivovat projekt DASTA_PREVOD (33/34 hotovo).
2. **T04** sloučit „IT development" + „Vývojové oddělení", deduplikovat členy kořene „PRAUT".
3. **T13** test doručení alertu (dočasná testovací entita, pak smazat).

Vše ostatní ve vlně 2 jsou dokumenty (nízké riziko) — generují se skripty `praut-mgmt-docs.cjs` (T07/T08/T11)
a SOP dokumenty (T18), plus repo změny (AGENTS.md T19, deník+CHANGELOG T17).
