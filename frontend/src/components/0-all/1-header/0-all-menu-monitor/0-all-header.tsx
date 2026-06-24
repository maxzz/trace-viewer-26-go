import { TopMenu } from "./1-all-menu";
import { FileReloadControls } from "./2-reload-controls";
import { HistoryButtons } from "../2-right-toolbar/1-btn-nav-history";
import { ErrorsNavControls } from "../2-right-toolbar/2-btn-nav-errors";
import { ToggleErrorsOnly, ToggleErrorsWithoutNoise, ToggleThreadOnly } from "../2-right-toolbar/3-top-menu-toggles";
import { FileFilterDropdown } from "../2-right-toolbar/4-btn-files-filter-as-select";
import { LoadingProgress } from "./3-loading-progress";
import { ButtonHighlightToggle } from "../2-right-toolbar/5-btn-highlight-toggle";
import { ButtonThemeToggle } from "../2-right-toolbar/8-btn-theme-toggle";

export function HeaderRow() {
    return (
        <div className="bg-background items-center justify-between flex">

            <div className="flex-1 px-2 items-center gap-4 flex">
                <TopMenu />
                <FileReloadControls />
                <LoadingProgress />
            </div>

            <div className="flex-1 px-2 gap-2 items-center justify-between flex">
                <div className="px-2 gap-2 items-center flex">
                    <HistoryButtons />
                    <ErrorsNavControls />
                    <ToggleErrorsOnly />
                    <ToggleErrorsWithoutNoise />
                    <ToggleThreadOnly />
                    <FileFilterDropdown />
                    <ButtonHighlightToggle />
                    <ButtonThemeToggle />
                </div>
            </div>

        </div>
    );
}
