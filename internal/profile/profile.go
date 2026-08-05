// Package profile describes the trade-offs between multi-tenant and
// single-tenant deployment profiles. The descriptions are surfaced in both
// the TUI and the --help text.
package profile

import (
	"fmt"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

// Description returns a multi-line explanation of the profile.
func Description(p config.Profile) string {
	switch p {
	case config.ProfileSingle:
		return single
	case config.ProfileMulti:
		return multi
	default:
		return fmt.Sprintf("unknown profile %q", p)
	}
}

// Short returns a single-line summary.
func Short(p config.Profile) string {
	switch p {
	case config.ProfileSingle:
		return "Single host / single user — tuned memory & logging caps, ~4 GB RAM at idle."
	case config.ProfileMulti:
		return "Multi-tenant / SaaS — unbounded resources, upstream-equivalent defaults."
	default:
		return string(p)
	}
}

const multi = `Multi-tenant / SaaS profile

  ▸ What this means:
    Designed for hosting many concurrent users. Services are NOT memory-capped
    and the default logging is unbounded.

  ▸ When to pick this:
    • You are running Huly for a team, an organization, or as a paid service.
    • You want upstream-equivalent behaviour and don't mind the resource cost.
    • You plan to scale horizontally or have already tuned the compose file.

  ▸ What you give up:
    • Larger disk usage from logs (no per-service rotation caps).
    • No OOM protection — a single buggy container can starve the host.

  ▸ What you get:
    • Predictable performance characteristics for many simultaneous users.
    • Compatibility with the upstream huly-selfhost reference setup.

→ Press Enter for this profile, or use --single-tenant / --multi-tenant.`

const single = `Single-tenant / single-host profile  (RECOMMENDED for self-host)

  ▸ What this means:
    Tuned for ONE user running the entire stack on a small VPS. Every service
    has a memory limit and the NODE heap is capped at ~75% of that. Logs are
    rotated per-service so a chatty container can't fill the disk.

  ▸ Memory footprint at idle:
    ~4 GB RAM total. Heavy load can push it to ~6 GB.

  ▸ Disabled for self-host:
    auto-translate, mailboxes, signup, passwords, recover (you don't need a
    password-reset flow when there's a single owner).

  ▸ Also enables:
    • init-repo skipping (INIT_REPO_DIR=/no-init-scripts) so new workspaces
      aren't seeded with example content.
    • Per-service JSON log rotation with measured caps.
    • Smaller Elastic heap (512m – 768m) — plenty for a single user's index.

  ▸ When NOT to pick this:
    • You serve more than a handful of concurrent users.
    • You're benchmarking Huly's performance.

→ Press Enter for this profile, or use --single-tenant / --multi-tenant.`
