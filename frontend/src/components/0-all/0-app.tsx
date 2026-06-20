import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { DropItDoc } from "../ui/local-ui/6-dnd/ui-drop-it-doc";
import { Toaster } from "../ui/local-ui/7-toaster";
import { UISymbolDefs, IconBinocular } from "../ui/icons";
import { doSetFilesFrom_Dnd_Atom } from "../ui/local-ui/6-dnd/8-dnd-atoms";
import { AppGlobalsAndDialogs } from "../4-dialogs/0-app-globals";
import { ZipLoadingOverlay } from "../ui/local-ui/zip-loading-overlay";
import { listenerToBuildAllTimesEffectAtom } from "@/store/traces-store/3-2-all-times-listener";
import { filesCountAtom } from "@/store/6-filtered-files";
import { isLoadingFilesAtom } from "@/store/traces-store/8-1-load-files";
import { HeaderRow } from "./1-header";
import { Footer } from "./2-footer";
import { TraceMainView } from "./6-resizable-panels";
// import { SpyAllIcons } from "@/utils/util-hooks/spy-all-icons";

export function App() {
    return (
        <div className="h-screen w-screen bg-background overflow-hidden">
            <UISymbolDefs />
            <Toaster />
            <ZipLoadingOverlay />
            <DropItDoc doSetFilesFromDropAtom={doSetFilesFrom_Dnd_Atom} />

            {/* <SpyAllIcons includeSvgSymbols /> */}
            <div className="h-full text-xs flex flex-col overflow-hidden">
                <HeaderRow />
                <TraceViewerApp />
                <Footer />
            </div>

            <AppGlobalsAndDialogs />
        </div>
    );
}

export function TraceViewerApp() {
    const fileCount = useAtomValue(filesCountAtom);
    const isLoadingFiles = useAtomValue(isLoadingFilesAtom);
    const showTraceMainView = fileCount > 0 && !isLoadingFiles;

    useAtomValue(listenerToBuildAllTimesEffectAtom);

    return (

        <div className="flex-1 flex flex-col overflow-hidden relative">
            <AnimatePresence initial={false} mode="wait">
                {!showTraceMainView
                    ? (
                        <motion.div
                            key="no-files"
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <NoFilesView loading={isLoadingFiles && fileCount > 0} />
                        </motion.div>
                    )
                    : (
                        <motion.div
                            key="trace-main"
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TraceMainView />
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div>

    );
}

function NoFilesView({ loading }: { loading?: boolean; }) {
    return (
        <div className="absolute inset-0 bg-foreground/5 flex flex-col items-center justify-center pointer-events-none">
            {!loading && (<>
                <IconBinocular className="size-8" />
                <p className="max-w-76 text-center text-xs text-foreground">
                    Drag and drop the .trc3 file, folder, ZIP archive, or use the file selection dialog to view the traces.
                </p>
            </>)}
        </div>
    );
}
