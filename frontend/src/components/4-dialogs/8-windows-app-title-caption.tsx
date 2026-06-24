import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { WindowSetTitle } from "../../../wailsjs/runtime/runtime";
import { appMainTitle, defaultTitle } from "@/store/3-ui-app-title";
import { isBackendAvailable } from "@/wails/is-wails";

export function WindowsAppTitleCaption() {
    const { title } = useSnapshot(appMainTitle);

    useEffect(
        () => {
            const nextTitle = title || defaultTitle;
            document.title = nextTitle;

            if (isBackendAvailable()) {
                WindowSetTitle(nextTitle);
            }
        },
        [title]
    );

    return null;
}
