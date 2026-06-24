type BackendApp = {
    Greet: (name: string) => Promise<string>;
    ReadPaths: (paths: string[]) => Promise<unknown>;
    LookupErrorMessage: (code: string) => Promise<string>;
    SetDevToolsState: (open: boolean) => Promise<void>;
    ToggleDevTools: () => Promise<void>;
};

type WailsWindow = Window & {
    go?: {
        backend?: {
            App?: BackendApp;
        };
    };
    runtime?: unknown;
};

/**
 * Returns true when the frontend runs inside the Wails Go desktop application
 * with backend bindings available. Returns false in a standalone browser.
 */
export function isBackendAvailable(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    return Boolean((window as WailsWindow).go?.backend?.App);
}

export function getBackendApp(): BackendApp | undefined {
    if (!isBackendAvailable()) {
        return undefined;
    }

    return (window as WailsWindow).go!.backend!.App!;
}
