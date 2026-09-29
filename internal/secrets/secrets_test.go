package secrets

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEnsureCreatesNew(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".huly.secret")
	v, err := Ensure(path, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(v) != 64 {
		t.Fatalf("expected 64 hex chars, got %d", len(v))
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != v+"\n" {
		t.Fatalf("file content mismatch: %q vs %q", data, v)
	}
}

func TestEnsureReuses(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".cr.secret")
	v1, _ := Ensure(path, false)
	v2, _ := Ensure(path, false)
	if v1 != v2 {
		t.Fatalf("expected reuse, got %q then %q", v1, v2)
	}
}

func TestEnsureForce(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".rp.secret")
	v1, _ := Ensure(path, false)
	v2, err := Ensure(path, true)
	if err != nil {
		t.Fatal(err)
	}
	if v1 == v2 {
		t.Fatal("expected force rotation to produce a different secret")
	}
}
