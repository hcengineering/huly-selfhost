package nginx

import (
	"strings"
	"testing"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

func TestRenderBuiltin(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443}
	c.ApplyDefaults()
	out, err := Render(c)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "server_name huly.example.com") {
		t.Fatalf("expected server_name substituted:\n%s", out)
	}
	if !strings.Contains(out, "proxy_pass http://front:8080") {
		t.Fatalf("expected proxy_pass:\n%s", out)
	}
}

func TestRenderReverseProxySnippet(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	c.Topology = config.TopologyReverse
	c.ExposeMode = config.ExposeNetwork
	out, err := ReverseProxySnippet(c)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"upstream huly_front",
		"server front:8080",
		"listen 443 ssl",
		"proxy_pass http://huly_transactor",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("snippet missing %q", want)
		}
	}
}

func TestRenderReverseProxySnippetLocalhost(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	c.Topology = config.TopologyReverse
	c.ExposeMode = config.ExposeLocalhost
	out, err := ReverseProxySnippet(c)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"server 127.0.0.1:8080",
		"server 127.0.0.1:3000",
		"server 127.0.0.1:3333",
		"server 127.0.0.1:9000",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("localhost snippet missing %q", want)
		}
	}
}
