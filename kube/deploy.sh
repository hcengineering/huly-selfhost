#!/usr/bin/env bash
# Quick deploy script for Huly on Kubernetes.
#
# Prerequisites: kubectl, kustomize (or kubectl >= 1.14), cert-manager,
#                ingress-nginx, DNS A record for $HULY_DOMAIN
#
# Usage:
#   HULY_DOMAIN=huly.yourdomain.com \
#   ADMIN_EMAIL=you@yourdomain.com \
#   HULY_VERSION=v0.7.382 \
#   GOOGLE_CLIENT_ID=xxx \
#   GOOGLE_CLIENT_SECRET=yyy \
#     bash kube/deploy.sh
#
# Optional:
#   HULY_NAMESPACE  (default: huly)
#   HULY_VERSION    (default: latest)

set -euo pipefail

: "${HULY_DOMAIN:?Set HULY_DOMAIN to your Huly hostname (e.g. huly.yourdomain.com)}"
: "${ADMIN_EMAIL:=admin@example.com}"
: "${HULY_VERSION:=latest}"
: "${HULY_NAMESPACE:=huly}"
: "${GOOGLE_CLIENT_ID:=}"
: "${GOOGLE_CLIENT_SECRET:=}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "==> Deploying Huly to namespace '$HULY_NAMESPACE' at https://$HULY_DOMAIN"

# 1. Create namespace
kubectl create namespace "$HULY_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# 2. Create/update secret
SERVER_SECRET=$(openssl rand -hex 32)
CR_PASS=$(openssl rand -hex 16)
RP_PASS=$(openssl rand -hex 16)

kubectl -n "$HULY_NAMESPACE" create secret generic huly-secret \
  --from-literal=SERVER_SECRET="$SERVER_SECRET" \
  --from-literal=STORAGE_CONFIG='minio|minio?accessKey=minioadmin&secretKey=minioadmin' \
  --from-literal=COCKROACH_PASSWORD="$CR_PASS" \
  --from-literal=REDPANDA_SUPERUSER_PASSWORD="$RP_PASS" \
  --from-literal=CR_DB_URL='postgres://root@cockroach:26257/defaultdb?sslmode=disable' \
  --from-literal=GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  --from-literal=GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Generate overlay with user's domain
cat > "$TMPDIR/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: $HULY_NAMESPACE
resources:
  - $SCRIPT_DIR/base
images:
  - name: hardcoreeng/front
    newTag: "$HULY_VERSION"
  - name: hardcoreeng/account
    newTag: "$HULY_VERSION"
  - name: hardcoreeng/transactor
    newTag: "$HULY_VERSION"
  - name: hardcoreeng/collaborator
    newTag: "$HULY_VERSION"
  - name: hardcoreeng/workspace
    newTag: "$HULY_VERSION"
  - name: hardcoreeng/fulltext
    newTag: "$HULY_VERSION"
  - name: hardcoreeng/rekoni-service
    newTag: "$HULY_VERSION"
  - name: hardcoreeng/stats
    newTag: "$HULY_VERSION"
patches:
  - target:
      kind: ConfigMap
      name: huly-config
    patch: |
      - op: replace
        path: /data/FRONT_URL
        value: "https://$HULY_DOMAIN"
      - op: replace
        path: /data/ACCOUNTS_URL
        value: "https://$HULY_DOMAIN/_accounts"
      - op: replace
        path: /data/COLLABORATOR_URL
        value: "wss://$HULY_DOMAIN/_collaborator"
      - op: replace
        path: /data/REKONI_URL
        value: "https://$HULY_DOMAIN/_rekoni"
      - op: replace
        path: /data/STATS_URL
        value: "https://$HULY_DOMAIN/_stats"
      - op: replace
        path: /data/TRANSACTOR_URL
        value: "ws://transactor:3333;wss://$HULY_DOMAIN/_transactor"
      - op: replace
        path: /data/GMAIL_URL
        value: "https://$HULY_DOMAIN/_gmail"
      - op: replace
        path: /data/TELEGRAM_URL
        value: "https://$HULY_DOMAIN/_telegram"
      - op: replace
        path: /data/CALENDAR_URL
        value: "https://$HULY_DOMAIN/_calendar"
      - op: replace
        path: /data/LOVE_ENDPOINT
        value: "https://$HULY_DOMAIN/_love"
      - op: replace
        path: /data/ADMIN_EMAILS
        value: "$ADMIN_EMAIL"
  - target:
      kind: Ingress
    patch: |
      - op: replace
        path: /spec/tls/0/hosts/0
        value: $HULY_DOMAIN
      - op: replace
        path: /spec/rules/0/host
        value: $HULY_DOMAIN
EOF

# 4. Apply
kubectl apply -k "$TMPDIR/"

echo "==> Huly deployed! Waiting for pods..."
kubectl -n "$HULY_NAMESPACE" get pods
echo ""
echo "Visit https://$HULY_DOMAIN once all pods are Running."
