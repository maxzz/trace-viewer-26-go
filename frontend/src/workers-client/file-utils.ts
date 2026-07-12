export function isTrc3File(file: File): boolean {
    return file.name.toLowerCase().endsWith('.trc3');
}

export type FileWithDiskPath = File & {
    diskPath?: string;
};

export function getFileDiskPath(file: File): string | undefined {
    return (file as FileWithDiskPath).diskPath;
}

export function setFileDiskPath(file: File, diskPath: string): FileWithDiskPath {
    const fileWithDiskPath = file as FileWithDiskPath;
    fileWithDiskPath.diskPath = diskPath;
    return fileWithDiskPath;
}

export function isZipFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';
}

// Windows shortcut ("Link File"). Detected on the web side so the drop can be
// redirected to the Go backend, which resolves the shortcut target.
export function isLinkFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.lnk');
}

function isTrc3Name(name: string): boolean {
    return name.endsWith('.trc3');
}

function isZipName(file: File, name: string): boolean {
    return name.endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';
}

export function isOurFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return isTrc3Name(name) || isZipName(file, name);
}
