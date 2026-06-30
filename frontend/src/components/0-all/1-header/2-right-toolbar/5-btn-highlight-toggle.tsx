import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Button } from "@/components/ui/shadcn/button";
import { Highlighter } from "lucide-react";
import { IconL_ChevronDown } from "@/components/ui/icons/normal/lucid-react";
import { appSettings } from "@/store/1-ui-settings";
import { dialogEditHighlightsOpenAtom } from "@/store/2-ui-dialog-atoms";
import { highlightActions } from "@/store/5-highlight-rules";

export function ButtonHighlightToggle() {
    const { highlightEnabled } = useSnapshot(appSettings);
    const setEditHighlightsOpen = useSetAtom(dialogEditHighlightsOpenAtom);

    return (
        <div className="h-6 border border-border rounded overflow-hidden flex items-center">
            <Button 
                className="p-0 size-6 border-r border-r-border rounded-none" 
                variant="ghost" 
                onClick={highlightActions.toggleHighlight}
                title={highlightEnabled ? "Disable highlighting" : "Enable highlighting"}
            >
               <Highlighter className={`size-3.5 ${highlightEnabled ? "text-foreground fill-sky-200 opacity-100 dark:text-sky-300 dark:fill-sky-500" : "opacity-40"}`} />
            </Button>

            <Button 
                className="p-0 size-6 rounded-none" 
                variant="ghost" 
                onClick={() => setEditHighlightsOpen(true)}
                title="Edit highlight rules"
            >
                <IconL_ChevronDown className="size-3 opacity-50" />
            </Button>
        </div>
    );
}
