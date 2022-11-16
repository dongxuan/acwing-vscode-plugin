// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

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
        // 放在在前面
        codeLensLine = 5;
        const range: vscode.Range = new vscode.Range(codeLensLine, 0, codeLensLine, 0);
        const codeLens: vscode.CodeLens[] = [];

        codeLens.push(new vscode.CodeLens(range, {
            title: "题目预览",
            command: "acWing.previewProblem",
            arguments: [problemID],
        }));

        codeLens.push(new vscode.CodeLens(range, {
            title: "题目解答",
            command: "acWing.showSolution",
            arguments: [problemID],
        }));

        codeLens.push(new vscode.CodeLens(range, {
            title: "调试代码",
            command: "acWing.testSolution",
            arguments: [problemID, document.uri, lang],
        }));
        
        codeLens.push(new vscode.CodeLens(range, {
            title: "提交答案",
            command: "acWing.submitSolution",
            arguments: [problemID, document.uri, lang],
        }));

        return codeLens;
    }
}

export const customCodeLensProvider: CustomCodeLensProvider = new CustomCodeLensProvider();
