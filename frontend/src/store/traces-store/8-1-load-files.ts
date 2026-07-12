import { type FileWithHandle } from "browser-fs-access";
import { atom, getDefaultStore } from "jotai";
import { ref } from "valtio";
import { extractTracesFromZipInWorker, getFileDiskPath, isTrc3File, isZipFile, setFileDiskPath } from "@/workers-client";
import { isBackendAvailable } from "@/wails/is-wails";
import { readFileFromBackendPath, scanFolderChangesFromBackend, statPathsFromBackend } from "@/wails/read-paths";
import { pathFileDataToUint8Array } from "@/wails/path-file-data";
import { setAppTitle } from "@/store/3-ui-app-title";
import { notice } from "@/components/ui/local-ui/7-toaster";
import { showFileListChanges, getFileListChangeHighlightDurationMs } from "@/components/0-all/1-header/0-all-menu-monitor/3-2-notice-file-list-changes";
import { filesStore, type FileData, type FileListChangeHighlight, type FileSourceInfo, type FileState, type FileUpdateInfo, type NewLinesMarker } from "./9-types-files-store";
import { asyncParseTraceFile, type ParsedTraceData } from "./8-2-parse-trace-file";
import { emptyFileHeader, LineCode, type TraceLine } from "@/trace-viewer-core/9-core-types";
import { NOISE_ERROR_CODE } from "@/trace-viewer-core/3-format-error-line";
import { delay } from "@/utils";
import { recomputeFilterMatches } from "../4-file-filters";
import { appSettings } from "../1-ui-settings";
import { matchesFilePattern } from "../6-filtered-files";
import { buildAlltimes } from "./3-2-all-times-listener";
import { setFileLoading } from "./8-3-file-loading-atoms";
import { recomputeHighlightMatches } from "../5-highlight-rules";
import { allTimesStore } from "./3-1-all-times-store";
import { closeFile, selectFile } from "./0-2-files-actions";
import { getCurrentFileState, setCurrentFileState, setCurrentLineIndex } from "./0-1-files-current-state";
import { getActiveBlockLoadPatterns, shouldBlockFileLoad } from "../9-block-load-filters";
import { setFileLoadSummary } from "./8-4-file-load-summary";
import { isTraceViewAtEnd, requestScrollTraceViewToBottom } from "./8-5-tail-tracking";

export const isLoadingFilesAtom = atom(false);

const RECENT_ADDED_BYTES_DURATION_MS = 1000;
const FILE_RELOAD_RETRY_ATTEMPTS = 4;
const FILE_RELOAD_RETRY_DELAY_MS = 500;

type FileLoadItem = {
    file: File;
    source: FileSourceInfo;
    listChangeHighlight?: FileListChangeHighlight | null;
};

type ReloadReason = "manual" | "auto";

type ReloadBatchOptions = {
    reason?: ReloadReason;
    prefetchedFiles?: Map<string, File>;
};

type ReloadSingleOptions = {
    reason: ReloadReason;
    prefetchedFile?: File;
};

type ReloadableFileState = FileState & {
    source: Extract<FileSourceInfo, { kind: "handle"; } | { kind: "path"; }>;
};

const activeFileReloadControllers = new Map<string, AbortController>();

export async function asyncLoadAnyFiles(files: File[], droppedFolderName?: string, filePaths?: string[]) {
    getDefaultStore().set(isLoadingFilesAtom, true);
    allTimesStore.setAllTimes([]);
    try {
        let loadedTrc3FilesCount = 0;
        let blockedTrc3FilesCount = 0;
        const blockPatterns = getActiveBlockLoadPatterns();
        const zipFiles = files.filter(f => isZipFile(f));
        const trc3Files = files.filter(f => isTrc3File(f));
        const allowedTrc3Files = trc3Files.filter(file => !shouldBlockFileLoad(file.name));
        blockedTrc3FilesCount += trc3Files.length - allowedTrc3Files.length;

        // Extract and load files from ZIPs
        for (const file of zipFiles) {
            const result = await extractTracesFromZipInWorker(file, blockPatterns);
            blockedTrc3FilesCount += result.blockedFilesCount;

            if (result.files.length > 0) {
                loadedTrc3FilesCount += result.files.length;
                await loadFilesToStore(
                    result.files.map(
                        (zipEntry) => ({
                            file: zipEntry,
                            source: { kind: "zip", zipFileName: result.zipFileName },
                        })
                    )
                );
            }
        }

        // Load .TRC3 files directly
        await loadFilesToStore(allowedTrc3Files.map((file) => ({ file, source: createFileSourceInfo(file) })));
        loadedTrc3FilesCount += allowedTrc3Files.length;
        setAppTitle(files, droppedFolderName, filePaths);
        setFileLoadSummary(blockedTrc3FilesCount);

        if (loadedTrc3FilesCount === 0) {
            const sourceName = buildDroppedSourceName(files, droppedFolderName);
            if (blockedTrc3FilesCount > 0 && appSettings.showAllBlockedFilesNotice) {
                notice.info(`All .trc3 files were blocked by load filters from "${sourceName}".`);
            }
        }

        if (droppedFolderName && filesStore.states.some((fileState) => canReloadFile(fileState))) {
            appSettings.fileUpdates.sizeMonitorEnabled = true;
        }

        appSettings.allTimes.needToRebuild = true;
        buildAlltimes();
    } finally {
        getDefaultStore().set(isLoadingFilesAtom, false);
    }
}

function buildDroppedSourceName(files: File[], droppedFolderName?: string): string {
    if (droppedFolderName) {
        return droppedFolderName;
    }
    if (files.length === 1) {
        return files[0].name;
    }
    if (files.length > 1) {
        return `${files.length} files`;
    }
    return "drop";
}

async function loadFilesToStore(items: FileLoadItem[]) {
    // Check if this is the first load (no files existed before)
    const isFirstLoad = filesStore.states.length === 0;

    const itemsToLoad: { file: File, fileState: FileState; }[] = [];

    // Populate the store with new file states
    for (const item of items) {
        const newFileState = newTraceItemCreate(item.file, item.source);
        if (item.listChangeHighlight) {
            markFileListChangeHighlight(newFileState, item.listChangeHighlight);
        }
        filesStore.states.push(newFileState);
        setFileLoading(newFileState.id, true);
        itemsToLoad.push({ file: item.file, fileState: newFileState });
    }

    // Recompute filters and highlights after all files list is populated
    recomputeFilterMatches();
    recomputeHighlightMatches();

    // Load the files
    for (const { file, fileState } of itemsToLoad) {
        await newTraceItemLoad(fileState, file);
    }

    // After all files are loaded, populate the quick file data
    for (const fileState of filesStore.states) {
        filesStore.quickFileData[fileState.id] = fileState.data;
    }

    // Handle file selection after loading
    const currentState = getCurrentFileState();
    if (itemsToLoad.length > 0) {
        // On first load, apply startup pattern to select a specific file
        if (isFirstLoad) {
            const startupPattern = appSettings.startupFilePattern;
            let fileToSelect = itemsToLoad[0].fileState;

            // If startup pattern is set, find the first matching file
            if (startupPattern) {
                const matchingFile = itemsToLoad.find(item => 
                    matchesFilePattern(item.fileState.data.fileName, startupPattern)
                );
                if (matchingFile) {
                    fileToSelect = matchingFile.fileState;
                }
            }

            selectFile(fileToSelect.id);
        } else if (!currentState) {
            // Not first load but no file selected - select first loaded file
            selectFile(itemsToLoad[0].fileState.id);
        } else if (itemsToLoad.some(item => item.fileState.id === currentState.id)) {
            // Force UI refresh by creating a new reference (data is loaded now)
            setCurrentFileState(currentState, true);
        }
    }
}

function newTraceItemCreate(file: File, source: FileSourceInfo): FileState {
    const id = MakeUuid();
    const newFileData = createNewFileData(id, file.name);
    const newFile = createNewFileState(id, ref(newFileData), source);
    return newFile;

    function MakeUuid(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    function createNewFileData(id: string, fileName: string): FileData {
        return {
            id,
            fileName,
            rawLines: [],
            viewLines: [],
            uniqueThreadIds: [],
            header: emptyFileHeader,
            errorsInTraceCount: 0,
            errorsInTraceCountWithoutNoise: 0,
            isLoading: true,
            errorLoadingFile: null,
        };
    }

    function createNewFileState(id: string, data: FileData, source: FileSourceInfo): FileState {
        return {
            id,
            data, // Placeholder, will update after adding to store
            source: ref(source),
            newLinesMarkerAtom: atom<NewLinesMarker | null>(null),
            updateInfo: {
                status: "idle",
                lastLoadedSize: file.size,
                lastObservedSize: file.size,
                hasUnreloadedSizeChange: false,
                lastAttemptAt: null,
                lastSuccessAt: null,
                lastFailureAt: null,
                failureMessage: null,
                totalAddedBytes: 0,
                recentAddedBytes: 0,
                recentAddedExpiresAt: null,
            },
            currentLineIdxAtom: atom(-1),
            scrollTopAtom: atom(0),
            showOnlySelectedThreadAtom: atom(false),
            threadLinesAtom: atom<TraceLine[] | undefined>(undefined),
            threadLineBaseIndicesAtom: atom<number[] | undefined>(undefined),
            threadBaseIndexToDisplayIndexAtom: atom<number[] | undefined>(undefined),
            threadLinesThreadIdAtom: atom<number | null>(null),
            matchedFilterIds: [],
            matchedHighlightIds: [],
            listChangeHighlight: null,
        };
    }
}

async function newTraceItemLoad(fileState: FileState, file: File): Promise<void> {
    const data = fileState.data;
    try {
        const parsed = await asyncParseTraceFile(file);

        applyParsedTraceData(fileState, file.name, parsed);
        clearNewLinesMarker(fileState);
        syncLoadedFileSize(fileState, file.size);
        data.isLoading = false;
    } catch (e: unknown) {
        if (shouldDeferLoadToMonitorCycle(fileState, e)) {
            deferLoadToNextMonitorCycle(fileState);
        } else {
            data.errorLoadingFile = e instanceof Error ? e.message : "Unknown error";
        }
        data.isLoading = false;
        console.error("Failed to load trace", e);
    }

    // Update the reactive atom to trigger UI re-render for this specific file
    setFileLoading(fileState.id, false, false);

    // If this file is currently selected, force a refresh to show loaded data
    const currentState = getCurrentFileState();
    if (currentState?.id === fileState.id) {
        setCurrentFileState(fileState, true);
    }
}

export function isReloadableSource(source: FileSourceInfo): boolean {
    if (source.kind === "handle") {
        return true;
    }

    return source.kind === "path" && isBackendAvailable();
}

export function canReloadFile(fileState: FileState | null | undefined): fileState is ReloadableFileState {
    return !!fileState && isReloadableSource(fileState.source);
}

export async function asyncReloadFile(fileState: ReloadableFileState): Promise<void> {
    await asyncReloadFiles([fileState], { reason: "manual" });
}

export async function asyncReloadFiles(fileStates: readonly FileState[], options: ReloadBatchOptions = {}): Promise<number> {
    const reason = options.reason ?? "manual";
    const prefetchedFiles = options.prefetchedFiles ?? new Map<string, File>();
    const reloadableStates = dedupeReloadableFiles(fileStates).filter((fileState) => !activeFileReloadControllers.has(fileState.id));
    if (reloadableStates.length === 0) {
        return 0;
    }

    const results = await Promise.allSettled(
        reloadableStates.map(
            (fileState) => reloadSingleFile(
                fileState,
                {
                    reason,
                    prefetchedFile: prefetchedFiles.get(fileState.id),
                }
            )
        )
    );

    const updatedFilesCount = results.filter(
        (result) => result.status === "fulfilled" && result.value === "success"
    ).length;

    if (updatedFilesCount > 0) {
        recomputeFilterMatches();
        recomputeHighlightMatches();
        appSettings.allTimes.needToRebuild = true;
        buildAlltimes();
    }

    return updatedFilesCount;
}

type MonitorProbe = {
    fileState: ReloadableFileState;
    observedSize: number;
    prefetchedFile?: File;
    grew: boolean;
};

// Single monitor pass driven by the "Track file changes" toggle:
//  - for every reloadable file: read its size, update the byte counters and the unreloaded-change flag;
//  - for the currently selected file only: if it grew AND the right pane was scrolled to the very
//    bottom, reload its content, then scroll to (and select) the freshly appended lines.
export async function asyncMonitorTick(): Promise<void> {
    const selectedId = getCurrentFileState()?.id ?? null;
    const followTail = isTraceViewAtEnd();
    const pathSizes = await readReloadablePathFileSizes();

    const probeResults = await Promise.all(
        filesStore.states.map(
            async (fileState): Promise<MonitorProbe | null> => {
                if (!canReloadFile(fileState)) return null;
                if (activeFileReloadControllers.has(fileState.id)) return null;

                try {
                    if (fileState.source.kind === "handle") {
                        const currentFile = await fileState.source.handle.getFile();
                        const grew = currentFile.size > fileState.updateInfo.lastObservedSize;
                        updateObservedFileSize(fileState, currentFile.size, true);
                        return { fileState, observedSize: currentFile.size, prefetchedFile: currentFile, grew };
                    }

                    const observedSize = pathSizes.get(fileState.source.path);
                    if (observedSize === undefined) {
                        return null;
                    }

                    const grew = observedSize > fileState.updateInfo.lastObservedSize;
                    updateObservedFileSize(fileState, observedSize, true);
                    return { fileState, observedSize, grew };
                } catch {
                    return null;
                }
            }
        )
    );

    if (!appSettings.fileUpdates.sizeMonitorEnabled) {
        return;
    }

    await asyncScanMonitoredFolders();

    if (!selectedId) {
        return;
    }

    const selectedProbe = probeResults.find((probe) => !!probe && probe.fileState.id === selectedId);
    if (!selectedProbe) {
        return;
    }

    const { fileState, prefetchedFile, grew } = selectedProbe;
    const needsInitialLoad = fileState.data.rawLines.length === 0;
    const needsContentReload = followTail && (grew || fileState.updateInfo.hasUnreloadedSizeChange);

    if (!needsInitialLoad && !needsContentReload) {
        return;
    }

    const prefetchedFiles = prefetchedFile
        ? new Map<string, File>([[fileState.id, prefetchedFile]])
        : undefined;
    const updatedCount = await asyncReloadFiles([fileState], { reason: "auto", prefetchedFiles });

    if (updatedCount > 0 && needsContentReload) {
        followSelectedFileTail(fileState);
    }
}

export async function asyncReloadFileById(fileId: string): Promise<void> {
    const fileState = filesStore.states.find((item) => item.id === fileId);
    if (canReloadFile(fileState)) {
        await asyncReloadFile(fileState);
    }
}

function followSelectedFileTail(fileState: FileState) {
    if (getCurrentFileState()?.id !== fileState.id) {
        return;
    }

    const lastLineIndex = fileState.data.viewLines.length - 1;
    if (lastLineIndex >= 0) {
        setCurrentLineIndex(lastLineIndex);
    }

    requestScrollTraceViewToBottom();
}

export function cancelFileReload(fileId: string) {
    const controller = activeFileReloadControllers.get(fileId);
    if (!controller) {
        return;
    }

    controller.abort();

    const fileState = filesStore.states.find((item) => item.id === fileId);
    if (fileState) {
        clearCancelledUpdate(fileState);
    }

    setFileLoading(fileId, false);
}

export function cancelAllFileReloads() {
    const fileIds = Array.from(activeFileReloadControllers.keys());
    fileIds.forEach(cancelFileReload);
}

function applyParsedTraceData(fileState: FileState, fileName: string, parsed: ParsedTraceData) {
    const data = fileState.data;
    data.fileName = fileName;
    data.rawLines = parsed.rawLines;
    data.viewLines = parsed.viewLines;
    data.uniqueThreadIds = parsed.uniqueThreadIds;
    data.header = parsed.header;
    data.errorsInTraceCount = parsed.errorCount;
    data.errorsInTraceCountWithoutNoise = getErrorLinesCountWithoutNoise(parsed.viewLines);
    data.errorLoadingFile = null;
}

function resetThreadViewCache(fileState: FileState) {
    const store = getDefaultStore();
    store.set(fileState.threadLinesAtom, undefined);
    store.set(fileState.threadLineBaseIndicesAtom, undefined);
    store.set(fileState.threadBaseIndexToDisplayIndexAtom, undefined);
    store.set(fileState.threadLinesThreadIdAtom, null);
}

function clampCurrentLineIndex(fileState: FileState, viewLinesLength: number) {
    const store = getDefaultStore();
    const currentLineIndex = store.get(fileState.currentLineIdxAtom);
    if (currentLineIndex < 0) return;

    const maxLineIndex = viewLinesLength - 1;
    store.set(fileState.currentLineIdxAtom, maxLineIndex >= 0 ? Math.min(currentLineIndex, maxLineIndex) : -1);
}

function createNewLinesMarker(previousRawLineCount: number, nextRawLineCount: number): NewLinesMarker | null {
    if (nextRawLineCount <= previousRawLineCount) {
        return null;
    }

    return {
        fromLineIndex: previousRawLineCount,
    };
}

function setNewLinesMarker(fileState: FileState, marker: NewLinesMarker | null) {
    getDefaultStore().set(fileState.newLinesMarkerAtom, marker);
}

function clearNewLinesMarker(fileState: FileState) {
    getDefaultStore().set(fileState.newLinesMarkerAtom, null);
}

function createFileSourceInfo(file: File): FileSourceInfo {
    const diskPath = getFileDiskPath(file);
    if (diskPath && isBackendAvailable()) {
        return { kind: "path", path: diskPath };
    }

    const handle = (file as FileWithHandle).handle;
    if (handle) {
        return { kind: "handle", handle };
    }

    return { kind: "transient" };
}

function dedupeReloadableFiles(fileStates: readonly FileState[]) {
    const uniqueReloadableFiles = new Map<string, ReloadableFileState>();

    for (const fileState of fileStates) {
        if (!canReloadFile(fileState)) continue;
        uniqueReloadableFiles.set(fileState.id, fileState);
    }

    return Array.from(uniqueReloadableFiles.values());
}

async function reloadSingleFile(fileState: ReloadableFileState, options: ReloadSingleOptions): Promise<"success" | "failed" | "cancelled"> {
    const existingController = activeFileReloadControllers.get(fileState.id);
    if (existingController) {
        return "cancelled";
    }

    const controller = new AbortController();
    activeFileReloadControllers.set(fileState.id, controller);

    const hadPreviousFailure = fileState.updateInfo.status === "failed";
    const previousRawLineCount = fileState.data.rawLines.length;

    startFileUpdate(fileState);

    try {
        const { file, parsed } = await parseLatestFileWithRetry(
            fileState,
            controller,
            options.prefetchedFile,
            options.reason
        );
        throwIfReloadCancelled(fileState.id, controller);

        applyParsedTraceData(fileState, file.name, parsed);
        resetThreadViewCache(fileState);
        clampCurrentLineIndex(fileState, parsed.viewLines.length);
        setNewLinesMarker(fileState, createNewLinesMarker(previousRawLineCount, parsed.rawLines.length));
        markUpdateSucceeded(fileState, file.size);
        refreshCurrentFileStateIfSelected(fileState);
        return "success";
    } catch (error) {
        if (isReloadCancelled(fileState.id, controller, error)) {
            clearCancelledUpdate(fileState);
            refreshCurrentFileStateIfSelected(fileState);
            return "cancelled";
        }

        if (shouldDeferLoadToMonitorCycle(fileState, error) && options.reason === "auto") {
            deferLoadToNextMonitorCycle(fileState);
            refreshCurrentFileStateIfSelected(fileState);
            return "cancelled";
        }

        markUpdateFailed(fileState, error, options.reason, hadPreviousFailure);
        refreshCurrentFileStateIfSelected(fileState);
        return "failed";
    } finally {
        if (activeFileReloadControllers.get(fileState.id) === controller) {
            activeFileReloadControllers.delete(fileState.id);
        }
        setFileLoading(fileState.id, false, false);
    }
}

function startFileUpdate(fileState: FileState) {
    clearNewLinesMarker(fileState);
    fileState.updateInfo.status = "updating";
    fileState.updateInfo.lastAttemptAt = Date.now();
    fileState.updateInfo.failureMessage = null;
    setFileLoading(fileState.id, true);
    refreshCurrentFileStateIfSelected(fileState);
}

function syncLoadedFileSize(fileState: FileState, fileSize: number) {
    fileState.updateInfo.lastLoadedSize = fileSize;
    fileState.updateInfo.lastObservedSize = fileSize;
    fileState.updateInfo.hasUnreloadedSizeChange = false;
}

function updateObservedFileSize(fileState: FileState, fileSize: number, trackSizeChange: boolean) {
    const info = fileState.updateInfo;
    const previousSizeChanged = info.hasUnreloadedSizeChange;
    const addedBytes = fileSize - info.lastObservedSize;

    info.lastObservedSize = fileSize;

    if (!trackSizeChange) {
        return;
    }

    if (addedBytes > 0) {
        applyAddedBytes(fileState, addedBytes);
    }

    info.hasUnreloadedSizeChange = fileSize !== info.lastLoadedSize;

    if (previousSizeChanged !== info.hasUnreloadedSizeChange) {
        refreshCurrentFileStateIfSelected(fileState);
    }
}

// Byte growth counters: show the most recent delta in orange for ~1s, then fold it into the gray total.
const recentBytesCommitTimers = new Map<string, number>();

function applyAddedBytes(fileState: FileState, addedBytes: number) {
    const info = fileState.updateInfo;

    // A newer delta arrived: commit the previous (still-orange) delta into the total first.
    commitPendingRecentBytes(info);

    info.recentAddedBytes = addedBytes;
    info.recentAddedExpiresAt = Date.now() + RECENT_ADDED_BYTES_DURATION_MS;
    scheduleRecentBytesCommit(fileState);

    // A fresh size change hides the previous green marker (re-set later if the file is reloaded).
    clearNewLinesMarker(fileState);
}

function commitPendingRecentBytes(info: FileUpdateInfo) {
    if (info.recentAddedBytes > 0) {
        info.totalAddedBytes += info.recentAddedBytes;
        info.recentAddedBytes = 0;
    }
    info.recentAddedExpiresAt = null;
}

function scheduleRecentBytesCommit(fileState: FileState) {
    const existing = recentBytesCommitTimers.get(fileState.id);
    if (existing !== undefined) {
        window.clearTimeout(existing);
    }

    const timerId = window.setTimeout(
        () => {
            recentBytesCommitTimers.delete(fileState.id);
            commitPendingRecentBytes(fileState.updateInfo);
        },
        RECENT_ADDED_BYTES_DURATION_MS
    );

    recentBytesCommitTimers.set(fileState.id, timerId);
}

function markUpdateSucceeded(fileState: FileState, fileSize: number) {
    fileState.updateInfo.status = "idle";
    syncLoadedFileSize(fileState, fileSize);
    fileState.updateInfo.lastSuccessAt = Date.now();
    fileState.updateInfo.lastFailureAt = null;
    fileState.updateInfo.failureMessage = null;
}

function markUpdateFailed(fileState: FileState, error: unknown, reason: ReloadReason, hadPreviousFailure: boolean) {
    const failureMessage = buildUpdateFailureMessage(fileState.data.fileName);
    fileState.updateInfo.status = "failed";
    fileState.updateInfo.lastFailureAt = Date.now();
    fileState.updateInfo.failureMessage = failureMessage;

    console.error("Failed to reload trace", error);

    if (appSettings.fileUpdates.showFailureNotice && (!hadPreviousFailure || reason === "manual")) {
        notice.info(failureMessage);
    }
}

function clearCancelledUpdate(fileState: FileState) {
    fileState.updateInfo.status = "idle";
    fileState.updateInfo.failureMessage = null;
    refreshCurrentFileStateIfSelected(fileState);
}

async function parseLatestFileWithRetry(
    fileState: ReloadableFileState,
    controller: AbortController,
    prefetchedFile?: File,
    reason: ReloadReason = "manual"
) {
    let nextFile: File | undefined = prefetchedFile;

    for (let attempt = 1; attempt <= FILE_RELOAD_RETRY_ATTEMPTS; attempt++) {
        throwIfReloadCancelled(fileState.id, controller);

        try {
            const fileToParse = nextFile ?? await readReloadableFile(fileState);
            updateObservedFileSize(fileState, fileToParse.size, appSettings.fileUpdates.sizeMonitorEnabled);
            const parsed = await asyncParseTraceFile(fileToParse);
            throwIfReloadCancelled(fileState.id, controller);
            return { file: fileToParse, parsed };
        } catch (error) {
            if (isReloadCancelled(fileState.id, controller, error)) {
                throw error;
            }

            if (reason === "auto" && isNotReadableError(error)) {
                throw error;
            }

            if (attempt >= FILE_RELOAD_RETRY_ATTEMPTS) {
                throw error;
            }

            nextFile = undefined;
            await delayWithAbort(FILE_RELOAD_RETRY_DELAY_MS, controller.signal);
        }
    }

    throw new Error("Failed to reload trace.");
}

function isNotReadableError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "NotReadableError") {
        return true;
    }

    if (error instanceof Error && error.name === "NotReadableError") {
        return true;
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.includes("NotReadableError");
}

function shouldDeferLoadToMonitorCycle(fileState: FileState, error: unknown): boolean {
    return isNotReadableError(error)
        && canReloadFile(fileState)
        && appSettings.fileUpdates.sizeMonitorEnabled;
}

function deferLoadToNextMonitorCycle(fileState: FileState) {
    fileState.data.errorLoadingFile = null;

    if (fileState.data.rawLines.length === 0) {
        fileState.updateInfo.lastLoadedSize = 0;
    }

    fileState.updateInfo.hasUnreloadedSizeChange = true;
    fileState.updateInfo.status = "idle";
    fileState.updateInfo.failureMessage = null;
    refreshCurrentFileStateIfSelected(fileState);
}

async function delayWithAbort(ms: number, signal: AbortSignal) {
    if (signal.aborted) {
        throw new DOMException("File reload cancelled.", "AbortError");
    }

    await Promise.race([
        delay(ms),
        new Promise((_, reject) => {
            signal.addEventListener(
                "abort",
                () => reject(new DOMException("File reload cancelled.", "AbortError")),
                { once: true }
            );
        })
    ]);
}

function throwIfReloadCancelled(fileId: string, controller: AbortController) {
    if (controller.signal.aborted || activeFileReloadControllers.get(fileId) !== controller) {
        throw new DOMException("File reload cancelled.", "AbortError");
    }
}

function isReloadCancelled(fileId: string, controller: AbortController, error: unknown) {
    return controller.signal.aborted
        || activeFileReloadControllers.get(fileId) !== controller
        || (error instanceof DOMException && error.name === "AbortError");
}

function refreshCurrentFileStateIfSelected(fileState: FileState) {
    if (getCurrentFileState()?.id === fileState.id) {
        setCurrentFileState(fileState, true);
    }
}

async function readReloadablePathFileSizes(): Promise<Map<string, number>> {
    const pathStates = filesStore.states.filter(
        (fileState): fileState is ReloadableFileState & { source: { kind: "path"; path: string; }; } =>
            canReloadFile(fileState) && fileState.source.kind === "path"
    );
    if (pathStates.length === 0) {
        return new Map();
    }

    try {
        const stats = await statPathsFromBackend(pathStates.map((fileState) => fileState.source.path));
        return new Map(stats.map((stat) => [stat.path, stat.size]));
    } catch {
        return new Map();
    }
}

async function readReloadableFile(fileState: ReloadableFileState): Promise<File> {
    if (fileState.source.kind === "handle") {
        return fileState.source.handle.getFile();
    }

    return readFileFromBackendPath(fileState.source.path);
}

function buildUpdateFailureMessage(fileName: string) {
    return `Could not update "${fileName}" after ${FILE_RELOAD_RETRY_ATTEMPTS} attempts. The file may be locked by another process.`;
}

function getErrorLinesCountWithoutNoise(viewLines: readonly TraceLine[]) {
    let count = 0;
    for (const line of viewLines) {
        if (line.code !== LineCode.Error) continue;
        if (line.content.includes(NOISE_ERROR_CODE)) continue;
        count++;
    }
    return count;
}

const listChangeHighlightTimers = new Map<string, number>();
const pendingRemovedFileIds = new Set<string>();

async function asyncScanMonitoredFolders(): Promise<void> {
    if (!isBackendAvailable()) {
        return;
    }

    const monitoredFolders = collectMonitoredFolders();
    if (monitoredFolders.size === 0) {
        return;
    }

    let totalAdded = 0;
    let totalRemoved = 0;

    for (const [dirPath, knownPaths] of monitoredFolders) {
        try {
            const changes = await scanFolderChangesFromBackend(dirPath, knownPaths);
            totalAdded += await asyncApplyMonitoredFolderAddedFiles(changes.addedFiles);
            totalRemoved += applyMonitoredFolderRemovedPaths(changes.removedPaths);
        } catch (error) {
            console.error("Failed to scan monitored folder", dirPath, error);
        }
    }

    if (totalAdded > 0 || totalRemoved > 0) {
        showFileListChanges(totalAdded, totalRemoved);
    }

    if (totalAdded > 0) {
        appSettings.allTimes.needToRebuild = true;
        buildAlltimes();
    }
}

export function registerMonitoredKnownPaths(paths: string[]) {
    const known = new Set(filesStore.monitoredKnownPaths);
    for (const path of paths) {
        known.add(path);
    }
    filesStore.monitoredKnownPaths = Array.from(known);
}

function unregisterMonitoredKnownPath(path: string) {
    filesStore.monitoredKnownPaths = filesStore.monitoredKnownPaths.filter((item) => item !== path);
}

function collectMonitoredFolders(): Map<string, string[]> {
    const folders = new Map<string, string[]>();

    const registerPath = (filePath: string) => {
        const dirPath = getParentDirectoryPath(filePath);
        const knownPaths = folders.get(dirPath) ?? [];
        if (!knownPaths.includes(filePath)) {
            knownPaths.push(filePath);
        }
        folders.set(dirPath, knownPaths);
    };

    for (const filePath of filesStore.monitoredKnownPaths) {
        registerPath(filePath);
    }

    for (const fileState of filesStore.states) {
        if (fileState.source.kind !== "path") {
            continue;
        }

        registerPath(fileState.source.path);
    }

    return folders;
}

function getParentDirectoryPath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const lastSlash = normalized.lastIndexOf("/");
    if (lastSlash <= 0) {
        return filePath;
    }

    return filePath.slice(0, filePath.length - (normalized.length - lastSlash));
}

async function asyncApplyMonitoredFolderAddedFiles(
    addedFiles: { name: string; path: string; data: number[]; }[]
): Promise<number> {
    if (addedFiles.length === 0) {
        return 0;
    }

    const blockPatterns = getActiveBlockLoadPatterns();
    const itemsToLoad: FileLoadItem[] = [];

    for (const pathFile of addedFiles) {
        registerMonitoredKnownPaths([pathFile.path]);
        const bytes = pathFileDataToUint8Array(pathFile.data);
        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        const file = setFileDiskPath(new File([copy.buffer], pathFile.name), pathFile.path);

        if (isZipFile(file)) {
            const result = await extractTracesFromZipInWorker(file, blockPatterns);
            for (const zipEntry of result.files) {
                itemsToLoad.push({
                    file: zipEntry,
                    source: { kind: "zip", zipFileName: result.zipFileName },
                    listChangeHighlight: "added",
                });
            }
            continue;
        }

        if (!isTrc3File(file) || shouldBlockFileLoad(file.name)) {
            continue;
        }

        itemsToLoad.push({
            file,
            source: { kind: "path", path: pathFile.path },
            listChangeHighlight: "added",
        });
    }

    if (itemsToLoad.length === 0) {
        return 0;
    }

    await loadFilesToStore(itemsToLoad);
    return itemsToLoad.length;
}

function applyMonitoredFolderRemovedPaths(removedPaths: string[]): number {
    if (removedPaths.length === 0) {
        return 0;
    }

    const removedPathSet = new Set(removedPaths);
    const removedZipNames = new Set(
        removedPaths
            .filter((path) => path.toLowerCase().endsWith(".zip"))
            .map((path) => getPathBaseName(path))
    );
    let removedCount = 0;

    for (const fileState of filesStore.states) {
        const pathSource = fileState.source.kind === "path" ? fileState.source.path : null;
        const zipSource = fileState.source.kind === "zip" && removedZipNames.has(fileState.source.zipFileName);

        if (!pathSource && !zipSource) {
            continue;
        }

        if (pathSource && !removedPathSet.has(pathSource)) {
            continue;
        }

        if (pendingRemovedFileIds.has(fileState.id)) {
            continue;
        }

        pendingRemovedFileIds.add(fileState.id);
        markFileListChangeHighlight(fileState, "removed");
        scheduleRemovedFileClose(fileState.id);
        if (pathSource) {
            unregisterMonitoredKnownPath(pathSource);
        }
        removedCount++;
    }

    for (const path of removedPaths) {
        unregisterMonitoredKnownPath(path);
    }

    return removedCount;
}

function getPathBaseName(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash < 0 ? filePath : normalized.slice(lastSlash + 1);
}

function markFileListChangeHighlight(fileState: FileState, highlight: FileListChangeHighlight) {
    fileState.listChangeHighlight = highlight;

    const existing = listChangeHighlightTimers.get(fileState.id);
    if (existing !== undefined) {
        window.clearTimeout(existing);
    }

    const timerId = window.setTimeout(
        () => {
            listChangeHighlightTimers.delete(fileState.id);
            if (fileState.listChangeHighlight === highlight) {
                fileState.listChangeHighlight = null;
            }
        },
        getFileListChangeHighlightDurationMs()
    );

    listChangeHighlightTimers.set(fileState.id, timerId);
}

function scheduleRemovedFileClose(fileId: string) {
    window.setTimeout(
        () => {
            pendingRemovedFileIds.delete(fileId);
            const fileState = filesStore.states.find((item) => item.id === fileId);
            if (!fileState || fileState.listChangeHighlight !== "removed") {
                return;
            }

            closeFile(fileId);
        },
        getFileListChangeHighlightDurationMs()
    );
}
