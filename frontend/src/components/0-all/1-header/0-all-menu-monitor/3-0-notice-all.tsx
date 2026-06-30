import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { IconStopCircle, SymbolInfo } from "@/components/ui/icons";
import { timelineBuildNoticeStore, type TimelineBuildNoticeType } from "./3-1-notice-timeline";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { isLoadingFilesAtom } from "@/store/traces-store/8-1-load-files";
import { dialogTimelineCancelOpenAtom } from "@/store/2-ui-dialog-atoms";
import { classNames } from "@/utils/classnames";

export function LoadingProgress() {
    return (
        <div className="flex items-center">
            <ParsingFilesProgress />
            <TimelineBuildProgress />
            <TimelineBuildNotice />
        </div>
    );
}

export function ParsingFilesProgress() {
    const isLoadingFiles = useAtomValue(isLoadingFilesAtom);

    if (!isLoadingFiles) {
        return null;
    }

    return (
        <Button className="mr-2 px-2 h-6 text-xs text-white bg-sky-600 opacity-100! rounded-sm" variant="ghost" size="sm" disabled>
            <Loader2 className="size-3 animate-spin" />
            Parsing files...
        </Button>
    );
}

export function TimelineBuildProgress() {
    const setTimelineCancelOpen = useSetAtom(dialogTimelineCancelOpenAtom);
    const { allTimesIsLoading } = useSnapshot(allTimesStore);

    if (!allTimesIsLoading) {
        return null;
    }

    return (<>
        <Button className="mr-2 px-2 h-6 text-xs text-foreground/70 bg-sky-100 dark:bg-sky-950 hover:bg-sky-400 dark:hover:bg-sky-700 rounded-sm cursor-pointer" variant="outline" size="sm" onClick={() => setTimelineCancelOpen(true)} title="Building timeline... Click to cancel.">
            <Loader2 className="size-3 animate-spin" />
            Building timeline...
        </Button>
    </>);
}

export function TimelineBuildNotice() {
    const { type, message } = useSnapshot(timelineBuildNoticeStore);
    // const type: any = "success";
    // const message = "Timeline build completed";

    if (!type || !message) {
        return null;
    }

    const buttonClasses = classNames("mr-2 px-2 h-6 text-xs opacity-100! rounded-sm",
        type === "success"
            ? "text-white bg-green-600"
            : type === "info"
                ? "text-white bg-sky-600"
                : "text-white bg-red-500"
    );

    return (
        <Button className={buttonClasses} variant="ghost" size="sm" disabled>
            {type === "error"
                ? <IconStopCircle className="size-3 stroke-background!" />
                : <SymbolInfo className="size-3" />
            }
            {message}
        </Button>
    );
}
