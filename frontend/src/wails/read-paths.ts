import { getBackendApp, isBackendAvailable } from "@/wails/is-wails";
import { pathFileDataToUint8Array } from "@/wails/path-file-data";

export type ReadPathsResult = {
    files: { name: string; path: string; data: number[]; }[];
    droppedFolderName?: string;
    unsupportedFile?: string;
};

export type PathFileStat = {
    path: string;
    size: number;
};

export type FolderChangesResult = {
    addedFiles: { name: string; path: string; data: number[]; }[];
    removedPaths: string[];
};

export async function readPathsFromBackend(paths: string[]): Promise<ReadPathsResult> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    return getBackendApp()!.ReadPaths(paths) as Promise<ReadPathsResult>;
}

export async function statPathsFromBackend(paths: string[]): Promise<PathFileStat[]> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    if (paths.length === 0) {
        return [];
    }

    return getBackendApp()!.StatPaths(paths) as Promise<PathFileStat[]>;
}

export async function scanFolderChangesFromBackend(dirPath: string, knownPaths: string[]): Promise<FolderChangesResult> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    return getBackendApp()!.ScanFolderChanges(dirPath, knownPaths) as Promise<FolderChangesResult>;
}

export async function readFileFromBackendPath(path: string): Promise<File> {
    const result = await readPathsFromBackend([path]);
    const pathFile = result.files[0];
    if (!pathFile) {
        throw new Error(`Failed to read file from path "${path}".`);
    }

    const bytes = pathFileDataToUint8Array(pathFile.data);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return new File([copy.buffer], pathFile.name);
}

// Resolves a Windows shortcut (.lnk) on the Go side and returns the referenced
// file(s). The shortcut bytes are passed as a base64 string (Go []byte).
export async function openLinkFileFromBackend(lnkBase64: string): Promise<ReadPathsResult> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    return getBackendApp()!.OpenLinkFile(lnkBase64) as Promise<ReadPathsResult>;
}
