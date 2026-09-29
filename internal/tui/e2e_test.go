package tui

import (
	"bytes"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

// runWithKeys drives a full TUI session by feeding a sequence of key events.
// Returns the final model and rendered output.
func runWithKeys(t *testing.T, c config.Config, keys string) (Model, string) {
	t.Helper()
	in := strings.NewReader(keys)
	var out bytes.Buffer
	m := New(c)
	p := tea.NewProgram(m, tea.WithInput(in), tea.WithOutput(&out))
	// Bubble Tea reads from input in a goroutine; give it a moment.
	done := make(chan struct{})
	var final tea.Model
	go func() {
		f, err := p.Run()
		if err != nil {
			t.Errorf("tui.Run: %v", err)
		}
		final = f
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		p.Quit()
		<-done
	}
	return final.(Model), out.String()
}

func keys(ks ...tea.KeyType) string {
	var b strings.Builder
	for _, k := range ks {
		switch k {
		case tea.KeyEnter:
			b.WriteByte('\r')
		case tea.KeyEsc:
			b.WriteString("\x1b")
		case tea.KeyUp:
			b.WriteString("\x1b[A")
		case tea.KeyDown:
			b.WriteString("\x1b[B")
		case tea.KeyTab:
			b.WriteByte('\t')
		case tea.KeySpace:
			b.WriteByte(' ')
		default:
			b.WriteString(string(rune(k)))
		}
	}
	return b.String()
}

func TestFullFlowSucceeds(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	// Welcome → enter → Profile (default multi) → enter → Topology (builtin)
	// → enter → Host (already set, just enter) → Port (already set, enter)
	// → Secure (yes=0, enter) → Volumes (enter enter ... )
	// → Summary (enter) → Review (enter) → Confirm (y)
	keys := keys(tea.KeyEnter) + // welcome
		keys(tea.KeyEnter) + // profile
		keys(tea.KeyEnter) + // topology (builtin default)
		keys(tea.KeyEnter) + // host (already filled)
		keys(tea.KeyEnter) + // port (already filled)
		keys(tea.KeyEnter) + // secure (default yes = cursor 0)
		keys(tea.KeyEnter) + // volumes (accept defaults)
		keys(tea.KeyEnter) + // summary -> review
		keys(tea.KeyEnter) + // review -> confirm
		keys('y') // apply

	m, _ := runWithKeys(t, c, keys)
	if m.aborted {
		t.Fatalf("unexpected abort")
	}
	if m.step != stepDone {
		t.Fatalf("expected stepDone, got %d", m.step)
	}
	// walk the model through the same flow by hand and verify the View at
	// each step renders the right content.
	steps := []step{
		stepWelcome, stepProfile, stepTopology, stepHost, stepPort,
		stepSecure, stepVolumes, stepSummary, stepReview, stepConfirm,
	}
	wantSubstrings := []string{
		"Welcome!",
		"Step 1/9",
		"Step 2/9",
		"Step 4/9",
		"Step 5/9",
		"Step 6/9",
		"Step 7/9",
		"Step 8/9",
		"Step 9/9",
		"Apply now?",
	}
	for i, s := range steps {
		m2 := m
		m2.step = s
		v := m2.View()
		if !strings.Contains(v, wantSubstrings[i]) {
			t.Errorf("step %d view missing %q", s, wantSubstrings[i])
		}
	}
}

func TestCtrlCAborts(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	m, out := runWithKeys(t, c, keys(tea.KeyCtrlC))
	if !m.aborted {
		t.Fatal("expected aborted flag")
	}
	if strings.Contains(out, "Welcome!") == false {
		t.Fatal("expected welcome in output before abort")
	}
}

func TestBackNavigationFlow(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	// Welcome -> enter -> Profile -> esc (back to welcome)
	ks := keys(tea.KeyEnter) + keys(tea.KeyEsc)
	m, _ := runWithKeys(t, c, ks)
	if m.step != stepWelcome {
		t.Fatalf("expected stepWelcome after back from profile, got %d", m.step)
	}
}

func TestReviewStepShowsFilesAndActions(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	c.Profile = config.ProfileSingle
	c.Topology = config.TopologyBuiltin
	m := New(c)
	m.step = stepReview
	v := m.View()
	for _, want := range []string{
		"Review changes",
		"Files to write",
		"Docker actions",
		"Profile impact",
		"single-tenant",
		"Reachable at",
		"huly_v7.conf",
		"compose.yml",
	} {
		if !strings.Contains(v, want) {
			t.Errorf("review missing %q", want)
		}
	}
}

func TestReviewReverseProxyShowsSnippet(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	c.Profile = config.ProfileSingle
	c.Topology = config.TopologyReverse
	c.ExposeMode = config.ExposeLocalhost
	m := New(c)
	m.step = stepReview
	v := m.View()
	if !strings.Contains(v, "reverse-proxy.conf") {
		t.Error("review should mention reverse-proxy.conf for reverse-proxy topology")
	}
	if strings.Contains(v, ".huly.nginx") {
		t.Error("review should not mention .huly.nginx for reverse-proxy topology")
	}
}