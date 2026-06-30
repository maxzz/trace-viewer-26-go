import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { IconStopCircle, SymbolInfo } from "@/components/ui/icons";
import { timelineBuildNoticeStore, type TimelineBuildNoticeType } from "./3-1-notice-timeline-state";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { isLoadingFilesAtom } from "@/store/traces-store/8-1-load-files";
import { dialogTimelineCancelOpenAtom } from "@/store/2-ui-dialog-atoms";
import { classNames } from "@/utils/classnames";

export function LoadingProgress() {
    return (
        <div className="flex items-center gap-1">
            <ParsingFilesProgress />
            <TimelineBuildProgress />
            <TimelineBuildNotice />
        </div>
    );
}

function ParsingFilesProgress() {
    const isLoadingFiles = useAtomValue(isLoadingFilesAtom);
    if (!isLoadingFiles) {
        return null;
    }

    return (
        <Button className="px-2 h-6 text-xs text-sky-600 bg-sky-300/10 border border-sky-500/50 opacity-100! rounded" variant="ghost" size="sm" disabled>
            <Loader2 className="size-3 animate-spin" />
            Parsing files...
        </Button>
    );
}

function TimelineBuildProgress() {
    const setTimelineCancelOpen = useSetAtom(dialogTimelineCancelOpenAtom);

    const { allTimesIsLoading } = useSnapshot(allTimesStore);
    if (!allTimesIsLoading) {
        return null;
    }

    return (<>
        <Button className="px-2 h-6 text-xs text-sky-500 bg-sky-300/10 border border-sky-500/50 hover:text-foreground hover:bg-sky-300 dark:hover:bg-sky-700 rounded cursor-pointer" variant="outline" size="sm" onClick={() => setTimelineCancelOpen(true)} title="Building timeline... Click to cancel.">
            <Loader2 className="size-3 animate-spin" />
            Building timeline...
        </Button>
    </>);
}

function TimelineBuildNotice() {
    const { type, message } = useSnapshot(timelineBuildNoticeStore);
    // const type: any = "success";
    // const message = "Timeline build completed";

    if (!type || !message) {
        return null;
    }

    const buttonClasses = classNames("px-2 h-6 text-xs opacity-100! rounded",
        type === "success"
            ? "text-green-600 bg-green-300/10 border border-green-500/50"
            : type === "info"
                ? "text-sky-600 bg-sky-300/10 border border-sky-500/50"
                : "text-red-500 bg-red-300/10 border border-red-500/30"
    );

    return (
        <Button className={buttonClasses} variant="ghost" size="sm" disabled>
            {type === "error"
                ? <IconStopCircle className="size-3" />
                : <SymbolInfo className="size-3" />
            }
            {message}
        </Button>
    );
}
