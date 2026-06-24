import { EventsOn } from "../../wailsjs/runtime/runtime";
import { asyncLoadFilesFromPaths } from "@/store/traces-store/8-0-load-files-from-paths";
import { isBackendAvailable } from "@/wails/is-wails";

export function initWailsFileOpening() {
    if (!isBackendAvailable()) {
        return;
    }

    EventsOn("open-paths", (paths: string[]) => {
        void asyncLoadFilesFromPaths(paths);
    });
}
