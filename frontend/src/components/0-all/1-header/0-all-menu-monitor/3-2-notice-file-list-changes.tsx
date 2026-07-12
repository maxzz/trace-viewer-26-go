import { proxy } from "valtio";
import { appSettings } from "@/store/1-ui-settings";

type FileListChangeNoticeState = {
    addedCount: number;
    removedCount: number;
};

export const fileListChangeNoticeStore = proxy<FileListChangeNoticeState>({
    addedCount: 0,
    removedCount: 0,
});

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function showFileListChanges(addedCount: number, removedCount: number) {
    if (addedCount <= 0 && removedCount <= 0) {
        return;
    }

    if (dismissTimer) {
        clearTimeout(dismissTimer);
    }

    fileListChangeNoticeStore.addedCount = addedCount;
    fileListChangeNoticeStore.removedCount = removedCount;

    dismissTimer = setTimeout(
        () => {
            fileListChangeNoticeStore.addedCount = 0;
            fileListChangeNoticeStore.removedCount = 0;
            dismissTimer = null;
        },
        getFileListChangeHighlightDurationMs()
    );
}

export function getFileListChangeHighlightDurationMs(): number {
    return Math.max(100, appSettings.fileUpdates.fileListChangeHighlightDurationMs);
}
