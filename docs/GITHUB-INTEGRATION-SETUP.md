# Napojení GitHub ↔ Huly — klikací návod

> Cíl: rozjet obousměrnou synchronizaci **issues, pull requestů, komentářů a reviews**
> mezi GitHubem (org PrautAutomation) a naším Huly na `https://huly.praut.cz`.
>
> Technická část (Docker služba + nginx) je **už nasazená v `main`**. Tento návod
> řeší to, co musí udělat člověk ručně: vytvořit GitHub App, vyplnit klíče na server
> a propojit v Huly.
>
> **Čas:** ~20–30 minut. **Potřebuješ:** admin práva v GitHub org PrautAutomation
> a SSH přístup na VPS.

---

## Přehled — 4 fáze

1. **Vytvořit GitHub App** (na GitHubu, formulář) → vznikne 6 tajných hodnot
2. **Vložit klíče na server** (do `huly_v7.conf`, mimo git)
3. **Nasadit** (`git pull` + `docker compose up -d`)
4. **Propojit v Huly** (tlačítko Connect + instalace App na repo)

---

## Fáze 1 — Vytvořit GitHub App

### 1.1 Otevři formulář
Jdi na: **https://github.com/organizations/PrautAutomation/settings/apps/new**
*(nebo: GitHub → org PrautAutomation → Settings → Developer settings → GitHub Apps → New GitHub App)*

### 1.2 Základní údaje
| Pole | Co vyplnit |
|------|------------|
| **GitHub App name** | `Huly Praut` (libovolné, ale unikátní v rámci GitHubu) |
| **Homepage URL** | `https://huly.praut.cz` |
| **Callback URL** | `https://huly.praut.cz/github` |
| ☑️ **Redirect on update** | **zaškrtnout** (pod Callback URL) |
| **Setup URL (optional)** | `https://huly.praut.cz/github` |
| ☑️ **Redirect on update** (u Setup URL) | zaškrtnout, pokud se nabízí |

### 1.3 Webhook
| Pole | Co vyplnit |
|------|------------|
| ☑️ **Active** | nechat zaškrtnuté |
| **Webhook URL** | `https://huly.praut.cz/_github/api/webhook` |
| **Webhook secret** | vymysli náhodný silný řetězec a **ulož si ho stranou** — budeš ho potřebovat ve Fázi 2 jako `GITHUB_WEBHOOK_SECRET` |

> 💡 Náhodný secret si můžeš vygenerovat třeba příkazem `openssl rand -hex 32`.

### 1.4 Permissions (Repository permissions)
Nastav přesně tyto (ostatní nech na *No access*):

| Oprávnění | Úroveň |
|-----------|--------|
| Commit statuses | **Read and write** |
| Contents | **Read and write** |
| Custom properties | **Read and write** |
| Discussions | **Read and write** |
| Issues | **Read and write** |
| Metadata | **Read-only** (povinné, nastaví se samo) |
| Pages | **Read and write** |
| Projects | **Read and write** |
| Pull requests | **Read and write** |
| Webhooks | **Read and write** |

### 1.5 Subscribe to events
Zaškrtni tyto události:
- ☑️ Issues
- ☑️ Pull request
- ☑️ Pull request review
- ☑️ Pull request review comment
- ☑️ Pull request review thread

### 1.6 Where can this app be installed?
Vyber **Only on this account** (jen PrautAutomation).

### 1.7 Klikni **Create GitHub App**

---

## Fáze 1b — Odečíst 6 tajných hodnot

Po vytvoření jsi na stránce **General** té App. Posbírej:

| Proměnná (do serveru) | Kde to najdeš na GitHubu |
|-----------------------|--------------------------|
| `GITHUB_APPID` | General → **About → App ID** (číslo, např. `123456`) |
| `GITHUB_APP_SLUG` | Z veřejné URL App `github.com/apps/<slug>` — ta část `<slug>` (např. `huly-praut`) |
| `GITHUB_CLIENTID` | General → **Client ID** (např. `Iv1.xxxxxxxx`) |
| `GITHUB_CLIENT_SECRET` | General → **Client secrets → Generate a new client secret** → zkopíruj hned (už se nezobrazí) |
| `GITHUB_PRIVATE_KEY` | General → **Private keys → Generate a private key** → stáhne se `.pem` soubor → potřebuješ **celý jeho obsah** (všechny řádky včetně `-----BEGIN...`/`-----END...`) |
| `GITHUB_WEBHOOK_SECRET` | Ten řetězec, co sis vymyslel v kroku 1.3 |

---

## Fáze 2 — Vložit klíče na server

Na VPS (SSH), uprav `/root/huly-selfhost/huly_v7.conf`. Jmenovky tam už jsou, jen prázdné — doplň hodnoty:

```bash
GITHUB_APPID=123456
GITHUB_APP_SLUG=huly-praut
GITHUB_CLIENTID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=tvuj-nahodny-retezec-z-kroku-1.3
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
```

> ⚠️ **Privátní klíč** je víceřádkový. Vlož ho jako jeden řádek s `\n` místo zalomení,
> nebo ho obal uvozovkami přes víc řádků — podle toho, jak `huly_v7.conf` čte ostatní
> víceřádkové hodnoty. Nejjistější je `\n` varianta v uvozovkách.
>
> 🔒 Tento soubor je v `.gitignore` — **nikdy se necommituje**. Klíče zůstávají jen na serveru.

---

## Fáze 3 — Nasadit

Na VPS:

```bash
cd /root/huly-selfhost
git pull origin main
docker compose pull github
docker compose up -d
```

Tím se spustí nová služba `github` a načte klíče. Ostatní služby zůstanou běžet.

Kontrola, že služba běží:
```bash
docker compose ps github
docker compose logs --tail=50 github
```

---

## Fáze 4 — Propojit v Huly

1. Otevři `https://huly.praut.cz` → přihlas se jako admin.
2. **Settings → Integrations → GitHub → Connect**.
3. Prohlížeč tě přesměruje na GitHub → **autorizuj** aplikaci.
4. Vyber, na která **repozitáře** org PrautAutomation se má App nainstalovat.
5. V Huly přiřaď GitHub repo k Huly projektu (Tracker) podle nabídky.

---

## Ověření, že to funguje ✅

- [ ] Tlačítko **Connect** vygenerovalo OAuth URL s vyplněným `client_id=` (ne prázdným).
- [ ] Na GitHubu: App → **Advanced → Recent Deliveries** ukazuje webhooky se **zelenou 200**.
- [ ] Vytvořím **issue na GitHubu** → objeví se v napojeném Huly projektu.
- [ ] Vytvořím/změním **issue v Huly** → promítne se na GitHub.

---

## Když něco nehraje

| Problém | Kde hledat |
|---------|-----------|
| Connect generuje prázdný `client_id` | `GITHUB_CLIENTID` chybí/špatně v `huly_v7.conf`, služba `front` se nerestartovala (`docker compose up -d front`) |
| Webhook na GitHubu hlásí červenou | špatná Webhook URL, nebo `GITHUB_WEBHOOK_SECRET` nesedí s tím v App |
| Služba `github` padá v logu | `docker compose logs github` — nejčastěji špatně vložený `GITHUB_PRIVATE_KEY` (zalomení řádků) |
| Sync neběží | App není nainstalovaná na daném repu (Fáze 4, krok 4) |

---

## Reference
- Oficiální postup: `README.md`, sekce **„GitHub Service"** (řádek 842+)
- Konfigurace: `compose.yml` (služba `github`), `.huly.nginx` (proxy `/_github`, řádek 153)
- GitHub Apps dokumentace: https://docs.github.com/en/apps/creating-github-apps
