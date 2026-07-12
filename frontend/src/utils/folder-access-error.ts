// Chromium / File System Access API refuses folders that contain system files.
// The native dialog text is "can't open this folder because it contains system files".
export function isFolderAccessRestrictedError(error: unknown): boolean {
    if (!(error instanceof DOMException)) {
        return false;
    }

    if (error.name === "SecurityError" || error.name === "NoModificationAllowedError") {
        return true;
    }

    const message = error.message.toLowerCase();
    return message.includes("system files") || message.includes("can't open this folder");
}
