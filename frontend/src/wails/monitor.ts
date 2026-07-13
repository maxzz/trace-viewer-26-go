import { getBackendApp, isBackendAvailable } from "@/wails/is-wails";

export type MonitorFileInfo = {
    path: string;
    size: number;
};

export type MonitorChangedFile = {
    path: string;
    size: number;
};

// Payload of the Go "monitor-changes" event.
export type MonitorChanges = {
    added: MonitorChangedFile[];
    modified: MonitorChangedFile[];
    deleted: string[];
};

// Asks the Go backend to start a Windows filesystem watcher over the given
// folders, seeded with the files the web component currently has loaded.
export async function startBackendMonitor(folders: string[], files: MonitorFileInfo[]): Promise<void> {
    if (!isBackendAvailable()) {
        return;
    }

    await getBackendApp()!.StartMonitor({ folders, files });
}

export async function stopBackendMonitor(): Promise<void> {
    if (!isBackendAvailable()) {
        return;
    }

    await getBackendApp()!.StopMonitor();
}
