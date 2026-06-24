import { useEffect } from "react";
import { atom, useSetAtom } from "jotai";
import { dialogBlockLoadFiltersOpenAtom, dialogCalculatorOpenAtom, dialogEditFiltersOpenAtom, dialogEditHighlightsOpenAtom, dialogOptionsOpenAtom } from "@/store/2-ui-atoms";
import { isBackendAvailable } from "@/wails/is-wails";
import { quitApplication } from "@/utils/quit-app";

export function useTopMenuGlobalShortcuts() {
    const handleGlobalKeyDown = useSetAtom(handleTopMenuKeyDownAtom);

    useEffect(
        () => {
            const controller = new AbortController();
            window.addEventListener('keydown', handleGlobalKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [handleGlobalKeyDown]
    );
}

const handleTopMenuKeyDownAtom = atom(
    null,
    (_get, set, e: KeyboardEvent) => {
        const key = e.key.toLowerCase();

        switch (key) {
            case ',': {
                if (!(e.ctrlKey || e.metaKey)) return;
                e.preventDefault();
                set(dialogOptionsOpenAtom, true);
                return;
            }
            case 'r': {
                if (!e.altKey) return;
                e.preventDefault();
                set(dialogEditHighlightsOpenAtom, true);
                return;
            }
            case 'h': {
                if (!e.altKey) return;
                e.preventDefault();
                set(dialogEditFiltersOpenAtom, true);
                return;
            }
            case 'b': {
                if (!e.altKey) return;
                e.preventDefault();
                set(dialogBlockLoadFiltersOpenAtom, true);
                return;
            }
            case 'e': {
                if (!e.altKey) return;
                e.preventDefault();
                set(dialogCalculatorOpenAtom, true);
                return;
            }
            case 'q': {
                if (!isBackendAvailable() || !(e.ctrlKey || e.metaKey)) return;
                e.preventDefault();
                quitApplication();
                return;
            }
        }
    }
);
