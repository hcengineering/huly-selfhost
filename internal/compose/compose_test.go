package compose

import (
	"strings"
	"testing"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

func baseConfig(t *testing.T) config.Config {
	t.Helper()
	c := config.Config{
		HostAddress: "huly.example.com",
		HTTPPort:    443,
		Secure:      true,
	}
	c.ApplyDefaults()
	return c
}

func TestRenderMultiTenant(t *testing.T) {
	c := baseConfig(t)
	c.Profile = config.ProfileMulti
	c.Topology = config.TopologyBuiltin
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"name: ${DOCKER_NAME}",
		"hardcoreeng/transactor:${HULY_VERSION}",
		"  nginx:",
		"${HTTP_BIND:+${HTTP_BIND}:}${HTTP_PORT}:80",
		"DISABLED_FEATURES=auto-translate,mailboxes",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("multi-tenant compose missing %q", want)
		}
	}
}

func TestRenderSingleTenant(t *testing.T) {
	c := baseConfig(t)
	c.Profile = config.ProfileSingle
	c.Topology = config.TopologyBuiltin
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"--cache=256MiB",
		"NODE_OPTIONS=--max-old-space-size=768",
		"DISABLED_FEATURES=auto-translate,mailboxes,signup,passwords,recover",
		"INIT_REPO_DIR=/no-init-scripts",
		"memory: 1152M",
		"memory: 1792M",
		"x-logging-default",
		"GOGC=200",
		"MINIO_API_REQUESTS_MAX=256",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("single-tenant compose missing %q", want)
		}
	}
}

func TestRenderReverseProxyStripsNginx(t *testing.T) {
	c := baseConfig(t)
	c.Profile = config.ProfileMulti
	c.Topology = config.TopologyReverse
	c.ExposeMode = config.ExposeNetwork
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(out, "\n  nginx:\n") {
		t.Errorf("reverse-proxy topology should drop the nginx service:\n%s", out)
	}
	for _, want := range []string{
		"hardcoreeng/front:",
		"hardcoreeng/transactor:",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("expected %q in reverse-proxy compose", want)
		}
	}
}

func TestRenderReverseProxyLocalhostExpose(t *testing.T) {
	c := baseConfig(t)
	c.Profile = config.ProfileMulti
	c.Topology = config.TopologyReverse
	c.ExposeMode = config.ExposeLocalhost
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		`"127.0.0.1:8080:8080"`,
		`"127.0.0.1:3000:3000"`,
		`"127.0.0.1:3333:3333"`,
		`"127.0.0.1:3078:3078"`,
		`"127.0.0.1:9000:9000"`,
	} {
		if !strings.Contains(out, want) {
			t.Errorf("expected %q in localhost expose mode", want)
		}
	}
	if strings.Contains(out, "0.0.0.0:8080:8080") {
		t.Errorf("localhost mode should not bind to 0.0.0.0")
	}
}

func TestRenderReverseProxyAllExpose(t *testing.T) {
	c := baseConfig(t)
	c.Profile = config.ProfileMulti
	c.Topology = config.TopologyReverse
	c.ExposeMode = config.ExposeAll
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, `"0.0.0.0:8080:8080"`) {
		t.Fatalf("expected 0.0.0.0 bind:\n%s", out)
	}
}

func TestRenderReverseProxyNetworkNoPorts(t *testing.T) {
	c := baseConfig(t)
	c.Profile = config.ProfileMulti
	c.Topology = config.TopologyReverse
	c.ExposeMode = config.ExposeNetwork
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(out, "8080:8080") {
		t.Fatalf("network mode should not bind any host ports:\n%s", out)
	}
}

func TestRenderVolumeOverride(t *testing.T) {
	c := baseConfig(t)
	c.VolumeElasticPath = "/srv/elastic"
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	// VOLUME_ELASTIC_PATH is expanded by docker compose from the .env file,
	// so the rendered template still contains the literal envsubst expression
	// pointing at VOLUME_ELASTIC_PATH.
	if !strings.Contains(out, "${VOLUME_ELASTIC_PATH:-elastic}:/usr/share/elasticsearch/data") {
		t.Fatalf("expected volume envsubst in compose:\n%s", out)
	}
}

func TestValidateFails(t *testing.T) {
	c := config.Config{}
	if _, err := Render(c); err == nil {
		t.Fatal("expected validation error")
	}
}
