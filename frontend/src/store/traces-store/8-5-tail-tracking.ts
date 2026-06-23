import { atom, getDefaultStore } from "jotai";

// Bridge atoms connecting the trace view (DOM scroll state) with the file-size monitor (store logic).
//
// - traceViewAtEndAtom: set by the trace view when its viewport is scrolled to (near) the very
//   bottom. The monitor reads it to decide whether an update should auto-scroll to the new lines.
// - scrollToBottomNonceAtom: bumped by the monitor after it appends new lines to the selected file,
//   asking the trace view to scroll to the bottom and select the last line.

export const traceViewAtEndAtom = atom(false);

export const scrollToBottomNonceAtom = atom(0);

export function isTraceViewAtEnd(): boolean {
    return getDefaultStore().get(traceViewAtEndAtom);
}

export function requestScrollTraceViewToBottom(): void {
    const store = getDefaultStore();
    store.set(scrollToBottomNonceAtom, store.get(scrollToBottomNonceAtom) + 1);
}
