# T20 — Bezpečnostní úklid: nálezy a kroky

> Provedeno 2026-07-02. Sken repa + prověření serveru (read-only). Vlastní rotace tokenů
> a smazání souboru na serveru = akce pro Štěpána (potřebují externí UI / zápis na server).

## 1. gitleaks sken repa — ✅ ČISTÝ (po allowlistu)

Sken celé git historie (351 commitů). **Žádné skutečné PRAUT tajemství v gitu.** 10 iniciálních
nálezů bylo vyhodnoceno jako neškodné a přidáno do `.gitleaks.toml` allowlist:

| Nález | Verdikt |
|---|---|
| `nginx/docker-compose.yml` (6×) | Upstream ukázka (egavrilov@ebay.com, 2024), na main neexistuje, veřejná v upstream repu |
| `nginx/setup.sh` | Upstream ukázka |
| `docs/GITHUB-INTEGRATION-SETUP.md` | Dokumentační placeholdery (`123456`, `Iv1.xxxx`) |
| `guides/smtp-troubleshooting.md` (2×) | Placeholder `your-smtp-server.com` v curl příkladu |
| `tools/huly-admin/praut-build-processes.cjs` | Huly interní `matchKey` _id (24-hex), ne tajemství |

Od teď je `gitleaks detect` zelený → lze zapojit do CI/pre-commit.

## 2. gh.pem na serveru — ⚠️ AKCE

- Soubor `/root/huly-selfhost/gh.pem` (GitHub App privátní klíč) existuje, práva **644 (world-readable)**.
- Služba `github` v compose používá **`GITHUB_PRIVATE_KEY`** (env z `huly_v7.conf`), **NE** ten soubor
  (žádný volume mount `gh.pem` v compose). → soubor je pravděpodobně **nepoužívaný zbytek** ze setupu.
- **Doporučení:** ověřit, že obsah `gh.pem` == `GITHUB_PRIVATE_KEY` v conf, a pak soubor **smazat**
  (nebo aspoň `chmod 600`). Smazání = zápis na server, provede Štěpán / pod dohledem.

## 3. Rotace tokenů — ⚠️ AKCE ŠTĚPÁNA (externí UI)

Tyto tokeny byly v minulosti sdílené v AI chatu → rotovat. Klikací postup:

### 3a. Postmark server token
1. Postmark → Servers → (náš server) → **API Tokens** → vygenerovat nový, starý smazat.
2. Na serveru: `cp /root/huly-selfhost/huly_v7.conf huly_v7.conf.bak-$(date +%F)`, přepsat token,
   `docker compose up -d mail && docker compose restart nginx`.
3. Test: vyvolat odchozí e-mail (healthcheck alert / OTP login) → ověřit doručení.

### 3b. GitHub App client secret
1. GitHub → Settings → Developer settings → GitHub Apps → huly-praut → **Client secrets** →
   Generate new, revoke old.
2. Na serveru: přepsat `GITHUB_CLIENT_SECRET` v conf, `docker compose up -d github && restart nginx`.
3. Ověřit `praut-github-check.cjs`.

## Zápis po dokončení
Po provedení bodů 2 a 3 odškrtnout v `praut_erp_docs/PRAUT_REMAINING_WORK.md` a přidat řádek do
`praut_erp_docs/CHANGELOG.md` (viz T17).

## Poznámka
Nové tokeny **nikdy nevkládat do chatu ani gitu** — Štěpán je vloží přímo na server (do `huly_v7.conf`,
mimo git). Před editací conf vždy záloha (`.bak`).
