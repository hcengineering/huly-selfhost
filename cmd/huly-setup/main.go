// Command huly-setup renders the Huly self-host compose/env/nginx stack and
// (optionally) brings it up with docker compose.
//
// Usage:
//
//	huly-setup                            # interactive Bubble Tea UI
//	huly-setup --quick                    # localhost:8087, no TLS, defaults
//	huly-setup --dry-run --single-tenant  # show what would happen
//	huly-setup --non-interactive --single-tenant --host=huly.example.com --tls
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/mattn/go-isatty"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/docker"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/runner"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/tui"
)

var version = "dev"

func main() {
	if err := run(os.Args[1:], os.Stdin, os.Stdout, os.Stderr); err != nil {
		fmt.Fprintf(os.Stderr, "huly-setup: %v\n", err)
		os.Exit(1)
	}
}

type parsedFlags struct {
	Quick            bool
	DryRun           bool
	NonInteractive   bool
	RotateSecrets    bool
	OnlyRender       bool
	SkipPull         bool
	SkipUp           bool
	Profile          string
	Topology         string
	ExposeMode       string
	BindMode         string
	SingleTenant     bool
	MultiTenant      bool
	BehindProxy      bool
	Host             string
	Port             int
	Bind             string
	Secure           bool
	Insecure         bool
	Title            string
	Language         string
	Version          string
	VolumeElastic    string
	VolumeFiles      string
	VolumeCRData     string
	VolumeCRCerts    string
	VolumeRedpanda   string
	ResetVolumes     bool
	ShowVersion      bool
	ShowHelp         bool
}

func run(args []string, stdin io.Reader, stdout, stderr io.Writer) error {
	fs := flag.NewFlagSet("huly-setup", flag.ContinueOnError)
	fs.SetOutput(stderr)
	var p parsedFlags
	fs.BoolVar(&p.Quick, "quick", false, "use defaults, skip prompts, start immediately")
	fs.BoolVar(&p.DryRun, "dry-run", false, "render files and log docker commands without writing/executing")
	fs.BoolVar(&p.NonInteractive, "non-interactive", false, "use flags only, never prompt; require all values")
	fs.BoolVar(&p.RotateSecrets, "rotate-secrets", false, "regenerate .huly.secret/.cr.secret/.rp.secret")
	fs.BoolVar(&p.OnlyRender, "only-render", false, "render files but don't run docker compose up")
	fs.BoolVar(&p.SkipPull, "skip-pull", false, "don't pull images before up")
	fs.BoolVar(&p.SkipUp, "skip-up", false, "don't run docker compose up")
	fs.StringVar(&p.Profile, "profile", "", "deployment profile: multi or single")
	fs.StringVar(&p.Topology, "topology", "", "network topology: builtin or reverse-proxy")
	fs.StringVar(&p.ExposeMode, "expose-mode", "", "reverse-proxy expose mode: 127.0.0.1, 0.0.0.0, or network (only with --topology=reverse-proxy)")
	fs.BoolVar(&p.SingleTenant, "single-tenant", false, "alias for --profile=single")
	fs.BoolVar(&p.MultiTenant, "multi-tenant", false, "alias for --profile=multi")
	fs.BoolVar(&p.BehindProxy, "behind-reverse-proxy", false, "alias for --topology=reverse-proxy")
	fs.StringVar(&p.BindMode, "bind-mode", "", "alias for --expose-mode when behind a reverse proxy (127.0.0.1|0.0.0.0|network)")
	fs.StringVar(&p.Host, "host", "", "public host (domain or IP)")
	fs.IntVar(&p.Port, "port", 0, "public port")
	fs.StringVar(&p.Bind, "bind", "", "bind IP (defaults to 0.0.0.0)")
	fs.BoolVar(&p.Secure, "tls", false, "enable HTTPS")
	fs.BoolVar(&p.Insecure, "no-tls", false, "disable HTTPS")
	fs.StringVar(&p.Title, "title", "", "instance title")
	fs.StringVar(&p.Language, "language", "", "default language")
	fs.StringVar(&p.Version, "huly-version", "", "Huly platform version (e.g. v0.7.426)")
	fs.StringVar(&p.VolumeElastic, "volume-elastic", "", "host path for elasticsearch volume")
	fs.StringVar(&p.VolumeFiles, "volume-files", "", "host path for files volume")
	fs.StringVar(&p.VolumeCRData, "volume-cr-data", "", "host path for cockroachdb data volume")
	fs.StringVar(&p.VolumeCRCerts, "volume-cr-certs", "", "host path for cockroachdb certs volume")
	fs.StringVar(&p.VolumeRedpanda, "volume-redpanda", "", "host path for redpanda volume")
	fs.BoolVar(&p.ResetVolumes, "reset-volumes", false, "clear all volume host-path overrides and exit")
	fs.BoolVar(&p.ShowVersion, "version", false, "print version and exit")
	fs.BoolVar(&p.ShowHelp, "help", false, "show help and exit")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return err
	}

	if p.ShowVersion {
		fmt.Fprintf(stdout, "huly-setup %s\n", version)
		return nil
	}
	if p.ShowHelp {
		fs.Usage()
		return nil
	}

	dir, err := config.HulyDir()
	if err != nil {
		return err
	}
	configPath := filepath.Join(dir, config.ConfigFileName)

	if p.ResetVolumes {
		return resetVolumes(configPath)
	}

	// Load existing config so users only need to specify the fields they want
	// to change.
	existing, _ := config.Load(configPath)
	merged := mergeConfig(existing, p)
	merged.ApplyDefaults()

	if p.DryRun {
		merged.DryRun = true
	}
	if p.SkipPull {
		merged.SkipPull = true
	}
	if p.SkipUp {
		merged.SkipUp = true
	}
	if p.Secure && p.Insecure {
		return errors.New("--tls and --no-tls are mutually exclusive")
	}

	if p.Quick {
		if merged.HostAddress == "" {
			merged.HostAddress = "localhost"
		}
		if merged.HTTPPort == 0 {
			merged.HTTPPort = 8087
		}
		merged.Secure = false
		if merged.Profile == "" {
			merged.Profile = config.ProfileSingle
		}
		if merged.Topology == "" {
			merged.Topology = config.TopologyBuiltin
		}
	}

	if !p.NonInteractive && !p.Quick && !merged.DryRun && isTerminal(stdin) && !hasAllRequiredFlags(p) {
		final, err := tui.Run(merged, stdin, stdout)
		if errors.Is(err, tui.ErrAborted) {
			fmt.Fprintln(stderr, "aborted.")
			return nil
		}
		if err != nil {
			return err
		}
		merged = final
		merged.ApplyDefaults()
	} else {
		if !p.Quick && !p.NonInteractive && !merged.DryRun {
			// stdin but no TTY: warn the user and continue with flag/default values.
			fmt.Fprintln(stderr, "warning: stdin is not a TTY; falling back to non-interactive mode (use --non-interactive to silence this warning).")
		}
		if err := merged.Validate(); err != nil {
			return fmt.Errorf("invalid configuration: %w", err)
		}
	}

	// Build the invoker. In dry-run mode we use a bare DryRunInvoker (no
	// Inner) so docker is never actually invoked; otherwise use the real CLI.
	var inv docker.Invoker
	if merged.DryRun {
		inv = &docker.DryRunInvoker{Logger: func(s string) { fmt.Fprintln(stdout, s) }}
	} else {
		inv = &docker.CLIInvoker{Stdout: stdout, Stderr: stderr}
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	res, err := runner.Run(ctx, merged, runner.Options{
		OnlyRender:    p.OnlyRender,
		RotateSecrets: p.RotateSecrets,
	}, inv, stdout)
	if err != nil {
		return err
	}
	if !merged.DryRun {
		runner.PrintSummary(res, stdout)
	}
	return nil
}

func mergeConfig(existing config.Config, p parsedFlags) config.Config {
	c := existing
	if p.Profile != "" {
		c.Profile = config.Profile(p.Profile)
	}
	if p.Topology != "" {
		c.Topology = config.NetworkTopology(p.Topology)
	}
	if p.SingleTenant {
		c.Profile = config.ProfileSingle
	}
	if p.MultiTenant {
		c.Profile = config.ProfileMulti
	}
	if p.BehindProxy {
		c.Topology = config.TopologyReverse
	}
	if p.ExposeMode != "" {
		c.ExposeMode = config.ExposeMode(p.ExposeMode)
	}
	if p.BindMode != "" {
		c.ExposeMode = config.ExposeMode(p.BindMode)
	}
	if p.Host != "" {
		c.HostAddress = p.Host
	}
	if p.Port != 0 {
		c.HTTPPort = p.Port
	}
	if p.Bind != "" {
		c.HTTPBind = p.Bind
	}
	if p.Secure {
		c.Secure = true
	}
	if p.Insecure {
		c.Secure = false
	}
	if p.Title != "" {
		c.Title = p.Title
	}
	if p.Language != "" {
		c.DefaultLanguage = p.Language
	}
	if p.Version != "" {
		c.HulyVersion = p.Version
	}
	if p.VolumeElastic != "" {
		c.VolumeElasticPath = p.VolumeElastic
	}
	if p.VolumeFiles != "" {
		c.VolumeFilesPath = p.VolumeFiles
	}
	if p.VolumeCRData != "" {
		c.VolumeCRDataPath = p.VolumeCRData
	}
	if p.VolumeCRCerts != "" {
		c.VolumeCRCertsPath = p.VolumeCRCerts
	}
	if p.VolumeRedpanda != "" {
		c.VolumeRedpanda = p.VolumeRedpanda
	}
	return c
}

func hasAllRequiredFlags(p parsedFlags) bool {
	return p.Host != "" && p.Port != 0 && p.Profile != "" && p.Topology != ""
}

func resetVolumes(path string) error {
	c, err := config.Load(path)
	if err != nil {
		return err
	}
	c.VolumeElasticPath = ""
	c.VolumeFilesPath = ""
	c.VolumeCRDataPath = ""
	c.VolumeCRCertsPath = ""
	c.VolumeRedpanda = ""
	return config.Save(c, path)
}

func isTerminal(r io.Reader) bool {
	f, ok := r.(*os.File)
	if !ok {
		return false
	}
	return isatty.IsTerminal(f.Fd())
}
