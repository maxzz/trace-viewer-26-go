import { useEffect, type ChangeEvent } from "react";
import { atom, useAtom } from "jotai";
import { dialogCalculatorOpenAtom } from "@/store/2-ui-atoms";
import { errorHexToSignedDecimal, parseSignedDecimalInput, signedDecimalToErrorHex } from "@/trace-viewer-core/3-format-error-line";
import { isBackendAvailable } from "@/wails/is-wails";
import { lookupErrorMessageFromBackend } from "@/wails/lookup-error-message";
import { getInitialErrorLookupValuesFromTraceView } from "@/components/2-trace-viewer/4-trace-error-lookup-init";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { Input } from "@/components/ui/shadcn/input";
import { Button } from "@/components/ui/shadcn/button";
import { Label } from "@/components/ui/shadcn/label";

export function DialogErrorsLookup() {
    const [open, onOpenChange] = useAtom(dialogCalculatorOpenAtom);
    const [hexValue, setHexValue] = useAtom(calculatorHexValueAtom);
    const [decimalValue, setDecimalValue] = useAtom(calculatorDecimalValueAtom);
    const [errorMessage, setErrorMessage] = useAtom(calculatorErrorMessageAtom);
    const backendAvailable = isBackendAvailable();

    useEffect(
        () => {
            if (!open) {
                return;
            }

            const initialValues = getInitialErrorLookupValuesFromTraceView();
            if (initialValues) {
                setHexValue(initialValues.hex);
                setDecimalValue(initialValues.decimal);
            }
        },
        [open, setDecimalValue, setHexValue]);

    useEffect(
        () => {
            if (!backendAvailable) {
                setErrorMessage("");
                return;
            }

            const code = hexValue.trim() || decimalValue.trim();
            if (!code) {
                setErrorMessage("");
                return;
            }

            let cancelled = false;
            void lookupErrorMessageFromBackend(code).then((message) => {
                if (!cancelled) {
                    setErrorMessage(message);
                }
            });

            return () => {
                cancelled = true;
            };
        },
        [backendAvailable, decimalValue, hexValue, setErrorMessage]);

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            setHexValue("");
            setDecimalValue("");
            setErrorMessage("");
        }

        onOpenChange(nextOpen);
    }

    function onHexValueChange(event: ChangeEvent<HTMLInputElement>) {
        const nextHex = event.target.value;
        setHexValue(nextHex);

        if (!nextHex.trim()) {
            setDecimalValue("");
            return;
        }

        const dec = errorHexToSignedDecimal(nextHex);
        setDecimalValue(dec === undefined ? "" : String(dec));
    }

    function onDecimalValueChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDecimal = event.target.value;
        setDecimalValue(nextDecimal);

        if (!nextDecimal.trim()) {
            setHexValue("");
            return;
        }

        const dec = parseSignedDecimalInput(nextDecimal);
        setHexValue(dec === undefined ? "" : signedDecimalToErrorHex(dec));
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-72!" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Errors lookup
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                        <Label htmlFor="calculator-hex">
                            Hexadecimal
                        </Label>
                        <Input
                            id="calculator-hex"
                            className="font-mono"
                            value={hexValue}
                            onChange={onHexValueChange}
                            placeholder="0x80070002"
                            spellCheck={false}
                        />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="calculator-decimal">
                            Decimal
                        </Label>
                        <Input
                            id="calculator-decimal"
                            className="font-mono"
                            value={decimalValue}
                            onChange={onDecimalValueChange}
                            placeholder="-2147024894"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {!backendAvailable && (
                    <p className="text-muted-foreground text-xs text-pretty">
                        The error code lookup function is not available in the web version.
                    </p>
                )}

                <div className="min-h-24">
                    {backendAvailable && errorMessage && (
                        <p className="text-muted-foreground text-xs text-pretty">
                            {errorMessage}
                        </p>
                    )}
                </div>


                <DialogFooter className="mt-4 justify-center!">
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const calculatorHexValueAtom = atom("");
const calculatorDecimalValueAtom = atom("");
const calculatorErrorMessageAtom = atom("");
