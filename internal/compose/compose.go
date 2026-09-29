// Package compose renders the docker-compose.yml for a given Config.
//
// Two templates are embedded: one for the multi-tenant profile (unbounded,
// upstream-equivalent) and one for the single-tenant profile (memory-tuned).
// The reverse-proxy topology strips the nginx service so the user's existing
// proxy can reach front:8080 etc. directly.
//
// Templates use docker-compose's native ${VAR} envsubst; the accompanying
// .env (huly_v7.conf) supplies the values at `docker compose up` time, so we
// don't need to interpolate here.
package compose

import (
	_ "embed"
	"fmt"
	"strings"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

//go:embed multi.tmpl
var multiTmpl string

//go:embed single.tmpl
var singleTmpl string

func Render(c config.Config) (string, error) {
	if err := c.Validate(); err != nil {
		return "", err
	}
	body := multiTmpl
	if c.Profile == config.ProfileSingle {
		body = singleTmpl
	}
	if c.Topology == config.TopologyReverse {
		body = stripServiceBlock(body, "nginx")
		body = stripNginxDependsOn(body)
		body = applyExposeMode(body, c.ExposeMode)
	}
	return body, nil
}

type exposedService struct {
	name string
	port int
}

// exposedServices are the internal service ports that a reverse proxy needs
// to reach. The service name must match the compose.yml key exactly.
var exposedServices = []exposedService{
	{"front", 8080},
	{"account", 3000},
	{"transactor", 3333},
	{"collaborator", 3078},
	{"rekoni", 4004},
	{"stats", 4900},
	{"minio", 9000},
}

// applyExposeMode injects a `ports:` block into each service that the proxy
// needs to reach. For ExposeNetwork no host ports are added — the proxy must
// join the docker network. For ExposeLocalhost and ExposeAll the services are
// bound to the host IP.
func applyExposeMode(body string, mode config.ExposeMode) string {
	if mode == config.ExposeNetwork {
		return body
	}
	bind := ""
	switch mode {
	case config.ExposeLocalhost:
		bind = "127.0.0.1:"
	case config.ExposeAll:
		bind = "0.0.0.0:"
	}
	for _, svc := range exposedServices {
		entry := fmt.Sprintf("      - \"%s%d:%d\"\n", bind, svc.port, svc.port)
		body = injectPorts(body, svc.name, entry)
	}
	return body
}

// injectPorts inserts `entry` (which must end with a newline) into the named
// service block, immediately before the existing `networks:` key if present
// or at the end of the service block otherwise. Idempotent: skips if the
// service already has a `ports:` block.
func injectPorts(body, service, entry string) string {
	const (
		serviceIndent = "  "
		propertyIndent = "    "
	)
	target := serviceIndent + service + ":"
	lines := strings.Split(body, "\n")
	// find service block start/end
	start := -1
	for i, l := range lines {
		if l == target {
			start = i
			break
		}
	}
	if start < 0 {
		return body
	}
	end := len(lines)
	for i := start + 1; i < len(lines); i++ {
		l := lines[i]
		if strings.HasPrefix(l, serviceIndent) && !strings.HasPrefix(l, propertyIndent) {
			end = i
			break
		}
	}

	// has ports already?
	for i := start + 1; i < end; i++ {
		if strings.HasPrefix(lines[i], propertyIndent+"ports:") {
			return body
		}
	}

	// find insertion point: last `networks:` line in the block, or block end
	insertAt := end
	for i := start + 1; i < end; i++ {
		if strings.HasPrefix(lines[i], propertyIndent+"networks:") {
			insertAt = i
		}
	}

	portLines := []string{
		propertyIndent + "ports:",
		strings.TrimRight(entry, "\n"),
	}

	out := make([]string, 0, len(lines)+len(portLines))
	out = append(out, lines[:insertAt]...)
	out = append(out, portLines...)
	out = append(out, lines[insertAt:]...)
	return strings.Join(out, "\n")
}

// stripNginxDependsOn removes any `depends_on: nginx: ...` entries that might
// appear in other services after the nginx service itself has been removed.
func stripNginxDependsOn(body string) string {
	lines := strings.Split(body, "\n")
	out := make([]string, 0, len(lines))
	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)
		if !strings.HasSuffix(trimmed, "depends_on:") {
			out = append(out, line)
			continue
		}
		indent := line[:len(line)-len(strings.TrimLeft(line, " "))]
		out = append(out, line)
		for i+1 < len(lines) {
			next := lines[i+1]
			nextTrim := strings.TrimSpace(next)
			if nextTrim == "" {
				out = append(out, next)
				i++
				continue
			}
			nextIndent := next[:len(next)-len(strings.TrimLeft(next, " "))]
			if len(nextIndent) <= len(indent) {
				break
			}
			key := strings.TrimSuffix(nextTrim, ":")
			if key == "nginx" {
				i++
				if i+1 < len(lines) {
					cond := lines[i+1]
					condIndent := cond[:len(cond)-len(strings.TrimLeft(cond, " "))]
					if len(condIndent) > len(indent)+len("      ") {
						i++
					}
				}
				continue
			}
			out = append(out, next)
			i++
		}
	}
	return strings.Join(out, "\n")
}

// stripServiceBlock removes a `  <name>:` service block from a docker-compose
// YAML file by tracking indentation depth.
func stripServiceBlock(body, name string) string {
	const serviceIndent = "  "
	target := serviceIndent + name + ":"
	lines := strings.Split(body, "\n")
	out := make([]string, 0, len(lines))
	inBlock := false
	for _, line := range lines {
		if !inBlock && line == target {
			inBlock = true
			continue
		}
		if inBlock {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" {
				continue
			}
			if strings.HasPrefix(line, serviceIndent) && !strings.HasPrefix(line, "    ") {
				inBlock = false
				out = append(out, line)
			} else {
				continue
			}
			continue
		}
		out = append(out, line)
	}
	return strings.Join(out, "\n")
}
