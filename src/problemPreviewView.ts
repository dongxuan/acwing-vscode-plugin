import { commands, ConfigurationChangeEvent, Disposable, ViewColumn, WebviewPanel, window, workspace, Uri } from "vscode";
import * as path from "path";
import { acwingManager } from "./repo/acwingManager";
import { ProblemContent } from "./repo/ProblemContent";


class ProblemPreviewView implements Disposable {

    private problemID: string = "";
    private problemContent: ProblemContent | undefined;
    private sideMode: boolean = false;
    protected panel: WebviewPanel | undefined;
    private listeners: Disposable[] = [];
    private extensionPath: string = "";

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }

    protected async showWebviewInternal(): Promise<void> {
        const title = 'Title'; 
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

    protected onDidDisposeWebview(): void {
        this.panel = undefined;
        for (const listener of this.listeners) {
            listener.dispose();
        }
        this.listeners = [];
        this.sideMode = false;
    }

    protected async onDidChangeConfiguration(event: ConfigurationChangeEvent): Promise<void> {
        if (this.panel && event.affectsConfiguration("markdown")) {
            this.panel.webview.html = await this.getWebviewContent();
        }
    }

    public isSideMode(): boolean {
        return this.sideMode;
    }

    public show(problemID: string, isSideMode: boolean, extensionPath: string): void {
        this.problemID = problemID;
        this.sideMode = isSideMode;
        this.extensionPath = extensionPath;
        this.showWebviewInternal();
    }


    private async getWebviewContent(): Promise<string> {
        this.problemContent = await acwingManager.getProblemContentById(this.problemID);
        if (!this.problemContent) {
            // 渲染失败页面
            return this.getWebviewFailedContent();
        }

        // Get path to resource on disk
        const onDiskPath = Uri.file(
            path.join(this.extensionPath, 'media', 'ac.css')
        );

        // And get the special URI to use with the webview
        const cssfile = this.panel?.webview.asWebviewUri(onDiskPath);

        const button: { element: string, script: string, style: string } = {
            element: `<button id="solve">Code Now</button>`,
            script: `const button = document.getElementById('solve');
                    button.onclick = () => vscode.postMessage({
                        command: 'ShowProblem',
                    });`,
            style: `<style>
                #solve {
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    border: 0;
                    margin: 1rem 0;
                    padding: 0.2rem 1rem;
                    color: white;
                    background-color: var(--vscode-button-background);
                }
                #solve:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                #solve:active {
                    border: 0;
                }
                </style>`,
        };

        const head: string = `<h2>${this.problemContent.name}</h2>`;
        // const info: string = markdownEngine.render([
        //     `| Category | Difficulty | Likes | Dislikes |`,
        //     `| :------: | :--------: | :---: | :------: |`,
        //     `| ${category} | ${difficulty} | ${likes} | ${dislikes} |`,
        // ].join("\n"));

        // const tags: string = [
        //     `<details>`,
        //     `<summary><strong>Tags</strong></summary>`,
        //     markdownEngine.render(
        //         this.description.tags
        //             .map((t: string) => `[\`${t}\`](https://leetcode.com/tag/${t})`)
        //             .join(" | "),
        //     ),
        //     `</details>`,
        // ].join("\n");

        // const companies: string = [
        //     `<details>`,
        //     `<summary><strong>Companies</strong></summary>`,
        //     markdownEngine.render(
        //         this.description.companies
        //             .map((c: string) => `\`${c}\``)
        //             .join(" | "),
        //     ),
        //     `</details>`,
        // ].join("\n");

        // const links: string = markdownEngine.render(`[Discussion](${this.getDiscussionLink(url)}) | [Solution](${this.getSolutionLink(url)})`);
        
        const body: string = this.problemContent.contentHtml;
        this.panel?.webview.cspSource
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="Content-Security-Policy"
                content = "default-src https://cdn.acwing.com 'unsafe-inline' 'none' ; 
                img-src ${ this.panel?.webview.cspSource } https:; 
                script-src ${ this.panel?.webview.cspSource } https://cdn.acwing.com 'unsafe-inline'; 
                style-src ${ this.panel?.webview.cspSource } https://cdn.acwing.com 'unsafe-inline';"/>
                ${!this.sideMode ? button.style : ""}
                <title>${ this.problemContent.name }</title>
                <link rel="stylesheet" href="${cssfile}">
            </head>
            <body>
                ${head}
                ${body}
                <hr />
                ${!this.sideMode ? button.element : ""}
                <script>
                    const vscode = acquireVsCodeApi();
                    ${!this.sideMode ? button.script : ""}
                </script>
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
            </body>
            </html>
        `;
        return "";
    }

    private getWebviewFailedContent () : string {
        return "failed."
    }

    protected async onDidReceiveMessage(message: IWebViewMessage): Promise<void> {
        switch (message.command) {
            case "ShowProblem": {
                await commands.executeCommand("leetcode.showProblem", this.problemID);
                break;
            }
        }
    }

    // private async hideSideBar(): Promise<void> {
    //     await commands.executeCommand("workbench.action.focusSideBar");
    //     await commands.executeCommand("workbench.action.toggleSidebarVisibility");
    // }

    private parseDescription(descString: string, problemID: string): IDescription | null {
        // const [
        //     /* title */, ,
        //     url, ,
        //     /* tags */, ,
        //     /* langs */, ,
        //     category,
        //     difficulty,
        //     likes,
        //     dislikes,
        //     /* accepted */,
        //     /* submissions */,
        //     /* testcase */, ,
        //     ...body
        // ] = descString.split("\n");
        // return {
        //     title: problem.name,
        //     url,
        //     tags: problem.tags,
        //     companies: problem.companies,
        //     category: category.slice(2),
        //     difficulty: difficulty.slice(2),
        //     likes: likes.split(": ")[1].trim(),
        //     dislikes: dislikes.split(": ")[1].trim(),
        //     body: body.join("\n").replace(/<pre>[\r\n]*([^]+?)[\r\n]*<\/pre>/g, "<pre><code>$1</code></pre>"),
        // };
        return null;
    }

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

interface IDescription {
    title: string;
    url: string;
    tags: string[];
    companies: string[];
    category: string;
    difficulty: string;
    likes: string;
    dislikes: string;
    body: string;
}

interface IWebViewMessage {
    command: string;
}

export const problemPreviewView: ProblemPreviewView = new ProblemPreviewView();
