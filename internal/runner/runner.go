// Package runner orchestrates the end-to-end setup: load previous config, ask
// the user (or use flags), validate, render artifacts (env, compose, nginx),
// and optionally invoke docker compose.
package runner

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/compose"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/docker"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/envconf"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/nginx"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/secrets"
)

// Options controls the run. The TUI populates it incrementally; CLI flags
// populate it up-front for --non-interactive runs.
type Options struct {
	// Existing path to override config load (defaults to huly_v7.conf in cwd).
	ConfigPath string
	// Output path for the generated env file. Defaults to <project>/huly_v7.conf.
	EnvPath string
	// Output path for the generated compose.yml.
	ComposePath string
	// Output path for the generated .huly.nginx (in-container nginx config).
	NginxPath string
	// Optional output path for the reverse-proxy snippet.
	SnippetPath string
	// Where the secret files live (defaults to <project>/).
	SecretDir string

	// Rotate any existing secrets (otherwise reuse).
	RotateSecrets bool

	// Pull + Up - the standard "apply" path.
	Pull bool
	Up   bool

	// Skip applying - just render artifacts.
	OnlyRender bool
}

// Result summarises what the runner did.
type Result struct {
	Config           config.Config
	EnvPath          string
	ComposePath      string
	NginxPath        string
	SnippetPath      string
	ComposeRendered  string
	EnvRendered      string
	NginxRendered    string
	SnippetRendered  string
	HulySecret       string
	CRSecret         string
	RedpandaSecret   string
	StartTime        time.Time
	Duration         time.Duration
	DockerActions    []string
}

// Run executes the setup. The cfg passed in has already had defaults applied
// and any TUI/flag overrides; runner handles persistence + execution only.
func Run(ctx context.Context, cfg config.Config, opts Options, inv docker.Invoker, out io.Writer) (*Result, error) {
	if out == nil {
		out = os.Stdout
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	dir, err := config.HulyDir()
	if err != nil {
		return nil, err
	}
	if opts.ConfigPath == "" {
		opts.ConfigPath = filepath.Join(dir, config.ConfigFileName)
	}
	if opts.EnvPath == "" {
		opts.EnvPath = opts.ConfigPath
	}
	if opts.ComposePath == "" {
		opts.ComposePath = filepath.Join(dir, config.ComposeFileName)
	}
	if opts.NginxPath == "" {
		opts.NginxPath = filepath.Join(dir, config.NginxFileName)
	}
	if opts.SnippetPath == "" {
		opts.SnippetPath = filepath.Join(dir, "reverse-proxy.conf")
	}
	if opts.SecretDir == "" {
		opts.SecretDir = dir
	}

	res := &Result{
		Config:    cfg,
		EnvPath:   opts.EnvPath,
		ComposePath: opts.ComposePath,
		NginxPath: opts.NginxPath,
		SnippetPath: opts.SnippetPath,
		StartTime: time.Now(),
	}

	// Secrets: ensure they exist (or rotate if requested).
	hulyPath := filepath.Join(opts.SecretDir, config.HulySecretFile)
	crPath := filepath.Join(opts.SecretDir, config.CRSecretFile)
	rpPath := filepath.Join(opts.SecretDir, config.RedpandaSecretFile)
	hulySecret, err := secrets.Ensure(hulyPath, opts.RotateSecrets)
	if err != nil {
		return nil, fmt.Errorf("ensure huly secret: %w", err)
	}
	crSecret, err := secrets.Ensure(crPath, opts.RotateSecrets)
	if err != nil {
		return nil, fmt.Errorf("ensure cr secret: %w", err)
	}
	rpSecret, err := secrets.Ensure(rpPath, opts.RotateSecrets)
	if err != nil {
		return nil, fmt.Errorf("ensure rp secret: %w", err)
	}
	res.HulySecret = hulySecret
	res.CRSecret = crSecret
	res.RedpandaSecret = rpSecret

	// Render compose.
	composeOut, err := compose.Render(cfg)
	if err != nil {
		return nil, fmt.Errorf("render compose: %w", err)
	}
	res.ComposeRendered = composeOut

	// Render env.
	envOut, err := envconf.Render(cfg, hulySecret, crSecret, rpSecret)
	if err != nil {
		return nil, fmt.Errorf("render env: %w", err)
	}
	res.EnvRendered = envOut

	// Render nginx.
	if cfg.Topology == config.TopologyBuiltin {
		nginxOut, err := nginx.Render(cfg)
		if err != nil {
			return nil, fmt.Errorf("render nginx: %w", err)
		}
		res.NginxRendered = nginxOut
	}
	if cfg.Topology == config.TopologyReverse {
		snippetOut, err := nginx.ReverseProxySnippet(cfg)
		if err != nil {
			return nil, fmt.Errorf("render snippet: %w", err)
		}
		res.SnippetRendered = snippetOut
	}

	// Persist artifacts.
	if !cfg.DryRun {
		if err := writeFile(opts.EnvPath, envOut); err != nil {
			return nil, err
		}
		if err := writeFile(opts.ComposePath, composeOut); err != nil {
			return nil, err
		}
		// Maintain backwards-compat: write .env symlink if absent.
		envLink := filepath.Join(dir, ".env")
		if _, err := os.Lstat(envLink); err != nil {
			_ = os.Symlink(filepath.Base(opts.EnvPath), envLink)
		}
		if res.NginxRendered != "" {
			if err := writeFile(opts.NginxPath, res.NginxRendered); err != nil {
				return nil, err
			}
		}
		if res.SnippetRendered != "" {
			if err := writeFile(opts.SnippetPath, res.SnippetRendered); err != nil {
				return nil, err
			}
		}
	} else {
		fmt.Fprintln(out, "[dry-run] would write:")
		for _, p := range []string{opts.EnvPath, opts.ComposePath} {
			fmt.Fprintf(out, "  - %s (%d bytes)\n", p, len(envOut))
		}
		fmt.Fprintf(out, "  (compose: %d bytes)\n", len(composeOut))
		if res.NginxRendered != "" {
			fmt.Fprintf(out, "  - %s (%d bytes)\n", opts.NginxPath, len(res.NginxRendered))
		}
		if res.SnippetRendered != "" {
			fmt.Fprintf(out, "  - %s (%d bytes)\n", opts.SnippetPath, len(res.SnippetRendered))
		}
	}

	if !opts.OnlyRender && !cfg.SkipPull && !cfg.DryRun {
		if err := inv.Pull(ctx, dir); err != nil {
			return nil, fmt.Errorf("docker compose pull: %w", err)
		}
		res.DockerActions = append(res.DockerActions, "pull")
	}
	if !opts.OnlyRender && !cfg.SkipUp && !cfg.DryRun {
		if err := inv.Up(ctx, dir, true); err != nil {
			return nil, fmt.Errorf("docker compose up: %w", err)
		}
		res.DockerActions = append(res.DockerActions, "up -d")
	} else if cfg.DryRun && !opts.OnlyRender {
		// Still let the invoker log the intent; useful for `--dry-run --only-render=false`.
		_ = inv.Pull(ctx, dir)
		_ = inv.Up(ctx, dir, true)
	}

	res.Duration = time.Since(res.StartTime)
	return res, nil
}

func writeFile(path, body string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.WriteString(body); err != nil {
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

// PrintSummary writes a human-readable summary to out.
func PrintSummary(res *Result, out io.Writer) {
	if out == nil {
		out = os.Stdout
	}
	w := func(format string, args ...any) {
		fmt.Fprintf(out, format+"\n", args...)
	}
	w("")
	w("════════════════════════════════════════════════════════════════")
	w("  Huly setup complete in %s", res.Duration.Round(time.Millisecond))
	w("════════════════════════════════════════════════════════════════")
	w("  Profile:           %s", res.Config.Profile)
	w("  Topology:          %s", res.Config.Topology)
	w("  Host:              %s", res.Config.HostAddress)
	w("  Port:              %d  (secure=%v)", res.Config.HTTPPort, res.Config.Secure)
	w("  Version:           %s", res.Config.HulyVersion)
	w("  Generated files:")
	w("    env      -> %s", res.EnvPath)
	w("    compose  -> %s", res.ComposePath)
	if res.NginxRendered != "" {
		w("    nginx    -> %s", res.NginxPath)
	}
	if res.SnippetRendered != "" {
		w("    snippet  -> %s", res.SnippetPath)
	}
	if len(res.DockerActions) > 0 {
		w("  Docker actions: %s", strings.Join(res.DockerActions, ", "))
	}
	w("")
	if res.Config.Topology == config.TopologyBuiltin {
		w("  Open: http%s://%s", secure(res.Config.Secure), urlHost(res.Config))
	} else {
		w("  Configure your reverse proxy with %s and you're done.", res.SnippetPath)
	}
}

func secure(b bool) string {
	if b {
		return "s"
	}
	return ""
}

func urlHost(c config.Config) string {
	if c.IsLocal() {
		if c.Secure {
			return fmt.Sprintf("localhost:%d", c.HTTPPort)
		}
		if c.HTTPPort == 80 {
			return "localhost"
		}
		return fmt.Sprintf("localhost:%d", c.HTTPPort)
	}
	return c.HostAddress
}

// IsCancellable lets the TUI short-circuit when the user hits Ctrl-C during a
// long pull.
func IsCancellable(err error) bool {
	return errors.Is(err, context.Canceled)
}
