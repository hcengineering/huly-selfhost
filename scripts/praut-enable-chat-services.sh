#!/usr/bin/env bash
# praut-enable-chat-services.sh
# Zprovozní chybějící chatové služby na produkčním Huly serveru (huly.praut.cz):
#   - hulypulse  (real-time presence / „píše…")
#   - notification (web-push + e-mail upozornění na zprávy; potřebuje VAPID klíče)
# a zapojí je do transactoru/frontu/nginx podle verze v tomto repu.
#
# BEZPEČNOST (dle AGENTS.md — živá produkce):
#   - Výchozí režim = --check: jen ZÁLOHA + DIFF + kontrola VAPID. NIC nemění.
#   - --apply mění produkci: rsync compose.yml + .huly.nginx na server, doplní VAPID
#     klíče do huly_v7.conf (mimo git), nasadí služby, restartuje nginx, ověří.
#   - Vždy nejdřív spusť BEZ --apply, ukaž diff Štěpánovi, teprve pak --apply.
#
# Předpoklady: SSH alias `huly`, server compose v /root/huly-selfhost.
set -euo pipefail

SSH=huly
SRV_DIR=/root/huly-selfhost
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%F)"
APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

say () { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

say "1) Záloha serverové konfigurace ($SRV_DIR → *.bak-$STAMP)"
ssh "$SSH" "cd $SRV_DIR && for f in compose.yml .huly.nginx huly_v7.conf; do [ -f \$f ] && cp -n \$f \$f.bak-$STAMP && echo '  zaloha: '\$f.bak-$STAMP; done"

say "2) DIFF: server compose.yml  vs  repo compose.yml"
ssh "$SSH" "cat $SRV_DIR/compose.yml" | diff -u - "$REPO_DIR/compose.yml" || true

say "3) DIFF: server .huly.nginx  vs  repo .huly.nginx"
ssh "$SSH" "cat $SRV_DIR/.huly.nginx" | diff -u - "$REPO_DIR/.huly.nginx" || true

say "4) Kontrola VAPID klíčů v huly_v7.conf na serveru"
HAS_PUB=$(ssh "$SSH" "grep -c '^PUSH_PUBLIC_KEY=..' $SRV_DIR/huly_v7.conf || true")
HAS_EMAIL=$(ssh "$SSH" "grep -c '^EMAIL_FROM=..' $SRV_DIR/huly_v7.conf || true")
echo "  PUSH_PUBLIC_KEY nastaven: $([ "$HAS_PUB" != 0 ] && echo ANO || echo NE)"
echo "  EMAIL_FROM nastaven:      $([ "$HAS_EMAIL" != 0 ] && echo ANO || echo NE)"

if [ "$APPLY" != true ]; then
  cat <<EOF

--- DRY-RUN hotovo. Nic se nezměnilo. ---
Až budeš chtít nasadit: bash $(basename "$0") --apply
Pozn.: --apply způsobí krátký restart transactor/front/nginx (výpadek desítky sekund).
EOF
  exit 0
fi

say "5) APPLY: VAPID klíče (pokud chybí, vygeneruji na serveru; hodnoty se NETISKNOU)"
if [ "$HAS_PUB" = 0 ]; then
  ssh "$SSH" "cd $SRV_DIR && docker run --rm node:20-alpine sh -c 'npm i -g web-push >/dev/null 2>&1 && web-push generate-vapid-keys --json' > /tmp/vapid.json && \
    PUB=\$(node -e 'console.log(require(\"/tmp/vapid.json\").publicKey)') && \
    PRIV=\$(node -e 'console.log(require(\"/tmp/vapid.json\").privateKey)') && \
    grep -q '^PUSH_PUBLIC_KEY=' huly_v7.conf && sed -i 's|^PUSH_PUBLIC_KEY=.*|PUSH_PUBLIC_KEY='\$PUB'|' huly_v7.conf || echo 'PUSH_PUBLIC_KEY='\$PUB >> huly_v7.conf && \
    grep -q '^PUSH_PRIVATE_KEY=' huly_v7.conf && sed -i 's|^PUSH_PRIVATE_KEY=.*|PUSH_PRIVATE_KEY='\$PRIV'|' huly_v7.conf || echo 'PUSH_PRIVATE_KEY='\$PRIV >> huly_v7.conf && \
    rm -f /tmp/vapid.json && echo '  VAPID klice doplneny do huly_v7.conf'"
else
  echo "  VAPID klíče už existují — přeskočeno."
fi

say "6) APPLY: nahrání compose.yml + .huly.nginx na server"
scp "$REPO_DIR/compose.yml" "$SSH:$SRV_DIR/compose.yml"
scp "$REPO_DIR/.huly.nginx" "$SSH:$SRV_DIR/.huly.nginx"

say "7) APPLY: validace compose + nasazení služeb"
ssh "$SSH" "cd $SRV_DIR && docker compose config >/dev/null && echo '  compose OK' && \
  docker compose up -d hulypulse notification && \
  docker compose up -d transactor front && \
  docker compose restart nginx && echo '  nasazeno + nginx restart'"

say "8) OVĚŘENÍ"
sleep 5
echo "  běžící chat služby:"; ssh "$SSH" "docker ps --format '{{.Names}} {{.Status}}' | grep -iE 'notification|hulypulse'"
echo "  config.json (PRESENCE_URL / PUSH_PUBLIC_KEY neprázdné?):"
curl -s https://huly.praut.cz/config.json | tr ',' '\n' | grep -iE 'PRESENCE_URL|PUSH_PUBLIC_KEY'
cat <<EOF

--- HOTOVO. ---
Rollback (kdyby něco): na serveru v $SRV_DIR obnov *.bak-$STAMP a spusť
  docker compose up -d && docker compose restart nginx
EOF
