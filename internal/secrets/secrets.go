// Package secrets handles the three persistent secret files used by Huly:
// .huly.secret, .cr.secret, .rp.secret. Each file holds 32 bytes of hex.
package secrets

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
)

const hexBytes = 32

func Ensure(path string, force bool) (string, error) {
	if !force {
		if data, err := os.ReadFile(path); err == nil {
			s := strip(string(data))
			if s != "" {
				return s, nil
			}
		}
	}
	buf := make([]byte, hexBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("read random: %w", err)
	}
	secret := hex.EncodeToString(buf)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(path, []byte(secret+"\n"), 0o600); err != nil {
		return "", err
	}
	return secret, nil
}

func strip(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '\n' || c == '\r' || c == ' ' || c == '\t' {
			continue
		}
		out = append(out, c)
	}
	return string(out)
}
