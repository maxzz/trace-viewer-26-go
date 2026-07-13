package backend

import (
	"path/filepath"
	"strings"
)

// MonitorFileInfo describes a file the web component currently has loaded. It is
// sent when monitoring starts so the Go watcher can align its baseline with the
// web side (the "sync" of loaded file state).
type MonitorFileInfo struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
}

// StartMonitorRequest carries every parameter the web component needs the Go
// watcher to use: the folders to observe and the files already loaded.
type StartMonitorRequest struct {
	Folders []string          `json:"folders"`
	Files   []MonitorFileInfo `json:"files"`
}

// MonitorChangedFile is an added or modified file reported back to the web side.
type MonitorChangedFile struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
}

// MonitorChanges is the payload of the "monitor-changes" event emitted to the
// frontend whenever the watched folders change.
type MonitorChanges struct {
	Added    []MonitorChangedFile `json:"added"`
	Modified []MonitorChangedFile `json:"modified"`
	Deleted  []string             `json:"deleted"`
}

// StartMonitor begins watching the requested folders for .trc3 additions,
// deletions and size/timestamp changes, emitting "monitor-changes" events. Any
// previously running monitor is stopped first.
func (a *App) StartMonitor(req StartMonitorRequest) error {
	return a.platformStartMonitor(req)
}

// StopMonitor stops any active folder monitor.
func (a *App) StopMonitor() {
	a.platformStopMonitor()
}

func isTrc3FileName(name string) bool {
	return strings.HasSuffix(strings.ToLower(name), ".trc3")
}

func normalizePathKey(path string) string {
	return strings.ToLower(filepath.Clean(path))
}
