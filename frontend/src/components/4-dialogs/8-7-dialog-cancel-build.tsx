import { useAtom } from "jotai";
import { Button } from "@/components/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { timelineBuildNotice } from "../0-all/1-header/0-all-menu-monitor/3-1-notice-timeline";
import { cancelAllTimesBuild } from "@/workers-client";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { dialogTimelineCancelOpenAtom } from "@/store/2-ui-dialog-atoms";

export function DialogCancelBuild() {
    const [open, setOpen] = useAtom(dialogTimelineCancelOpenAtom);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-80!">
                <DialogHeader>
                    <DialogTitle>
                        Cancel Timeline Build?
                    </DialogTitle>
                    <DialogDescription className="py-2">
                        Are you sure you want to stop the timeline generation? The current progress will be discarded.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Continue</Button>
                    <Button
                        variant="default"
                        onClick={
                            () => {
                                cancelAllTimesBuild();
                                allTimesStore.setAllTimesLoading(false);
                                allTimesStore.setAllTimes([]);
                                timelineBuildNotice.info("Timeline build cancelled");
                                setOpen(false);
                            }
                        }
                    >
                        Stop Build
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
