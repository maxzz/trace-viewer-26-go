export function isWailsRuntime(): boolean {
    return typeof window !== "undefined" && "runtime" in window;
}
