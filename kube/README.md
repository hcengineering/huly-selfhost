# Huly on Kubernetes (Kustomize)

Deploy [Huly](https://huly.io) to any Kubernetes cluster using Kustomize.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              nginx ingress                   │
                    │  /            → front:8080                  │
                    │  /_accounts   → account:3000                │
                    │  /_transactor → transactor:3333 (WS)        │
                    │  /_collaborator → collaborator:3078 (WS)    │
                    │  /_rekoni     → rekoni:4004                 │
                    │  /_stats      → stats:4900                  │
                    └────────────────────┬────────────────────────┘
                                         │
          ┌──────────┬──────────┬────────┴───────┬──────────┬──────────┐
          │          │          │                │          │          │
       front    account   transactor      collaborator  rekoni     stats
          │          │          │                │
          │          └────┬─────┘                │
          │               │                     │
          │    ┌──────────┴──────────┐          │
          │    │                     │          │
          │  cockroach          redpanda        │
          │    │                     │          │
          │    ├── workspace         │          │
          │    ├── fulltext ─────────┤          │
          │    │       │             │          │
          │    │  elasticsearch      │          │
          │    │                     │          │
          └────┴─────── minio ──────┴──────────┘
```

> **Note:** Elasticsearch 7.14.2 is used (not OpenSearch) because Huly's
> fulltext service bundles `elasticsearch-js` which rejects non-Elasticsearch backends.

## Directory layout

```
kube/
  base/
    config/         # ConfigMap with URLs and app settings
    infra/          # CockroachDB, Redpanda, Elasticsearch, MinIO
    app/            # 8 Huly services
    ingress/        # 6 nginx Ingress resources (path-based routing)
  overlays/
    example/        # Copy this, set your domain + image tags
```

## Prerequisites

- Kubernetes cluster with:
  - [ingress-nginx](https://kubernetes.github.io/ingress-nginx/)
  - [cert-manager](https://cert-manager.io/) with a `ClusterIssuer` named `letsencrypt-prod`
- `kubectl` configured for your cluster
- DNS A record pointing your domain to the ingress load-balancer IP
- (Optional) Google OAuth credentials for login

## Quick start

```bash
# 1. Create your overlay (copy the example)
cp -r kube/overlays/example kube/overlays/my-site
# Edit kube/overlays/my-site/kustomization.yaml:
#   - Uncomment the patches section
#   - Replace huly.yourdomain.com with your actual domain
#   - Replace you@yourdomain.com with your admin email
#   - Pin image tags to a specific version (e.g., v0.7.382)

# 2. Create namespace
kubectl create namespace huly

# 3. Create secrets
SERVER_SECRET=$(openssl rand -hex 32)
CR_PASS=$(openssl rand -hex 16)
RP_PASS=$(openssl rand -hex 16)

kubectl -n huly create secret generic huly-secret \
  --from-literal=SERVER_SECRET="$SERVER_SECRET" \
  --from-literal=STORAGE_CONFIG='minio|minio?accessKey=minioadmin&secretKey=minioadmin' \
  --from-literal=COCKROACH_PASSWORD="$CR_PASS" \
  --from-literal=REDPANDA_SUPERUSER_PASSWORD="$RP_PASS" \
  --from-literal=CR_DB_URL='postgres://root@cockroach:26257/defaultdb?sslmode=disable' \
  --from-literal=GOOGLE_CLIENT_ID='<your-google-client-id>' \
  --from-literal=GOOGLE_CLIENT_SECRET='<your-google-client-secret>'

# 4. Deploy
kubectl apply -k kube/overlays/my-site/

# 5. Watch pods come up
kubectl -n huly get pods -w
```

## One-liner deploy

If you have `envsubst` available, you can deploy with a single command after
creating the namespace and secret above:

```bash
HULY_DOMAIN=huly.yourdomain.com \
ADMIN_EMAIL=you@yourdomain.com \
HULY_VERSION=v0.7.382 \
  bash kube/deploy.sh
```

> See the [deploy.sh script](#deploy-script) section below for details.

## Authentication

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://<your-domain>/_accounts/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `huly-secret`

### Admin bootstrap

The first user to sign up creates their workspace and becomes the workspace owner.
Set `ADMIN_EMAILS` in the ConfigMap to grant system-wide admin privileges (comma-separated).

### Restricting sign-ups

After creating admin accounts, add `DISABLE_SIGNUP=true` to the account and
front deployments. New users can then only join via workspace invites.

## Upgrading

Edit your overlay's `kustomization.yaml` — change all `newTag` values, then:

```bash
kubectl apply -k kube/overlays/my-site/
```

## Verify

```bash
# All 12 pods should be Running
kubectl -n huly get pods

# Front responds
curl -I https://<your-domain>/

# Account responds (405 = healthy, POST-only API)
curl -I https://<your-domain>/_accounts

# CockroachDB admin UI (port-forward)
kubectl -n huly port-forward svc/cockroach 8080:8080
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Pod stuck in `Init` | Infra not ready — `kubectl -n huly logs <pod> -c wait-cockroach` |
| Account CrashLoop | DB auth — `kubectl -n huly logs deploy/account` |
| Front CrashLoop | Missing env — check logs for `please provide <var>` |
| Redpanda won't start | Needs ≥1Gi memory limit |
| Elasticsearch permission denied | Pod spec needs `securityContext.fsGroup: 1000` |
| Fulltext `ProductNotSupportedError` | Must use ES 7.14.2, not OpenSearch |
| WebSocket 502 | Check ingress `proxy-read-timeout: "3600"` annotation |

## Services

| Service | Port | Protocol | Needs DB | Needs Redpanda |
|---------|------|----------|----------|----------------|
| front | 8080 | HTTP | - | - |
| account | 3000 | HTTP | yes | yes |
| transactor | 3333 | WebSocket | yes | yes |
| collaborator | 3078 | WebSocket | - | - |
| workspace | - | background | yes | yes |
| fulltext | 4700 | HTTP | yes | yes |
| rekoni | 4004 | HTTP | - | - |
| stats | 4900 | HTTP | - | - |

## Teardown

```bash
kubectl delete -k kube/overlays/my-site/
kubectl -n huly delete secret huly-secret
kubectl delete namespace huly
# PVCs are retained — delete manually if needed:
kubectl -n huly delete pvc --all
```
