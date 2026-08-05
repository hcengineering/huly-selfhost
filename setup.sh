#!/usr/bin/env bash
# Thin shim around the Go `huly-setup` binary. The real implementation lives
# in cmd/huly-setup; this file exists so existing workflows that invoke
# `./setup.sh` keep working.
#
# Resolution order:
#   1. ./huly-setup on PATH or in $PWD
#   2. `go run ./cmd/huly-setup` (dev / no-binary users)
#
# All CLI args are forwarded as-is.

set -euo pipefail

if [ -x "./huly-setup" ]; then
  exec ./huly-setup "$@"
fi

if command -v huly-setup >/dev/null 2>&1; then
  exec huly-setup "$@"
fi

if command -v go >/dev/null 2>&1; then
  if [ -d "cmd/huly-setup" ]; then
    exec go run ./cmd/huly-setup "$@"
  fi
fi

echo "setup.sh: huly-setup binary not found and 'go' is not on PATH." >&2
echo "Install Go (https://go.dev/dl/) or run:" >&2
echo "  go build -o huly-setup ./cmd/huly-setup" >&2
exit 1