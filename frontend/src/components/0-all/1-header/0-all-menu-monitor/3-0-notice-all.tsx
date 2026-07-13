import { type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { IconStopCircle, SymbolInfo } from "@/components/ui/icons";
import { timelineBuildNoticeStore } from "./3-1-notice-timeline-state";
import { fileChangeNoticeStore } from "./3-2-notice-file-changes-state";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { isLoadingFilesAtom } from "@/store/traces-store/8-1-load-files";
import { dialogTimelineCancelOpenAtom } from "@/store/2-ui-dialog-atoms";

export function LoadingProgress() {
    return (
        <motion.div layout className="flex items-center gap-1">
            <ParsingFilesProgress />
            <TimelineBuildProgress />
            <TimelineBuildNotice />
            <FileChangesNotice />
        </motion.div>
    );
}

function ParsingFilesProgress() {
    const isLoadingFiles = useAtomValue(isLoadingFilesAtom);

    return (
        <AnimatedNotice show={isLoadingFiles}>
            <Button className="px-2 h-6 text-xs text-sky-600 bg-sky-300/10 border border-sky-500/50 opacity-100! rounded" variant="ghost" size="sm" disabled>
                <Loader2 className="size-3 animate-spin" />
                Parsing files...
            </Button>
        </AnimatedNotice>
    );
}

function TimelineBuildProgress() {
    const setTimelineCancelOpen = useSetAtom(dialogTimelineCancelOpenAtom);
    const { allTimesIsLoading } = useSnapshot(allTimesStore);

    return (
        <AnimatedNotice show={allTimesIsLoading}>
            <Button className="px-2 h-6 text-xs text-sky-500 bg-sky-300/10 border border-sky-500/50 hover:text-foreground hover:bg-sky-300 dark:hover:bg-sky-700 rounded cursor-pointer" variant="outline" size="sm" onClick={() => setTimelineCancelOpen(true)} title="Building timeline... Click to cancel.">
                <Loader2 className="size-3 animate-spin" />
                Building timeline...
            </Button>
        </AnimatedNotice>
    );
}

function TimelineBuildNotice() {
    const { type, message } = useSnapshot(timelineBuildNoticeStore);
    // const type: any = "success";
    // const message = "Timeline build completed";
    const show = Boolean(type && message);

    const buttonClasses = classNames("px-2 h-6 text-xs opacity-100! rounded",
        type === "success"
            ? "text-green-600 bg-green-300/10 border border-green-500/50"
            : type === "info"
                ? "text-sky-600 bg-sky-300/10 border border-sky-500/50"
                : "text-red-500 bg-red-300/10 border border-red-500/30"
    );

    return (
        <AnimatedNotice show={show}>
            <Button className={buttonClasses} variant="ghost" size="sm" disabled>
                {type === "error"
                    ? <IconStopCircle className="size-3" />
                    : <SymbolInfo className="size-3" />
                }
                {message}
            </Button>
        </AnimatedNotice>
    );
}

function FileChangesNotice() {
    const { added, removed } = useSnapshot(fileChangeNoticeStore);
    const show = added > 0 || removed > 0;

    return (
        <AnimatedNotice show={show} appearDelay={0}>
            <div className="px-2 h-6 text-xs font-mono rounded border border-muted-foreground/30 bg-muted-foreground/5 flex items-center gap-1.5" title="Files added / removed">
                {added > 0 && (
                    <span className="text-green-600">
                        +{added}
                    </span>
                )}
                {removed > 0 && (
                    <span className="text-red-500">
                        -{removed}
                    </span>
                )}
            </div>
        </AnimatedNotice>
    );
}

function AnimatedNotice({ show, children, appearDelay = 1 }: { show: boolean; children: ReactNode; appearDelay?: number; }) {
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    layout
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto", transition: { duration: 0.2, delay: appearDelay, ease: "easeIn" } }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden flex"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
