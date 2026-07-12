import { getBackendApp, isBackendAvailable } from "@/wails/is-wails";

export type ReadPathsResult = {
    files: { name: string; path: string; data: number[]; }[];
    droppedFolderName?: string;
    unsupportedFile?: string;
};

export async function readPathsFromBackend(paths: string[]): Promise<ReadPathsResult> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    return getBackendApp()!.ReadPaths(paths) as Promise<ReadPathsResult>;
}

// Resolves a Windows shortcut (.lnk) on the Go side and returns the referenced
// file(s). The shortcut bytes are passed as a base64 string (Go []byte).
export async function openLinkFileFromBackend(lnkBase64: string): Promise<ReadPathsResult> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    return getBackendApp()!.OpenLinkFile(lnkBase64) as Promise<ReadPathsResult>;
}

export async function openFolderFromBackend(): Promise<ReadPathsResult> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    return getBackendApp()!.OpenFolder() as Promise<ReadPathsResult>;
}
