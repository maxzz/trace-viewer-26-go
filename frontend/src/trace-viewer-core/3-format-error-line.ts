/**
 * Format an error line content by converting negative error codes to hex values in place.
 * @param content - The content to format.
 * @returns The formatted content.
 * @example
 * formatErrorLineContent("hResult: -2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("-2147024894 DPFPTokenIsEnrolled failed") // "0x80070002 DPFPTokenIsEnrolled failed"
 * formatErrorLineContent("m_cpWrappedProvider->Advise -2147467263") // "m_cpWrappedProvider->Advise 0x80004001"
 */
export function formatErrorLineContent(content: string): string {
    return content.replace(/(?<!\d)-(\d+)(?![\d.])/g, (match) => {
        try {
            const dec = parseInt(match, 10);
            return signedDecimalToErrorHex(dec);
        } catch {
            return match;
        }
    });
}

export const NOISE_ERROR_CODE = "0x80070002"; // ERROR_FILE_NOT_FOUND

export function signedDecimalToErrorHex(dec: number): string {
    return `0x${unsignedHexFromSignedDecimal(dec)}`;
}

export function errorHexToSignedDecimal(hexValue: string): number | undefined {
    const trimmed = hexValue.trim();
    if (!trimmed) {
        return undefined;
    }

    let hexDigits = trimmed;
    if (hexDigits.startsWith("0x") || hexDigits.startsWith("0X")) {
        hexDigits = hexDigits.slice(2);
    }

    if (!hexDigits || !/^[0-9A-Fa-f]+$/.test(hexDigits)) {
        return undefined;
    }

    const unsigned = parseInt(hexDigits, 16);
    if (!Number.isFinite(unsigned)) {
        return undefined;
    }

    return toSignedInt32(unsigned);
}

export function parseSignedDecimalInput(value: string): number | undefined {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
        return undefined;
    }

    const parsed = parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }

    return parsed;
}

function unsignedHexFromSignedDecimal(dec: number): string {
    return (dec >>> 0).toString(16).toUpperCase();
}

function toSignedInt32(value: number): number {
    return value | 0;
}

/*
TODO: collect all error codes and add to a map, so we can use it to format the error line content.
when all files loaded, we can collect all error codes and add to a map, so we can use it to format the error line content.
*/
