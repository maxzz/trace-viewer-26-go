import { useEffect, type ChangeEvent } from "react";
import { atom, useAtom } from "jotai";
import { dialogCalculatorOpenAtom } from "@/store/2-ui-atoms";
import { errorHexToSignedDecimal, parseSignedDecimalInput, signedDecimalToErrorHex } from "@/trace-viewer-core/3-format-error-line";
import { isBackendAvailable } from "@/wails/is-wails";
import { lookupErrorMessageFromBackend } from "@/wails/lookup-error-message";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { Input } from "@/components/ui/shadcn/input";
import { Button } from "@/components/ui/shadcn/button";
import { Label } from "@/components/ui/shadcn/label";

export function DialogCalculator() {
    const [open, onOpenChange] = useAtom(dialogCalculatorOpenAtom);
    const [hexValue, setHexValue] = useAtom(calculatorHexValueAtom);
    const [decimalValue, setDecimalValue] = useAtom(calculatorDecimalValueAtom);
    const [errorMessage, setErrorMessage] = useAtom(calculatorErrorMessageAtom);
    const backendAvailable = isBackendAvailable();

    useEffect(() => {
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
    }, [backendAvailable, decimalValue, hexValue, setErrorMessage]);

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            setHexValue("");
            setDecimalValue("");
            setErrorMessage("");
        }

        onOpenChange(nextOpen);
    }

    function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
        const nextHex = event.target.value;
        setHexValue(nextHex);

        if (!nextHex.trim()) {
            setDecimalValue("");
            return;
        }

        const dec = errorHexToSignedDecimal(nextHex);
        setDecimalValue(dec === undefined ? "" : String(dec));
    }

    function handleDecimalChange(event: ChangeEvent<HTMLInputElement>) {
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
            <DialogContent className="max-w-64!" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Errors Code converter
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 grid gap-2">
                    <div className="grid gap-1">
                        <Label htmlFor="calculator-decimal">
                            Decimal
                        </Label>
                        <Input
                            id="calculator-decimal"
                            className="font-mono"
                            value={decimalValue}
                            onChange={handleDecimalChange}
                            placeholder="-2147024894"
                            spellCheck={false}
                        />
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="calculator-hex">
                            Hexadecimal
                        </Label>
                        <Input
                            id="calculator-hex"
                            className="font-mono"
                            value={hexValue}
                            onChange={handleHexChange}
                            placeholder="0x80070002"
                            spellCheck={false}
                        />
                    </div>

                    {backendAvailable && errorMessage && (
                        <p className="text-muted-foreground text-xs text-pretty">
                            {errorMessage}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const calculatorHexValueAtom = atom("");
const calculatorDecimalValueAtom = atom("");
const calculatorErrorMessageAtom = atom("");
