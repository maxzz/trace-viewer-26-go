import { EventsOn } from "../../wailsjs/runtime/runtime";
import { type MonitorChanges } from "@/wails/monitor";
import { asyncApplyMonitorChanges } from "@/store/traces-store/8-1-load-files";
import { isBackendAvailable } from "@/wails/is-wails";

// Listens for filesystem changes reported by the Go backend watcher and applies
// them to the loaded file list (add / remove / reload).
export function initWailsMonitor() {
    if (!isBackendAvailable()) {
        return;
    }

    EventsOn("monitor-changes", (changes: MonitorChanges) => {
        void asyncApplyMonitorChanges(changes);
    });
}
