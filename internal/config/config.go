package config

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	DefaultVersion      = "v0.7.426"
	DefaultDesktop      = "0.7.426"
	DefaultTitle        = "Huly Self Host"
	DefaultLanguage     = "en"
	DefaultDatabase     = "defaultdb"
	DefaultCRUser       = "selfhost"
	DefaultRedpandaUser = "superadmin"
	DefaultComposeName  = "huly_v7"
	ConfigFileName      = "huly_v7.conf"
	ComposeFileName     = "compose.yml"
	NginxFileName       = ".huly.nginx"
	HulySecretFile      = ".huly.secret"
	CRSecretFile        = ".cr.secret"
	RedpandaSecretFile  = ".rp.secret"
)

type Mode int

const (
	ModeInteractive Mode = iota
	ModeQuick
	ModeNonInteractive
)

type Profile string

const (
	ProfileMulti  Profile = "multi"
	ProfileSingle Profile = "single"
)

type NetworkTopology string

const (
	TopologyBuiltin NetworkTopology = "builtin"
	TopologyReverse NetworkTopology = "reverse-proxy"
)

// ExposeMode controls how services are published to the host when the
// in-stack nginx is dropped (reverse-proxy topology).
type ExposeMode string

const (
	// ExposeNetwork keeps services on the docker network only — the proxy
	// must join the `huly_net` network and reach them by hostname
	// (e.g. http://front:8080). No host port bindings are created.
	ExposeNetwork ExposeMode = "network"
	// ExposeLocalhost binds each service port to 127.0.0.1 — the proxy
	// runs on the host (system nginx / caddy / traefik) and connects
	// via http://127.0.0.1:8080 etc.
	ExposeLocalhost ExposeMode = "127.0.0.1"
	// ExposeAll binds each service port to 0.0.0.0 — same as above but
	// the host port is reachable from any interface.
	ExposeAll ExposeMode = "0.0.0.0"
)

type Config struct {
	Mode     Mode            `yaml:"-"`
	DryRun   bool            `yaml:"-"`
	Profile  Profile         `yaml:"profile"`
	Topology NetworkTopology `yaml:"topology"`

	HulyVersion string `yaml:"huly_version"`
	DesktopChan string `yaml:"desktop_channel"`

	HostAddress string `yaml:"host_address"`
	HTTPPort    int    `yaml:"http_port"`
	HTTPBind    string `yaml:"http_bind"`
	Secure      bool   `yaml:"secure"`

	Title           string `yaml:"title"`
	DefaultLanguage string `yaml:"default_language"`
	LastNameFirst   bool   `yaml:"last_name_first"`

	CRDatabase    string `yaml:"cr_database"`
	CRUsername    string `yaml:"cr_username"`
	RedpandaAdmin string `yaml:"redpanda_admin"`

	VolumeElasticPath string `yaml:"volume_elastic_path"`
	VolumeFilesPath   string `yaml:"volume_files_path"`
	VolumeCRDataPath  string `yaml:"volume_cr_data_path"`
	VolumeCRCertsPath string `yaml:"volume_cr_certs_path"`
	VolumeRedpanda    string `yaml:"volume_redpanda_path"`

	ComposeName string `yaml:"compose_name"`

	// ExposeMode is only consulted when Topology == TopologyReverse.
	ExposeMode ExposeMode `yaml:"expose_mode"`

	SkipPull bool `yaml:"-"`
	SkipUp   bool `yaml:"-"`
}

func (c *Config) ApplyDefaults() {
	if c.HulyVersion == "" {
		c.HulyVersion = DefaultVersion
	}
	if c.DesktopChan == "" {
		c.DesktopChan = strings.TrimPrefix(c.HulyVersion, "v")
	}
	if c.ComposeName == "" {
		c.ComposeName = DefaultComposeName
	}
	if c.Title == "" {
		c.Title = DefaultTitle
	}
	if c.DefaultLanguage == "" {
		c.DefaultLanguage = DefaultLanguage
	}
	if c.CRDatabase == "" {
		c.CRDatabase = DefaultDatabase
	}
	if c.CRUsername == "" {
		c.CRUsername = DefaultCRUser
	}
	if c.RedpandaAdmin == "" {
		c.RedpandaAdmin = DefaultRedpandaUser
	}
	if c.Profile == "" {
		c.Profile = ProfileMulti
	}
	if c.Topology == "" {
		c.Topology = TopologyBuiltin
	}
	if c.Topology == TopologyReverse && c.ExposeMode == "" {
		c.ExposeMode = ExposeLocalhost
	}
	if !c.LastNameFirst {
		c.LastNameFirst = true
	}
}

func (c *Config) Validate() error {
	if c.HostAddress == "" {
		return fmt.Errorf("host address is required")
	}
	if c.HTTPPort < 1 || c.HTTPPort > 65535 {
		return fmt.Errorf("http port must be between 1 and 65535 (got %d)", c.HTTPPort)
	}
	if c.HulyVersion == "" {
		return fmt.Errorf("huly version is required")
	}
	if c.Profile != ProfileMulti && c.Profile != ProfileSingle {
		return fmt.Errorf("profile must be %q or %q", ProfileMulti, ProfileSingle)
	}
	if c.Topology != TopologyBuiltin && c.Topology != TopologyReverse {
		return fmt.Errorf("topology must be %q or %q", TopologyBuiltin, TopologyReverse)
	}
	if c.Topology == TopologyReverse {
		switch c.ExposeMode {
		case ExposeNetwork, ExposeLocalhost, ExposeAll:
		default:
			return fmt.Errorf("reverse-proxy topology requires --expose-mode of network, 127.0.0.1, or 0.0.0.0")
		}
	}
	return nil
}

func (c *Config) IsLocal() bool {
	h := strings.ToLower(strings.TrimSpace(c.HostAddress))
	if h == "" {
		return true
	}
	if h == "localhost" || h == "127.0.0.1" || h == "::1" || strings.HasPrefix(h, "127.") {
		return true
	}
	if ip := net.ParseIP(h); ip != nil && ip.IsLoopback() {
		return true
	}
	return false
}

func HulyDir() (string, error) {
	if d := strings.TrimSpace(os.Getenv("HULY_SETUP_DIR")); d != "" {
		abs, err := filepath.Abs(d)
		if err != nil {
			return "", err
		}
		if err := os.MkdirAll(abs, 0o755); err != nil {
			return "", err
		}
		return abs, nil
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return wd, nil
}

func (c *Config) Path(name string) string {
	dir, _ := HulyDir()
	return filepath.Join(dir, name)
}

func (c *Config) PortString() string {
	return strconv.Itoa(c.HTTPPort)
}
