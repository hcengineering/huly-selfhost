#!/usr/bin/env tsx
/**
 * Mint a workspace-scoped JWT for Huly API access.
 *
 * The token format matches what the Huly platform account service issues,
 * so the transactor accepts it identically.
 *
 * Required env:
 *   SERVER_SECRET — the shared secret used across all Huly services
 *
 * Usage:
 *   SERVER_SECRET=<secret> npx tsx mint.ts \
 *     --account <account-uuid> \
 *     --workspace <workspace-uuid> \
 *     [--expiry 30d]
 *
 * Getting UUIDs from CockroachDB:
 *   kubectl exec -n huly <cockroach-pod> -- cockroach sql --insecure \
 *     -e "SELECT uuid FROM global_account.workspace WHERE url = 'my-workspace'"
 *   kubectl exec -n huly <cockroach-pod> -- cockroach sql --insecure \
 *     -e "SELECT p.uuid FROM global_account.social_id si
 *         JOIN global_account.person p ON si.person_uuid = p.uuid
 *         WHERE si.value = 'user@example.com' AND si.type = 'email'"
 */

import jwt from 'jwt-simple'

// ── Arg parsing ──────────────────────────────────────────────────────

function parseArgs(argv: string[]): { account: string; workspace: string; expiry: string } {
  const args: Record<string, string> = {}
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--') && i + 1 < argv.length) {
      args[arg.slice(2)] = argv[++i]
    }
  }

  if (!args.account || !args.workspace) {
    console.error(`Usage: SERVER_SECRET=<secret> npx tsx mint.ts \\
  --account <account-uuid> \\
  --workspace <workspace-uuid> \\
  [--expiry 30d]

Options:
  --account    Account UUID (person UUID from CockroachDB)
  --workspace  Workspace UUID
  --expiry     Token lifetime: e.g. 1h, 7d, 30d, 365d (default: 30d, max: 365d)`)
    process.exit(1)
  }

  return {
    account: args.account,
    workspace: args.workspace,
    expiry: args.expiry ?? '30d'
  }
}

// ── Duration parsing ─────────────────────────────────────────────────

function parseDurationSeconds(duration: string): number {
  const match = duration.match(/^(\d+)(h|d)$/)
  if (!match) {
    console.error(`Invalid expiry format: "${duration}". Use e.g. 1h, 7d, 30d, 365d`)
    process.exit(1)
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  const seconds = unit === 'h' ? value * 3600 : value * 86400

  if (seconds > 365 * 86400) {
    console.error(`Expiry exceeds maximum of 365 days`)
    process.exit(1)
  }

  return seconds
}

// ── Main ─────────────────────────────────────────────────────────────

function main(): void {
  const secret = process.env.SERVER_SECRET
  if (!secret) {
    console.error('Error: SERVER_SECRET environment variable is required')
    process.exit(1)
  }

  const { account, workspace, expiry } = parseArgs(process.argv)
  const durationSec = parseDurationSeconds(expiry)

  const now = Math.floor(Date.now() / 1000)
  const exp = now + durationSec

  const payload = {
    account,
    workspace,
    exp
  }

  const token = jwt.encode(payload, secret)

  const expiresAt = new Date(exp * 1000).toISOString()

  // Output token to stdout (pipe-friendly)
  if (process.stdout.isTTY) {
    console.log()
    console.log(`Token minted successfully`)
    console.log(`  Account:   ${account}`)
    console.log(`  Workspace: ${workspace}`)
    console.log(`  Expires:   ${expiresAt}`)
    console.log()
    console.log(`Token:`)
    console.log(token)
    console.log()
    console.log(`Usage:`)
    console.log(`  curl -H "Authorization: Bearer ${token}" \\`)
    console.log(`    "https://<huly-host>/_transactor/api/v1/find-all/${workspace}?class=contact:class:Person"`)
    console.log()
  } else {
    // When piped, output only the token
    process.stdout.write(token)
  }
}

main()
