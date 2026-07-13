# Handover: Zprovoznění chatu v Huly — „Simon nevidí přímé zprávy"

**Datum diagnostiky:** 2026-07-08
**Datum nasazení + ověření:** 2026-07-13
**Autor:** Claude na zadání @stepanmanda
**Stav:** ✅ **VYŘEŠENO A OVĚŘENO V PRODUKCI** (Štěpán 2026-07-13: „Už to funguje, zprávu mojí vidí Simon i já.")
**Workspace:** `praut` (huly.praut.cz), verze 0.7.423

---

## Zadání
Štěpán: „Simonovi posílám přímé zprávy (DM) a on je nevidí. Zjisti proč a oprav chat."

## Root cause (potvrzeno)

V produkčním `compose.yml` **chyběly dvě služby**, které chatový modul potřebuje k tomu, aby
se zpráva u příjemce projevila (doručení do Inboxu, upozornění, real-time signalizace):

| Chybělo | Důsledek |
|---|---|
| služba **`notification`** (kontejner vůbec neběžel) | žádné web-push / e-mail upozornění na zprávy; `PUSH_PUBLIC_KEY` v `config.json` prázdný |
| **VAPID klíče** (`PUSH_PUBLIC_KEY` / `PUSH_PRIVATE_KEY` v `huly_v7.conf`) | bez nich se `notification` nedá nastartovat (známý bod #9 v `TROUBLESHOOTING_MATRIX.md`) |
| služba **`hulypulse`** (v compose zakomentovaná, nginx `location /_pulse` zakomentovaný) | žádná real-time presence („online" / „píše…") |
| propojení: transactor `PULSE_URL` + `WEB_PUSH_URL`, front `PULSE_URL` + `PUSH_PUBLIC_KEY` | i po nasazení služeb by je nikdo nevolal |

**Simonův účet ani server nebyly vadné.** Simon má 1 Person kartu, ověřený účet
`simon.brumla@gmail.com`, je členem kanálů, transactor nic neodmítal (0 chyb v logu).

## ⚠️ Oprava chybné mezi-diagnózy (důležité pro příště)

Během diagnostiky jsem naměřil „**0 DirectMessage v celém workspace**" a vyvodil z toho, že se
chat vůbec nepoužívá. **Bylo to špatně.** `chunter:class:DirectMessage` je v Huly **privátní
prostor viditelný jen svým členům** — admin účet, kterým se skript ptá, není členem cizích DM,
takže mu dotaz vrátí 0 bez ohledu na to, kolik jich reálně existuje.

**Poučení:** počty DM/zpráv se z admin session dotazovat nedá. Autoritativní zdroj je
**log transactoru** (`chunter:ids:DMNotification`), ne `findAll` přes admin klienta.

## Co bylo nasazeno (2026-07-13)

Skriptem `scripts/praut-enable-chat-services.sh --apply` (zálohy `*.bak-2026-07-13` na serveru):

1. Vygenerovány **VAPID klíče** (P-256, lokálně přes `node crypto`) → doplněny do `huly_v7.conf`
   (mimo git; hodnoty se netisknou do logu).
2. Nahrán `compose.yml` — přidány služby **`hulypulse`** (`:8099`, backend `memory`) a
   **`notification`** (`:8091`); transactoru přidáno `PULSE_URL` + `WEB_PUSH_URL`,
   frontu `PULSE_URL` + `PUSH_PUBLIC_KEY`.
3. Nahrán `.huly.nginx` — odkomentován `location /_pulse` (WebSocket proxy na `hulypulse:8099`).
4. `docker compose up -d hulypulse notification transactor front` → **`docker compose restart nginx`**.

## Ověření (důkazy)

| Kontrola | Výsledek |
|---|---|
| `docker ps` | `huly_v7-notification-1` Up, `huly_v7-hulypulse-1` Up |
| log `notification` | `Setting VAPID details` (publicKeyLen 87 / privateKeyLen 43), `Notification service listening port 8091` |
| log `hulypulse` | obsluhuje živé WS klienty, ukládá presence klíče (`contact:class:Person`) → nginx `/_pulse` proxuje správně |
| `config.json` | `PUSH_PUBLIC_KEY` neprázdný, `PULSE_URL=https://huly.praut.cz/_pulse` |
| log `transactor` (06:33–06:34) | `NotificationsHandler: processing inbox notifications … "chunter:ids:DMNotification"` → **DM zprávy i inbox notifikace se reálně vytvářejí** |
| uživatelský test | Štěpán poslal Simonovi zprávu — **vidí ji Simon i Štěpán** ✅ |

## Poznámky / co zůstává

- **`PRESENCE_URL` je prázdný — a je to správně.** Samostatná služba `presence` v této verzi Huly
  už neexistuje, presence převzal HulyPulse (potvrzeno: v jeho logu chodí přesně ty presence klíče).
  Legacy `PresenceClient` bez `PRESENCE_URL` jen tiše nic nedělá, nic to nerozbíjí.
- **E-mailová upozornění na DM jsou vypnutá** — transactor loguje
  `email provider not enabled for notification type: chunter:ids:DMNotification`.
  Web-push funguje. Pokud bude Štěpán chtít i e-maily, je to samostatná změna konfigurace.
- **Rollback:** na serveru v `/root/huly-selfhost` obnovit `*.bak-2026-07-13`, pak
  `docker compose up -d && docker compose restart nginx`.

## Vedlejší nález (samostatný, menší úkol)

Plošný sken našel **3 duplicitní identity**: `Švanda,Martin`, `Hoyer,René Samuel` (jedna karta bez účtu),
`Huf,Tomas`. Nesouvisí s chatem, ale stojí za úklid přes `tools/huly-admin/praut-merge-persons.cjs`
(nejdřív DRY-RUN, pak `--apply` po souhlasu).

## Nástroje vytvořené při řešení

- `tools/huly-admin/praut-diagnose-messaging.cjs` — read-only diagnostika identit / DM / notifikací,
  `--all` plošný sken duplicit. **Pozor na omezení popsané výše** (DM počty z admin session jsou nespolehlivé).
- `scripts/praut-enable-chat-services.sh` — bez argumentu = dry-run (záloha + diff + kontrola VAPID),
  `--apply` = plné nasazení + ověření.
