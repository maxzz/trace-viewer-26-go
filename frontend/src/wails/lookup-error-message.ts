import { getBackendApp, isBackendAvailable } from "./is-wails";

export async function lookupErrorMessageFromBackend(code: string): Promise<string> {
    if (!isBackendAvailable()) {
        return "";
    }

    const trimmed = code.trim();
    if (!trimmed) {
        return "";
    }

    return getBackendApp()!.LookupErrorMessage(trimmed);
}
