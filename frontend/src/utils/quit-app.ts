import { Quit } from "../../wailsjs/runtime/runtime";
import { isBackendAvailable } from "@/wails/is-wails";

export function quitApplication(): void {
    if (!isBackendAvailable()) {
        return;
    }

    Quit();
}
