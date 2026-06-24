//go:build windows

package backend

import (
	"strconv"
	"strings"
	"syscall"
	"unsafe"
)

const (
	formatMessageAllocateBuffer = 0x00000100
	formatMessageFromSystem     = 0x00001000
	formatMessageIgnoreInserts  = 0x00000200
	facilityWin32               = 7
)

func lookupErrorMessage(code string) string {
	unsigned, ok := parseErrorCodeInput(code)
	if !ok {
		return ""
	}

	candidates := make([]uint32, 0, 3)
	seen := map[uint32]bool{}

	addCandidate := func(value uint32) {
		if value == 0 || seen[value] {
			return
		}
		seen[value] = true
		candidates = append(candidates, value)
	}

	if unsigned <= 0xFFFF {
		addCandidate(unsigned)
	}

	win32 := win32CodeFromHResult(unsigned)
	addCandidate(win32)
	addCandidate(unsigned & 0xFFFF)

	for _, candidate := range candidates {
		if message := formatMessageWin32(candidate); message != "" {
			return message
		}
	}

	return ""
}

func parseErrorCodeInput(code string) (uint32, bool) {
	trimmed := strings.TrimSpace(code)
	if trimmed == "" {
		return 0, false
	}

	lower := strings.ToLower(trimmed)
	if strings.HasPrefix(lower, "0x") {
		value, err := strconv.ParseUint(trimmed[2:], 16, 32)
		return uint32(value), err == nil
	}

	if isHexDigits(trimmed) {
		value, err := strconv.ParseUint(trimmed, 16, 32)
		return uint32(value), err == nil
	}

	if isSignedDecimal(trimmed) {
		value, err := strconv.ParseInt(trimmed, 10, 32)
		return uint32(int32(value)), err == nil
	}

	return 0, false
}

func isHexDigits(value string) bool {
	if value == "" {
		return false
	}

	for _, r := range value {
		if (r < '0' || r > '9') && (r < 'a' || r > 'f') && (r < 'A' || r > 'F') {
			return false
		}
	}

	return true
}

func isSignedDecimal(value string) bool {
	if value == "" {
		return false
	}

	start := 0
	if value[0] == '-' {
		start = 1
	}

	if start >= len(value) {
		return false
	}

	for _, r := range value[start:] {
		if r < '0' || r > '9' {
			return false
		}
	}

	return true
}

func win32CodeFromHResult(hr uint32) uint32 {
	if hr <= 0xFFFF {
		return hr
	}

	facility := (hr >> 16) & 0x1FFF
	if facility == facilityWin32 {
		return hr & 0xFFFF
	}

	return hr & 0xFFFF
}

func formatMessageWin32(code uint32) string {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	formatMessageW := kernel32.NewProc("FormatMessageW")
	localFree := kernel32.NewProc("LocalFree")

	var buffer *uint16
	ret, _, _ := formatMessageW.Call(
		uintptr(formatMessageAllocateBuffer|formatMessageFromSystem|formatMessageIgnoreInserts),
		0,
		uintptr(code),
		0,
		uintptr(unsafe.Pointer(&buffer)),
		0,
		0,
	)
	if ret == 0 || buffer == nil {
		return ""
	}
	defer localFree.Call(uintptr(unsafe.Pointer(buffer)))

	slice := (*[1 << 20]uint16)(unsafe.Pointer(buffer))[:ret]
	return trimMessage(syscall.UTF16ToString(slice))
}

func trimMessage(message string) string {
	return strings.TrimSpace(message)
}
