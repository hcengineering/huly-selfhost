package runner

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/docker"
)

type fakeInv struct {
	upCalled   bool
	pullCalled bool
}

func (f *fakeInv) Info(ctx context.Context) (string, error)  { return "v0.0", nil }
func (f *fakeInv) Pull(ctx context.Context, dir string) error { f.pullCalled = true; return nil }
func (f *fakeInv) Up(ctx context.Context, dir string, detach bool) error {
	f.upCalled = true
	return nil
}
func (f *fakeInv) Down(ctx context.Context, dir string) error  { return nil }
func (f *fakeInv) Ps(ctx context.Context, dir string) (string, error) { return "[]", nil }
func (f *fakeInv) Command(ctx context.Context, dir string, args ...string) error { return nil }
func (f *fakeInv) CommandOutput(ctx context.Context, dir string, args ...string) (string, error) {
	return "", nil
}

func TestRunDryRun(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("HULY_SETUP_DIR", dir)

	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true, DryRun: true}
	c.ApplyDefaults()
	c.Profile = config.ProfileSingle
	c.Topology = config.TopologyBuiltin

	inv := &docker.DryRunInvoker{Logger: func(string) {}}
	res, err := Run(context.Background(), c, Options{}, inv, io.Discard)
	if err != nil {
		t.Fatal(err)
	}
	if res.ComposeRendered == "" || res.EnvRendered == "" {
		t.Fatal("expected rendered compose/env")
	}
	if _, err := os.Stat(filepath.Join(dir, "huly_v7.conf")); err == nil {
		t.Fatal("dry-run should NOT write files")
	}
	if !strings.Contains(res.ComposeRendered, "memory: 1792M") {
		t.Fatalf("expected single-tenant compose memory budgets in output:\n%s", snippet(res.ComposeRendered, 400))
	}
}

func TestRunWritesFilesAndCallsDocker(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("HULY_SETUP_DIR", dir)

	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()

	fake := &fakeInv{}
	res, err := Run(context.Background(), c, Options{}, fake, io.Discard)
	if err != nil {
		t.Fatal(err)
	}
	if !fake.pullCalled || !fake.upCalled {
		t.Fatal("expected pull + up to be invoked")
	}
	if res.ComposePath == "" || res.EnvPath == "" {
		t.Fatal("expected populated paths")
	}
	if _, err := os.Stat(res.ComposePath); err != nil {
		t.Fatalf("compose.yml not written: %v", err)
	}
	if _, err := os.Stat(res.EnvPath); err != nil {
		t.Fatalf("env file not written: %v", err)
	}
}

func TestRunReverseProxyOmitsNginx(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("HULY_SETUP_DIR", dir)

	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true, Topology: config.TopologyReverse}
	c.ApplyDefaults()
	inv := &docker.DryRunInvoker{Logger: func(string) {}}
	res, err := Run(context.Background(), c, Options{OnlyRender: true}, inv, io.Discard)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(res.ComposeRendered, "\n  nginx:\n") {
		t.Fatal("reverse-proxy compose should not include the nginx service")
	}
	if res.SnippetRendered == "" {
		t.Fatal("expected reverse-proxy snippet")
	}
}

func snippet(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "...(truncated)"
}
