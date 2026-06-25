# File monitor NotReadableError
_Exported on 6/24/2026 at 20:32:19 PDT from Cursor (3.8.24)_

---

**User**

@frontend/src/store/traces-store/8-1-load-files.ts:240-245 If this error (NotReadableError) occurred while attempting to load a file in File Monitor mode, it means the file is currently being written to; you should try updating its contents later—specifically, during the next File Monitor update cycle.

---

**Cursor**

I'll inspect the file-loading logic and how File Monitor update cycles work so we can retry on `NotReadableError` instead of failing immediately.


Implementing deferred retry on the next monitor cycle for `NotReadableError` when File Monitor is enabled, and extending the monitor tick to retry deferred loads.


Fixing defer logic: when a reload hits `NotReadableError` without a size change, we should still mark the file for retry on the next monitor cycle.


`NotReadableError` during File Monitor mode is now treated as a transient “file is being written” condition rather than a permanent load failure.

### Behavior

When monitoring is enabled and the file has a handle (`canReloadFile`):

1. **Initial load** (`newTraceItemLoad`) — no `errorLoadingFile` is shown; the file is marked for retry on the next monitor tick.
2. **Auto reload** (`reloadSingleFile` with `reason: "auto"`) — no failure notice; inline retries are skipped and the next monitor cycle retries instead.
3. **Monitor tick** (`asyncMonitorTick`) — retries when:
   - the selected file never loaded successfully (`rawLines.length === 0`), or
   - the view is at the tail and the file has unreloaded changes (`grew` or `hasUnreloadedSizeChange`)

Manual reloads still use the existing retry/failure behavior.

### Helpers added

- `isNotReadableError()` — detects the DOMException
- `shouldDeferLoadToMonitorCycle()` — monitor mode + handle + NotReadableError
- `deferLoadToNextMonitorCycle()` — clears the error, sets `hasUnreloadedSizeChange`, keeps status idle

Outside File Monitor mode, or for other errors, behavior is unchanged.

