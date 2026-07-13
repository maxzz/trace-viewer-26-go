import { useEffect, useMemo, useRef } from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/shadcn/button";
import { IconPlayStart, IconPlayStop } from "@/components/ui/icons";
import { appSettings } from "@/store/1-ui-settings";
import { filesStore } from "@/store/traces-store/9-types-files-store";
import { asyncMonitorTick, isReloadableSource } from "@/store/traces-store/8-1-load-files";
import { isBackendAvailable } from "@/wails/is-wails";
import { startBackendMonitor, stopBackendMonitor } from "@/wails/monitor";

export function MonitorControls() {
    const { states } = useSnapshot(filesStore);
    const { fileUpdates } = useSnapshot(appSettings);
    const tickRunningRef = useRef(false);

    const hasReloadableFiles = states.some((fileState) => isReloadableSource(fileState.source));
    const hasHandleFiles = states.some((fileState) => fileState.source.kind === "handle");
    const trackingEnabled = fileUpdates.sizeMonitorEnabled;

    // Stable key of the path-based files: lets the Go monitor restart only when the
    // set of watched files changes, not on every observed size update.
    const pathFilesKey = useMemo(
        () => states
            .filter((fileState) => fileState.source.kind === "path")
            .map((fileState) => (fileState.source as { path: string; }).path)
            .sort()
            .join("|"),
        [states]);

    useEffect(
        () => {
            if (trackingEnabled && !hasReloadableFiles) {
                appSettings.fileUpdates.sizeMonitorEnabled = false;
            }
        },
        [trackingEnabled, hasReloadableFiles]);

    // Desktop path-based files are watched by the Go backend (real Windows FS events).
    useEffect(
        () => {
            if (!isBackendAvailable()) {
                return;
            }

            if (!trackingEnabled || pathFilesKey === "") {
                void stopBackendMonitor();
                return;
            }

            const files = filesStore.states
                .filter((fileState) => fileState.source.kind === "path")
                .map((fileState) => ({
                    path: (fileState.source as { path: string; }).path,
                    size: fileState.updateInfo.lastObservedSize,
                }));

            void startBackendMonitor(distinctParentFolders(files.map((file) => file.path)), files);

            return () => {
                void stopBackendMonitor();
            };
        },
        [trackingEnabled, pathFilesKey]);

    // Browser folder handles have no disk path, so they still rely on polling.
    useEffect(
        () => {
            if (!trackingEnabled || !hasHandleFiles) {
                return;
            }

            let disposed = false;
            const intervalMs = Math.max(500, fileUpdates.autoUpdateIntervalMs);

            async function tick() {
                if (disposed || tickRunningRef.current) {
                    return;
                }

                tickRunningRef.current = true;
                try {
                    await asyncMonitorTick();
                } finally {
                    tickRunningRef.current = false;
                }
            }

            void tick();
            const intervalId = window.setInterval(() => void tick(), intervalMs);

            return () => {
                disposed = true;
                window.clearInterval(intervalId);
                tickRunningRef.current = false;
            };
        },
        [trackingEnabled, hasHandleFiles, fileUpdates.autoUpdateIntervalMs]);

    if (!hasReloadableFiles) {
        return null;
    }

    return (
        <div className="h-6 border rounded flex items-center" title="File Updates">
            <Button
                className="group h-6 active:scale-y-75 focus:ring-0 rounded"
                variant="outline"
                size="sm"
                onClick={() => { appSettings.fileUpdates.sizeMonitorEnabled = !trackingEnabled; }}
                title={trackingEnabled ? "Stop Tracking File Changes" : "Track File Changes"}
            >
                {trackingEnabled
                    ? (<>
                        <IconPlayStop className="size-3.5 text-red-500/50 fill-red-500" /> Stop Monitoring
                    </>) : (<>
                        <IconPlayStart className="size-3.5 text-foreground/50" /> Start Monitoring
                    </>)}
            </Button>
        </div>
    );
}

function distinctParentFolders(paths: string[]): string[] {
    const folders = new Set<string>();

    for (const path of paths) {
        const normalized = path.replace(/\//g, "\\");
        const index = normalized.lastIndexOf("\\");
        if (index > 0) {
            folders.add(normalized.slice(0, index));
        }
    }

    return Array.from(folders);
}
