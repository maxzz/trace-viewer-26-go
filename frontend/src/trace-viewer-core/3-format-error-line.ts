/**
 * Format an error line content by converting hResult patterns to hex values.
 * @param content - The content to format.
 * @returns The formatted content.
 * @example
 * formatErrorLineContent("hResult=2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("hResult: 2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("hResult 2147500037") // "hResult 0x80004005"
 * formatErrorLineContent("hResult: -2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("-2147024894 ") // "0x80070002 (-2147024894)"
 * formatErrorLineContent("-2147024894 DPFPTokenIsEnrolled failed") // "0x80070002 (-2147024894): DPFPTokenIsEnrolled failed"
 * formatErrorLineContent("0x80004003") // "0x80004003 (-2147467261)"
 */
export function formatErrorLineContent(content: string): string {

    // Try to find hResult pattern (e.g. hResult=2147500037, hResult: 2147500037, hResult 2147500037) and convert to hex
    // -2147500037 -> 0x80004005 (E_FAIL)
    // '-2147024894 ' -> 0x80070002 (E_FILE_NOT_FOUND) // Windows cannot find a specified file
    let result = content.replace(/hResult([:=\s]+)(-?\d+)/g, (match, separator, p1) => {
        try {
            const dec = parseInt(p1, 10);
            // Handle signed integer to unsigned hex conversion
            const hex = unsignedHexFromSignedDecimal(dec);
            // Preserve the separator (:, =, or space) in the output, normalize whitespace to single space
            const normalizedSeparator = separator.includes(':') ? ': ' : separator.includes('=') ? '=' : ' ';
            return `hResult${normalizedSeparator}0x${hex}`;
        } catch {
            return match;
        }
    });

    if (result === content) {
        const formatted = formatLeadingErrorCode(content);
        if (formatted !== undefined) {
            return formatted;
        }
    }

    return result;
}

export const NOISE_ERROR_CODE = "0x80070002";

function formatLeadingErrorCode(content: string): string | undefined {
    const hexMatch = content.match(/^\s*(0x[0-9A-Fa-f]+)\s*(.*)$/);
    if (hexMatch) {
        const hex = hexMatch[1].slice(2);
        const dec = signedDecimalFromHex(hexMatch[1]);
        return formatErrorCodeLine(hex, dec, hexMatch[2]);
    }

    const decMatch = content.match(/^\s*(-?\d+)\s*(.*)$/);
    if (decMatch) {
        const dec = parseInt(decMatch[1], 10);
        const hex = unsignedHexFromSignedDecimal(dec);
        return formatErrorCodeLine(hex, toSignedInt32(dec), decMatch[2]);
    }

    return undefined;
}

function formatErrorCodeLine(hex: string, dec: number, message: string): string {
    const errorCode = `0x${hex.toUpperCase()}`;
    const base = `${errorCode} (${dec})`;
    const trimmedMessage = message.trim();
    return trimmedMessage ? `${base}: ${trimmedMessage}` : base;
}

function unsignedHexFromSignedDecimal(dec: number): string {
    return (dec >>> 0).toString(16).toUpperCase();
}

function signedDecimalFromHex(hexValue: string): number {
    const unsigned = parseInt(hexValue, 16);
    return toSignedInt32(unsigned);
}

function toSignedInt32(value: number): number {
    return value | 0;
}

/*
TODO: collect all error codes and add to a map, so we can use it to format the error line content.
when all files loaded, we can collect all error codes and add to a map, so we can use it to format the error line content.
*/
