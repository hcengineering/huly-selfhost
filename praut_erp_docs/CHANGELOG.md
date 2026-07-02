# CHANGELOG — PRAUT Huly

Přehled produkčních změn. Novější nahoře. Detaily v PR (číslo v závorce), rozhodnutí v
`HULY_DECISIONS_AND_DEVIATIONS.md`. Formát: datum — změna (PR).

> Pravidlo: každá produkční změna = nový řádek sem (viz `../AGENTS.md`).

## 2026-07 — Roadmapa vylepšení (audit + vlna 1)
- 2026-07-02 — Kompletní audit ERP + roadmapa 22 úkolů pro agenty: `docs/improvements/ROADMAP-2026-07.md` (#27, otevřený).
- 2026-07-02 — Záchrana admin skriptů `praut-merge-persons` + `praut-create-relations` na main (#28).
- 2026-07-02 — Spec „výběr PRAUT role při pozvánce" na main (#29).
- 2026-07-02 — Nové nástroje pro tým: týdenní report, návody per role, oživení denního kanálu (#30).
- 2026-07-02 — Bezpečnostní sken: gitleaks allowlist, repo čistý; nálezy T20 (#31).
- 2026-07-02 — **Aplikováno do produkce:** 4 návody per role, kanál `#praut-denni-prehled` (1→9 členů + ritual), první týdenní přehled.
- 2026-07-02 — Oprava přihlášení René (sloučení duplicitní osoby + přepojení social identit; „Confirmed social identity is attached to the wrong person").

## 2026-06-25 — Vlna vylepšení (přístupy, offboarding, migrace)
- Rychlý start pro tým — dokument v Huly (#25).
- Onboarding podle role: obchodník/vývojář/markeťák/vedení (#24).
- Oddělení obchodních dat jen pro vedení — privátní CardSpace „Obchod" (#23).
- Týmové shrnutí + audit dokumentace (#22).
- Offboarding zaměstnanců: okamžitá deaktivace + příprava 2měsíčního výmazu (#21).
- Migrační runbook + runbook pro vlastní build (#20).
- Očista názvů sekcí dokumentace + archiv prázdného funnelu (#19).
- Počeštění stupňů Lead funnelu (#18).
- Oprava chybových ikonek u symetrických vztahů (#17).

## 2026-06-23 — Provozní služby
- Lehký health monitoring + e-mailové alerty (#15, nasazeno na server 2026-06-25).
- HulyPulse + web-push notifikace — config (#14, VAPID klíče až na serveru).
- SMTP mail service pro odchozí e-maily přes Postmark (#13).
- Reset hesla + vrácení uživatele do workspace (#12).
- Read-only diagnostika GitHub integrace (#11).

## 2026-06-22 — UX přestavba + GitHub
- Zjednodušení na 4-krokový workflow (Klient→Příležitost→Nabídka→Zakázka) (#9).
- Automatizační procesy — 3 alert pravidla přes API (#8).
- Zjednodušení workspace — návody 6→2, pryč DEMO karty (#7).
- GitHub integrace pro self-hosted Huly (#6, webhook fix #10).
- Kompletní UX přestavba workspace pro PRAUT (#5).

## 2026-06-18/19 — Základ
- Usability: DEMO karty, průvodce, typemapa, manuály (#4).
- Huly admin tooling přes oficiální API (#3).
- Ověřený živý audit Huly (#2).
- Sjednocení VPS + lokál do jednoho zdroje pravdy (#1).
