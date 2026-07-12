//go:build !windows

package backend

import "fmt"

// resolveShortcutTarget is only supported on Windows, where .lnk shortcuts exist.
func resolveShortcutTarget(_ []byte) (string, error) {
	return "", fmt.Errorf("resolving shortcut files is only supported on Windows")
}
