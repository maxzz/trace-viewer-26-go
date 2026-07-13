//go:build windows

package backend

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/bep/debounce"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/sys/windows"
)

// monitorDebounceDelay coalesces the burst of change notifications Windows fires
// for a single logical file operation before we scan and diff the folders.
const monitorDebounceDelay = 150 * time.Millisecond

type fileSnapshot struct {
	path  string
	size  int64
	modMs int64
}

type fsMonitor struct {
	folders []string
	appCtx  context.Context

	mu    sync.Mutex
	known map[string]fileSnapshot
}

func (a *App) platformStartMonitor(req StartMonitorRequest) error {
	a.platformStopMonitor()

	appCtx := a.ctx
	if appCtx == nil {
		return nil
	}

	folders := dedupeFolders(req.Folders)
	if len(folders) == 0 {
		return nil
	}

	monitor := &fsMonitor{
		folders: folders,
		appCtx:  appCtx,
		known:   seedKnownState(folders, req.Files),
	}

	ctx, cancel := context.WithCancel(context.Background())

	a.monitorMu.Lock()
	a.monitorCancel = cancel
	a.monitorMu.Unlock()

	debounced := debounce.New(monitorDebounceDelay)
	trigger := func() { debounced(monitor.diffAndEmit) }

	for _, folder := range folders {
		go watchFolder(ctx, folder, trigger)
	}

	return nil
}

func (a *App) platformStopMonitor() {
	a.monitorMu.Lock()
	cancel := a.monitorCancel
	a.monitorCancel = nil
	a.monitorMu.Unlock()

	if cancel != nil {
		cancel()
	}
}

func dedupeFolders(folders []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(folders))
	for _, folder := range folders {
		trimmed := strings.TrimSpace(folder)
		if trimmed == "" {
			continue
		}
		key := normalizePathKey(trimmed)
		if seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, trimmed)
	}
	return result
}

// seedKnownState builds the baseline map of .trc3 files. It starts from the
// current on-disk state of every folder, then overrides sizes with the web
// component's view so growth that happened between the initial load and the
// monitor start is reported as a modification on the next change.
func seedKnownState(folders []string, webFiles []MonitorFileInfo) map[string]fileSnapshot {
	known := map[string]fileSnapshot{}

	for _, folder := range folders {
		for key, snap := range scanFolderTrc3(folder) {
			known[key] = snap
		}
	}

	for _, file := range webFiles {
		key := normalizePathKey(file.Path)
		snap := known[key]
		snap.path = file.Path
		snap.size = file.Size
		known[key] = snap
	}

	return known
}

func scanFolderTrc3(folder string) map[string]fileSnapshot {
	result := map[string]fileSnapshot{}

	entries, err := os.ReadDir(folder)
	if err != nil {
		return result
	}

	for _, entry := range entries {
		if entry.IsDir() || !isTrc3FileName(entry.Name()) {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		full := filepath.Join(folder, entry.Name())
		result[normalizePathKey(full)] = fileSnapshot{
			path:  full,
			size:  info.Size(),
			modMs: info.ModTime().UnixMilli(),
		}
	}

	return result
}

func (m *fsMonitor) diffAndEmit() {
	current := map[string]fileSnapshot{}
	for _, folder := range m.folders {
		for key, snap := range scanFolderTrc3(folder) {
			current[key] = snap
		}
	}

	m.mu.Lock()
	var added, modified []MonitorChangedFile
	var deleted []string

	for key, snap := range current {
		prev, ok := m.known[key]
		if !ok {
			added = append(added, MonitorChangedFile{Path: snap.path, Size: snap.size})
			continue
		}
		if prev.size != snap.size || prev.modMs != snap.modMs {
			modified = append(modified, MonitorChangedFile{Path: snap.path, Size: snap.size})
		}
	}
	for key, prev := range m.known {
		if _, ok := current[key]; !ok {
			deleted = append(deleted, prev.path)
		}
	}
	m.known = current
	m.mu.Unlock()

	if len(added) == 0 && len(modified) == 0 && len(deleted) == 0 {
		return
	}

	runtime.EventsEmit(m.appCtx, "monitor-changes", MonitorChanges{
		Added:    added,
		Modified: modified,
		Deleted:  deleted,
	})
}

// watchFolder runs a blocking ReadDirectoryChangesW loop on a single folder,
// invoking onChange for every notification until ctx is cancelled. Overlapped
// I/O plus a stop event lets the wait be interrupted cleanly.
func watchFolder(ctx context.Context, folder string, onChange func()) {
	dirPtr, err := windows.UTF16PtrFromString(folder)
	if err != nil {
		return
	}

	handle, err := windows.CreateFile(
		dirPtr,
		windows.FILE_LIST_DIRECTORY,
		windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE|windows.FILE_SHARE_DELETE,
		nil,
		windows.OPEN_EXISTING,
		windows.FILE_FLAG_BACKUP_SEMANTICS|windows.FILE_FLAG_OVERLAPPED,
		0,
	)
	if err != nil {
		return
	}
	defer windows.CloseHandle(handle)

	// Manual-reset events: one signalled by the overlapped read completing, one
	// signalled when the caller cancels the context.
	overlappedEvent, err := windows.CreateEvent(nil, 1, 0, nil)
	if err != nil {
		return
	}
	defer windows.CloseHandle(overlappedEvent)

	stopEvent, err := windows.CreateEvent(nil, 1, 0, nil)
	if err != nil {
		return
	}
	defer windows.CloseHandle(stopEvent)

	go func() {
		<-ctx.Done()
		_ = windows.SetEvent(stopEvent)
	}()

	const filter = windows.FILE_NOTIFY_CHANGE_FILE_NAME |
		windows.FILE_NOTIFY_CHANGE_SIZE |
		windows.FILE_NOTIFY_CHANGE_LAST_WRITE

	buffer := make([]byte, 64*1024)

	for {
		var overlapped windows.Overlapped
		overlapped.HEvent = overlappedEvent
		_ = windows.ResetEvent(overlappedEvent)

		err := windows.ReadDirectoryChanges(
			handle,
			&buffer[0],
			uint32(len(buffer)),
			false,
			filter,
			nil,
			&overlapped,
			0,
		)
		if err != nil {
			return
		}

		event, err := windows.WaitForMultipleObjects(
			[]windows.Handle{overlappedEvent, stopEvent},
			false,
			windows.INFINITE,
		)
		if err != nil {
			_ = windows.CancelIoEx(handle, &overlapped)
			return
		}

		// event == 0 -> overlappedEvent (a change); anything else -> stop/failure.
		if event != 0 {
			_ = windows.CancelIoEx(handle, &overlapped)
			return
		}

		var bytesReturned uint32
		if err := windows.GetOverlappedResult(handle, &overlapped, &bytesReturned, false); err != nil {
			return
		}

		onChange()
	}
}
