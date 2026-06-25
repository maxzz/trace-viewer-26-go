import { useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/shadcn/button";
import { IconPlayStart, IconPlayStop } from "@/components/ui/icons";
import { appSettings } from "@/store/1-ui-settings";
import { filesStore } from "@/store/traces-store/9-types-files-store";
import { asyncMonitorTick } from "@/store/traces-store/8-1-load-files";

export function MonitorControls() {
    const { states } = useSnapshot(filesStore);
    const { fileUpdates } = useSnapshot(appSettings);
    const tickRunningRef = useRef(false);

    const hasReloadableFiles = states.some((fileState) => fileState.source.kind === "handle");
    const trackingEnabled = fileUpdates.sizeMonitorEnabled;

    useEffect(
        () => {
            if (trackingEnabled && !hasReloadableFiles) {
                appSettings.fileUpdates.sizeMonitorEnabled = false;
            }
        },
        [trackingEnabled, hasReloadableFiles]);

    useEffect(
        () => {
            if (!trackingEnabled || !hasReloadableFiles) {
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
        [trackingEnabled, hasReloadableFiles, fileUpdates.autoUpdateIntervalMs]);

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
