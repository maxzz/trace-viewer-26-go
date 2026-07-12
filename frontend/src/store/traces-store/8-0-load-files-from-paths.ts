import { type ReadPathsResult, openLinkFileFromBackend, readPathsFromBackend } from "@/wails/read-paths";
import { pathFileDataToUint8Array } from "@/wails/path-file-data";
import { isBackendAvailable } from "@/wails/is-wails";
import { notice } from "@/components/ui/local-ui/7-toaster";
import { setFileDiskPath } from "@/workers-client";
import { closeAllFiles } from "./0-2-files-actions";
import { asyncLoadAnyFiles, registerMonitoredKnownPaths } from "./8-1-load-files";
import { setFileLoadSummary } from "./8-4-file-load-summary";

export async function asyncLoadFilesFromPaths(paths: string[]) {
    if (!isBackendAvailable()) {
        return;
    }

    if (paths.length === 0) {
        return;
    }

    const result = await readPathsFromBackend(paths);
    await handleReadPathsResult(result);
}

// Opens a Windows shortcut (.lnk) by resolving its target on the Go side and
// loading the referenced file or folder. Must only be called when the backend
// is available; the web-only case is handled by the caller.
export async function asyncOpenLinkFile(file: File) {
    if (!isBackendAvailable()) {
        return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await openLinkFileFromBackend(uint8ArrayToBase64(bytes));
    await handleReadPathsResult(result);
}

async function handleReadPathsResult(result: ReadPathsResult) {
    if (result.unsupportedFile) {
        notice.info(`Unsupported file "${result.unsupportedFile}". Please drop a .trc3 file or a ZIP archive with .trc3 files.`);
        return;
    }

    if (result.files.length === 0) {
        setFileLoadSummary(0);
        return;
    }

    closeAllFiles();

    const files = result.files.map(
        (pathFile) => setFileDiskPath(
            new File([toArrayBuffer(pathFileDataToUint8Array(pathFile.data))], pathFile.name),
            pathFile.path
        )
    );
    const filePaths = result.files.map((pathFile) => pathFile.path);
    registerMonitoredKnownPaths(filePaths);

    await asyncLoadAnyFiles(files, result.droppedFolderName, filePaths);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let index = 0; index < bytes.length; index++) {
        binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
}
