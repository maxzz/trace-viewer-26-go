import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useGroupRef } from "react-resizable-panels";
import { appSettings } from "../../store/1-ui-settings";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/shadcn/resizable";
import { FileList } from "../1-file-list/0-file-list-all";
import { TraceListForCurrentFile } from "../2-trace-viewer";

const DEFAULT_FILE_PANEL_SIZE = 20;
const DEFAULT_TRACE_PANEL_SIZE = 80;

export function TraceMainView() {
    const groupRef = useGroupRef();
    const restoredLayoutRef = useRef(false);

    const defaultLayout = useMemo(
        () => ({
            "file-list": appSettings.panelSizes?.[0] ?? DEFAULT_FILE_PANEL_SIZE,
            "trace-view": appSettings.panelSizes?.[1] ?? DEFAULT_TRACE_PANEL_SIZE,
        }),
        []);

    useLayoutEffect(
        () => {
            restoredLayoutRef.current = false;
            const group = groupRef.current;
            if (!group) {
                return;
            }

            group.setLayout(defaultLayout);
            restoredLayoutRef.current = true;
        },
        [defaultLayout, groupRef]);

    const handleLayoutChanged = useCallback(
        (layout: { [key: string]: number; }) => {
            if (!restoredLayoutRef.current) {
                return;
            }

            const fileListSize = layout["file-list"];
            const traceViewSize = layout["trace-view"];

            if (!isValidPanelSize(fileListSize) || !isValidPanelSize(traceViewSize)) {
                return;
            }

            appSettings.panelSizes = [fileListSize, traceViewSize];
        },
        []);

    return (
        <ResizablePanelGroup
            groupRef={groupRef}
            className="h-full border-t"
            orientation="horizontal"
            defaultLayout={defaultLayout}
            onLayoutChanged={handleLayoutChanged}
        >
            <ResizablePanel
                id="file-list"
                defaultSize={`${defaultLayout["file-list"]}`}
                minSize="132px"
                maxSize="90%"
            >
                <FileList />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
                id="trace-view"
                defaultSize={`${defaultLayout["trace-view"]}`}
            >
                <div className="h-full overflow-hidden flex flex-col">
                    <TraceListForCurrentFile />
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

function isValidPanelSize(size: number | undefined): size is number {
    return typeof size === "number" && Number.isFinite(size) && size > 0;
}
