# Huly Helm Chart

Deploy [Huly](https://huly.io) — an open-source project management platform — on Kubernetes with a single command.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/) (if using TLS)

## Quick Start

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com
```

All secrets (server secret, CockroachDB password, MinIO credentials) are auto-generated on first install and preserved across `helm upgrade`.

## Authentication

At least one auth provider should be configured. Without one, users cannot sign in.

### Google OAuth

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com \
  --set auth.google.clientId=YOUR_CLIENT_ID \
  --set auth.google.clientSecret=YOUR_CLIENT_SECRET
```

### GitHub OAuth

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com \
  --set auth.github.clientId=YOUR_CLIENT_ID \
  --set auth.github.clientSecret=YOUR_CLIENT_SECRET
```

### OpenID Connect (OIDC)

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com \
  --set auth.oidc.clientId=YOUR_CLIENT_ID \
  --set auth.oidc.clientSecret=YOUR_CLIENT_SECRET \
  --set auth.oidc.issuer=https://accounts.google.com
```

### Disable Public Signup

```bash
--set auth.disableSignup=true
```

## External S3 Storage

By default, the chart deploys a built-in MinIO instance. To use external S3-compatible storage instead:

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com \
  --set storage.type=s3 \
  --set storage.s3.endpoint=https://s3.amazonaws.com \
  --set storage.s3.region=us-east-1 \
  --set storage.s3.accessKey=YOUR_ACCESS_KEY \
  --set storage.s3.secretKey=YOUR_SECRET_KEY \
  --set storage.s3.rootBucket=huly-data
```

Setting `storage.type=s3` automatically disables the built-in MinIO deployment and PVC.

**Bucket modes:**
- `rootBucket` — all workspaces share one bucket, isolated by workspace-ID prefix (recommended)
- `bucketPrefix` — each workspace gets its own bucket, prefixed with this string

## External Infrastructure

Each built-in infra service (CockroachDB, Redpanda, Elasticsearch) can be replaced with an external instance.

### External CockroachDB / PostgreSQL

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com \
  --set cockroach.enabled=false \
  --set secrets.crDbUrl='postgres://user:pass@db.example.com:26257/huly'
```

### External Redpanda / Kafka

```bash
--set redpanda.enabled=false \
--set external.redpanda=kafka.example.com:9092
```

### External Elasticsearch

```bash
--set elastic.enabled=false \
--set external.elastic=https://es.example.com:9200
```

## GitHub Integration

Bidirectional sync of issues, PRs, and comments between Huly and GitHub. Requires a [GitHub App](https://docs.github.com/en/apps/creating-github-apps).

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com \
  --set githubIntegration.enabled=true \
  --set githubIntegration.appId=123456 \
  --set githubIntegration.clientId=Iv1.abc123 \
  --set githubIntegration.clientSecret=YOUR_SECRET \
  --set-file githubIntegration.privateKey=path/to/private-key.pem \
  --set githubIntegration.webhookSecret=YOUR_WEBHOOK_SECRET \
  --set githubIntegration.botName="your-app-name[bot]"
```

**GitHub App settings:**

| Field | Value |
|-------|-------|
| Callback URL | `https://<domain>/github` |
| Setup URL | `https://<domain>/github?op=installation` |
| Webhook URL | `https://<domain>/_github/api/webhook` |
| Permissions | Issues R/W, PRs R/W, Contents R, Metadata R |
| Events | Issues, Issue comment, Pull request, PR review, PR review comment, PR review thread |

## AI Bot

Optional AI assistant powered by OpenAI. Requires an OpenAI API key.

```bash
helm install huly ./helm/huly \
  --set domain=huly.mysite.com \
  --set aibot.enabled=true \
  --set secrets.openaiApiKey=sk-...
```

## Admin Configuration

```bash
--set appSettings.adminEmails="admin@example.com,ops@example.com"
```

## Upgrading

### Version bumps

Update `hulyVersion` to the desired release tag:

```bash
helm upgrade huly ./helm/huly \
  --reuse-values \
  --set hulyVersion=v0.7.400
```

All app service pods restart automatically (via checksum annotations) when the chart version or config changes. Infrastructure services (CockroachDB, Redpanda, Elasticsearch) are **not** restarted on config changes to avoid data-layer disruption.

### From MinIO to S3

When switching storage backends, set the new storage type explicitly — it overrides any previously persisted config:

```bash
helm upgrade huly ./helm/huly \
  --reuse-values \
  --set storage.type=s3 \
  --set storage.s3.endpoint=https://s3.example.com \
  --set storage.s3.region=us-east-1 \
  --set storage.s3.accessKey=KEY \
  --set storage.s3.secretKey=SECRET \
  --set storage.s3.rootBucket=huly-data
```

After confirming S3 works, clean up the orphaned MinIO PVC:

```bash
kubectl delete pvc minio-data -n <namespace>
```

## Troubleshooting

### Services fail to start with connection errors

App services (account, transactor, workspace, fulltext) depend on CockroachDB and Redpanda. The chart includes init containers that wait for these services to accept connections before starting. If you see `ECONNREFUSED` or `ENOTFOUND` errors in logs, restart the affected deployments:

```bash
kubectl rollout restart deployment/account deployment/transactor \
  deployment/workspace deployment/fulltext -n <namespace>
```

### CockroachDB user/password issues

When running CockroachDB with `--insecure` (the default), authentication is disabled. The `COCKROACH_PASSWORD` env var creates the user during init but is not enforced for connections. If using the `root` user, set:

```bash
--set cockroach.username=root \
--set secrets.crDbUrl='postgres://root@cockroach:26257/defaultdb?sslmode=disable'
```

### Checking pod health

```bash
kubectl get pods -l app.kubernetes.io/part-of=huly -n <namespace>
kubectl logs deployment/<service> -n <namespace> --tail=20
```

## Values Reference

### Required

| Key | Description | Default |
|-----|-------------|---------|
| `domain` | Your Huly domain (e.g. `huly.mysite.com`) | `huly.example` |

### Authentication

| Key | Description | Default |
|-----|-------------|---------|
| `auth.google.clientId` | Google OAuth client ID | `""` |
| `auth.google.clientSecret` | Google OAuth client secret | `""` |
| `auth.github.clientId` | GitHub OAuth client ID | `""` |
| `auth.github.clientSecret` | GitHub OAuth client secret | `""` |
| `auth.oidc.clientId` | OIDC client ID | `""` |
| `auth.oidc.clientSecret` | OIDC client secret | `""` |
| `auth.oidc.issuer` | OIDC issuer URL | `""` |
| `auth.disableSignup` | Prevent new user registration | `false` |

### Storage

| Key | Description | Default |
|-----|-------------|---------|
| `storage.type` | `minio` (built-in) or `s3` (external) | `minio` |
| `storage.s3.endpoint` | S3 endpoint URL | `""` |
| `storage.s3.region` | S3 region | `""` |
| `storage.s3.accessKey` | S3 access key | `""` |
| `storage.s3.secretKey` | S3 secret key | `""` |
| `storage.s3.rootBucket` | Single bucket for all workspaces (prefixed by workspace ID) | `""` |
| `storage.s3.bucketPrefix` | Prefix for per-workspace bucket names (if rootBucket empty) | `""` |

### Secrets

All secrets are auto-generated if left empty. They persist across `helm upgrade` via Kubernetes secret lookup.

| Key | Description | Default |
|-----|-------------|---------|
| `secrets.serverSecret` | Shared JWT signing secret | auto |
| `secrets.storageConfig` | Full storage connection string override | auto |
| `secrets.cockroachPassword` | CockroachDB password | auto |
| `secrets.redpandaPassword` | Redpanda superuser password | auto |
| `secrets.crDbUrl` | CockroachDB connection URL | auto |

### Ingress

| Key | Description | Default |
|-----|-------------|---------|
| `ingress.enabled` | Enable ingress resources | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.annotations` | Extra annotations for all ingress resources | `{}` |
| `ingress.tls.enabled` | Enable TLS via cert-manager | `true` |
| `ingress.tls.clusterIssuer` | cert-manager ClusterIssuer name | `letsencrypt-prod` |

### App Settings

| Key | Description | Default |
|-----|-------------|---------|
| `appSettings.title` | Browser title | `Huly Self Host` |
| `appSettings.defaultLanguage` | Default UI language | `en` |
| `appSettings.lastNameFirst` | Display last name first | `true` |
| `appSettings.modelEnabled` | Enabled platform models | `*` |
| `appSettings.adminEmails` | Comma-separated admin emails | `""` |
| `appSettings.desktopChannel` | Desktop update channel | `selfhost` |

### Infrastructure

Each infra service can be disabled to use an external instance. When disabled, provide connection details via the corresponding external/secret keys.

| Key | Description | Default |
|-----|-------------|---------|
| `cockroach.enabled` | Deploy built-in CockroachDB | `true` |
| `cockroach.image` | CockroachDB image | `cockroachdb/cockroach:latest-v24.2` |
| `cockroach.storage` | Data PVC size | `10Gi` |
| `cockroach.storageClassName` | PVC storage class (empty = cluster default) | `""` |
| `cockroach.database` | Database name | `defaultdb` |
| `cockroach.username` | Database user | `selfhost` |
| `redpanda.enabled` | Deploy built-in Redpanda | `true` |
| `redpanda.image` | Redpanda image | `docker.redpanda.com/...` |
| `redpanda.storage` | Data PVC size | `5Gi` |
| `redpanda.storageClassName` | PVC storage class | `""` |
| `elastic.enabled` | Deploy built-in Elasticsearch | `true` |
| `elastic.image` | Elasticsearch image | `elasticsearch:7.14.2` |
| `elastic.storage` | Data PVC size | `10Gi` |
| `elastic.storageClassName` | PVC storage class | `""` |
| `elastic.javaOpts` | JVM heap options | `-Xms1024m -Xmx1024m` |
| `minio.enabled` | Deploy built-in MinIO | `true` |
| `minio.image` | MinIO image | `minio/minio` |
| `minio.storage` | Data PVC size | `50Gi` |
| `minio.storageClassName` | PVC storage class | `""` |

### External Infrastructure

| Key | Description | Default |
|-----|-------------|---------|
| `external.redpanda` | Kafka-compatible broker address (when `redpanda.enabled=false`) | `""` |
| `external.elastic` | Elasticsearch URL (when `elastic.enabled=false`) | `""` |

### Application Services

All app services share these overridable keys: `<svc>.replicas`, `<svc>.resources`.

| Key | Description | Default |
|-----|-------------|---------|
| `hulyVersion` | Image tag for all Huly services | `v0.7.382` |
| `kvs.enabled` | Deploy KVS (key-value store) service | `true` |

### GitHub Integration

| Key | Description | Default |
|-----|-------------|---------|
| `githubIntegration.enabled` | Deploy GitHub integration service | `false` |
| `githubIntegration.replicas` | Replica count | `1` |
| `githubIntegration.botName` | Bot display name (must match GitHub App slug + `[bot]`) | `""` |
| `githubIntegration.appId` | GitHub App ID | `""` |
| `githubIntegration.clientId` | GitHub App Client ID | `""` |
| `githubIntegration.clientSecret` | GitHub App Client Secret | `""` |
| `githubIntegration.privateKey` | GitHub App Private Key (PEM) | `""` |
| `githubIntegration.webhookSecret` | GitHub App Webhook Secret | `""` |

### AI Bot

| Key | Description | Default |
|-----|-------------|---------|
| `aibot.enabled` | Deploy AI bot service | `false` |
| `aibot.replicas` | Replica count | `1` |
| `aibot.firstName` | Bot display first name | `Huly` |
| `aibot.lastName` | Bot display last name | `AI` |
| `secrets.openaiApiKey` | OpenAI API key (required when enabled) | `""` |
| `secrets.openaiBaseUrl` | OpenAI API base URL override | `""` |

### Global Pod Settings

| Key | Description | Default |
|-----|-------------|---------|
| `global.nodeSelector` | Node selector for all pods | `{}` |
| `global.tolerations` | Tolerations for all pods | `[]` |
| `global.affinity` | Affinity rules for all pods | `{}` |

## Architecture

The chart deploys 13+ services (optional services marked with *):

| Service | Port | Description |
|---------|------|-------------|
| **cockroach** | 26257 | SQL database (CockroachDB) |
| **redpanda** | 9092 | Message queue (Kafka-compatible) |
| **elastic** | 9200 | Full-text search (Elasticsearch) |
| **minio** | 9000 | Object storage (S3-compatible) |
| **front** | 8080 | Web UI |
| **account** | 3000 | Authentication & user management |
| **transactor** | 3333 | Core transaction engine |
| **collaborator** | 3078 | Real-time collaboration (WebSocket) |
| **workspace** | — | Workspace lifecycle (background worker) |
| **fulltext** | 4700 | Search indexing |
| **rekoni** | 4004 | Content intelligence |
| **stats** | 4900 | Metrics collection |
| **kvs** | 8094 | Key-value store |
| **github*** | 3500 | GitHub integration (bidirectional sync) |
| **aibot*** | 4010 | AI assistant (requires OpenAI key) |
| **mongodb*** | 27017 | Document database (for aibot) |

All services are exposed under a single domain via path-based NGINX ingress routing:
- `/` → front
- `/_accounts` → account
- `/_transactor` → transactor (WebSocket)
- `/_collaborator` → collaborator (WebSocket)
- `/_rekoni` → rekoni
- `/_stats` → stats
- `/_github` → github *
- `/_aibot` → aibot *

## CI / OCI Registry

On merge to `main`, the GitHub Actions workflow packages and pushes the chart to GHCR:

```bash
helm install huly oci://ghcr.io/hcengineering/charts/huly \
  --version 0.1.0 \
  --set domain=huly.mysite.com
```
