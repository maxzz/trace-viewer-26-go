import { proxy } from "valtio";
import { appSettings } from "@/store/1-ui-settings";

// Store backing the header "+N / -N" file-change notice. Counts are accumulated
// within the highlight window and cleared together after the configured
// duration (default 1s), matching the per-row added/removed highlight.

type FileChangeNoticeState = {
    added: number;
    removed: number;
};

export const fileChangeNoticeStore = proxy<FileChangeNoticeState>({
    added: 0,
    removed: 0,
});

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function showFileChangeNotice(added: number, removed: number) {
    if (added <= 0 && removed <= 0) {
        return;
    }

    fileChangeNoticeStore.added += Math.max(0, added);
    fileChangeNoticeStore.removed += Math.max(0, removed);

    if (dismissTimer) {
        clearTimeout(dismissTimer);
    }

    dismissTimer = setTimeout(
        () => {
            fileChangeNoticeStore.added = 0;
            fileChangeNoticeStore.removed = 0;
            dismissTimer = null;
        },
        getChangeHighlightDurationMs());
}

export function getChangeHighlightDurationMs(): number {
    const value = appSettings.fileUpdates.changeHighlightDurationMs;
    return typeof value === "number" && value >= 0 ? value : 1000;
}
