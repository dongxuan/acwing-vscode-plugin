import { URLSearchParams } from "url";
import { FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri, workspace, WorkspaceConfiguration } from "vscode";

export class AcWingTreeItemDecorationProvider implements FileDecorationProvider {
    private readonly DIFFICULTY_BADGE_LABEL: { [key: string]: string } = {
        '简单': "简单",
        '中等': "中等",
        '困难': "困难",
    };

    private readonly ITEM_COLOR: { [key: string]: ThemeColor } = {
        '简单': new ThemeColor("charts.green"),
        '中等': new ThemeColor("charts.yellow"),
        '困难': new ThemeColor("charts.red"),
    };

    public provideFileDecoration(uri: Uri): ProviderResult<FileDecoration>  {
        if (uri.scheme !== "acwing" && uri.authority !== "problems") {
            return;
        }
        const configuration: WorkspaceConfiguration = workspace.getConfiguration();
        if (!configuration.get<boolean>("acWing.colorizeProblems", false)) {
            return;
        }
        const params: URLSearchParams = new URLSearchParams(uri.query);
        const difficulty: string = params.get("difficulty")!.toLowerCase();
        return {
            badge: this.DIFFICULTY_BADGE_LABEL[difficulty],
            color: this.ITEM_COLOR[difficulty],
        };
    }
}

export const acWingTreeItemDecorationProvider: AcWingTreeItemDecorationProvider = new AcWingTreeItemDecorationProvider();
