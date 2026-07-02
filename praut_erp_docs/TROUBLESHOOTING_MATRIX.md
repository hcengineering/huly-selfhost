# Troubleshooting matrix — Huly PRAUT

Rychlá tabulka **symptom → příčina → fix** pro provoz `huly.praut.cz` (workspace `praut`).
Konsoliduje řešené případy z provozních memories, admin README a runbooků. Pro širší diagnostiku
výpadku viz `docs/RUNBOOK-SERVER-DOWN.md`, pro provoz `PRAUT_OPERATIONS_RUNBOOK.md`.

> Skripty se spouští z `HulyPrautplatform/dev/import-tool/` s `NODE_PATH` (viz
> `SOP_UZIVATELE_A_PRISTUPY.md`). Vždy nejdřív DRY-RUN, pak `--apply`.

## Matice

| # | Symptom | Příčina | Fix |
|---|---|---|---|
| 1 | **502** nebo v prohlížeči `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` (login/API); backend přitom běží (`account: server started`) | Po `docker compose up -d` dostaly backend služby nové IP v Docker síti; Docker `nginx` resolvuje `proxy_pass` hostnames jen při startu a drží **starou IP** → vrací HTML 502 tam, kde klient čeká JSON | `docker compose restart nginx` (re-resolve IP). **Dělej to VŽDY po každém `up -d`.** Memory `huly-deploy-nginx-stale-ip` |
| 2 | **GitHub webhook vrací 404** (`POST /_github/api/webhook`), ostatní služby OK | V `.huly.nginx` měla lokace `/_github` trailing slash v `proxy_pass` (`http://github:3500/`) → octokit middleware porovnává cestu přesně proti `/api/webhook` a pokřivenou cestu odmítne (404) ještě před kontrolou podpisu | Odebrat slash: `proxy_pass http://github:3500;` (**opraveno PR #10**, merged). Nasadit `git pull` + `docker compose restart nginx` → Redeliver na GitHubu → 200. Memory `github-integration-state` |
| 3 | **`platform:status:AccountMismatch`** při každém zápisu admin skriptem (`createDoc`/`updateDoc`) | `TxOperations` postaven se špatnou identitou (`selected.account`) místo `socialId` z loginu | Stavět klienta s `socialId`: `const { token, socialId } = await getAccountClient().login(...)` a předat `socialId` do `TxOperations`. Read-only `findAll` to neřeší. Vzor: `praut-lead-setup.cjs`, `praut-fix-associations.cjs`. Memory `huly-admin-scripts-env` |
| 4 | **Účet zamčený** po 5 neúspěšných loginech; `restorePassword` heslo nastaví, ale login hlásí `PasswordLoginLocked` | `failed_login_attempts >= 5` = natvrdo zamčeno (žádné časové odemčení) | **A)** OTP: login → „Login with code" → e-mail → kód → přihlášení **vynuluje** čítač. **B)** SQL na serveru: `UPDATE global_account.account SET failed_login_attempts = 0 WHERE uuid = '<UUID>';` (přes `docker compose exec cockroach ./cockroach sql …`). Viz `SOP_UZIVATELE_A_PRISTUPY.md` §4 |
| 5 | **„Confirmed social identity is attached to the wrong person"** — error screen hned po přihlášení (jméno+heslo přitom OK) | **Nedokončené sloučení** duplicitní osoby: ověřená social identity účtu je ve workspace (`SocialIdentity.attachedTo`) připojená ke **staré/jiné** osobě než té s `personUuid`=uuid účtu. `praut-merge-persons.cjs` (account-merge) workspace identity **NEpřepojí** | 2 kroky: (1) `praut-merge-persons.cjs --primary <správné-uuid> --secondary <staré-uuid> --apply`; (2) přepojit každou `SocialIdentity` s `attachedTo==stará-osoba` na správnou osobu (`c.updateDoc(SocialIdentity, space, _id, {attachedTo: správná._id})`). Memory `huly-account-management` |
| 6 | **Prázdný výběr „Prostor"** v „Nový dokument" (řízené dokumenty) — nejde vybrat prostor | Dropdown filtruje na prostory, kde mám právo `CreateDocument`; to plyne **jen z rolí**, ne z členství/vlastnictví. Do rolí **Manager/QARA** není přiřazen nikdo | Prostor → Nastavení → Role → přidat lidi (min. sebe) do role **Manager** nebo **QARA**. Opakovat pro každý dokum. prostor. Skript `praut-docspace-perms.cjs` (dia) / `praut-assign-manager.cjs`. Memory `huly-docspace-roles` |
| 7 | **„Nelze sloučit globální osoby"** (UI „Sloučit kontakty") | **Obrácený směr:** zdrojová (slučovaná) osoba má **ověřené** social ID (`verified_on != null`) → `canMergeSpecifiedPersons` vrátí false | Prohodit: do „Sloučit z" (zdroj) dát osobu **bez** ověřeného přihlášení, do „cíl" tu ověřenou → tlačítko zezelená. Když mají obě ověřené ID: `praut-merge-persons.cjs --apply` (account-merge). Memory `huly-merge-contacts` |
| 8 | **Healthcheck / curl hlásí HTTP 000** přes doménu, přestože web zvenčí funguje | **NAT hairpin** — server sám k sobě přes veřejnou doménu/IP nemá cestu | Testuj přes loopback: `curl -kI https://127.0.0.1/`. Pro ověření na serveru používej `http://127.0.0.1` místo veřejné domény |
| 9 | **`notification` služba v crash-loopu** (restartuje se dokola) | Chybí **VAPID klíče** pro web-push (`PUSH_PUBLIC_KEY` / `PUSH_PRIVATE_KEY`) | Vygenerovat pár: `npx web-push generate-vapid-keys` → doplnit obě proměnné do `huly_v7.conf` (mimo git) → `docker compose up -d notification front && docker compose restart nginx`. Viz `.template.huly.conf` a `SOP_REBUILD_FROM_SCRATCH.md` §3 |

## Obecná diagnostika (když symptom není v tabulce)

```bash
cd /root/huly-selfhost
docker compose ps                       # kdo neběží / restartuje
docker compose logs --tail=100          # hledej ERROR/FATAL/panic/OOM/connection refused
docker compose logs transactor --tail=100
docker compose logs account --tail=100
df -h                                   # plný disk? → docker image prune -a; docker system prune -f
free -h                                 # < 500 MB RAM = problém (Huly chce min. 4 GB)
scripts/praut-healthcheck.sh --dry-run  # služby + HTTP 200 + disk + stáří zálohy
```

Bezpečný restart celého stacku: `docker compose down && docker compose up -d && docker compose restart nginx`
(počkej 60–90 s). Krajní řešení: power-cycle VPS. Obnova ze zálohy až po dohodě s vedením
(`scripts/praut-restore-smoke.sh` nejdřív nedestruktivně ověří). Kroky: `docs/RUNBOOK-SERVER-DOWN.md`.

> **Zlaté pravidlo:** po jakémkoli `docker compose up -d` **vždy** `docker compose restart nginx`
> (řádek #1 této matice je nejčastější incident).
