/**
 * Format an error line content by converting hResult patterns and negative error codes to hex values.
 * @param content - The content to format.
 * @returns The formatted content.
 * @example
 * formatErrorLineContent("hResult=2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("hResult: -2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("-2147024894 DPFPTokenIsEnrolled failed") // "0x80070002 DPFPTokenIsEnrolled failed"
 * formatErrorLineContent("m_cpWrappedProvider->Advise -2147467263") // "m_cpWrappedProvider->Advise 0x80004001"
 */
export function formatErrorLineContent(content: string): string {

    // Try to find hResult pattern (e.g. hResult=2147500037, hResult: 2147500037, hResult 2147500037) and convert to hex
    // -2147500037 -> 0x80004005 (E_FAIL)
    // '-2147024894 ' -> 0x80070002 (E_FILE_NOT_FOUND) // Windows cannot find a specified file
    let result = content.replace(/hResult([:=\s]+)(-?\d+)/g, (match, separator, decimalString) => {
        try {
            const dec = parseInt(decimalString, 10);
            const normalizedSeparator = separator.includes(':') ? ': ' : separator.includes('=') ? '=' : ' ';
            const formattedCode = signedDecimalToErrorHex(dec);
            return `hResult${normalizedSeparator}${formattedCode}`;
        } catch {
            return match;
        }
    });

    result = result.replace(/(?<!\d)-(\d+)(?![\d.])/g, (match) => {
        try {
            const dec = parseInt(match, 10);
            return signedDecimalToErrorHex(dec);
        } catch {
            return match;
        }
    });

    return result;
}

export const NOISE_ERROR_CODE = "0x80070002";

export function signedDecimalToErrorHex(dec: number): string {
    return `0x${unsignedHexFromSignedDecimal(dec)}`;
}

export function errorHexToSignedDecimal(hexValue: string): number | undefined {
    const trimmed = hexValue.trim();
    if (!trimmed) {
        return undefined;
    }

    const match = trimmed.match(/^0x([0-9A-Fa-f]+)$/i);
    if (!match) {
        return undefined;
    }

    const unsigned = parseInt(match[1], 16);
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
