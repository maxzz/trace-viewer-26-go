//go:build windows

package backend

import (
	"fmt"
	"os"
	"runtime"
	"syscall"
	"unsafe"
)

type comGUID struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

var (
	clsidShellLink = comGUID{0x00021401, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}}
	iidShellLinkW  = comGUID{0x000214F9, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}}
	iidPersistFile = comGUID{0x0000010B, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}}
)

const (
	coinitApartmentThreaded = 0x2
	clsctxInprocServer      = 0x1
	win32FindDataSize       = 592 // sizeof(WIN32_FIND_DATAW)
)

// resolveShortcutTarget parses the raw bytes of a .lnk shortcut and returns the
// absolute path of the file or folder it points to. Because the Windows shell
// COM API loads shortcuts from disk, the bytes are written to a temporary file
// first.
func resolveShortcutTarget(data []byte) (string, error) {
	if len(data) == 0 {
		return "", fmt.Errorf("empty shortcut data")
	}

	tempPath, err := writeTempLinkFile(data)
	if err != nil {
		return "", err
	}
	defer os.Remove(tempPath)

	return resolveShortcutFile(tempPath)
}

func writeTempLinkFile(data []byte) (string, error) {
	file, err := os.CreateTemp("", "tv-shortcut-*.lnk")
	if err != nil {
		return "", err
	}
	defer file.Close()

	if _, err := file.Write(data); err != nil {
		return "", err
	}

	return file.Name(), nil
}

func resolveShortcutFile(path string) (string, error) {
	// COM apartments are per-thread, so pin this goroutine to its OS thread.
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	ole32 := syscall.NewLazyDLL("ole32.dll")
	coInitializeEx := ole32.NewProc("CoInitializeEx")
	coUninitialize := ole32.NewProc("CoUninitialize")
	coCreateInstance := ole32.NewProc("CoCreateInstance")

	hr, _, _ := coInitializeEx.Call(0, uintptr(coinitApartmentThreaded))
	// S_OK (0) and S_FALSE (1) mean we initialized COM on this thread and must
	// balance it with CoUninitialize. RPC_E_CHANGED_MODE means COM was already
	// initialized differently; in that case we must not uninitialize.
	if hr == 0 || hr == 1 {
		defer coUninitialize.Call()
	}

	var shellLink unsafe.Pointer
	hr, _, _ = coCreateInstance.Call(
		uintptr(unsafe.Pointer(&clsidShellLink)),
		0,
		uintptr(clsctxInprocServer),
		uintptr(unsafe.Pointer(&iidShellLinkW)),
		uintptr(unsafe.Pointer(&shellLink)),
	)
	if hr != 0 || shellLink == nil {
		return "", fmt.Errorf("CoCreateInstance(ShellLink) failed: 0x%08x", uint32(hr))
	}
	defer comRelease(shellLink)

	var persistFile unsafe.Pointer
	// IUnknown::QueryInterface is vtable index 0.
	hr = comCall(shellLink, 0, uintptr(unsafe.Pointer(&iidPersistFile)), uintptr(unsafe.Pointer(&persistFile)))
	if hr != 0 || persistFile == nil {
		return "", fmt.Errorf("QueryInterface(IPersistFile) failed: 0x%08x", uint32(hr))
	}
	defer comRelease(persistFile)

	pathPtr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return "", err
	}

	// IPersistFile::Load is vtable index 5 (dwMode STGM_READ == 0).
	hr = comCall(persistFile, 5, uintptr(unsafe.Pointer(pathPtr)), 0)
	if hr != 0 {
		return "", fmt.Errorf("IPersistFile.Load failed: 0x%08x", uint32(hr))
	}

	// IShellLinkW::GetPath is vtable index 3.
	buf := make([]uint16, syscall.MAX_PATH)
	findData := make([]byte, win32FindDataSize)
	hr = comCall(
		shellLink, 3,
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)),
		uintptr(unsafe.Pointer(&findData[0])),
		0,
	)
	if hr != 0 {
		return "", fmt.Errorf("IShellLink.GetPath failed: 0x%08x", uint32(hr))
	}

	target := syscall.UTF16ToString(buf)
	if target == "" {
		return "", fmt.Errorf("shortcut has no file system target")
	}

	return target, nil
}

// comCall invokes the COM method at the given vtable index on obj, passing obj
// as the implicit "this" argument. A COM interface pointer points to a struct
// whose first field is a pointer to the vtable (an array of function pointers).
func comCall(obj unsafe.Pointer, method int, args ...uintptr) uintptr {
	vtable := *(**[64]uintptr)(obj)
	ret, _, _ := syscall.SyscallN(vtable[method], append([]uintptr{uintptr(obj)}, args...)...)
	return ret
}

func comRelease(obj unsafe.Pointer) {
	// IUnknown::Release is vtable index 2.
	comCall(obj, 2)
}
