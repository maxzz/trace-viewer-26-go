/**
 * Format an error line content by converting hResult patterns to hex values.
 * @param content - The content to format.
 * @returns The formatted content.
 * @example
 * formatErrorLineContent("hResult=2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("hResult: 2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("hResult 2147500037") // "hResult 0x80004005"
 * formatErrorLineContent("hResult: -2147500037") // "hResult: 0x80004005"
 * formatErrorLineContent("-2147024894 ") // "0x80070002"
 */
export function formatErrorLineContent(content: string): string {

    // Try to find hResult pattern (e.g. hResult=2147500037, hResult: 2147500037, hResult 2147500037) and convert to hex
    // -2147500037 -> 0x80004005 (E_FAIL)
    // '-2147024894 ' -> 0x80070002 (E_FILE_NOT_FOUND) // Windows cannot find a specified file
    let result = content.replace(/hResult([:=\s]+)(-?\d+)/g, (match, separator, p1) => {
        try {
            const dec = parseInt(p1, 10);
            // Handle signed integer to unsigned hex conversion
            const hex = (dec >>> 0).toString(16).toUpperCase();
            // Preserve the separator (:, =, or space) in the output, normalize whitespace to single space
            const normalizedSeparator = separator.includes(':') ? ': ' : separator.includes('=') ? '=' : ' ';
            return `hResult${normalizedSeparator}0x${hex}`;
        } catch {
            return match;
        }
    });

    // If no hResult pattern was found, check if the line contains only a single integer
    if (result === content) {
        // Check if the entire line is just a single integer (possibly with leading/trailing whitespace)
        const singleIntMatch = content.match(/^\s*(-?\d+)\s*$/);
        if (singleIntMatch) {
            try {
                const errorCode = decimalToErrorCode(singleIntMatch[1]);
                return errorCode === NOISE_ERROR_CODE ? NOISE_ERROR_CODE : errorCode;
            } catch {
                // If conversion fails, return original
            }
        }
    }

    return result;
}

export const NOISE_ERROR_CODE = "0x80070002";

function decimalToErrorCode(decimalString: string): string {
    const dec = parseInt(decimalString, 10);
    const hex = (dec >>> 0).toString(16).toUpperCase();
    return `0x${hex}`;
}

// -2147024894 DPFPTokenIsEnrolled failed
// -2147024893 DpAgent64::InstallFirefoxCertificate::
// -2147467263 m_cpWrappedProvider->Advise
// -2147023673 httpcall[com]
// -2147023673 hr
// 0x80004003

/*
TODO: collect all error codes and add to a map, so we can use it to format the error line content.
when all files loaded, we can collect all error codes and add to a map, so we can use it to format the error line content.
*/