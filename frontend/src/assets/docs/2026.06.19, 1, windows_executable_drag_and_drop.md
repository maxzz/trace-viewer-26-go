# Windows executable drag-and-drop functionality
_Exported on 6/19/2026 at 14:34:22 PDT from Cursor (3.8.11)_

---

**User**

This application consists of two parts: a frontend capable of operating completely independently of the backend, and a backend written in Go. Once the application is compiled into a Windows executable, it must support drag-and-drop functionality: if a ZIP archive, folder, or individual file is dragged onto the executable, the application should open the dragged object.


---

**Cursor**

I'll explore the codebase to see how the app is built and how it currently opens files, then implement Windows drag-and-drop on the executable.


Reading key files to implement Windows executable drag-and-drop.


Implementing Windows executable drag-and-drop: Go path handling, single-instance support, and frontend Wails integration.


Fixing duplicate OnFileDrop registration and consolidating Wails drop handling.


Unexporting internal App methods so Wails doesn't expose them to the frontend.


Wails-generated `models.ts` uses namespaces, which conflicts with `erasableSyntaxOnly`. Adding a typed wrapper to avoid importing generated models into the typecheck.


Windows drag-and-drop support is implemented for the compiled executable. Here is what was added and how it works.

## What was implemented

### 1. Drop onto the `.exe` (Windows Explorer)
When you drag a `.trc3` file, `.zip` archive, or folder onto `tm-template-go-26.exe`, Windows passes those paths as command-line arguments. The Go backend reads them and opens the files once the UI is ready.

- **`main.go`** — passes `os.Args[1:]` into the app and enables **single-instance lock** so a second drop forwards paths to the already-running window instead of starting another process
- **`backend/files.go`** — reads paths from disk (`.trc3`, `.zip`, first-level folder contents — same rules as the in-app drop handler)
- **`backend/app.go`** — emits an `open-paths` event on startup and when a second instance is launched

### 2. Drop onto the app window (Wails native)
In the desktop build, window drops use Wails `OnFileDrop`, which provides full filesystem paths (more reliable than HTML5 drag-and-drop in WebView2). The browser-only frontend path is unchanged.

### 3. Frontend integration
- **`8-0-load-files-from-paths.ts`** — loads files via the Go `ReadPaths` binding and reuses the existing `asyncLoadAnyFiles` pipeline
- **`init-wails-file-opening.ts`** — listens for `open-paths` events (exe drop / second instance)
- **`ui-drop-it-doc.tsx`** — uses Wails native drop in desktop mode; HTML5 drop remains for standalone browser use

## Supported drop targets

| Dropped item | Behavior |
|---|---|
| `.trc3` file | Opens the trace |
| `.zip` archive | Extracts and opens `.trc3` files inside |
| Folder | Opens first-level `.trc3` / `.zip` files (same as in-app folder drop) |
| Multiple items | Opens all supported files from all dropped paths |

## Build verified

The Windows executable builds successfully at:
`build/bin/tm-template-go-26.exe`

To test: drag a `.trc3`, `.zip`, or folder onto the `.exe` icon, or onto the running app window. If the app is already open, dropping onto the `.exe` again should focus the existing window and load the new files.

---

**User**

This application can launch multiple instances—that is, several copies can run simultaneously.

---

**Cursor**

Removing single-instance locking so each launch can run independently while keeping exe drag-and-drop via command-line args.


Removed the **single-instance lock**. Each launch now starts a separate process.

**What changed:**
- Removed `SingleInstanceLock` from `main.go`
- Removed `SecondInstanceLaunchHandler` and `onSecondInstanceLaunch` from `backend/app.go`

**What still works:**
- Dragging a file, folder, or ZIP onto the `.exe` still opens it in a **new** instance (via command-line args)
- Dropping onto an open window still loads files in that window

**New behavior:**
- Dropping onto the `.exe` while another instance is already running starts a second window instead of forwarding files to the existing one
- You can also launch multiple copies manually (double-click the exe, shortcuts, etc.)

---

**User**

Rename this @wails.json:2 to "trace-viewer-26" and @wails.json:3 to "tv-26" and update links. The repository name and folder names must remain the same.

---

**Cursor**

Searching the codebase for references to update the Wails app name and output filename.


Updating app identity references while keeping the Go module path and repository URLs unchanged.


Renamed the Wails app identity and updated related references. The repository, folder, and Go module path are unchanged.

**Updated:**
| File | Change |
|---|---|
| `wails.json` | `name` → `trace-viewer-26`, `outputfilename` → `tv-26` |
| `main.go` | Window title → `trace-viewer-26` |
| `backend/options.go` | Config dir → `%AppData%/trace-viewer-26/` |
| `package.json` | Root package name → `trace-viewer-26-root` |
| `.gitignore` | Build artifact patterns → `tv-26*` |
| `.vscode/launch.json` | Debug config label updated |

**Unchanged (as requested):**
- Repository folder name (`trace-viewer-26-go`)
- Go module path (`tm-template-go-26` in `go.mod` / imports)
- GitHub repository URLs in `package.json`
- README template history notes

The built executable is now `build/bin/tv-26.exe`.

---

**User**

When a folder, a ZIP file, or a single file is open, its name should be displayed in the window title; 
if multiple files are open, the title should show the location from which they were opened, with an '/*' at the end of the path.
This functionality should be implemented in the frontend part of the project, since the application can be launched either via an executable file or as a web application.

---

**Cursor**

Reviewing how the window title is set today and where file paths are tracked.


Implementing title logic in the frontend and wiring it to both `document.title` and the Wails window title.


Window title logic now lives entirely in the frontend and applies to both the web app and the Wails executable.

## Title rules

| Open source | Example title |
|---|---|
| Single `.trc3` file | `TV - trace.trc3` |
| Single `.zip` file | `TV - archive.zip` |
| Folder (picker, drop, or exe) | `TV - MyFolder` |
| Multiple files from the same location | `TV - C:\traces\folder/*` |

## Changes

**`frontend/src/store/3-ui-app-title.ts`** — Reworked `setAppTitle()` to:
- Show the **name** for a single file, ZIP, or folder
- Show the **common directory path + `/*`** when multiple files are opened from the same location (using native paths from exe/drop, or relative paths from folder picker)
- Fall back to `TV - N files` when multiple files are opened in the browser without path info
- Added `resetAppTitle()` for when all files are closed

**`frontend/src/components/4-dialogs/8-windows-app-title-caption.tsx`** — Sets both `document.title` (web) and `WindowSetTitle()` (Wails desktop)

**`frontend/src/store/traces-store/0-2-files-actions.ts`** — Resets the title when all files are closed

**`frontend/src/store/traces-store/8-1-load-files.ts`** — Sets the title once at the end of loading (so a ZIP with many extracted traces still shows the ZIP name, not a count)

---

**User**

There is some strange behavior when opening files: if a single file with the `.trc3` extension is opened, the position of the vertical splitter is not restored. However, if a single ZIP file is opened, the vertical splitter position is restored correctly. If two `.trc3` files are opened, the vertical splitter position is not restored. What could be causing this?

---

**Cursor**

Investigating how the vertical splitter position is saved and restored, and what differs between `.trc3` and ZIP loading paths.


Tracing the mount timing and panel persistence logic to confirm the root cause, then applying a fix.


Identified the cause: conditional mounting plus `onLayoutChange` saving layout during unstable initial layout. Applying a fix.


The behavior comes from **when the splitter mounts** and **how its position is saved**, not from a difference between `.trc3` and `.zip` parsing itself.

## Root cause

### 1. Conditional mounting (`0-app.tsx`)

`TraceMainView` (which contains the resizable panels) only renders when files are in the store:

```40:43:frontend/src/components/0-all/0-app.tsx
{!showTraceMainView
    ? <NoFilesView loading={isLoadingFiles && fileCount > 0} />
    : <TraceMainView />
}
```

**Direct `.trc3` open:** `loadFilesToStore()` pushes files into the store immediately, so `fileCount > 0` and the panel group mounts **while parsing is still in progress**.

**ZIP open:** `await extractTracesFromZipInWorker()` runs first. During that time `fileCount` stays `0`, so the panel group does **not** mount yet. It only appears after extraction finishes — by then the layout container has been stable for longer.

That timing gap is why ZIP appeared to “restore correctly” while `.trc3` did not.

### 2. `defaultSize` only applies on mount

Saved sizes from `appSettings.panelSizes` were passed as `defaultSize` on each panel. `react-resizable-panels` applies those **once** when the group mounts. If the group mounts while the container is still settling (during parse, content loading, All Times panel appearing, etc.), the library may compute a different layout — especially with `minSize="132px"` on the file list panel.

### 3. `onLayoutChange` overwrote saved sizes too early

The old handler used `onLayoutChange`, which fires on **every** layout recalculation, including automatic ones during mount. The library recommends `onLayoutChanged` for persistence (fires after layout settles, e.g. when the user finishes dragging).

So the sequence for `.trc3` was often:

1. Panel group mounts mid-load  
2. Library auto-calculates a default layout  
3. `onLayoutChange` saves that layout over your stored `panelSizes`  
4. You see the default 20/80 split instead of your saved position  

ZIP mostly avoided step 1 happening too early.

## Fix applied

1. **`0-app.tsx`** — Mount `TraceMainView` only when `fileCount > 0 && !isLoadingFiles`, so the splitter appears after loading finishes (same timing for `.trc3`, ZIP, and multi-file opens).

2. **`6-resizable-panels.tsx`** — Use `defaultLayout` on the group, switch to `onLayoutChanged`, explicitly `setLayout()` on mount via `useGroupRef`, and ignore layout events until that restore completes.

This keeps splitter persistence entirely in the frontend, as required for both the web app and the executable.

---

**User**

@frontend/src/components/0-all/0-app.tsx:43-47 make this change animated with motion libraary

---

**Cursor**

Adding an `AnimatePresence` crossfade between the empty state and main view, matching existing motion patterns in the project.


The empty state ↔ main view switch now uses `AnimatePresence` with a 200ms opacity crossfade, consistent with other motion usage in the project (e.g. All Times panel).

- **`mode="wait"`** — the outgoing view fades out before the incoming one fades in
- **`initial={false}`** — no animation on first page load
- Both views are wrapped in `motion.div` with `absolute inset-0` so they occupy the same area during the transition

