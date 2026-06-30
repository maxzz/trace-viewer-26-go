import { type ComponentProps, useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { Button } from "../ui/shadcn/button";
import { Input } from "../ui/shadcn/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/shadcn/dialog";
import { GripVertical, Trash2, Plus, Regex, Check } from "lucide-react";
import { appSettings, type FileFilter } from "../../store/1-ui-settings";
import { dialogEditFiltersOpenAtom } from "../../store/2-ui-dialog-atoms";
import { filterActions } from "../../store/4-file-filters";
import { notice } from "../ui/local-ui/7-toaster/7-toaster";

export function DialogEditFilters() {
    const [open, setOpen] = useAtom(dialogEditFiltersOpenAtom);
    const { fileFilters } = useSnapshot(appSettings, { sync: true });
    const [invalidFilterIds, setInvalidFilterIds] = useState<{ name: Set<string>, pattern: Set<string>; }>({ name: new Set(), pattern: new Set() });

    function validateFilters(): boolean {
        const invalidNames = new Set<string>();
        const invalidPatterns = new Set<string>();

        fileFilters.forEach(
            (filter) => {
                if (!filter.name || filter.name.trim() === '') {
                    invalidNames.add(filter.id);
                }
                if (!filter.pattern || filter.pattern.trim() === '') {
                    invalidPatterns.add(filter.id);
                }
            }
        );

        setInvalidFilterIds({ name: invalidNames, pattern: invalidPatterns });

        if (invalidNames.size > 0 || invalidPatterns.size > 0) {
            notice.error('Filter name and pattern cannot be empty');
            return false;
        }

        return true;
    }

    function onItemsReorder(newOrder: FileFilter[]) {
        filterActions.reorderFilters(newOrder);
    }

    function onDlgOpenChange(newOpen: boolean) {
        if (newOpen) {
            // Opening dialog - clear any previous invalid states
            setInvalidFilterIds({ name: new Set(), pattern: new Set() });
            setOpen(true);
        } else {
            // Attempting to close - validate first
            if (validateFilters()) {
                setOpen(false);
            }
            // If validation fails, don't close (setOpen is not called)
        }
    }

    function onDlgClose() {
        if (validateFilters()) {
            setOpen(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onDlgOpenChange}>
            <DialogContent className="max-w-150! outline-none" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="select-none">
                        Filters
                    </DialogTitle>

                    <div className="flex items-center gap-x-1">
                        <DialogDescription className="text-xs text-muted-foreground">
                            Filters are used to exclude files from the loaded files list. Use regex or wildcard patterns to match the file names.
                        </DialogDescription>

                        <Button className="mx-5 mr-7 h-7" variant="outline" size="xs" onClick={() => filterActions.addFilter("", "")}>
                            <Plus className="size-3.5" />
                            Add Filter
                        </Button>
                    </div>
                </DialogHeader>

                <div className="-mt-3">
                    {/* Show header line for the filters list with column names located over the filter name and pattern columns */}
                    {fileFilters.length !== 0 && <Header />}

                    <div className="-mx-2 pr-2 py-1">
                        <Reorder.Group className="m-0 p-0" axis="y" values={fileFilters as unknown as FileFilter[]} onReorder={onItemsReorder}>
                            {fileFilters.map(
                                (filter) => (
                                    <FilterRow
                                        key={filter.id}
                                        filter={filter as unknown as FileFilter}
                                        onDelete={filterActions.deleteFilter}
                                        isNameInvalid={invalidFilterIds.name.has(filter.id)}
                                        isPatternInvalid={invalidFilterIds.pattern.has(filter.id)}
                                    />
                                )
                            )}
                        </Reorder.Group>

                        {/* <Button className="mt-1 mx-5 h-7" variant="outline" size="xs" onClick={() => filterActions.addFilter("", "")}>
                            <Plus className="size-3.5" />
                            Add Filter
                        </Button> */}
                    </div>

                    <FilterExamples />
                </div>

                <DialogFooter className="mt-2 justify-center!">
                    <Button variant="outline" onClick={onDlgClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}

function Header() {
    return (
        <div className="mt-4 px-5 grid grid-cols-[170px_1fr] gap-1 select-none">
            <div className="text-xs font-semibold">
                Filter name
            </div>
            <div className="text-xs font-semibold">
                Match pattern
            </div>
        </div>
    );
}

function FilterRow({ filter, onDelete, isNameInvalid, isPatternInvalid }: { filter: FileFilter, onDelete: (id: string) => void, isNameInvalid?: boolean, isPatternInvalid?: boolean; }) {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            className="mb-1 bg-background flex items-center select-none"
            id={filter.id}
            value={filter}
            dragListener={false}
            dragControls={dragControls}
        >
            <div className="py-2 px-1 hover:bg-muted cursor-grab touch-none rounded" onPointerDown={(e) => dragControls.start(e)}>
                <GripVertical className="size-3 text-muted-foreground" />
            </div>

            <div className="flex-1 grid grid-cols-[170px_1fr] gap-1">
                <Input
                    className={`h-8 ${isNameInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    placeholder="Filter Name"
                    value={filter.name}
                    onChange={(e) => filterActions.updateFilter(filter.id, { name: e.target.value })}
                    {...turnOffAutoComplete}
                />
                <InputPattern
                    filterId={filter.id}
                    pattern={filter.pattern}
                    isPatternInvalid={isPatternInvalid ?? false}
                />
            </div>

            <Button className="ml-0.5 size-7 text-muted-foreground/50 rounded" variant="ghost" size="icon-sm" tabIndex={-1} onClick={() => onDelete(filter.id)}>
                <Trash2 className="size-3.5" />
            </Button>
        </Reorder.Item>
    );
}

function InputPattern({ filterId, pattern, isPatternInvalid }: { filterId: string, pattern: string, isPatternInvalid: boolean; }) {
    // Detect if pattern is regex (starts and ends with /)
    const isRegex = pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 1;
    const patternWithoutSlashes = isRegex ? pattern.slice(1, -1) : pattern;

    // Use local state for input value to prevent cursor jumping to the end of the input when the pattern changes
    const [localValue, setLocalValue] = useState(patternWithoutSlashes);

    // Sync local state when pattern changes externally to prevent cursor jumping to the end of the input when the pattern changes
    useEffect(() => setLocalValue(patternWithoutSlashes), [patternWithoutSlashes]);

    function onUpdate(id: string, data: Partial<FileFilter>) {
        filterActions.updateFilter(id, data);
    }

    function handlePatternChange(value: string) {
        setLocalValue(value);
        // If currently regex, wrap the new value with slashes
        if (isRegex) {
            onUpdate(filterId, { pattern: `/${value}/` });
        } else {
            onUpdate(filterId, { pattern: value });
        }
    }

    function handleToggleRegex() {
        if (isRegex) {
            // Remove regex: unwrap slashes
            onUpdate(filterId, { pattern: patternWithoutSlashes });
        } else {
            // Enable regex: wrap with slashes
            onUpdate(filterId, { pattern: `/${pattern}/` });
        }
    }

    return (
        <div className="relative">
            <Input
                className={`h-8 pr-8 ${isPatternInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                placeholder={isRegex ? "Regex pattern" : "Pattern (e.g. *.log)"}
                value={localValue}
                onChange={(e) => handlePatternChange(e.target.value)}
                {...turnOffAutoComplete}
            />
            <div className="absolute right-0 top-0">
                <Button
                    className={`border-0 border-l border-l-border rounded-r-[3px] rounded-l-none ${isRegex ? 'text-primary bg-primary/10' : 'hover:bg-primary/5'} ${isPatternInvalid ? 'border-l-red-500' : ''}`}
                    variant={isRegex ? "outline" : "ghost"}
                    size="icon-sm"
                    onClick={handleToggleRegex}
                    title="Use regex pattern"
                    type="button"
                    tabIndex={-1}
                >
                    <Regex className={`size-3 ${isRegex ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </Button>
            </div>
        </div>
    );
}

// Examples of filters

function FilterExamples({ className, ...rest }: ComponentProps<"div">) {
    return (
        <div className={classNames("text-xs text-muted-foreground text-balance", className)} {...rest}>
            <p className="mb-2">
                Examples (wildcards or regex):
            </p>
            <ul className="pl-4 flex flex-col gap-y-3">
                <li>
                    <CopyableCode text="^(?!.*(DpHostW|D[pP][^AP]))" /> Show only <span className={sampleClasses}>DpAgentOtsPlugin</span> and <span className={sampleClasses}>DPPmatHelper</span>
                </li>
                <li>
                    <CopyableCode text="^(?!.*(DpHost|DPCard))" /> Hide <span className={sampleClasses}>DpHost</span> and <span className={sampleClasses}>DPCard</span>
                </li>
                <li>
                    <CopyableCode text="^(?!.*DpHost).*$" /> regex to exclude files with name <span className={sampleClasses}>DpHost</span>
                </li>
                <li>
                    <CopyableCode text="DpCard" /> Show only <span className={sampleClasses}>DpCard</span>
                </li>
            </ul>
        </div>
    );
}

const codeClasses = "px-1.5 py-1 font-mono bg-muted/70 outline rounded";
const sampleClasses = "px-1 py-0.5 font-semibold bg-muted/75 rounded";

function CopyableCode({ text }: { text: string; }) {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    function handleClick() {
        void navigator.clipboard.writeText(text);
        clearTimeout(timeoutRef.current);
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), 1000);
    }

    return (
        <span
            className={classNames(codeClasses, "relative mr-1 inline cursor-pointer select-none")}
            onClick={handleClick}
            title="Click to copy"
        >
            {text}
            <AnimatePresence initial={false}>
                {copied && (
                    <motion.span
                        className="absolute top-1/2 left-0 -translate-y-1/2 text-green-600 bg-muted rounded shadow-sm flex items-center gap-1 z-10 whitespace-nowrap outline"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                    >
                        <Check className="size-3" />
                        Copied
                    </motion.span>
                )}
            </AnimatePresence>
        </span>
    );
}
