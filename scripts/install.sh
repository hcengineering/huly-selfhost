#!/usr/bin/env bash
# Huly self-host one-line installer.
#
# Downloads the appropriate huly-setup binary for the host OS/arch into
# ~/.local/bin/huly-setup (or $INSTALL_DIR if set) and launches it.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/hcengineering/huly-selfhost/main/scripts/install.sh | bash
#   curl -fsSL ... | bash -s -- --single-tenant --host=huly.example.com --port=443 --tls
#
# Environment overrides:
#   HULY_SETUP_VERSION   Tag/branch to install (default: latest GitHub release)
#   HULY_SETUP_REPO      GitHub repo (default: hcengineering/huly-selfhost)
#   INSTALL_DIR          Where to drop the binary (default: ~/.local/bin)

set -euo pipefail

REPO="${HULY_SETUP_REPO:-hcengineering/huly-selfhost}"
VERSION="${HULY_SETUP_VERSION:-}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
BIN_NAME="huly-setup"

log()  { printf '\033[1;36m[huly-setup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[huly-setup]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[huly-setup]\033[0m %s\n' "$*" >&2; }

detect_os_arch() {
  local os arch
  case "$(uname -s)" in
    Linux)  os="linux" ;;
    Darwin) os="darwin" ;;
    *) err "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64)  arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) err "Unsupported arch: $(uname -m)"; exit 1 ;;
  esac
  echo "${os}_${arch}"
}

resolve_version() {
  if [ -n "$VERSION" ]; then
    echo "$VERSION"
    return
  fi
  log "Resolving latest release from GitHub..."
  local url="https://api.github.com/repos/${REPO}/releases/latest"
  if command -v curl >/dev/null 2>&1; then
    VERSION="$(curl -fsSL "$url" | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  elif command -v wget >/dev/null 2>&1; then
    VERSION="$(wget -qO- "$url" | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  else
    err "Neither curl nor wget is available"
    exit 1
  fi
  if [ -z "$VERSION" ]; then
    err "Could not determine latest version (try HULY_SETUP_VERSION=v0.7.426)"
    exit 1
  fi
  echo "$VERSION"
}

download_binary() {
  local target="$1" version="$2" url tmp
  url="https://github.com/${REPO}/releases/download/${version}/huly-setup_${version}_${target}.tar.gz"
  tmp="$(mktemp -d)"
  log "Downloading $url"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$tmp/installer.tgz"
  else
    wget -q "$url" -O "$tmp/installer.tgz"
  fi
  tar -xzf "$tmp/installer.tgz" -C "$tmp"
  install -d "$INSTALL_DIR"
  install -m 0755 "$tmp/$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"
  rm -rf "$tmp"
}

ensure_path() {
  case ":$PATH:" in
    *":$INSTALL_DIR:"*) return ;;
  esac
  warn "$INSTALL_DIR is not in PATH. Add it with:"
  warn "  export PATH=\"$INSTALL_DIR:\$PATH\""
}

main() {
  local target version
  target="$(detect_os_arch)"
  version="$(resolve_version)"
  mkdir -p "$INSTALL_DIR"
  download_binary "$target" "$version"
  log "Installed $BIN_NAME $version to $INSTALL_DIR/$BIN_NAME"
  ensure_path
  log "Launching interactive setup..."
  exec "$INSTALL_DIR/$BIN_NAME" "$@"
}

main "$@"
