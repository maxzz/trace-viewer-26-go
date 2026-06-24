import { getDefaultStore } from "jotai";
import { currentFileStateAtom } from "@/store/traces-store/0-1-files-current-state";
import { LineCode } from "@/trace-viewer-core/9-core-types";
import { extractErrorCodeFromLineContent, parseErrorCodeFromText, type ErrorCodeValues } from "@/trace-viewer-core/3-format-error-line";

export function getInitialErrorLookupValuesFromTraceView(): ErrorCodeValues | undefined {
    const selectedText = getTraceListTextSelection();
    if (selectedText) {
        const fromSelection = parseErrorCodeFromText(selectedText);
        if (fromSelection) {
            return fromSelection;
        }
    }

    return getErrorCodeFromSelectedTraceLine();
}

function getTraceListTextSelection(): string | undefined {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return undefined;
    }

    const text = selection.toString().trim();
    if (!text) {
        return undefined;
    }

    if (!isNodeWithinTraceList(selection.anchorNode) || !isNodeWithinTraceList(selection.focusNode)) {
        return undefined;
    }

    return text;
}

function getErrorCodeFromSelectedTraceLine(): ErrorCodeValues | undefined {
    const fileState = getDefaultStore().get(currentFileStateAtom);
    if (!fileState) {
        return undefined;
    }

    const lineIndex = getDefaultStore().get(fileState.currentLineIdxAtom);
    const line = fileState.data.viewLines[lineIndex];
    if (!line || line.code !== LineCode.Error) {
        return undefined;
    }

    return extractErrorCodeFromLineContent(line.content);
}

function isNodeWithinTraceList(node: Node | null): boolean {
    if (!node) {
        return false;
    }

    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    return !!element?.closest("[data-trace-list]");
}
