//go:build !windows

package backend

// Filesystem monitoring is only implemented on Windows. On other platforms the
// monitor methods are no-ops so the bound API stays available.

func (a *App) platformStartMonitor(req StartMonitorRequest) error {
	return nil
}

func (a *App) platformStopMonitor() {}
