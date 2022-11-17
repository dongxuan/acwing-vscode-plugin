/*
 * @Author: richard 
 * @Date: 2022-11-17 14:56:34 
 * @Last Modified by:   richard 
 * @Last Modified time: 2022-11-17 14:56:34 
 */
import * as vscode from "vscode";

export class CustomCodeLensProvider implements vscode.CodeLensProvider {

    private onDidChangeCodeLensesEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    get onDidChangeCodeLenses(): vscode.Event<void> {
        return this.onDidChangeCodeLensesEmitter.event;
    }

    public refresh(): void {
        this.onDidChangeCodeLensesEmitter.fire();
    }

    public provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
        const shortcuts: string[] = vscode.workspace.getConfiguration()
            .get<string[]>("acWing.editor.shortcuts", ["题目预览","题目解答","调试代码","提交答案"]);

        if (!shortcuts) {
            return;
        }

        const content: string = document.getText();
        const matchResult: RegExpMatchArray | null = content.match(/@acwing app=.* id=(.*) lang=(.*)/);
        if (!matchResult) {
            return undefined;
        }
        const problemID: string | undefined = matchResult[1];
        const lang = matchResult[2];
   
        let codeLensLine: number = document.lineCount - 1;
        for (let i: number = document.lineCount - 1; i >= 0; i--) {
            const lineContent: string = document.lineAt(i).text;
            if (lineContent.indexOf("@acwing code end") >= 0) {
                codeLensLine = i;
                break;
            }
        }

        const rangeStart: vscode.Range = new vscode.Range(5, 0, 5, 0);
        const rangeEnd: vscode.Range = new vscode.Range(codeLensLine, 0, codeLensLine, 0);
        const codeLens: vscode.CodeLens[] = [];

        if (shortcuts.indexOf("题目预览") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeStart, {
                title: "题目预览",
                command: "acWing.previewProblem",
                arguments: [problemID],
            }));
        }

        if (shortcuts.indexOf("题目解答") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeStart, {
                title: "题目解答",
                command: "acWing.showSolution",
                arguments: [problemID],
            }));
        }

        if (shortcuts.indexOf("调试代码") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeStart, {
                title: "调试代码",
                command: "acWing.runSolution",
                arguments: [problemID, document.uri, lang],
            }));
        }

        if (shortcuts.indexOf("提交答案") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeStart, {
                title: "提交答案",
                command: "acWing.submitSolution",
                arguments: [problemID, document.uri, lang],
            }));
        }

        if (shortcuts.indexOf("原题链接") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeEnd, {
                title: "原题链接",
                command: "acWing.showSource",
                arguments: [problemID],
            }));
        }

        if (shortcuts.indexOf("提交记录") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeEnd, {
                title: "提交记录",
                command: "acWing.showSubmitRecord",
                arguments: [problemID],
            }));
        }

        if (shortcuts.indexOf("讨论组") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeEnd, {
                title: "讨论组",
                command: "acWing.showDiscussion",
                arguments: [problemID],
            }));
        }

        if (shortcuts.indexOf("视频解答") >= 0) {
            codeLens.push(new vscode.CodeLens(rangeEnd, {
                title: "视频解答",
                command: "acWing.showSolutionVideo",
                arguments: [problemID],
            }));
        }
        return codeLens;
    }
}

export const customCodeLensProvider: CustomCodeLensProvider = new CustomCodeLensProvider();
