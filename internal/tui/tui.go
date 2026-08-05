package tui

import (
	"fmt"
	"io"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/hcengineering/huly-selfhost/cmd/huly-setup/internal/config"
)

func Run(initial config.Config, in io.Reader, out io.Writer) (config.Config, error) {
	m := New(initial)
	p := tea.NewProgram(m, tea.WithInput(in), tea.WithOutput(out))
	final, err := p.Run()
	if err != nil {
		return config.Config{}, fmt.Errorf("tui: %w", err)
	}
	fm, ok := final.(Model)
	if !ok {
		return config.Config{}, fmt.Errorf("tui: unexpected model type %T", final)
	}
	if fm.aborted {
		return config.Config{}, ErrAborted
	}
	return fm.cfg, nil
}

// ErrAborted is returned by Run when the user pressed ctrl+c.
var ErrAborted = fmt.Errorf("tui: aborted")

// WasAborted reports whether the config returned by Run was produced by an
// aborted session. It's always false in practice because aborted runs return
// ErrAborted, but kept for symmetry / future use.
func WasAborted(_ config.Config) bool { return false }
