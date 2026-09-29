package tui

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

func TestNewModelDefaults(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	m := New(c)
	if m.step != stepWelcome {
		t.Fatalf("expected initial step Welcome, got %d", m.step)
	}
	if m.cfg.Profile != config.ProfileMulti {
		t.Fatalf("expected default profile multi, got %q", m.cfg.Profile)
	}
}

func press(m Model, k tea.KeyType) Model {
	updated, _ := m.Update(tea.KeyMsg{Type: k})
	return updated.(Model)
}

func TestWelcomeAdvancesOnEnter(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	mm := press(New(c), tea.KeyEnter)
	if mm.step != stepProfile {
		t.Fatalf("expected profile step, got %d", mm.step)
	}
}

func TestProfileSelection(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	m := New(c)
	m.step = stepProfile
	m.cursor = 1
	mm := press(m, tea.KeyEnter)
	if mm.cfg.Profile != config.ProfileSingle {
		t.Fatalf("expected single profile, got %q", mm.cfg.Profile)
	}
	if mm.step != stepTopology {
		t.Fatalf("expected topology step, got %d", mm.step)
	}
}

func TestTopologyReverse(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	m := New(c)
	m.step = stepTopology
	m.cursor = 1
	mm := press(m, tea.KeyEnter)
	if mm.cfg.Topology != config.TopologyReverse {
		t.Fatalf("expected reverse topology, got %q", mm.cfg.Topology)
	}
}

func TestHostValidation(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	m := New(c)
	m.step = stepHost
	m.hostInput = ""
	mm := press(m, tea.KeyEnter)
	if mm.err == nil {
		t.Fatal("expected validation error for empty host")
	}
	m2 := New(c)
	m2.step = stepHost
	m2.hostInput = "huly.example.com"
	mm2 := press(m2, tea.KeyEnter)
	if mm2.step != stepPort {
		t.Fatalf("expected port step, got %d", mm2.step)
	}
	if mm2.cfg.HostAddress != "huly.example.com" {
		t.Fatalf("expected host set, got %q", mm2.cfg.HostAddress)
	}
}

func TestPortValidation(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	m := New(c)
	m.step = stepPort
	m.portInput = "70000"
	mm := press(m, tea.KeyEnter)
	if mm.err == nil {
		t.Fatal("expected validation error for bad port")
	}
	m2 := New(c)
	m2.step = stepPort
	m2.portInput = "443"
	mm2 := press(m2, tea.KeyEnter)
	if mm2.step != stepSecure {
		t.Fatalf("expected secure step, got %d", mm2.step)
	}
}

func TestViewSummaryContainsKey(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true, Profile: config.ProfileSingle, Topology: config.TopologyBuiltin}
	c.ApplyDefaults()
	m := New(c)
	m.step = stepSummary
	v := m.View()
	for _, want := range []string{"summary", "Profile", "Host"} {
		if !strings.Contains(v, want) {
			t.Errorf("view missing %q", want)
		}
	}
}

func TestReviewStepShowsChanges(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	c.Profile = config.ProfileSingle
	c.Topology = config.TopologyBuiltin
	m := New(c)
	m.step = stepReview
	v := m.View()
	for _, want := range []string{"Review", "Files to write", "Docker actions", "single-tenant", "Reachable at"} {
		if !strings.Contains(v, want) {
			t.Errorf("review view missing %q", want)
		}
	}
}

func TestBackNavigation(t *testing.T) {
	c := config.Config{HostAddress: "huly.example.com", HTTPPort: 443, Secure: true}
	c.ApplyDefaults()
	m := New(c)
	m.step = stepExpose
	mm := press(m, tea.KeyEsc)
	if mm.step != stepTopology {
		t.Fatalf("expected stepTopology, got %d", mm.step)
	}
}

func TestCtrlCMarksAborted(t *testing.T) {
	c := config.Config{}
	c.ApplyDefaults()
	m := New(c)
	mm := press(m, tea.KeyCtrlC)
	if !mm.aborted {
		t.Fatal("expected aborted flag set on ctrl+c")
	}
}
