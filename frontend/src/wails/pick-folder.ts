import { getBackendApp, isBackendAvailable } from "@/wails/is-wails";

export async function pickFolderFromBackend(): Promise<string> {
    if (!isBackendAvailable()) {
        throw new Error("Backend is not available.");
    }

    return getBackendApp()!.PickFolder() as Promise<string>;
}
