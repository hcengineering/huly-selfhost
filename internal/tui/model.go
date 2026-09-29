// Package tui implements the Bubble Tea interactive setup for huly-setup.
package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/profile"
)

type step int

const (
	stepWelcome step = iota
	stepProfile
	stepTopology
	stepExpose
	stepHost
	stepPort
	stepSecure
	stepVolumes
	stepSummary
	stepReview
	stepConfirm
	stepDone
)

// back maps a step to the step that the "back" key should return to.
var back = map[step]step{
	stepProfile:   stepWelcome,
	stepTopology:  stepProfile,
	stepExpose:    stepTopology,
	stepHost:      stepExpose,
	stepPort:      stepHost,
	stepSecure:    stepPort,
	stepVolumes:   stepSecure,
	stepSummary:   stepVolumes,
	stepReview:    stepSummary,
	stepConfirm:   stepReview,
}

type Model struct {
	cfg  config.Config
	step step
	err  error

	cursor      int
	hostInput   string
	portInput   string
	elasticPath string
	filesPath   string
	crDataPath  string
	crCertsPath string
	redpandaPath string

	width, height int
	aborted       bool
}

func New(cfg config.Config) Model {
	return Model{
		cfg:       cfg,
		step:      stepWelcome,
		hostInput: cfg.HostAddress,
		portInput: fmt.Sprintf("%d", cfg.HTTPPort),
	}
}

func (m Model) Init() tea.Cmd { return nil }

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	case tea.KeyMsg:
		return m.handleKey(msg)
	}
	return m, nil
}

func (m Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c":
		m.aborted = true
		return m, tea.Quit
	case "esc":
		if prev, ok := back[m.step]; ok {
			m.err = nil
			m.cursor = 0
			m.step = prev
			return m, nil
		}
	}
	switch m.step {
	case stepWelcome:
		return m.updateWelcome(msg)
	case stepProfile:
		return m.updateProfile(msg)
	case stepTopology:
		return m.updateTopology(msg)
	case stepExpose:
		return m.updateExpose(msg)
	case stepHost:
		return m.updateHost(msg)
	case stepPort:
		return m.updatePort(msg)
	case stepSecure:
		return m.updateSecure(msg)
	case stepVolumes:
		return m.updateVolumes(msg)
	case stepSummary:
		return m.updateSummary(msg)
	case stepReview:
		return m.updateReview(msg)
	case stepConfirm:
		return m.updateConfirm(msg)
	}
	return m, nil
}

func (m Model) updateWelcome(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter", " ":
		m.step = stepProfile
	}
	return m, nil
}

func (m Model) updateProfile(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
	case "down", "j":
		if m.cursor < 1 {
			m.cursor++
		}
	case "enter", " ":
		m.cfg.Profile = config.ProfileMulti
		if m.cursor == 1 {
			m.cfg.Profile = config.ProfileSingle
		}
		m.step = stepTopology
		m.cursor = 0
	}
	return m, nil
}

func (m Model) updateTopology(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
	case "down", "j":
		if m.cursor < 1 {
			m.cursor++
		}
	case "enter", " ":
		m.cfg.Topology = config.TopologyBuiltin
		if m.cursor == 1 {
			m.cfg.Topology = config.TopologyReverse
		}
		m.cursor = 0
		if m.cfg.Topology == config.TopologyReverse {
			m.step = stepExpose
		} else {
			m.step = stepHost
		}
	}
	return m, nil
}

func (m Model) updateExpose(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
	case "down", "j":
		if m.cursor < 2 {
			m.cursor++
		}
	case "enter", " ":
		modes := []config.ExposeMode{config.ExposeLocalhost, config.ExposeAll, config.ExposeNetwork}
		m.cfg.ExposeMode = modes[m.cursor]
		m.step = stepHost
		m.cursor = 0
	}
	return m, nil
}

func (m Model) updateHost(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		host := strings.TrimSpace(m.hostInput)
		if host == "" {
			m.err = fmt.Errorf("host address cannot be empty")
			return m, nil
		}
		m.err = nil
		m.cfg.HostAddress = host
		m.step = stepPort
	case "backspace":
		if len(m.hostInput) > 0 {
			m.hostInput = m.hostInput[:len(m.hostInput)-1]
		}
	default:
		if len(msg.String()) == 1 {
			m.hostInput += msg.String()
		}
	}
	return m, nil
}

func (m Model) updatePort(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		var port int
		_, err := fmt.Sscanf(m.portInput, "%d", &port)
		if err != nil || port < 1 || port > 65535 {
			m.err = fmt.Errorf("port must be a number 1-65535")
			return m, nil
		}
		m.err = nil
		m.cfg.HTTPPort = port
		m.step = stepSecure
		m.cursor = 0
	case "backspace":
		if len(m.portInput) > 0 {
			m.portInput = m.portInput[:len(m.portInput)-1]
		}
	default:
		if len(msg.String()) == 1 && (msg.String()[0] >= '0' && msg.String()[0] <= '9') {
			m.portInput += msg.String()
		}
	}
	return m, nil
}

func (m Model) updateSecure(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
	case "down", "j":
		if m.cursor < 1 {
			m.cursor++
		}
	case "enter", " ":
		m.cfg.Secure = m.cursor == 0
		m.step = stepVolumes
		m.cursor = 0
		m.elasticPath = m.cfg.VolumeElasticPath
		m.filesPath = m.cfg.VolumeFilesPath
		m.crDataPath = m.cfg.VolumeCRDataPath
		m.crCertsPath = m.cfg.VolumeCRCertsPath
		m.redpandaPath = m.cfg.VolumeRedpanda
	}
	return m, nil
}

func (m Model) updateVolumes(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		m.cfg.VolumeElasticPath = strings.TrimSpace(m.elasticPath)
		m.cfg.VolumeFilesPath = strings.TrimSpace(m.filesPath)
		m.cfg.VolumeCRDataPath = strings.TrimSpace(m.crDataPath)
		m.cfg.VolumeCRCertsPath = strings.TrimSpace(m.crCertsPath)
		m.cfg.VolumeRedpanda = strings.TrimSpace(m.redpandaPath)
		m.step = stepSummary
	case "tab":
		m.cursor = (m.cursor + 1) % 5
	case "backspace":
		switch m.cursor {
		case 0:
			if len(m.elasticPath) > 0 {
				m.elasticPath = m.elasticPath[:len(m.elasticPath)-1]
			}
		case 1:
			if len(m.filesPath) > 0 {
				m.filesPath = m.filesPath[:len(m.filesPath)-1]
			}
		case 2:
			if len(m.crDataPath) > 0 {
				m.crDataPath = m.crDataPath[:len(m.crDataPath)-1]
			}
		case 3:
			if len(m.crCertsPath) > 0 {
				m.crCertsPath = m.crCertsPath[:len(m.crCertsPath)-1]
			}
		case 4:
			if len(m.redpandaPath) > 0 {
				m.redpandaPath = m.redpandaPath[:len(m.redpandaPath)-1]
			}
		}
	default:
		if len(msg.String()) == 1 {
			switch m.cursor {
			case 0:
				m.elasticPath += msg.String()
			case 1:
				m.filesPath += msg.String()
			case 2:
				m.crDataPath += msg.String()
			case 3:
				m.crCertsPath += msg.String()
			case 4:
				m.redpandaPath += msg.String()
			}
		}
	}
	return m, nil
}

func (m Model) updateSummary(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		if err := m.cfg.Validate(); err != nil {
			m.err = err
			return m, nil
		}
		m.err = nil
		m.step = stepReview
	}
	return m, nil
}

func (m Model) updateReview(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		m.step = stepConfirm
	case "b":
		m.step = stepSummary
	}
	return m, nil
}

func (m Model) updateConfirm(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y":
		m.step = stepDone
		return m, tea.Quit
	case "n", "N":
		m.step = stepReview
	}
	return m, nil
}

func (m Model) View() string {
	var b strings.Builder
	b.WriteString(logo())
	b.WriteString("\n")
	w := widthFor(m.width)
	switch m.step {
	case stepWelcome:
		b.WriteString(m.viewWelcome(w))
	case stepProfile:
		b.WriteString(m.viewProfile(w))
	case stepTopology:
		b.WriteString(m.viewTopology(w))
	case stepExpose:
		b.WriteString(m.viewExpose(w))
	case stepHost:
		b.WriteString(m.viewHost(w))
	case stepPort:
		b.WriteString(m.viewPort(w))
	case stepSecure:
		b.WriteString(m.viewSecure(w))
	case stepVolumes:
		b.WriteString(m.viewVolumes(w))
	case stepSummary:
		b.WriteString(m.viewSummary(w))
	case stepReview:
		b.WriteString(m.viewReview(w))
	case stepConfirm:
		b.WriteString(m.viewConfirm(w))
	case stepDone:
		b.WriteString(m.viewDone(w))
	}
	return b.String()
}


func boolStr(b bool) string {
	if b {
		return ok.Render("yes")
	}
	return dim.Render("no")
}

func orDefault(s string) string {
	if s == "" {
		return dim.Render("(named volume)")
	}
	return s
}

func (m Model) Config() config.Config { return m.cfg }

// Stub used by older code paths; intentionally returns the rendered profile
// description so callers can show context if they want.
var _ = profile.Description
func (m Model) viewWelcome(w int) string {
	return box(w,
		accent.Render("Welcome!")+"\n\n"+
			"This tool will generate the Huly self-host configuration. "+
			"It can run in two modes:\n\n"+
			"  • "+ok.Render("Quick")+" — use defaults, skip prompts, start immediately\n"+
			"  • "+accent.Render("Interactive")+" — step through the choices below\n\n"+
			keyStyle.Render(" enter ")+" "+helpStyle.Render("begin  •  ctrl+c abort"),
	)
}

func (m Model) viewProfile(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 1/9  Deployment profile "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("Huly is normally tuned for many concurrent users. For a self-hosted instance with a single user, we ship a memory-optimized variant. Which do you want?"))
	b.WriteString("\n\n")
	options := []string{
		profile.Short(config.ProfileMulti),
		profile.Short(config.ProfileSingle),
	}
	for i, opt := range options {
		if i == m.cursor {
			b.WriteString(selected.Render("▶ ") + selected.Render(opt) + "\n")
		} else {
			b.WriteString(unselected.Render("  ") + opt + "\n")
		}
	}
	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" ↑/↓ ") + helpStyle.Render("move  ") +
		keyStyle.Render(" enter ") + helpStyle.Render("confirm  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewTopology(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 2/9  Network topology "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("How is the stack exposed to browsers?"))
	b.WriteString("\n\n")
	options := [][]string{
		{"Built-in nginx container", "Ship an nginx service in the compose stack; it binds to the host on the port you choose. Simplest option. (Your external reverse proxy can still forward to it.)"},
		{"Behind a reverse proxy", "Skip the nginx container. Generate a paste-ready snippet for your existing nginx / caddy / traefik."},
	}
	for i, opt := range options {
		mark := "  "
		if i == m.cursor {
			mark = selected.Render("▶ ")
		}
		b.WriteString(mark + opt[0] + "\n")
		b.WriteString("    " + dim.Render(opt[1]) + "\n")
	}
	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" ↑/↓ ") + helpStyle.Render("move  ") +
		keyStyle.Render(" enter ") + helpStyle.Render("confirm  •  esc back  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewExpose(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 3/9  How does your proxy reach the services? "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("The in-stack nginx is gone. Each service (front, account, transactor...) needs a way to be reached. Pick how the proxy connects:"))
	b.WriteString("\n\n")
	options := [][]string{
		{"127.0.0.1 — bind to localhost", "RECOMMENDED when your proxy runs on this host (system nginx, caddy, traefik). Services are bound to 127.0.0.1:<port> — not reachable from the network."},
		{"0.0.0.0 — bind to all interfaces", "Same as above, but services are reachable from any host interface. Useful when the proxy runs on a different host."},
		{"Docker network only", "Don't publish any host ports. Your proxy container must join the huly_net network and reach services by hostname (e.g. http://front:8080)."},
	}
	for i, opt := range options {
		mark := "  "
		if i == m.cursor {
			mark = selected.Render("▶ ")
		}
		b.WriteString(mark + opt[0] + "\n")
		b.WriteString("    " + dim.Render(opt[1]) + "\n\n")
	}
	b.WriteString(keyStyle.Render(" ↑/↓ ") + helpStyle.Render("move  ") +
		keyStyle.Render(" enter ") + helpStyle.Render("confirm  •  esc back  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewHost(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 4/9  Host address "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("Domain name or IP that browsers will use to reach Huly. Press Enter for default (localhost)."))
	b.WriteString("\n\n")
	b.WriteString(accent.Render("> ") + m.hostInput + "█\n")
	if m.err != nil {
		b.WriteString("\n" + errStyle.Render(m.err.Error()) + "\n")
	}
	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" enter ") + helpStyle.Render("continue  •  esc back  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewPort(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 5/9  HTTP port "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("Host port the nginx container (or your reverse proxy) will bind to. Use 80 for plaintext, 443 for TLS-terminated-by-proxy."))
	b.WriteString("\n\n")
	b.WriteString(accent.Render("> ") + m.portInput + "█\n")
	if m.err != nil {
		b.WriteString("\n" + errStyle.Render(m.err.Error()) + "\n")
	}
	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" enter ") + helpStyle.Render("continue  •  esc back  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewSecure(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 6/9  TLS "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("Is Huly served over HTTPS? (If using a reverse proxy, choose yes and terminate TLS upstream.)"))
	b.WriteString("\n\n")
	options := []string{"Yes — generate URLs with https://", "No — use plain http://"}
	for i, opt := range options {
		mark := "  "
		if i == m.cursor {
			mark = selected.Render("▶ ")
		}
		b.WriteString(mark + opt + "\n")
	}
	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" ↑/↓ ") + helpStyle.Render("move  ") +
		keyStyle.Render(" enter ") + helpStyle.Render("continue  •  esc back  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewVolumes(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 7/9  Persistent storage "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("Leave blank to use Docker named volumes, or enter a host path. Press Tab to switch fields. Press Enter when done."))
	b.WriteString("\n\n")
	fields := []struct {
		label string
		val   *string
	}{
		{"Elasticsearch", &m.elasticPath},
		{"Files (MinIO)", &m.filesPath},
		{"CockroachDB data", &m.crDataPath},
		{"CockroachDB certs", &m.crCertsPath},
		{"Redpanda", &m.redpandaPath},
	}
	for i, f := range fields {
		marker := "  "
		if i == m.cursor {
			marker = selected.Render("▶ ")
		}
		val := *f.val
		cursor := ""
		if i == m.cursor {
			cursor = "█"
		}
		display := val
		if display == "" {
			display = dim.Render("(named volume)")
		}
		b.WriteString(fmt.Sprintf("%s%-18s %s%s\n", marker, f.label+":", display, cursor))
	}
	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" tab ") + helpStyle.Render("next field  ") +
		keyStyle.Render(" enter ") + helpStyle.Render("continue  •  esc back  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewSummary(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 8/9  Configuration summary "))
	b.WriteString("\n\n")
	rows := []struct{ k, v string }{
		{"Profile", string(m.cfg.Profile)},
		{"Topology", string(m.cfg.Topology)},
		{"Host", m.cfg.HostAddress},
		{"Port", fmt.Sprintf("%d", m.cfg.HTTPPort)},
		{"TLS", boolStr(m.cfg.Secure)},
		{"Elastic volume", orDefault(m.cfg.VolumeElasticPath)},
		{"Files volume", orDefault(m.cfg.VolumeFilesPath)},
		{"CR data volume", orDefault(m.cfg.VolumeCRDataPath)},
		{"CR certs volume", orDefault(m.cfg.VolumeCRCertsPath)},
		{"Redpanda volume", orDefault(m.cfg.VolumeRedpanda)},
		{"Huly version", m.cfg.HulyVersion},
	}
	if m.cfg.Topology == config.TopologyReverse {
		rows = append(rows, struct{ k, v string }{k: "Expose", v: string(m.cfg.ExposeMode)})
	}
	for _, r := range rows {
		b.WriteString(fmt.Sprintf("  %-18s %s\n", dim.Render(r.k+":"), r.v))
	}
	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" enter ") + helpStyle.Render("review changes  •  esc back  •  ctrl+c abort"))
	return box(w, b.String())
}

// viewReview shows exactly what the runner will write and run. This is the
// last gate before execution.
func (m Model) viewReview(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Step 9/9  Review changes "))
	b.WriteString("\n\n")
	b.WriteString(dim.Render("The following will happen if you confirm:"))
	b.WriteString("\n\n")

	b.WriteString(accent.Render("Files to write") + "\n")
	b.WriteString("  " + dim.Render("• huly_v7.conf  ") + "env, secrets, host\n")
	b.WriteString("  " + dim.Render("• compose.yml    ") + "services, ports, profiles\n")
	if m.cfg.Topology == config.TopologyBuiltin {
		b.WriteString("  " + dim.Render("• .huly.nginx   ") + "in-container nginx config\n")
	} else {
		b.WriteString("  " + dim.Render("• reverse-proxy.conf") + " snippet for your proxy\n")
	}
	b.WriteString("  " + dim.Render("• .huly.secret, .cr.secret, .rp.secret") + " 32-byte hex\n")

	b.WriteString("\n")
	b.WriteString(accent.Render("Docker actions") + "\n")
	b.WriteString("  " + dim.Render("• docker compose pull  ") + "(unless --skip-pull)\n")
	b.WriteString("  " + dim.Render("• docker compose up -d ") + "(unless --skip-up)\n")

	b.WriteString("\n")
	b.WriteString(accent.Render("Profile impact") + "\n")
	if m.cfg.Profile == config.ProfileSingle {
		b.WriteString("  " + ok.Render("single-tenant") + " ~4 GB RAM at idle, ~6 GB peak.\n")
		b.WriteString("  Logging rotated per-service.\n")
		b.WriteString("  Disabled: signup, passwords, recover,\n")
		b.WriteString("  auto-translate, mailboxes.\n")
	} else {
		b.WriteString("  " + dim.Render("multi-tenant") + " unbounded resources,\n  upstream-equivalent.\n")
	}

	if m.cfg.Topology == config.TopologyBuiltin {
		b.WriteString("\n")
		b.WriteString(accent.Render("Reachable at") + "\n")
		scheme := "http"
		if m.cfg.Secure {
			scheme = "https"
		}
		url := fmt.Sprintf("%s://%s", scheme, m.cfg.HostAddress)
		if !m.cfg.IsLocal() && m.cfg.HTTPPort != 80 && m.cfg.HTTPPort != 443 {
			url = fmt.Sprintf("%s://%s:%d", scheme, m.cfg.HostAddress, m.cfg.HTTPPort)
		}
		b.WriteString("  " + ok.Render(url) + "\n")
	} else {
		b.WriteString("\n")
		b.WriteString(accent.Render("After apply") + "\n")
		b.WriteString("  Configure your proxy with " + ok.Render("reverse-proxy.conf") + "\n")
	}

	if m.cfg.DryRun {
		b.WriteString("\n")
		b.WriteString(warn.Render("DRY RUN") + " no files written, no containers started\n")
	}

	b.WriteString("\n")
	b.WriteString(keyStyle.Render(" enter ") + helpStyle.Render("confirm & apply  •  ") +
		keyStyle.Render(" b ") + helpStyle.Render("back to summary  •  ctrl+c abort"))
	return box(w, b.String())
}

func (m Model) viewConfirm(w int) string {
	var b strings.Builder
	b.WriteString(sectionTitle.Render(" Apply now? "))
	b.WriteString("\n\n")
	b.WriteString(accent.Render("Apply changes and start the Huly stack?"))
	b.WriteString("\n\n")
	if m.cfg.DryRun {
		b.WriteString(warn.Render("DRY RUN") + dim.Render(" — nothing will be written or started.") + "\n\n")
	}
	b.WriteString(dim.Render("Answer "))
	b.WriteString(ok.Render("Y") + dim.Render(" to apply, "))
	b.WriteString(errStyle.Render("N") + dim.Render(" to go back, or "))
	b.WriteString(dim.Render("press ctrl+c to abort."))
	return box(w, b.String())
}

func (m Model) viewDone(w int) string {
	return box(w,
		ok.Render("✓ Configuration applied.")+"\n\n"+
			dim.Render("The runner is now executing docker compose pull + up. "+
				"Watch for the summary that follows the program exit."))
}
