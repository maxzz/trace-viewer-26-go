export function pathFileDataToUint8Array(data: unknown): Uint8Array {
    if (data instanceof Uint8Array) {
        return data;
    }

    if (Array.isArray(data)) {
        return new Uint8Array(data);
    }

    if (typeof data === "string") {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }

    throw new Error("Unexpected file data format from backend.");
}
