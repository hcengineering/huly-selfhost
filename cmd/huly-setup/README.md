# Huly Self-Host Setup (`huly-setup`)

`huly-setup` is the new Go + Bubble Tea replacement for the legacy `setup.sh`
and `nginx.sh` scripts. It generates the same artifacts (`compose.yml`,
`huly_v7.conf`, `.huly.nginx`) but adds:

- **Two deployment profiles** — `multi` (multi-tenant / upstream-equivalent)
  and `single` (memory-tuned for one user on a small VPS).
- **Two network topologies** — `builtin` (in-stack nginx container) and
  `reverse-proxy` (skips nginx, emits a paste-ready snippet for your existing
  proxy).
- **Dry-run mode** that renders every file and prints the docker commands
  without writing or executing anything — perfect for CI and previews.
- **First-class non-interactive mode** for scripts.
- **Cross-platform binary distribution** via GitHub Releases + a one-line
  bash installer.

## Quickstart

```bash
# Interactive (Bubble Tea TUI):
./huly-setup

# Same as the old ./setup.sh --quick:
./huly-setup --quick

# Behind your own reverse proxy (no in-stack nginx), exposing services on
# 127.0.0.1 so the host's system nginx can reach them:
./huly-setup --only-render --non-interactive \
  --multi-tenant --host=huly.example.com --port=443 --tls \
  --behind-reverse-proxy --expose-mode=127.0.0.1

# Single-tenant, fully scripted:
./huly-setup --non-interactive \
  --single-tenant --host=huly.example.com --port=443 --tls

# Just preview, do nothing:
./huly-setup --dry-run --single-tenant
```

## Distribution

GitHub Actions (`.github/workflows/release.yaml`) cross-compiles the binary for
linux/darwin × amd64/arm64 + windows/amd64 and attaches the tarballs to the
release. Tag with `huly-setup-v*` to trigger:

```bash
git tag huly-setup-v0.1.0
git push origin huly-setup-v0.1.0
```

Users install with one line:

```bash
curl -fsSL https://raw.githubusercontent.com/hcengineering/huly-selfhost/main/scripts/install.sh | bash
```

This downloads the matching binary, drops it into `~/.local/bin/huly-setup`,
and launches it. Pin a version with `HULY_SETUP_VERSION=huly-setup-v0.1.0`.

## Profiles in detail

### `single` (recommended for self-host)

Cherry-picks the memory & logging tuning from the upstream huly-selfhost
branch:

- ~4 GB RAM at idle, ~6 GB under load
- Per-service memory limits (`deploy.resources.limits.memory`)
- Per-service log rotation (3m–30m × 3–5 files)
- `GOGC=200` for cockroach
- Elastic heap dropped from 1 GB → 768 MB
- Redpanda constrained to 256 MB
- `DISABLED_FEATURES=auto-translate,mailboxes,signup,passwords,recover`
  (signup/passwords/recover don't make sense for a single owner)
- `INIT_REPO_DIR=/no-init-scripts` so new workspaces aren't seeded with
  example content

### `multi`

Upstream-equivalent — no memory caps, no log rotation, no feature disabling.
Use this if you want the same behaviour as the upstream `hcengineering/huly-selfhost`
and don't mind the resource cost.

## Topologies

### `builtin`

The compose stack ships an `nginx:1.21.3` container that bind-mounts
`.huly.nginx` and forwards to `front:8080`, `account:3000`, etc. via the
internal `huly_net` bridge. This is what the legacy `setup.sh` always did.

### `reverse-proxy`

The `nginx:` service is removed from the generated compose. You get a
`reverse-proxy.conf` snippet instead. After selecting this topology the TUI
(or `--expose-mode` flag) asks how the proxy reaches the services:

| Expose mode | Compose port bindings | Snippet upstream targets |
|---|---|---|
| `127.0.0.1` (default, recommended for system nginx / caddy / traefik on the host) | `127.0.0.1:8080:8080`, `127.0.0.1:3000:3000`, ... | `server 127.0.0.1:8080`, ... |
| `0.0.0.0` (proxy is on a different host that can reach this one) | `0.0.0.0:8080:8080`, ... | `server 0.0.0.0:8080`, ... |
| `network` (proxy joins the `huly_net` docker network) | none (services only on the docker network) | `server front:8080`, ... |

Paste the snippet into your existing nginx server block (or translate for
caddy / traefik).

## Command-line flags

```
      --bind string             bind IP (defaults to 0.0.0.0)
      --dry-run                 render files and log docker commands without writing/executing
      --help                    show help and exit
      --host string             public host (domain or IP)
      --huly-version string     Huly platform version (e.g. v0.7.426)
      --language string         default language
      --no-tls                  disable HTTPS
      --non-interactive         use flags only, never prompt; require all values
      --only-render             render files but don't run docker compose up
      --port int                public port
      --profile string          deployment profile: multi or single
      --quick                   use defaults, skip prompts, start immediately
      --reset-volumes           clear all volume host-path overrides and exit
      --rotate-secrets          regenerate .huly.secret/.cr.secret/.rp.secret
      --single-tenant           alias for --profile=single
      --behind-reverse-proxy    alias for --topology=reverse-proxy
      --bind-mode string        alias for --expose-mode (127.0.0.1|0.0.0.0|network)
      --expose-mode string      reverse-proxy expose mode: 127.0.0.1, 0.0.0.0, or network (only with --topology=reverse-proxy)
      --multi-tenant            alias for --profile=multi
      --skip-pull               don't pull images before up
      --skip-up                 don't run docker compose up
      --title string            instance title
      --tls                     enable HTTPS
      --topology string         network topology: builtin or reverse-proxy
      --version                 print version and exit
      --volume-cr-certs string  host path for cockroachdb certs volume
      --volume-cr-data string   host path for cockroachdb data volume
      --volume-elastic string   host path for elasticsearch volume
      --volume-files string     host path for files volume
      --volume-redpanda string  host path for redpanda volume
```

## Development

```bash
make build   # ./huly-setup
make test    # go test ./... -count=1
make vet
```

Templates are embedded into the binary via `//go:embed`. If you change a
template under `internal/compose/*.tmpl`, `internal/nginx/*.conf`, or
`internal/envconf/envconf.go`, rebuild.

## Migrating from the old `setup.sh`

The new tool generates the same file layout, so existing `huly_v7.conf`,
`.huly.secret`, `.cr.secret`, `.rp.secret` are picked up — re-running the new
tool on an existing checkout will only overwrite fields you've changed.

The legacy `setup.sh` and `nginx.sh` are kept around for reference but are no
longer maintained. Delete them after you've migrated:

```bash
rm setup.sh nginx.sh .template.huly.conf .template.nginx.conf
```
