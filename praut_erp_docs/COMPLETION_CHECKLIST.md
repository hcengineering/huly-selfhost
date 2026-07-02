# Completion checklist — zdravý živý workspace Huly PRAUT

Co má obsahovat **hotový, produkčně nasazený** workspace `praut`, a jak to **read-only** ověřit.
Slouží k odškrtnutí po rebuildu/migraci a jako periodická kontrola. Konsoliduje
`PRAUT_OPERATIONS_RUNBOOK.md`, `tools/huly-admin/README.md` a provozní memories.

> Čísla odpovídají ověřenému stavu z admin README a operations runbooku (ROADMAP-2026-07 dosud
> není v repu — zapiš aktuální stav do `HULY_VALIDATION_LOG.md` při každé validaci).
> Ověřování dělej **read-only** — skripty bez `--apply`, `docker compose … ps/logs/exec … env`.

---

## 1. Prostory (spaces) — model „sdílený + privátní ostrovy"

- [ ] **Sdílený dokumentový teamspace** `Firemní dokumentace HULY` — private, `autoJoin=true`,
      všichni aktivní členové; necitlivé oblasti (Základ systému, Zakázky/projekty/úkoly, Dokumenty
      a znalostní báze, Komunikace, Automatizace).
- [ ] **Privátní prostory vedení** (private, jen vedení): `Vedení`, `Řízení a reporting`,
      `Obchodní dokumenty`, `Marketing`, `Obchod` (CardSpace `card:space:PrautObchod`).
- [ ] **Projektové trackery** (private, jen lidé na projektu): `PULS`, `DASTA_PREVOD`, `MontexBAU`.
- [ ] **8 dokumentových teamspaců** aktivních, **80 dokumentů** s content refs, bez duplicitních titulků.
- [ ] Importní titulky **nejsou** ve `VELYOS` ani `sudety`.

Ověření (read-only):

```bash
node praut-spaces-list.cjs        # názvy, třída, private/archived, _id všech prostorů
```

> Pozn.: `MontexBAU` nemá člena admina → adminovi/skriptům je neviditelný (správně). Model přístupu:
> viditelnost = `space.members` + `space.private`. Memory `huly-access-model`.

---

## 2. Typy karet (card types) — zjednodušeno 22 → 8

- [ ] Aktivních **8 workflow typů:** `Firma`, `Kontakt`, `Příležitost`, `Nabídka`, `Zakázka`,
      `Projekt`, `Schůzka`, `Faktura`.
- [ ] Zbylých 14 typů **skryto** (`removed=true`, vratné přes `praut-hide-types.cjs --restore`) — karty
      se nemažou.
- [ ] Ke každému (dříve) typu existuje jedna `TEST - <typ>` karta (kontrolní vzorek).
- [ ] DEMO karty **smazané** (workspace ukazuje jen reálná data).

---

## 3. Automatizační procesy (alert-only) — 4 běží, 3 odloženy limity Huly

- [ ] **4 běžící procesy** (plugin „Process", akce = in-app upozornění adminovi):
  - Nabídka uvízla ve schvalování (stav=ke schvaleni → +2 dny) — pilot (UI)
  - Lead bez aktivity 7 dní (+7 dní od startu) — API
  - SLA požadavku do 24 h (+1 den) — API
  - Zakázka v riziku (health=v riziku → ihned) — API
- [ ] **3 záměrně odloženy (limit Huly):**
  - Incident v triage 2 h — Huly neumí **hodinové** offsety (jen dny/týdny/měsíce)
  - Zakázka obnova 30 dní — pole „datum obnovy" je **text**, ne Date → offset nelze
  - Projekt v riziku — typ Projekt nemá rizikové pole
- [ ] Směr automatizace = **jen alert**, bez auto-schvalování / auto-odesílání klientům / změn oprávnění.

> Detail nastavení: `tools/huly-admin/AUTOMATION_SETUP_MANUAL.md`, `README.md`.

---

## 4. Lead funnel (pipeline) — české stavy

- [ ] Lead funnel `Potencionální zákazník` (`6a3abfafb0b5c36dec2898f8`) je **private** (vedení).
- [ ] Stavy přejmenované do češtiny (1:1, beze změny pořadí):
      **Kvalifikace → Vyjednávání → Příprava nabídky → Vyhráno → Prohráno**.
- [ ] Kontrolní průchod: Lead → příležitost → nabídka (se schválením) → zakázka → faktura → projekt.

> Skript `praut-lead-setup.cjs` (přejmenování stavů). Nabídka nesmí být odesílatelná bez schvalovatele;
> faktura/upomínka/storno vyžadují člověka.

---

## 5. Uložené pohledy (FilteredView)

- [ ] Sada pohledů s emoji: 🏢 Klienti, 🤝 Aktivní příležitosti, 📅 Záznamy, ⭐ Ke schválení,
      📦 Aktivní, 🔴 V riziku, 💰 Po splatnosti (`praut-build-views.cjs`, idempotentní).

> Nedotažené pohledy (vyžadují změnu datového modelu na `RefTo:Member` / `TypeDate`): „Bez vlastníka",
> „Moje", „Obnovy do 60 dní" — viz `README.md`.

---

## 6. Zálohy a monitoring

- [ ] **Denní záloha 02:30** Europe/Prague (cron), retence 14 dní; zálohy obsahují adresář
      `cockroachdb/` (ne legacy `.sql.gz`) + `minio-data/` + `huly_v7.conf` + compose/nginx.
- [ ] **Healthcheck cron** každých 15 min (alert jen při chybě) + denní 08:00 souhrn.
- [ ] Existuje **restore-tested** backup s výsledkem `PASS` v `HULY_VALIDATION_LOG.md`.

Ověření:

```bash
crontab -l                                   # řádky 02:30 backup + */15 healthcheck + 08:00 daily
systemctl list-timers --all | grep -i praut  # alternativně timery
scripts/praut-healthcheck.sh --dry-run       # služby + HTTP 200 + disk + stáří zálohy
ls backup-praut/scheduled/                   # čerstvé denní zálohy
```

Cron šablona: `ops/praut-root.crontab` (nasadí se `crontab ops/praut-root.crontab`, uprav `ALERT_EMAIL_TO`).

---

## 7. Bezpečnostní invarianty

- [ ] `DISABLE_SIGNUP=true` na **front i account** (vypnutá veřejná registrace).
- [ ] `kvs` publikovaný jen na `127.0.0.1:8094` (ne `0.0.0.0`).
- [ ] Z internetu jen porty `80`/`443`; vnitřní služby nedostupné veřejně.
- [ ] Žádné secrets v gitu (`gitleaks detect` zelený — viz `docs/improvements/T20-security-findings.md`).

Ověření:

```bash
docker compose exec -T front env   | grep '^DISABLE_SIGNUP=true$'
docker compose exec -T account env | grep '^DISABLE_SIGNUP=true$'
docker compose port kvs 8094       # 127.0.0.1:8094
```

---

## 8. Služby běží

- [ ] `docker compose ps` — všechny klíčové služby ve stavu **Up/running**:
      `nginx cockroach redpanda minio elastic transactor account front fulltext stats kvs`
      (+ `collaborator rekoni hulypulse notification mail`, volitelně `github`).
- [ ] Web `https://huly.praut.cz` a `…/workbench/praut` bez 5xx.

---

## Otevřené / odložené (evidovat, ne blokovat)

- [ ] Plný **dropdown „PRAUT role" v pozvánce** (auto-přiřazení prostorů) — zatím jen spec
      `docs/specs/invite-with-praut-role.md`; realizace přes build pipeline na novém serveru
      (`docs/CUSTOM-BUILD.md`). Do té doby onboarding skriptem `praut-onboard-user.cjs --role`.
- [ ] **GitHub per-user OAuth** (`GithubAuthentication`) — infrastruktura hotová, chybí account-link
      (memory `github-integration-state`).
- [ ] **Purge-sweep** offboardingu (>60 dní) — cron až na novém serveru.
- [ ] Rotace tokenů (Postmark, GitHub client secret) — `docs/improvements/T20-security-findings.md`.

> Každý průchod tímto checklistem zapiš do `HULY_VALIDATION_LOG.md` (datum + výsledek) a významné
> změny do `praut_erp_docs/CHANGELOG.md`.
