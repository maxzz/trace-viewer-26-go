import { useSnapshot } from "valtio";
import { proxy } from "valtio";
import { Button } from "@/components/ui/shadcn/button";
import { IconStopCircle, SymbolInfo } from "@/components/ui/icons";

type TimelineBuildNoticeType = "success" | "info" | "error";

type TimelineBuildNoticeState = {
    type: TimelineBuildNoticeType | null;
    message: string | null;
};

const NOTICE_DURATION_MS = 5000;

const timelineBuildNoticeStore = proxy<TimelineBuildNoticeState>({
    type: null,
    message: null,
});

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
        NOTICE_DURATION_MS
    );
}

export const timelineBuildNotice = {
    success: (message: string) => showTimelineBuildNotice("success", message),
    info: (message: string) => showTimelineBuildNotice("info", message),
    error: (message: string) => showTimelineBuildNotice("error", message),
};

export function TimelineBuildNotice() {
    const { type, message } = useSnapshot(timelineBuildNoticeStore);

    if (!type || !message) {
        return null;
    }

    return (
        <Button className={noticeButtonClasses(type)} variant="ghost" size="sm" disabled>
            {noticeIcon(type)}
            {message}
        </Button>
    );
}

function noticeButtonClasses(type: TimelineBuildNoticeType): string {
    const base = "mr-2 px-2 h-6 text-xs opacity-100! rounded-sm";

    if (type === "success") {
        return `${base} text-white bg-green-600`;
    }

    if (type === "info") {
        return `${base} text-white bg-sky-600`;
    }

    return `${base} text-white bg-red-500`;
}

function noticeIcon(type: TimelineBuildNoticeType) {
    if (type === "error") {
        return <IconStopCircle className="size-3 stroke-background!" />;
    }

    return <SymbolInfo className="size-3" />;
}
