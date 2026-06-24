import { getBackendApp, isBackendAvailable } from "@/wails/is-wails";

type ReadPathsResult = {
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

export {};
