import { atom, getDefaultStore } from "jotai";
import { type FileState } from "./9-types-files-store";
import { syncCurrentFileThreadLinesCacheAtom } from "./0-4-thread-filter-cache";

export const currentFileStateAtom = atom<FileState | null>(null);

// Helper functions for accessing the atom outside of React components

export function getCurrentFileState(): FileState | null {
    return getDefaultStore().get(currentFileStateAtom);
}

export function setCurrentFileState(fileState: FileState | null, forceUpdate = false): void {
    const store = getDefaultStore();

    // Selection changed to a different file: hide the green new-lines marker on the file we leave.
    const previous = store.get(currentFileStateAtom);
    if (previous && previous.id !== (fileState?.id ?? null)) {
        store.set(previous.newLinesMarkerAtom, null);
    }

    if (forceUpdate && fileState) {
        // Create a shallow copy to force Jotai to notify subscribers (same data, new reference)
        store.set(currentFileStateAtom, { ...fileState });
    } else {
        store.set(currentFileStateAtom, fileState);
    }
    store.set(syncCurrentFileThreadLinesCacheAtom, "sync");
}

export function setCurrentLineIndex(lineIndex: number): void {
    const state = getDefaultStore().get(currentFileStateAtom);
    
    if (state) {
        const store = getDefaultStore();
        store.set(state.currentLineIdxAtom, lineIndex);
        store.set(syncCurrentFileThreadLinesCacheAtom, "sync");
    }
}
