import { useState, type ChangeEvent } from "react";
import { useAtom } from "jotai";
import { ArrowLeftRight } from "lucide-react";
import { dialogCalculatorOpenAtom } from "@/store/2-ui-atoms";
import { errorHexToSignedDecimal, parseSignedDecimalInput, signedDecimalToErrorHex } from "@/trace-viewer-core/3-format-error-line";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { Input } from "@/components/ui/shadcn/input";
import { Button } from "@/components/ui/shadcn/button";
import { Label } from "@/components/ui/shadcn/label";

type LastEditedField = "hex" | "decimal";

export function DialogCalculator() {
    const [open, onOpenChange] = useAtom(dialogCalculatorOpenAtom);
    const [hexValue, setHexValue] = useState("");
    const [decimalValue, setDecimalValue] = useState("");
    const [lastEdited, setLastEdited] = useState<LastEditedField>("hex");

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            setHexValue("");
            setDecimalValue("");
            setLastEdited("hex");
        }

        onOpenChange(nextOpen);
    }

    function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
        setLastEdited("hex");
        setHexValue(event.target.value);
    }

    function handleDecimalChange(event: ChangeEvent<HTMLInputElement>) {
        setLastEdited("decimal");
        setDecimalValue(event.target.value);
    }

    function handleConvert() {
        if (lastEdited === "hex") {
            const normalizedHex = normalizeHexInput(hexValue);
            const dec = errorHexToSignedDecimal(normalizedHex);
            if (dec === undefined) {
                return;
            }

            setHexValue(normalizedHex);
            setDecimalValue(String(dec));
            return;
        }

        const dec = parseSignedDecimalInput(decimalValue);
        if (dec === undefined) {
            return;
        }

        setDecimalValue(String(dec));
        setHexValue(signedDecimalToErrorHex(dec));
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-110!" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Calculator
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 flex items-end gap-2">
                    <div className="grid flex-1 gap-1">
                        <Label htmlFor="calculator-hex">
                            Hexadecimal
                        </Label>
                        <Input
                            id="calculator-hex"
                            className="font-mono"
                            value={hexValue}
                            onChange={handleHexChange}
                            onFocus={() => setLastEdited("hex")}
                            placeholder="0x80070002"
                            spellCheck={false}
                        />
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="mb-0.5 shrink-0"
                        aria-label="Convert between hexadecimal and decimal"
                        onClick={handleConvert}
                    >
                        <ArrowLeftRight />
                    </Button>

                    <div className="grid flex-1 gap-1">
                        <Label htmlFor="calculator-decimal">
                            Decimal
                        </Label>
                        <Input
                            id="calculator-decimal"
                            className="font-mono"
                            value={decimalValue}
                            onChange={handleDecimalChange}
                            onFocus={() => setLastEdited("decimal")}
                            placeholder="-2147024894"
                            spellCheck={false}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function normalizeHexInput(value: string): string {
    const trimmed = value.trim();
    if (/^0x[0-9A-Fa-f]+$/i.test(trimmed)) {
        return `0x${trimmed.slice(2).toUpperCase()}`;
    }

    if (/^[0-9A-Fa-f]+$/i.test(trimmed)) {
        return `0x${trimmed.toUpperCase()}`;
    }

    return trimmed;
}
