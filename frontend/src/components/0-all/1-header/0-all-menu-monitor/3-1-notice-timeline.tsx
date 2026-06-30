import { proxy } from "valtio";

export const timelineBuildNotice = {
    success: (message: string) => showTimelineBuildNotice("success", message),
    info: (message: string) => showTimelineBuildNotice("info", message),
    error: (message: string) => showTimelineBuildNotice("error", message),
};

// Store for the timeline build notice

export type TimelineBuildNoticeType = "success" | "info" | "error";

type TimelineBuildNoticeState = {
    type: TimelineBuildNoticeType | null;
    message: string | null;
};

export const timelineBuildNoticeStore = proxy<TimelineBuildNoticeState>({
    type: null,
    message: null,
});

// Function to show the timeline build notice

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function showTimelineBuildNotice(type: TimelineBuildNoticeType, message: string) {
    if (dismissTimer) {
        clearTimeout(dismissTimer);
    }

    timelineBuildNoticeStore.type = type;
    timelineBuildNoticeStore.message = message;

    dismissTimer = setTimeout(
        () => {
            timelineBuildNoticeStore.type = null;
            timelineBuildNoticeStore.message = null;
            dismissTimer = null;
        },
        3000);
}
