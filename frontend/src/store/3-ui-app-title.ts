import { proxy } from 'valtio';
import { isBackendAvailable } from '@/wails/is-wails';

export const defaultTitle = 'Trace Viewer';

export const appMainTitle = proxy<{ title: string; }>({
    title: defaultTitle,
});

export function resetAppTitle() {
    appMainTitle.title = defaultTitle;
}

export function setAppTitle(files: File[], droppedFolderName?: string, filePaths?: string[]) {
    const source = resolveAppTitleSource(files, droppedFolderName, filePaths);
    appMainTitle.title = formatAppTitle(source);
}

type AppTitleSource =
    | { kind: 'name'; name: string; }
    | { kind: 'location'; directoryPath: string; };

function resolveAppTitleSource(
    files: File[],
    droppedFolderName?: string,
    filePaths?: string[]
): AppTitleSource | null {
    if (files.length === 0) {
        return null;
    }

    if (droppedFolderName) {
        return { kind: 'name', name: droppedFolderName };
    }

    const folderNameFromRelativePaths = getFolderNameFromRelativePaths(files);
    if (folderNameFromRelativePaths) {
        return { kind: 'name', name: folderNameFromRelativePaths };
    }

    const normalizedFilePaths = filePaths?.filter(Boolean) ?? [];
    if (normalizedFilePaths.length === 1) {
        return { kind: 'name', name: getBaseName(normalizedFilePaths[0]) };
    }

    if (files.length === 1) {
        return { kind: 'name', name: files[0].name };
    }

    const directoryPath = getLocationDirectoryPath(normalizedFilePaths, files);
    if (directoryPath) {
        return { kind: 'location', directoryPath };
    }

    if (files.length > 1) {
        return { kind: 'name', name: `${files.length} files` };
    }

    return null;
}

function formatAppTitle(source: AppTitleSource | null): string {
    if (!source) {
        return defaultTitle;
    }

    const titleShort = getDefaultTitleShort();

    if (source.kind === 'name') {
        return `${titleShort} - ${source.name}`;
    }

    return `${titleShort} - ${source.directoryPath}/*`;
}

function getDefaultTitleShort(): string {
    return isBackendAvailable() ? 'TV' : 'TVweb';
}

function getFolderNameFromRelativePaths(files: File[]): string | null {
    const relativePaths = files
        .map((file) => file.webkitRelativePath)
        .filter((path) => path.length > 0);

    if (relativePaths.length !== files.length || relativePaths.length === 0) {
        return null;
    }

    const folderName = relativePaths[0].split('/')[0];
    if (!folderName) {
        return null;
    }

    const folderPrefix = `${folderName}/`;
    if (!relativePaths.every((path) => path === folderName || path.startsWith(folderPrefix))) {
        return null;
    }

    return folderName;
}

function getLocationDirectoryPath(filePaths: string[], files: File[]): string {
    if (filePaths.length > 1) {
        return getCommonDirectoryPath(filePaths);
    }

    const relativePaths = files
        .map((file) => file.webkitRelativePath)
        .filter((path) => path.length > 0);

    if (relativePaths.length > 1) {
        return getCommonDirectoryPath(relativePaths);
    }

    return '';
}

function getCommonDirectoryPath(filePaths: string[]): string {
    if (filePaths.length === 0) {
        return '';
    }

    const directoryPaths = filePaths.map(getDirectoryPath);
    if (directoryPaths.length === 1) {
        return directoryPaths[0];
    }

    const usesBackslash = directoryPaths.some((path) => path.includes('\\'));
    const splitPaths = directoryPaths.map(splitPathParts);
    const commonParts: string[] = [];
    const referencePath = splitPaths[0];

    for (let index = 0; index < referencePath.length; index++) {
        const part = referencePath[index];
        if (splitPaths.every((segments) => segments.length > index && segments[index] === part)) {
            commonParts.push(part);
        } else {
            break;
        }
    }

    return joinPathParts(commonParts, usesBackslash);
}

function getDirectoryPath(filePath: string): string {
    const usesBackslash = filePath.includes('\\');
    const normalized = filePath.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');

    if (lastSlash < 0) {
        return '';
    }

    const directoryPath = normalized.slice(0, lastSlash);
    return usesBackslash ? directoryPath.replace(/\//g, '\\') : directoryPath;
}

function getBaseName(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash < 0 ? filePath : normalized.slice(lastSlash + 1);
}

function splitPathParts(path: string): string[] {
    return path.replace(/\\/g, '/').split('/').filter((part) => part.length > 0);
}

function joinPathParts(parts: string[], usesBackslash: boolean): string {
    if (parts.length === 0) {
        return '';
    }

    const joined = parts.join('/');
    if (!usesBackslash) {
        return joined;
    }

    if (/^[A-Za-z]:/.test(joined)) {
        const drive = joined.slice(0, 2);
        const rest = joined.slice(3).replace(/\//g, '\\');
        return rest ? `${drive}\\${rest}` : `${drive}\\`;
    }

    return joined.replace(/\//g, '\\');
}
