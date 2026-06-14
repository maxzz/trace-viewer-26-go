type ReadPathsResult = {
    files: { name: string; path: string; data: number[]; }[];
    droppedFolderName?: string;
    unsupportedFile?: string;
};

export async function readPathsFromBackend(paths: string[]): Promise<ReadPathsResult> {
    const readPaths = window.go.backend.App.ReadPaths as (paths: string[]) => Promise<ReadPathsResult>;
    return readPaths(paths);
}

declare global {
    interface Window {
        go: {
            backend: {
                App: {
                    ReadPaths: (paths: string[]) => Promise<ReadPathsResult>;
                };
            };
        };
    }
}

export {};
