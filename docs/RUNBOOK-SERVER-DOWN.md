# Runbook: huly.praut.cz nereaguje

Co dělat krok za krokem, když Huly nejde otevřít.

## Krok 1 — ověř, že jde o výpadek serveru (ne tvůj prohlížeč)

1. Zkus `Ctrl+Shift+R` (tvrdý reload bez cache)
2. Zkus jiný prohlížeč (Chrome ↔ Firefox ↔ Safari)
3. Zkus otevřít huly.praut.cz z mobilu **na mobilních datech** (ne na stejné wifi)

Pokud mobil na datech také neotevře → server je skutečně dolů. Pokračuj.

## Krok 2 — SSH na VPS a zkontroluj stav Dockeru

```bash
ssh root@72.62.156.104
cd /root/huly-selfhost

# Zkontroluj stav všech containerů
docker compose ps

# Ideální stav: všechny řádky mají "Up" nebo "running"
# Problém: "Exit", "Restarting", nebo chybí řádek
```

## Krok 3 — Přečti logy (co se stalo)

```bash
# Poslední logy všech služeb najednou
docker compose logs --tail=50

# Nebo konkrétní problematická služba (transactor, front, account...)
docker compose logs transactor --tail=100
docker compose logs front --tail=50
docker compose logs account --tail=50
```

Hledej: `ERROR`, `FATAL`, `panic`, `OOM`, `disk full`, `connection refused`.

## Krok 4 — Restart služeb

```bash
# Bezpečný restart VŠECH služeb (trvá ~60 sekund)
docker compose down
docker compose up -d

# Sleduj spouštění
docker compose logs -f --tail=20
```

Počkej 60–90 sekund, pak zkus huly.praut.cz znovu.

## Krok 5 — Zkontroluj místo na disku

```bash
df -h
# Problém: / nebo /var nebo /data má 0 volného místa

# Pokud plný disk — vyčisti staré Docker images
docker image prune -a
docker system prune -f
```

## Krok 6 — Zkontroluj paměť a CPU

```bash
free -h          # RAM — méně než 500 MB free = problém
top              # CPU — přetížení nebo zombie procesy
```

Huly potřebuje min. 4 GB RAM. Pokud méně → restartuj VPS z Digital Ocean panelu.

## Krok 7 — Restart celého VPS (krajní řešení)

Přes Digital Ocean panel:
1. Otevři droplet `huly-praut`
2. Klikni **Power** → **Power Cycle** (ne Shutdown — to ho nezapne zpátky)
3. Počkej 3–5 minut
4. Zkus huly.praut.cz

## Krok 8 — Obnova ze zálohy (pouze pokud data jsou poškozena)

```bash
# Zálohy jsou v:
ls /root/huly-selfhost/backup-praut/

# Smoke test zálohy (nespouští produkci, jen ověří):
cd /root/huly-selfhost
scripts/praut-restore-smoke.sh backup-praut/DATUM-STAMP

# Úplná obnova ze zálohy — POUZE po dohodě s vedením
# Viz scripts/praut-restore-smoke.sh pro detaily
```

## Kontakty při výpadku

| Kdo | GitHub | Odpovědnost |
|-----|--------|-------------|
| **EmperorKunDis** | admin | Primární tech kontakt — GitHub org admin |
| **Kaspis77** | maintain | Sekundární |
| **stepanmanda** | write | Štěpán Manda — ředitel |

## Prevence

- Zálohy běží každý den v 02:30 (cron `/root/huly-selfhost/ops/praut-root.crontab`)
- Zálohy se uchovávají 14 dní
- Po každém `git pull` na VPS se nic nerestartuje — Huly běží dál bez výpadku
- Konfigurace `.env` / `huly_v7.conf` jsou gitignorované — nezálohovány v gitu, ale jsou v backup
