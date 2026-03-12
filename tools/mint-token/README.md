# Huly API Token Minter

Mint workspace-scoped JWTs for programmatic access to the Huly transactor REST API.

## Prerequisites

- Node.js 22+
- `SERVER_SECRET` from your Huly deployment

## Install

```bash
cd tools/mint-token
npm install
```

## Usage

```bash
SERVER_SECRET=<your-secret> npx tsx mint.ts \
  --account <account-uuid> \
  --workspace <workspace-uuid> \
  --expiry 30d
```

### Getting UUIDs

Query CockroachDB to find account and workspace UUIDs:

```bash
# Workspace UUID (from workspace URL slug)
kubectl exec -n huly <cockroach-pod> -- cockroach sql --insecure \
  -e "SELECT uuid FROM global_account.workspace WHERE url = 'my-workspace'"

# Account UUID (from user email)
kubectl exec -n huly <cockroach-pod> -- cockroach sql --insecure \
  -e "SELECT p.uuid FROM global_account.social_id si
      JOIN global_account.person p ON si.person_uuid = p.uuid
      WHERE si.value = 'user@example.com' AND si.type = 'email'"
```

### Options

| Flag          | Description                  | Default |
|---------------|------------------------------|---------|
| `--account`   | Account UUID (required)      | —       |
| `--workspace` | Workspace UUID (required)    | —       |
| `--expiry`    | Token lifetime (e.g. `7d`)   | `30d`   |

Expiry supports `h` (hours) and `d` (days). Maximum: 365 days.

## Using the Token

```bash
# Query documents
curl -H "Authorization: Bearer <token>" \
  "https://huly.example.com/_transactor/api/v1/find-all/<ws-uuid>?class=contact:class:Person"
```

```typescript
// With @hcengineering/api-client
import { connectRest } from '@hcengineering/api-client'
const client = await connectRest('https://huly.example.com', {
  token: '<token>',
  workspace: '<ws-slug>'
})
```
