package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Load parses a previously-written huly_v7.conf. Unknown keys and blank or
// comment lines are silently skipped. ${VAR:-default} syntax is resolved using
// process env where available.
func Load(path string) (Config, error) {
	f, err := os.Open(path)
	if err != nil {
		return Config{}, err
	}
	defer f.Close()

	c := Config{}
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx < 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		// envsubst syntax: ${VAR:-default} or ${VAR}
		val = resolve(val)

		switch key {
		case "HULY_VERSION":
			c.HulyVersion = val
		case "DESKTOP_CHANNEL":
			c.DesktopChan = val
		case "DOCKER_NAME":
			c.ComposeName = val
		case "HOST_ADDRESS":
			c.HostAddress = val
		case "SECURE":
			c.Secure = val == "true"
		case "HTTP_PORT":
			if v, err := atoiSafe(val); err == nil {
				c.HTTPPort = v
			}
		case "HTTP_BIND":
			c.HTTPBind = val
		case "TITLE":
			c.Title = val
		case "DEFAULT_LANGUAGE":
			c.DefaultLanguage = val
		case "LAST_NAME_FIRST":
			c.LastNameFirst = val == "true"
		case "CR_DATABASE":
			c.CRDatabase = val
		case "CR_USERNAME":
			c.CRUsername = val
		case "REDPANDA_ADMIN_USER":
			c.RedpandaAdmin = val
		case "VOLUME_ELASTIC_PATH":
			c.VolumeElasticPath = val
		case "VOLUME_FILES_PATH":
			c.VolumeFilesPath = val
		case "VOLUME_CR_DATA_PATH":
			c.VolumeCRDataPath = val
		case "VOLUME_CR_CERTS_PATH":
			c.VolumeCRCertsPath = val
		case "VOLUME_REDPANDA_PATH":
			c.VolumeRedpanda = val
		case "PROFILE":
			c.Profile = Profile(val)
		case "TOPOLOGY":
			c.Topology = NetworkTopology(val)
		case "EXPOSE_MODE":
			c.ExposeMode = ExposeMode(val)
		}
	}
	if err := scanner.Err(); err != nil {
		return c, err
	}
	return c, nil
}

// resolve strips shell-style ${VAR:-default} wrappers.
func resolve(s string) string {
	if !strings.Contains(s, "${") {
		return s
	}
	out := s
	for {
		open := strings.Index(out, "${")
		if open < 0 {
			break
		}
		close := strings.Index(out[open:], "}")
		if close < 0 {
			break
		}
		close += open
		expr := out[open+2 : close]
		name := expr
		def := ""
		if i := strings.Index(expr, ":-"); i >= 0 {
			name = expr[:i]
			def = expr[i+2:]
		}
		// honour env override if present, else default, else empty
		if v, ok := os.LookupEnv(name); ok {
			out = out[:open] + v + out[close+1:]
		} else if def != "" {
			out = out[:open] + def + out[close+1:]
		} else {
			out = out[:open] + out[close+1:]
		}
	}
	return out
}

func atoiSafe(s string) (int, error) {
	var v int
	_, err := fmt.Sscanf(s, "%d", &v)
	return v, err
}

// Save writes the config to disk in a stable shell-sourceable format that the
// docker compose stack expects. Existing files are overwritten; callers should
// have already taken a backup if they care.
func Save(c Config, path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	w := bufio.NewWriter(tmp)
	fmt.Fprintln(w, "# Managed by huly-setup. Re-run to update.")
	fmt.Fprintln(w, "# Regenerate with: huly-setup --apply")
	fmt.Fprintln(w)
	fmt.Fprintf(w, "HULY_VERSION=%s\n", c.HulyVersion)
	fmt.Fprintf(w, "DESKTOP_CHANNEL=%s\n", c.DesktopChan)
	fmt.Fprintf(w, "DOCKER_NAME=%s\n", c.ComposeName)
	fmt.Fprintf(w, "PROFILE=%s\n", c.Profile)
	fmt.Fprintf(w, "TOPOLOGY=%s\n", c.Topology)
	if c.Topology == TopologyReverse {
		fmt.Fprintf(w, "EXPOSE_MODE=%s\n", c.ExposeMode)
	}
	fmt.Fprintln(w)
	fmt.Fprintf(w, "HOST_ADDRESS=%s\n", c.HostAddress)
	if c.Secure {
		fmt.Fprintln(w, "SECURE=true")
	} else {
		fmt.Fprintln(w, "SECURE=")
	}
	fmt.Fprintf(w, "HTTP_PORT=%d\n", c.HTTPPort)
	fmt.Fprintf(w, "HTTP_BIND=%s\n", c.HTTPBind)
	fmt.Fprintln(w)
	fmt.Fprintf(w, "TITLE=%s\n", c.Title)
	fmt.Fprintf(w, "DEFAULT_LANGUAGE=%s\n", c.DefaultLanguage)
	if c.LastNameFirst {
		fmt.Fprintln(w, "LAST_NAME_FIRST=true")
	} else {
		fmt.Fprintln(w, "LAST_NAME_FIRST=false")
	}
	fmt.Fprintln(w)
	fmt.Fprintf(w, "CR_DATABASE=%s\n", c.CRDatabase)
	fmt.Fprintf(w, "CR_USERNAME=%s\n", c.CRUsername)
	fmt.Fprintf(w, "REDPANDA_ADMIN_USER=%s\n", c.RedpandaAdmin)
	fmt.Fprintln(w)
	fmt.Fprintf(w, "VOLUME_ELASTIC_PATH=%s\n", c.VolumeElasticPath)
	fmt.Fprintf(w, "VOLUME_FILES_PATH=%s\n", c.VolumeFilesPath)
	fmt.Fprintf(w, "VOLUME_CR_DATA_PATH=%s\n", c.VolumeCRDataPath)
	fmt.Fprintf(w, "VOLUME_CR_CERTS_PATH=%s\n", c.VolumeCRCertsPath)
	fmt.Fprintf(w, "VOLUME_REDPANDA_PATH=%s\n", c.VolumeRedpanda)
	fmt.Fprintln(w)

	if err := w.Flush(); err != nil {
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}
