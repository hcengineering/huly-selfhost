# Handover: Diagnostika chatu Huly — „Simon nevidí přímé zprávy"

**Datum:** 2026-07-08
**Autor:** Claude (Fable 5) na zadání @stepanmanda
**Stav:** Diagnostika hotová (read-only). Oprava připravena, **čeká na souhlas** + jednu reprodukci.
**Workspace:** `praut` (huly.praut.cz), verze 0.7.423

---

## Zadání
Štěpán: „Simonovi posílám přímé zprávy (DM) a on je nevidí. Zjisti proč a oprav chat."

## Co bylo naměřeno (read-only, produkce)

| Fakt | Hodnota | Zdroj |
|---|---|---|
| Simonova identita | 1 Person karta, ověřený účet `simon.brumla@gmail.com`, personUuid `2aa34004…` | `praut-diagnose-messaging.cjs` |
| Simon člen kanálů | ANO (je v #random, #general…) | dump Channel.members |
| Přímé zprávy (DM) v celém workspace | **0** | findAll `chunter:class:DirectMessage` |
| Chatové zprávy ve všech 4 kanálech | **0** (general, random, vedení, praut-denni-prehled) | findAll ChatMessage per space |
| Celkem `chunter:class:ChatMessage` | 20 — **všechny jsou komentáře u karet / PR**, ne chat | attachedToClass = card/github |
| Aktivita workspace | 646 ActivityMessage, 24 karet, tracker/lead aktivní | probe |
| Workspaců na účtu | jen 1 (`praut`) | getUserWorkspaces |
| Chyby transactoru (odmítnuté tx, permission) | **žádné** (1500 řádků logu) | ssh huly docker logs |

## Co je skutečně špatně (potvrzeno)

1. **Chat se fakticky nepoužívá / neodesílá.** V celém workspace není ani jedna zpráva v kanálu ani jedna DM. Není to Simonem — jeho účet je v pořádku a je členem kanálů.
2. **Odeslání zprávy NENÍ blokováno serverem.** Podle zdrojového kódu forku (`plugins/chunter-resources/.../ChatMessageInput.svelte`) je odeslání čistý zápis do transactoru (`addCollection` → `commit`), nezávislý na presence/push. Komentáře u karet tímto stejným mechanismem fungují (20 jich existuje). Transactor nic neodmítá.
3. **Chybí dvě služby — ale ty odeslání neblokují, jen komfort:**
   - `notification` (kontejner neběží) → **žádné web-push / e-mail upozornění** na zprávy. `PUSH_PUBLIC_KEY` v config.json prázdný, VAPID klíče chybí (známý bod #9 v `TROUBLESHOOTING_MATRIX.md`).
   - `hulypulse` (v compose zakomentovaný, `PRESENCE_URL` prázdný) → **žádný indikátor „online / píše"**. Kód `setTyping` je bez presence bezpečně no-op (nespadne).

## Závěr příčiny

„0 zpráv v celém workspace" jde vysvětlit jen tím, že **se přes Chat reálně neodesílá** — buď se modul Chat u uživatelů v prohlížeči nenačte/spadne při otevření, nebo ho tým vůbec nepoužívá (chat je v Huly zastrčený, tým jede přes karty a Tracker). Server ani Simonův účet vadné nejsou.

Přesné rozlišení („Chat spadne v prohlížeči" × „nikdo tam nepíše") **vyžaduje živou reprodukci** — tu se nepodařilo udělat:
- Chrome rozšíření Claude není připojené (nesedící claude.ai účet).
- Testovací zápis do produkce (poslat 1 test zprávu) zablokoval bezpečnostní klasifikátor.

## Připravená oprava (čeká na souhlas Štěpána — jde o zásah do produkce)

**A) Reprodukce (10 s, bez rizika):** Štěpán otevře Huly → levý panel ikona **Chat** → napíše Simonovi „test". Sledovat: objeví se zpráva v okně? Jde Chat vůbec otevřít? → tím se určí, jestli je to klientská chyba nebo jen nepoužívání.

**B) Dodělat chybějící služby (zvýší komfort chatu — upozornění + presence):**
1. Záloha: `cp huly_v7.conf huly_v7.conf.bak-2026-07-08` na serveru.
2. Vygenerovat VAPID: `npx web-push generate-vapid-keys` → `PUSH_PUBLIC_KEY` / `PUSH_PRIVATE_KEY` do `huly_v7.conf`.
3. V serverovém `compose.yml` odkomentovat `hulypulse`, nastavit `PRESENCE_URL` (front) + `WEB_PUSH_URL=http://notification:8091` (transactor), přidat službu `notification`.
4. `docker compose up -d notification hulypulse front transactor` → **`docker compose restart nginx`** (jinak 502).
5. Ověřit: `config.json` má neprázdné `PUSH_PUBLIC_KEY` a `PRESENCE_URL`; `docker ps` ukáže běžící notification + hulypulse.

**Pozn.:** Krok B sám o sobě NEvyřeší „0 zpráv", pokud je příčina klientská — proto A jde první.

### Přesný, OVĚŘENÝ rozsah změny (read-only diff server → cíl, 2026-07-08)
Diff je čistý — mění **jen** chat, nic jiného:
- `compose.yml`: nová služba **`hulypulse`** (presence) + **`notification`** (web-push); do **transactoru** přidat `PULSE_URL=http://hulypulse:8099` a `WEB_PUSH_URL=http://notification:8091`; do **frontu** `PULSE_URL=…/_pulse` a `PUSH_PUBLIC_KEY`.
- `.huly.nginx`: odkomentovat `location /_pulse` (→ `hulypulse:8099`).
- `huly_v7.conf`: doplnit `PUSH_PUBLIC_KEY` + `PUSH_PRIVATE_KEY` (VAPID). Ověřeno: **VAPID chybí**, `EMAIL_FROM` už nastaven.

### Automatizace: `scripts/praut-enable-chat-services.sh`
- Bez argumentu = **dry-run** (záloha `*.bak-YYYY-MM-DD` + diff + kontrola VAPID).
- `--apply` = vygeneruje VAPID, nahraje `compose.yml` + `.huly.nginx`, `docker compose up -d hulypulse notification transactor front`, `docker compose restart nginx`, ověří `config.json`. Rollback = obnovit `*.bak-*` + `up -d` + restart nginx.

### ⚠️ Blokace prostředí (2026-07-08)
Nasazení nebylo možné provést z agentního sandboxu — bezpečnostní klasifikátor odmítl **jakýkoli prod-zápis** (test zpráva i zálohovací/deploy krok) a instruoval předat rozhodnutí uživateli. Skript proto musí spustit **Štěpán** (`! bash scripts/praut-enable-chat-services.sh` → po kontrole `--apply`), nebo udělit odpovídající Bash permission. Read-only diagnostika a diff proběhly.

## Nástroje vytvořené při diagnostice
- `tools/huly-admin/praut-diagnose-messaging.cjs` — read-only diagnostika identit / DM / notifikací, `--all` plošný sken duplicit. (Bonus: sken našel 3 duplicitní identity — Švanda, Hoyer, Huf — samostatný, menší úkol na `praut-merge-persons.cjs`.)

## Další krok
Čeká se na: (1) Štěpánovu reprodukci dle A, nebo připojení Chrome rozšíření pro živý test; (2) souhlas s krokem B.
