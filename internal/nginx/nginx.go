// Package nginx renders the .huly.nginx config used by the in-stack nginx
// container, or a paste-ready reverse-proxy snippet for users who already
// have nginx / caddy / traefik in front.
package nginx

import (
	_ "embed"
	"fmt"
	"strings"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

//go:embed container.conf
var containerConf string

//go:embed upstream.conf
var upstreamConf string

func Render(c config.Config) (string, error) {
	if err := c.Validate(); err != nil {
		return "", err
	}
	body := containerConf
	host := c.HostAddress
	if c.IsLocal() {
		host = "localhost"
	}
	return strings.ReplaceAll(body, "${HOST_ADDRESS}", host), nil
}

// ReverseProxySnippet returns a paste-ready nginx server block that proxies
// to the Huly compose stack. When ExposeMode is localhost or 0.0.0.0 the
// upstreams point at the host bind IP. When ExposeMode is network the
// upstreams point at the docker service hostnames (the proxy must run in
// the huly_net docker network).
func ReverseProxySnippet(c config.Config) (string, error) {
	if err := c.Validate(); err != nil {
		return "", err
	}
	listen := fmt.Sprintf("%d", c.HTTPPort)
	if c.Secure {
		listen = "443 ssl"
	}
	host := "huly_" // placeholder; replaced below
	body := strings.ReplaceAll(upstreamConf, "${LISTEN_DIRECTIVE}", listen)
	switch c.ExposeMode {
	case config.ExposeLocalhost:
		body = strings.ReplaceAll(body, "server front:8080", "server 127.0.0.1:8080")
		body = strings.ReplaceAll(body, "server account:3000", "server 127.0.0.1:3000")
		body = strings.ReplaceAll(body, "server transactor:3333", "server 127.0.0.1:3333")
		body = strings.ReplaceAll(body, "server collaborator:3078", "server 127.0.0.1:3078")
		body = strings.ReplaceAll(body, "server rekoni:4004", "server 127.0.0.1:4004")
		body = strings.ReplaceAll(body, "server stats:4900", "server 127.0.0.1:4900")
		body = strings.ReplaceAll(body, "server minio:9000", "server 127.0.0.1:9000")
	case config.ExposeAll:
		body = strings.ReplaceAll(body, "server front:8080", "server 0.0.0.0:8080")
		body = strings.ReplaceAll(body, "server account:3000", "server 0.0.0.0:3000")
		body = strings.ReplaceAll(body, "server transactor:3333", "server 0.0.0.0:3333")
		body = strings.ReplaceAll(body, "server collaborator:3078", "server 0.0.0.0:3078")
		body = strings.ReplaceAll(body, "server rekoni:4004", "server 0.0.0.0:4004")
		body = strings.ReplaceAll(body, "server stats:4900", "server 0.0.0.0:4900")
		body = strings.ReplaceAll(body, "server minio:9000", "server 0.0.0.0:9000")
	}
	_ = host
	return body, nil
}
