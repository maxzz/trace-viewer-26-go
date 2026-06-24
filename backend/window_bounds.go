package backend

import (
	"context"
	"time"

	"github.com/bep/debounce"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	windowBoundsSaveDelay      = 5 * time.Second
	windowBoundsPollInterval   = 250 * time.Millisecond
)

func (a *App) startWindowBoundsWatcher(watchCtx context.Context) {
	debouncedSave := debounce.New(windowBoundsSaveDelay)

	go func() {
		var lastX, lastY, lastW, lastH int
		var lastMaximized bool
		initialized := false

		ticker := time.NewTicker(windowBoundsPollInterval)
		defer ticker.Stop()

		for {
			select {
			case <-watchCtx.Done():
				return
			case <-ticker.C:
				saveCtx := a.ctx
				if saveCtx == nil {
					continue
				}

				x, y := runtime.WindowGetPosition(saveCtx)
				w, h := runtime.WindowGetSize(saveCtx)
				maximized := runtime.WindowIsMaximised(saveCtx)

				if !initialized {
					lastX, lastY, lastW, lastH = x, y, w, h
					lastMaximized = maximized
					initialized = true
					continue
				}

				if x == lastX && y == lastY && w == lastW && h == lastH && maximized == lastMaximized {
					continue
				}

				lastX, lastY, lastW, lastH = x, y, w, h
				lastMaximized = maximized

				debouncedSave(func() {
					select {
					case <-watchCtx.Done():
						return
					default:
					}

					if saveCtx := a.ctx; saveCtx != nil {
						a.saveWindowOptions(saveCtx)
					}
				})
			}
		}
	}()
}

func (a *App) stopWindowBoundsWatcher() {
	if a.windowBoundsCancel == nil {
		return
	}

	a.windowBoundsCancel()
	a.windowBoundsCancel = nil
}
