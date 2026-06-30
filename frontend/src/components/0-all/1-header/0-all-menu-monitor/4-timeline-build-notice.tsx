import { proxy, useSnapshot } from "valtio";
import { Button } from "@/components/ui/shadcn/button";
import { IconStopCircle, SymbolInfo } from "@/components/ui/icons";

export const timelineBuildNotice = {
    success: (message: string) => showTimelineBuildNotice("success", message),
    info: (message: string) => showTimelineBuildNotice("info", message),
    error: (message: string) => showTimelineBuildNotice("error", message),
};

// Store for the timeline build notice

type TimelineBuildNoticeType = "success" | "info" | "error";

type TimelineBuildNoticeState = {
    type: TimelineBuildNoticeType | null;
    message: string | null;
};

const timelineBuildNoticeStore = proxy<TimelineBuildNoticeState>({
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
        NOTICE_DURATION_MS);
}

const NOTICE_DURATION_MS = 5000;

// Component to display the timeline build notice

export function TimelineBuildNotice() {
    const { type, message } = useSnapshot(timelineBuildNoticeStore);
    if (!type || !message) {
        return null;
    }

    return (
        <Button className={noticeButtonClasses(type)} variant="ghost" size="sm" disabled>
            {type === "error"
                ? <IconStopCircle className="size-3 stroke-background!" />
                : <SymbolInfo className="size-3" />
            }
            {message}
        </Button>
    );
}

function noticeButtonClasses(type: TimelineBuildNoticeType): string {
    const base = "mr-2 px-2 h-6 text-xs opacity-100! rounded-sm";
    const additionalClasses = type === "success" ? "text-white bg-green-600" : type === "info" ? "text-white bg-sky-600" : "text-white bg-red-500";
    return `${base} ${additionalClasses}`;
}
