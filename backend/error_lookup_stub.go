//go:build !windows

package backend

func lookupErrorMessage(_ string) string {
	return ""
}
