import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelsPath = join(frontendDir, "wailsjs/go/models.ts");
const appDtsPath = join(frontendDir, "wailsjs/go/backend/App.d.ts");

function fixModelsTs(content) {
    if (!content.includes("export namespace backend")) {
        return content;
    }

    const match = content.match(/export namespace backend \{([\s\S]*)\}\s*$/);
    if (!match) {
        throw new Error("Could not parse Wails models.ts namespace wrapper.");
    }

    return match[1].trim() + "\n";
}

function fixAppDts(content) {
    return content
        .replace(
            /import \{backend\} from '\.\.\/models';/,
            "import { type ReadPathsResult } from '../models';"
        )
        .replace(
            /Promise<backend\.ReadPathsResult>/g,
            "Promise<ReadPathsResult>"
        );
}

const modelsContent = readFileSync(modelsPath, "utf8");
const nextModelsContent = fixModelsTs(modelsContent);
if (nextModelsContent !== modelsContent) {
    writeFileSync(modelsPath, nextModelsContent, "utf8");
    console.log("Patched wailsjs/go/models.ts for erasableSyntaxOnly.");
}

const appDtsContent = readFileSync(appDtsPath, "utf8");
const nextAppDtsContent = fixAppDts(appDtsContent);
if (nextAppDtsContent !== appDtsContent) {
    writeFileSync(appDtsPath, nextAppDtsContent, "utf8");
    console.log("Patched wailsjs/go/backend/App.d.ts for erasableSyntaxOnly.");
}
