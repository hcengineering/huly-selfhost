#!/usr/bin/env bash
# PRAUT Huly health check — lehký monitoring pro jeden VPS.
#
# Co kontroluje:
#   1) běží všechny klíčové Docker služby (docker compose ps)
#   2) web odpovídá 200 (/ a /config.json)
#   3) volné místo na disku pod prahem
#   4) poslední záloha není starší než limit
#
# Při PROBLÉMU pošle alert e-mail přes Postmark (token bere z huly_v7.conf).
# Bez problému je tiše (vhodné do cronu po 15 min). S --daily pošle i "vše OK".
#
# Použití:
#   scripts/praut-healthcheck.sh            # tichá kontrola, alert jen při chybě
#   scripts/praut-healthcheck.sh --daily    # navíc pošle denní souhrn i když je OK
#   scripts/praut-healthcheck.sh --dry-run  # nic neposílá, jen vypíše výsledek
#
# Konfigurace přes env (s rozumnými defaulty):
#   PRAUT_CONF              cesta k huly conf (default: <repo>/huly_v7.conf)
#   ALERT_EMAIL_TO          komu posílat alerty (jinak se jen loguje)
#   HEALTH_URL              základ URL (default: https://huly.praut.cz)
#   MUST_RUN_SERVICES       mezerou oddělené názvy služeb, které MUSÍ běžet
#   DISK_THRESHOLD_PCT      práh zaplnění disku v % (default: 85)
#   BACKUP_ROOT             kde hledat zálohy (default: backup-praut/scheduled)
#   BACKUP_MAX_AGE_HOURS    max stáří poslední zálohy v hodinách (default: 26)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export TZ="${TZ:-Europe/Prague}"

PRAUT_CONF="${PRAUT_CONF:-$ROOT_DIR/huly_v7.conf}"
HEALTH_URL="${HEALTH_URL:-https://huly.praut.cz}"
MUST_RUN_SERVICES="${MUST_RUN_SERVICES:-nginx cockroach redpanda minio elastic transactor account front fulltext stats kvs}"
DISK_THRESHOLD_PCT="${DISK_THRESHOLD_PCT:-85}"
BACKUP_ROOT="${BACKUP_ROOT:-backup-praut/scheduled}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"

DRY_RUN=0
DAILY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --daily) DAILY=1 ;;
    *) echo "Neznámý argument: $arg" >&2; exit 2 ;;
  esac
done

PROBLEMS=()
add_problem () { PROBLEMS+=("$1"); }

# --- 1) Docker služby ---
running="$(docker compose ps --status running --services 2>/dev/null || true)"
for svc in $MUST_RUN_SERVICES; do
  if ! grep -qx "$svc" <<<"$running"; then
    add_problem "Docker služba '$svc' neběží (není ve stavu running)."
  fi
done

# --- 2) HTTP dostupnost ---
check_http () {
  local path="$1" code
  code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 15 "${HEALTH_URL}${path}" 2>/dev/null || echo "000")"
  if [ "$code" != "200" ]; then
    add_problem "HTTP ${HEALTH_URL}${path} vrátilo ${code} (čekáno 200)."
  fi
}
check_http "/"
check_http "/config.json"

# --- 3) Místo na disku (filesystém repo i kořen) ---
check_disk () {
  local mount="$1" pct
  pct="$(df -P "$mount" 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
  if [[ "$pct" =~ ^[0-9]+$ ]] && [ "$pct" -ge "$DISK_THRESHOLD_PCT" ]; then
    add_problem "Disk pro '$mount' je zaplněn na ${pct}% (práh ${DISK_THRESHOLD_PCT}%)."
  fi
}
check_disk "$ROOT_DIR"
check_disk "/"

# --- 4) Stáří poslední zálohy ---
if [ -d "$BACKUP_ROOT" ]; then
  fresh="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mmin -"$((BACKUP_MAX_AGE_HOURS * 60))" 2>/dev/null | head -1 || true)"
  if [ -z "$fresh" ]; then
    add_problem "Žádná záloha v '$BACKUP_ROOT' mladší než ${BACKUP_MAX_AGE_HOURS} h."
  fi
else
  add_problem "Adresář se zálohami '$BACKUP_ROOT' neexistuje."
fi

# --- Odeslání e-mailu přes Postmark ---
# Token a odesílatele bere z huly conf (SMTP_PASSWORD = Postmark Server token).
send_mail () {
  local subject="$1" body="$2"
  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY-RUN] by se poslal e-mail: ${subject}"
    return 0
  fi
  if [ -z "${ALERT_EMAIL_TO:-}" ]; then
    echo "ALERT_EMAIL_TO není nastaveno — e-mail se neposílá (jen log)." >&2
    return 0
  fi
  local token="" from=""
  if [ -f "$PRAUT_CONF" ]; then
    token="${ALERT_POSTMARK_TOKEN:-$(grep -E '^SMTP_PASSWORD=' "$PRAUT_CONF" | head -1 | cut -d= -f2- | tr -d '[:space:]')}"
    from="${ALERT_EMAIL_FROM:-$(grep -E '^EMAIL_FROM=' "$PRAUT_CONF" | head -1 | cut -d= -f2- | tr -d '[:space:]')}"
  fi
  token="${token:-${ALERT_POSTMARK_TOKEN:-}}"
  from="${from:-${ALERT_EMAIL_FROM:-}}"
  if [ -z "$token" ] || [ -z "$from" ]; then
    echo "Chybí Postmark token nebo odesílatel (EMAIL_FROM) — e-mail se neposílá." >&2
    return 0
  fi
  local payload
  payload="$(printf '{"From":"%s","To":"%s","Subject":"%s","TextBody":%s,"MessageStream":"outbound"}' \
    "$from" "$ALERT_EMAIL_TO" "$subject" "$(printf '%s' "$body" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")"
  curl -fsS --max-time 20 "https://api.postmarkapp.com/email" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "X-Postmark-Server-Token: ${token}" \
    -d "$payload" >/dev/null \
    && echo "Alert e-mail odeslán na ${ALERT_EMAIL_TO}." \
    || echo "Odeslání alert e-mailu SELHALO (Postmark API)." >&2
}

STAMP="$(date -Is)"
HOSTLINE="Huly PRAUT — ${HEALTH_URL} — ${STAMP}"

if [ "${#PROBLEMS[@]}" -gt 0 ]; then
  echo "[${STAMP}] HEALTHCHECK: ${#PROBLEMS[@]} problém(ů):"
  body="${HOSTLINE}"$'\n\n'"Nalezené problémy:"
  for p in "${PROBLEMS[@]}"; do
    echo "  - $p"
    body="${body}"$'\n'"  - ${p}"
  done
  body="${body}"$'\n\n'"Doporučení: zkontroluj 'docker compose ps' a 'docker compose logs', případně po 'up -d' spusť 'docker compose restart nginx'."
  send_mail "🔴 Huly PRAUT: ${#PROBLEMS[@]} problém(ů)" "$body"
  exit 1
else
  echo "[${STAMP}] HEALTHCHECK: vše OK."
  if [ "$DAILY" = "1" ]; then
    send_mail "✅ Huly PRAUT: vše OK" "${HOSTLINE}"$'\n\n'"Všechny služby běží, web odpovídá 200, disk i zálohy v pořádku."
  fi
  exit 0
fi
