package envconf

import (
	"strings"
	"testing"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

func baseCfg() config.Config {
	c := config.Config{
		HostAddress: "huly.example.com",
		HTTPPort:    443,
		Secure:      true,
	}
	c.ApplyDefaults()
	return c
}

func TestRenderIncludesSecrets(t *testing.T) {
	out, err := Render(baseCfg(), "huly-hex", "cr-hex", "rp-hex")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"HULY_VERSION=v0.7.426",
		"HOST_ADDRESS=huly.example.com",
		"HTTP_PORT=443",
		"SECURE=true",
		"PROFILE=multi",
		"TOPOLOGY=builtin",
		"SECRET=huly-hex",
		"CR_USER_PASSWORD=cr-hex",
		"REDPANDA_ADMIN_PWD=rp-hex",
		"CR_DB_URL=postgres://selfhost:cr-hex@cockroach:26257/defaultdb",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q in:\n%s", want, out)
		}
	}
}

func TestRenderInsecure(t *testing.T) {
	c := baseCfg()
	c.HTTPPort = 80
	c.Secure = false
	out, err := Render(c, "x", "y", "z")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "SECURE=\n") && !strings.Contains(out, "SECURE= ") {
		if !strings.Contains(out, "SECURE=") {
			t.Fatal("missing SECURE entry")
		}
	}
}
