/**
 * Format an error line content by converting hResult patterns and negative error codes to hex values.
 * @param content - The content to format.
 * @returns The formatted content.
 * @example
 * formatErrorLineContent("hResult=2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("hResult: -2147500037") // "hResult: 0x80004005 (-2147500037)"
 * formatErrorLineContent("-2147024894 DPFPTokenIsEnrolled failed") // "0x80070002 (-2147024894) DPFPTokenIsEnrolled failed"
 * formatErrorLineContent("m_cpWrappedProvider->Advise -2147467263") // "m_cpWrappedProvider->Advise 0x80004001 (-2147467263)"
 */
export function formatErrorLineContent(content: string): string {

    // Try to find hResult pattern (e.g. hResult=2147500037, hResult: 2147500037, hResult 2147500037) and convert to hex
    // -2147500037 -> 0x80004005 (E_FAIL)
    // '-2147024894 ' -> 0x80070002 (E_FILE_NOT_FOUND) // Windows cannot find a specified file
    let result = content.replace(/hResult([:=\s]+)(-?\d+)/g, (match, separator, decimalString) => {
        try {
            const dec = parseInt(decimalString, 10);
            const normalizedSeparator = separator.includes(':') ? ': ' : separator.includes('=') ? '=' : ' ';
            const formattedCode = dec < 0 ? formatNegativeErrorCode(dec) : `0x${unsignedHexFromSignedDecimal(dec)}`;
            return `hResult${normalizedSeparator}${formattedCode}`;
        } catch {
            return match;
        }
    });

    result = result.replace(/(?<![\d(])-(\d+)(?![\d.])/g, (match) => {
        try {
            const dec = parseInt(match, 10);
            return formatNegativeErrorCode(dec);
        } catch {
            return match;
        }
    });

    return result;
}

export const NOISE_ERROR_CODE = "0x80070002";

function formatNegativeErrorCode(dec: number): string {
    const hex = unsignedHexFromSignedDecimal(dec);
    return `0x${hex} (${dec})`;
}

function unsignedHexFromSignedDecimal(dec: number): string {
    return (dec >>> 0).toString(16).toUpperCase();
}

/*
TODO: collect all error codes and add to a map, so we can use it to format the error line content.
when all files loaded, we can collect all error codes and add to a map, so we can use it to format the error line content.
*/
