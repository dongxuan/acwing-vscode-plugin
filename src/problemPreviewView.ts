import * as vscode from 'vscode';
import { commands, ConfigurationChangeEvent, Disposable, ViewColumn, WebviewPanel, window, workspace, Uri } from "vscode";
import * as path from "path";
import * as fse from "fs-extra";
import { acwingManager } from "./repo/acwingManager";
import { Problem } from "./repo/Problem";
import { ProblemContent } from "./repo/ProblemContent";


class ProblemPreviewView implements Disposable {

    private problemID: string = "";
    private problem: Problem | undefined;
    private problemContent: ProblemContent | undefined;
    private sideMode: boolean = false;
    protected panel: WebviewPanel | undefined;
    private listeners: Disposable[] = [];
    private mContext: vscode.ExtensionContext | undefined;
    private extensionPath: string = "";

    public show(problemID: string, problem: Problem, isSideMode: boolean): void {
        this.problemID = problemID;
        this.problem = problem;
        this.sideMode = isSideMode;
        this.showWebviewInternal();
    }

    public isSideMode(): boolean {
        return this.sideMode;
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }

    public setContext(context: vscode.ExtensionContext) {
        this.mContext = context;
        this.extensionPath = this.mContext.extensionPath;
    }

    private async showWebviewInternal(): Promise<void> {
        console.log('showWebviewInternal()');
        
        let title = 'AcWing';
        if (this.problem) {
            title = `${this.problem.index}. ${this.problem.name}`;
        }

        const viewColumn = this.sideMode ? ViewColumn.Two: ViewColumn.One;
        const preserveFocus = this.sideMode;

        if (!this.panel) {
            this.panel = window.createWebviewPanel("acWing.webview", title, { viewColumn, preserveFocus }, {
                enableScripts: true,
                enableCommandUris: true,
                enableFindWidget: true,
                retainContextWhenHidden: true,
                localResourceRoots: [Uri.file(path.join(this.extensionPath, 'media'))]
            });
            this.panel.onDidDispose(this.onDidDisposeWebview, this, this.listeners);
            this.panel.webview.onDidReceiveMessage(this.onDidReceiveMessage, this, this.listeners);
            workspace.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this.listeners);
        } else {
            this.panel.title = title;
            if (viewColumn === ViewColumn.Two) {
                // Make sure second group exists. See vscode#71608 issue
                commands.executeCommand("workbench.action.focusSecondEditorGroup").then(() => {
                    this.panel!.reveal(viewColumn, preserveFocus);
                });
            } else {
                this.panel.reveal(viewColumn, preserveFocus);
            }
        }
        this.panel.webview.html = await this.getWebviewContent();
    }

    private onDidDisposeWebview(): void {
        this.panel = undefined;
        for (const listener of this.listeners) {
            listener.dispose();
        }
        this.listeners = [];
        this.sideMode = false;
    }

    private async onDidChangeConfiguration(event: ConfigurationChangeEvent): Promise<void> {
        if (this.panel && event.affectsConfiguration("markdown")) {
            this.panel.webview.html = await this.getWebviewContent();
        }
    }

    private async getWebviewContent(): Promise<string> {
        this.problemContent = await acwingManager.getProblemContentById(this.problemID);
        if (!this.problemContent) {
            return this.getWebviewFailedContent();
        }

        const html = this.getHtmlTheme();
        const head = this.getHtmlHead();
        const titlte = `<div class="Subhead"><h2 class="Subhead-heading">${this.problemContent.name}</h2></div>`;
        const links = this.getHtmlLinkArea(); 
        const table = this.getHtmlTable();
        const tags = this.getHtmlTags();  
        const body: string = this.problemContent.contentHtml;
        const script = this.getHtmlScript();

        return `
            <!DOCTYPE html>
            ${html}
            <head>${head}</head>
            <body style="padding-bottom: 100px;">
                ${titlte}
                ${links}
                ${table}
                ${tags}
                ${body}
                ${script}   
            </body>
            </html>
        `;
        return "";
    }

    private getResWebUri(resName: string) {
        const onDiskPath = Uri.file(
            path.join(this.extensionPath, 'media', resName)
        );
        // And get the special URI to use with the webview
        return this.panel?.webview.asWebviewUri(onDiskPath);
    }

    private getHtmlTheme() {
        // Light	data-color-mode="light" data-light-theme="light"
        // Dark	data-color-mode="dark" data-dark-theme="dark"
        // Dark Dimmed	data-color-mode="dark" data-dark-theme="dark_dimmed"
        // Dark High Contrast	data-color-mode="dark" data-dark-theme="dark_high_contrast"
        let nowKind = vscode.window.activeColorTheme.kind;
        if (nowKind == vscode.ColorThemeKind.Dark) {
            return `<html data-color-mode="dark" data-dark-theme="dark_dimmed">`;
        } else if (nowKind == vscode.ColorThemeKind.HighContrast) {
            return `<html data-color-mode="dark" data-dark-theme="dark_dimmed">`; 
        } else {
            return `<html data-color-mode="light" data-dark-theme="light">`;
        }
    }

    private getHtmlHead() {
        let html = `
            <meta http-equiv="Content-Security-Policy"
                content = "default-src https://cdn.acwing.com 'unsafe-inline' 'none' ; 
                img-src ${ this.panel?.webview.cspSource } https://cdn.acwing.com  https:; 
                script-src ${ this.panel?.webview.cspSource } https://cdn.acwing.com 'unsafe-inline';
                style-src ${ this.panel?.webview.cspSource } https://cdn.acwing.com 'unsafe-inline';"
            />
            <link rel="stylesheet" href="${this.getResWebUri('acwing.css')}">
            <link rel="stylesheet" href="${this.getResWebUri('primer.css')}">
        `
        return html;
    }

    // 获取HTML的跳转区域
    private getHtmlLinkArea ():string {
        let html = "<div>";
        const data = [
            { title : '原题链接', url: this.getSourceLink() },
            { title : '题目讨论', url: this.getDiscussionLink() },
            { title : '题解答案', url: this.getSolutionLink() },
            { title : '视频讲解', url: this.getSolutionVideoLink() },
        ]

        for (let item of data) {
            html += `
            <a href="${item.url}" class="link-mktg arrow-target-mktg text-semibold f4-mktg">
            ${item.title}
            <svg xmlns="http://www.w3.org/2000/svg" class="octicon arrow-symbol-mktg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path fill="currentColor" d="M7.28033 3.21967C6.98744 2.92678 6.51256 2.92678 6.21967 3.21967C5.92678 3.51256 5.92678 3.98744 6.21967 4.28033L7.28033 3.21967ZM11 8L11.5303 8.53033C11.8232 8.23744 11.8232 7.76256 11.5303 7.46967L11 8ZM6.21967 11.7197C5.92678 12.0126 5.92678 12.4874 6.21967 12.7803C6.51256 13.0732 6.98744 13.0732 7.28033 12.7803L6.21967 11.7197ZM6.21967 4.28033L10.4697 8.53033L11.5303 7.46967L7.28033 3.21967L6.21967 4.28033ZM10.4697 7.46967L6.21967 11.7197L7.28033 12.7803L11.5303 8.53033L10.4697 7.46967Z"></path>
                <path stroke="currentColor" d="M1.75 8H11" stroke-width="1.5" stroke-linecap="round"></path>
            </svg>
            </a>
            `
        }
        html += '</div>';
        return html;
    }

    // 算法标签
    private getHtmlTags () {
        let tags = this.problemContent?.tags;
        if (!tags || tags.length == 0) return '';

        let html = `<details class="details-reset mt-3" style="margin-bottom: 18px;">
                    <summary class="btn-link f4-mktg">
                        算法标签<span class="dropdown-caret">
                    </summary>
                    <div style="margin-top: 8px;">`;
        for (let item of tags) {
            html += `<span class="Label mr-1 Label--accent">${item}</span>`;
        }

        html += '</div></details>';
        return html;
    }

    // 获取table HTML
    private getHtmlTable () {
        let html = `<div class="markdown-body" style="margin-top: 12px; margin-bottom: 12px;">
        <table><thead><tr>
        <th>难度</th>
        <th>时/空限制</th>
        <th>总通过数</th>
        <th>总尝试数</th>
        <th>来源</th>
        </tr>
        </thead><tbody><tr>
        `;

        const bg = {
            '简单': 'color-bg-success-emphasis',
            '中等': 'color-bg-attention-emphasis',
            '困难': 'color-bg-danger-emphasis',
        }
        
        html += `<td>
            <span class="IssueLabel IssueLabel--big color-fg-on-emphasis mr-1 
                ${bg[this.problemContent?.difficulty || '简单']}">
                ${this.problemContent?.difficulty}
            </span></td>`
        html += `<td>${this.problemContent?.limit}</td>`;
        html += `<td>${this.problemContent?.accepted}</td>`;
        html += `<td>${this.problemContent?.submissions}</td>`;
        html += `<td>${this.problemContent?.source}</td>`;
        html += '</tr></tbody></table></div>';
        return html;
    }

    private getHtmlScript() {
        let html = `
            <button id="solve">Code Now</button>                
            <script type="text/javascript" src="https://cdn.acwing.com/static/MathJax-2.6-latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"></script>
            <script type="text/x-mathjax-config;executed=true">
                MathJax.Hub.Config({
                    tex2jax: {inlineMath: [['$','$'], ['\\(','\\)']]},
                    showMathMenu: false,
                });
            </script>
            <script>
                console.log("MathJax.Hub.Config");
                MathJax.Hub.Config({
                    tex2jax: {inlineMath: [['$','$'], ['\\(','\\)']]},
                    showMathMenu: false,
                });
                //MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
            </script>
            <script>
                const vscode = acquireVsCodeApi();
                const button = document.getElementById('solve');
                button.onclick = () => vscode.postMessage({
                    command: 'editProblem',
                });
            </script> 
        `
        return html;
    }

    private getWebviewFailedContent () : string {
        let html = `
        ${this.getHtmlTheme()}
            <head>
                ${this.getHtmlHead()}
            </head>
            <body> 
                <div class="blankslate">
                    <h3 class="blankslate-heading">似乎有些问题</h3>
                    
                    <p>加载失败，请重新刷新页面</p>
                    
                    <div id="reload" class="blankslate-action">
                        <button class="btn btn-primary" type="button">刷新页面</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const button = document.getElementById('reload');
                    button.onclick = () => vscode.postMessage({
                        command: 'reloadProblem',
                    });
                </script>
            </body>
        </html>
        
        
        `
        return html;
    }

    private async onDidReceiveMessage(message: IWebViewMessage): Promise<void> {
        switch (message.command) {
            case "editProblem": {
                await commands.executeCommand("editProblem", this.problemID);
                break;    
            }
            case "reloadProblem": {
                console.log('reloadProblem()');
                await this.showWebviewInternal();
                break;
            }
        }
    }

    // private async hideSideBar(): Promise<void> {
    //     await commands.executeCommand("workbench.action.focusSideBar");
    //     await commands.executeCommand("workbench.action.toggleSidebarVisibility");
    // }



    // 原题链接
    private getSourceLink(): string {
        return `https://www.acwing.com/problem/${this.problemID}`;
    }

    // 提交记录的链接
    private getSubmitLink(): string {
        return `https://www.acwing.com/problem/content/submission/${this.problemID}`;
    }

    // 讨论地址
    private getDiscussionLink(): string {
        return `https://www.acwing.com/problem/content/discussion/index/${this.problemID}/1/`;
    }

    // 题解地址
    private getSolutionLink(): string {
        return `https://www.acwing.com/problem/content/discussion/index/${this.problemID}/1/`;
    }

    // 视频地址
    private getSolutionVideoLink(): string {
        return `https://www.acwing.com/problem/content/video/${this.problemID}/`;
    }
}


interface IWebViewMessage {
    command: string;
}

export const problemPreviewView: ProblemPreviewView = new ProblemPreviewView();
