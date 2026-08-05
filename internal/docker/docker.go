// Package docker wraps the docker compose CLI for the setup tool. All exec
// helpers are side-effect aware: when wrapped in a DryRunInvoker, the actual
// command is logged but not executed.
package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

type Invoker interface {
	Info(ctx context.Context) (string, error)
	Pull(ctx context.Context, projectDir string) error
	Up(ctx context.Context, projectDir string, detach bool) error
	Down(ctx context.Context, projectDir string) error
	Ps(ctx context.Context, projectDir string) (string, error)
	Command(ctx context.Context, projectDir string, args ...string) error
	CommandOutput(ctx context.Context, projectDir string, args ...string) (string, error)
}

type CLIInvoker struct {
	Env    []string
	Stdout io.Writer
	Stderr io.Writer
}

func (c *CLIInvoker) composeBin() string {
	if runtime.GOOS == "windows" {
		return "docker.exe"
	}
	return "docker"
}

func (c *CLIInvoker) run(ctx context.Context, projectDir string, capture bool, args ...string) error {
	if projectDir != "" {
		args = insertProjectDir(args, projectDir)
	}
	cmd := exec.CommandContext(ctx, c.composeBin(), args...)
	if projectDir != "" {
		cmd.Dir = projectDir
	}
	cmd.Env = append(os.Environ(), c.Env...)
	if c.Stdout != nil {
		cmd.Stdout = c.Stdout
	} else {
		cmd.Stdout = os.Stdout
	}
	if c.Stderr != nil {
		cmd.Stderr = c.Stderr
	} else {
		cmd.Stderr = os.Stderr
	}
	if capture {
		cmd.Stdout = nil
		cmd.Stderr = nil
		out, err := cmd.CombinedOutput()
		if c.Stdout != nil {
			fmt.Fprintln(c.Stdout, string(out))
		}
		return err
	}
	return cmd.Run()
}

func (c *CLIInvoker) runCapture(ctx context.Context, projectDir string, args ...string) (string, error) {
	if projectDir != "" {
		args = insertProjectDir(args, projectDir)
	}
	cmd := exec.CommandContext(ctx, c.composeBin(), args...)
	if projectDir != "" {
		cmd.Dir = projectDir
	}
	cmd.Env = append(os.Environ(), c.Env...)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// insertProjectDir inserts `--project-directory <dir>` after the first
// `compose` positional so that it ends up as a `docker compose` flag rather
// than a top-level `docker` flag (the latter is unsupported).
func insertProjectDir(args []string, dir string) []string {
	out := make([]string, 0, len(args)+2)
	out = append(out, args...)
	insertAt := 0
	for i, a := range args {
		if a == "compose" {
			insertAt = i + 1
			break
		}
	}
	out = append(out, "")
	copy(out[insertAt+2:], out[insertAt:])
	out[insertAt] = "--project-directory"
	out[insertAt+1] = dir
	return out
}

func (c *CLIInvoker) Info(ctx context.Context) (string, error) {
	return c.runCapture(ctx, "", "info", "--format", "{{.ServerVersion}}")
}

func (c *CLIInvoker) Pull(ctx context.Context, projectDir string) error {
	return c.run(ctx, projectDir, false, "compose", "pull")
}

func (c *CLIInvoker) Up(ctx context.Context, projectDir string, detach bool) error {
	args := []string{"compose", "up"}
	if detach {
		args = append(args, "-d")
	}
	return c.run(ctx, projectDir, false, args...)
}

func (c *CLIInvoker) Down(ctx context.Context, projectDir string) error {
	return c.run(ctx, projectDir, false, "compose", "down")
}

func (c *CLIInvoker) Ps(ctx context.Context, projectDir string) (string, error) {
	return c.runCapture(ctx, projectDir, "compose", "ps", "--format", "json")
}

func (c *CLIInvoker) Command(ctx context.Context, projectDir string, args ...string) error {
	return c.run(ctx, projectDir, false, args...)
}

func (c *CLIInvoker) CommandOutput(ctx context.Context, projectDir string, args ...string) (string, error) {
	return c.runCapture(ctx, projectDir, args...)
}

// DryRunInvoker wraps another Invoker, logging every call instead of executing
// it. Useful for `huly-setup --dry-run` and tests.
type DryRunInvoker struct {
	Inner  Invoker
	Logger func(string)
}

func (d *DryRunInvoker) log(s string) {
	if d.Logger != nil {
		d.Logger(s)
		return
	}
	fmt.Fprintln(os.Stdout, s)
}

func (d *DryRunInvoker) Info(ctx context.Context) (string, error) {
	d.log("[dry-run] docker info")
	if d.Inner != nil {
		return d.Inner.Info(ctx)
	}
	return "dry-run", nil
}

func (d *DryRunInvoker) Pull(ctx context.Context, dir string) error {
	d.log("[dry-run] docker compose pull (cwd=" + filepath.Clean(dir) + ")")
	if d.Inner != nil {
		return d.Inner.Pull(ctx, dir)
	}
	return nil
}

func (d *DryRunInvoker) Up(ctx context.Context, dir string, detach bool) error {
	flag := ""
	if detach {
		flag = " -d"
	}
	d.log(fmt.Sprintf("[dry-run] docker compose up%s (cwd=%s)", flag, filepath.Clean(dir)))
	if d.Inner != nil {
		return d.Inner.Up(ctx, dir, detach)
	}
	return nil
}

func (d *DryRunInvoker) Down(ctx context.Context, dir string) error {
	d.log("[dry-run] docker compose down (cwd=" + filepath.Clean(dir) + ")")
	if d.Inner != nil {
		return d.Inner.Down(ctx, dir)
	}
	return nil
}

func (d *DryRunInvoker) Ps(ctx context.Context, dir string) (string, error) {
	d.log("[dry-run] docker compose ps (cwd=" + filepath.Clean(dir) + ")")
	if d.Inner != nil {
		return d.Inner.Ps(ctx, dir)
	}
	return "[]", nil
}

func (d *DryRunInvoker) Command(ctx context.Context, dir string, args ...string) error {
	d.log(fmt.Sprintf("[dry-run] docker %v (cwd=%s)", args, filepath.Clean(dir)))
	if d.Inner != nil {
		return d.Inner.Command(ctx, dir, args...)
	}
	return nil
}

func (d *DryRunInvoker) CommandOutput(ctx context.Context, dir string, args ...string) (string, error) {
	d.log(fmt.Sprintf("[dry-run] docker %v (cwd=%s)", args, filepath.Clean(dir)))
	if d.Inner != nil {
		return d.Inner.CommandOutput(ctx, dir, args...)
	}
	return "", nil
}
