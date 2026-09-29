// Package envconf renders the .env (huly_v7.conf) file consumed by
// docker-compose and the embedded Huly services.
package envconf

import (
	"bytes"
	"os"
	"path/filepath"
	"text/template"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

const tmpl = `HULY_VERSION={{.HULY_VERSION}}
DESKTOP_CHANNEL={{.DESKTOP_CHANNEL}}
DOCKER_NAME={{.DOCKER_NAME}}
PROFILE={{.PROFILE}}
TOPOLOGY={{.TOPOLOGY}}
{{- if eq .TOPOLOGY "reverse-proxy"}}
EXPOSE_MODE={{.EXPOSE_MODE}}{{end}}

HOST_ADDRESS={{.HOST_ADDRESS}}
SECURE={{.SECURE}}
HTTP_PORT={{.HTTP_PORT}}
HTTP_BIND={{.HTTP_BIND}}

TITLE={{.TITLE}}
DEFAULT_LANGUAGE={{.DEFAULT_LANGUAGE}}
LAST_NAME_FIRST={{.LAST_NAME_FIRST}}

CR_DATABASE={{.CR_DATABASE}}
CR_USERNAME={{.CR_USERNAME}}
CR_USER_PASSWORD={{.CR_USER_PASSWORD}}
CR_DB_URL=postgres://{{.CR_USERNAME}}:{{.CR_USER_PASSWORD}}@cockroach:26257/{{.CR_DATABASE}}

REDPANDA_ADMIN_USER={{.REDPANDA_ADMIN_USER}}
REDPANDA_ADMIN_PWD={{.REDPANDA_ADMIN_PWD}}

# Volume host-path overrides (empty = docker named volumes)
VOLUME_ELASTIC_PATH={{.VOLUME_ELASTIC_PATH}}
VOLUME_FILES_PATH={{.VOLUME_FILES_PATH}}
VOLUME_CR_DATA_PATH={{.VOLUME_CR_DATA_PATH}}
VOLUME_CR_CERTS_PATH={{.VOLUME_CR_CERTS_PATH}}
VOLUME_REDPANDA_PATH={{.VOLUME_REDPANDA_PATH}}

# Auto-generated. Regenerate by running ` + "`huly-setup --rotate-secrets`" + `.
SECRET={{.SECRET}}
`

func Render(c config.Config, hulySecret, crSecret, rpSecret string) (string, error) {
	if err := c.Validate(); err != nil {
		return "", err
	}
	secure := ""
	if c.Secure {
		secure = "true"
	}
	lnf := "true"
	if !c.LastNameFirst {
		lnf = "false"
	}
	t, err := template.New("env").Parse(tmpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, map[string]any{
		"HULY_VERSION":         c.HulyVersion,
		"DESKTOP_CHANNEL":      c.DesktopChan,
		"DOCKER_NAME":          c.ComposeName,
		"PROFILE":              c.Profile,
		"TOPOLOGY":             c.Topology,
		"EXPOSE_MODE":          string(c.ExposeMode),
		"HOST_ADDRESS":         c.HostAddress,
		"SECURE":               secure,
		"HTTP_PORT":            c.PortString(),
		"HTTP_BIND":            c.HTTPBind,
		"TITLE":                c.Title,
		"DEFAULT_LANGUAGE":     c.DefaultLanguage,
		"LAST_NAME_FIRST":      lnf,
		"CR_DATABASE":          c.CRDatabase,
		"CR_USERNAME":          c.CRUsername,
		"CR_USER_PASSWORD":     crSecret,
		"REDPANDA_ADMIN_USER":  c.RedpandaAdmin,
		"REDPANDA_ADMIN_PWD":   rpSecret,
		"VOLUME_ELASTIC_PATH":  c.VolumeElasticPath,
		"VOLUME_FILES_PATH":    c.VolumeFilesPath,
		"VOLUME_CR_DATA_PATH":  c.VolumeCRDataPath,
		"VOLUME_CR_CERTS_PATH": c.VolumeCRCertsPath,
		"VOLUME_REDPANDA_PATH": c.VolumeRedpanda,
		"SECRET":               hulySecret,
	}); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func Save(c config.Config, hulySecret, crSecret, rpSecret, path string) error {
	rendered, err := Render(c, hulySecret, crSecret, rpSecret)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.WriteString(rendered); err != nil {
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}
