# Window position saving mechanism
_Exported on 6/24/2026 at 16:31:27 PDT from Cursor (3.8.23)_

---

**User**

In the current implementation, the window position is saved only when the application closes.
This is incorrect.
The position should be saved whenever the window is resized or moved.
These actions should trigger the saving process, but the actual save operation should occur approximately five seconds after such changes cease (using a delay or debouncing mechanism).

---

**Cursor**

I'll locate where window position is persisted today and how close/save hooks are wired, then add debounced save on move and resize.


Implementing debounced window-bounds saving on the backend: polling for move/resize changes and persisting ~5s after they stop.


Window position and size are now saved while the app runs, not only on exit.

### What changed

1. **`backend/window_bounds.go`** — A background watcher polls the window every 250ms for position, size, and maximized state. When any of those change, it schedules a save with a **5-second debounce** (using `github.com/bep/debounce`, already in the project).

2. **`backend/app.go`** — The watcher starts in `DomReady` after the saved bounds are restored, so restore does not trigger a spurious save. On close, the watcher is stopped and **`saveWindowOptions` still runs immediately** so nothing is lost if you quit within the 5-second window.

### Behavior

- Move or resize the window → save is scheduled.
- Keep moving/resizing → the 5-second timer resets on each change.
- Stop for ~5 seconds → bounds are written to `init.json`.
- Close the app → final save runs right away regardless of the debounce timer.

The dev server should pick this up on the next backend rebuild; move/resize the window, wait about 5 seconds, and check `%APPDATA%\trace-viewer-26\init.json` to confirm the bounds updated.

