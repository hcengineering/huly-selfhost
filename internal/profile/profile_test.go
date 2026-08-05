package profile

import (
	"testing"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

func TestShort(t *testing.T) {
	got := Short(config.ProfileSingle)
	if got == "" {
		t.Fatal("empty short description")
	}
	if got == Short(config.ProfileMulti) {
		t.Fatal("short descriptions should differ")
	}
}

func TestDescriptionHasKeySections(t *testing.T) {
	if d := Description(config.ProfileSingle); d == "" {
		t.Fatal("empty single description")
	}
	if d := Description(config.ProfileMulti); d == "" {
		t.Fatal("empty multi description")
	}
}
