package docker

import (
	"context"
	"errors"
	"testing"
)

type fakeInvoker struct {
	calls []string
	err   error
}

func (f *fakeInvoker) Info(ctx context.Context) (string, error) {
	f.calls = append(f.calls, "info")
	return "v1.0", f.err
}
func (f *fakeInvoker) Pull(ctx context.Context, dir string) error {
	f.calls = append(f.calls, "pull:"+dir)
	return f.err
}
func (f *fakeInvoker) Up(ctx context.Context, dir string, detach bool) error {
	f.calls = append(f.calls, "up:"+dir)
	return f.err
}
func (f *fakeInvoker) Down(ctx context.Context, dir string) error {
	f.calls = append(f.calls, "down:"+dir)
	return f.err
}
func (f *fakeInvoker) Ps(ctx context.Context, dir string) (string, error) {
	f.calls = append(f.calls, "ps:"+dir)
	return "[]", f.err
}
func (f *fakeInvoker) Command(ctx context.Context, dir string, args ...string) error {
	f.calls = append(f.calls, "cmd:"+dir)
	return f.err
}
func (f *fakeInvoker) CommandOutput(ctx context.Context, dir string, args ...string) (string, error) {
	f.calls = append(f.calls, "cmdout:"+dir)
	return "", f.err
}

func TestDryRunInvokerDoesNotCallInner(t *testing.T) {
	fake := &fakeInvoker{}
	dr := &DryRunInvoker{Inner: fake}
	dr.Info(context.Background())
	dr.Up(context.Background(), "/tmp", true)
	dr.Pull(context.Background(), "/tmp")
	if len(fake.calls) != 3 {
		t.Fatalf("expected 3 calls, got %v", fake.calls)
	}
}

func TestDryRunInvokerNilInner(t *testing.T) {
	dr := &DryRunInvoker{}
	if err := dr.Up(context.Background(), "/tmp", true); err != nil {
		t.Fatal(err)
	}
	if err := dr.Down(context.Background(), "/tmp"); err != nil {
		t.Fatal(err)
	}
	if _, err := dr.Info(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestDryRunInvokerPropagatesError(t *testing.T) {
	fake := &fakeInvoker{err: errors.New("boom")}
	dr := &DryRunInvoker{Inner: fake}
	if err := dr.Pull(context.Background(), "/tmp"); err == nil {
		t.Fatal("expected propagated error")
	}
}
