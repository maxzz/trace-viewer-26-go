import { readPathsFromBackend } from "@/wails/read-paths";
import { pathFileDataToUint8Array } from "@/wails/path-file-data";
import { isBackendAvailable } from "@/wails/is-wails";
import { notice } from "@/components/ui/local-ui/7-toaster";
import { closeAllFiles } from "./0-2-files-actions";
import { asyncLoadAnyFiles } from "./8-1-load-files";
import { setFileLoadSummary } from "./8-4-file-load-summary";

export async function asyncLoadFilesFromPaths(paths: string[]) {
    if (!isBackendAvailable()) {
        return;
    }

    if (paths.length === 0) {
        return;
    }

    const result = await readPathsFromBackend(paths);

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
        (pathFile) => new File([toArrayBuffer(pathFileDataToUint8Array(pathFile.data))], pathFile.name)
    );
    const filePaths = result.files.map((pathFile) => pathFile.path);

    await asyncLoadAnyFiles(files, result.droppedFolderName, filePaths);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}
