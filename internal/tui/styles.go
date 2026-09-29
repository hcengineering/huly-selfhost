package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/reflow/wrap"
)

var (
	brand = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#7c3aed")).
		Bold(true)

	accent = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#22d3ee")).
		Bold(true)

	dim = lipgloss.NewStyle().Foreground(lipgloss.Color("#71717a"))

	ok = lipgloss.NewStyle().Foreground(lipgloss.Color("#10b981")).Bold(true)

	warn = lipgloss.NewStyle().Foreground(lipgloss.Color("#f59e0b")).Bold(true)

	errStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#ef4444")).Bold(true)

	keyStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#0a0a0a")).
			Background(lipgloss.Color("#7c3aed")).
			Bold(true).
			Padding(0, 1)

	helpStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#a1a1aa"))

	sectionTitle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#fafafa")).
			Background(lipgloss.Color("#3f3f46")).
			Bold(true).
			Padding(0, 1)

	selected = lipgloss.NewStyle().Foreground(lipgloss.Color("#22d3ee")).Bold(true)
	unselected = lipgloss.NewStyle().Foreground(lipgloss.Color("#a1a1aa"))
)

// box builds the standard bordered container. The body is wrapped to fit the
// requested outer width, with the actual content area being outer - 6 (1 border
// + 1 padding on each side, plus a small safety margin so word-wrap doesn't
// break at exactly the rightmost column).
func box(outerWidth int, s string) string {
	if outerWidth < 24 {
		outerWidth = 24
	}
	contentWidth := outerWidth - 6
	if contentWidth < 14 {
		contentWidth = 14
	}
	body := wrap.String(s, contentWidth)
	b := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#3f3f46")).
		Padding(0, 1).
		MarginTop(1).
		MarginBottom(1).
		Width(outerWidth)
	return b.Render(body)
}

// widthFor returns the available content width inside the box given the
// terminal width. Leaves 2 columns of breathing room on each side.
func widthFor(termW int) int {
	if termW <= 0 {
		return 76
	}
	w := termW - 4
	if w < 20 {
		w = 20
	}
	if w > 100 {
		w = 100
	}
	return w
}

// logo returns the banner. It's drawn at its natural width so it stays crisp.
func logo() string {
	return brand.Render(strings.TrimRight(`
 ██╗  ██╗██╗   ██╗██╗  ██╗   ██╗
 ██║  ██║██║   ██║██║  ╚██╗ ██╔╝
 ███████║██║   ██║██║   ╚████╔╝
 ██╔══██║██║   ██║██║    ╚██╔╝
 ██║  ██║╚██████╔╝███████╗██║
 ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝
                       self-host setup`, "\n"))
}