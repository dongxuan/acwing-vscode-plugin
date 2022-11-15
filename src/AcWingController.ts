import * as fs from "fs";
import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import * as path from "path";
import * as fse from "fs-extra";

import { ConfigurationChangeEvent, Disposable, languages, workspace, FileSystemProvider, ExtensionContext } from "vscode";
import { customCodeLensProvider, CustomCodeLensProvider } from "./CustomCodeLensProvider";
import { acwingManager } from "./repo/acwingManager";
import { problemPreviewView } from './problemPreviewView';
import { ProblemTreeProvider } from './problemTreeView';
import { Problem } from "./repo/Problem";

export class AcWingController implements Disposable {
    static readonly ACWIGN_STATUS_NAMES = {"Uploading":"Uploading","Pending":"Pending","Judging":"Judging","Running":"Running","Too many tasks":"Too many tasks","Upload Failed":"Upload Failed","Input Limit Exceeded":"Input Limit Exceeded","COMPILE_ERROR":"Compile Error","WRONG_ANSWER":"Wrong Answer","TIME_LIMIT_EXCEEDED":"Time Limit Exceeded","MEMORY_LIMIT_EXCEEDED":"Memory Limit Exceeded","OUTPUT_LIMIT_EXCEEDED":"Output Limit Exceeded","RUNTIME_ERROR":"Runtime Error","SEGMENTATION_FAULT":"Segmentation Fault","PRESENTATION_ERROR":"Presentation Error","INTERNAL_ERROR":"Internal Error","FLOAT_POINT_EXCEPTION":"Float Point Exception","NON_ZERO_EXIT_CODE":"Non Zero Exit Code","ACCEPTED":"Accepted","FINISHED":"Finished"};
    static readonly ACWIGN_STATUS_COLORS = {"Uploading":"#9d9d9d","Pending":"#9d9d9d","Judging":"#337ab7","Running":"#337ab7","Too many tasks":"#d05451","Upload Failed":"#d05451","Input Limit Exceeded":"#d05451","Compile Error":"#d05451","Wrong Answer":"#d05451","Time Limit Exceeded":"#d05451","Memory Limit Exceeded":"#d05451","Output Limit Exceeded":"#d05451","Runtime Error":"#d05451","Segmentation Fault":"#d05451","Presentation Error":"#d05451","Internal Error":"#d05451","Float Point Exception":"#d05451","Non Zero Exit Code":"#d05451","Accepted":"#449d44","Finished":"#449d44"};
    
    private outputChannel : vscode.OutputChannel = vscode.window.createOutputChannel("AcWing");
    private mContext: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.mContext = context;
        problemPreviewView.setContext(this.mContext);
    }

    // 预览题目
    public previewProblem (problemID: string, problem: Problem) {
        console.log('AcWingController::previewProblem() ' + problemID);
        problemPreviewView.show(problemID, problem, false);
    }

    // 显示编辑器
    public async showProblem (problemID: string) {
        let problemContent = await acwingManager.getProblemContentById(problemID);

        if (!problemContent) {
            console.error('getProblemContentById() failed ' + problemID);
            return;
        }

        const language = 'cpp';
        const fileFolder: string = this.mContext.globalStorageUri.fsPath;
        const fileName: string = problemContent.name.trim() + '.cpp';
        let finalPath: string = path.join(fileFolder, fileName);

        if (!await fse.pathExists(finalPath)) {
            await fse.createFile(finalPath);

            let content: string = "";
            if (problemContent.codeTemplate) {
                content = problemContent.codeTemplate['C++'] || "";
            }

            // 写入标题
            const header = 
`/*
* @acwing app=acwing.cn id=${problemID} lang=${language}
*
* [${problemID}] ${problemContent.name}
*/

// @acwing code start

`;

            const end = `
// @acwing code end`;
            await fse.writeFile(finalPath, header + content + end);
        }
        vscode.window.showTextDocument(
            vscode.Uri.file(finalPath), 
            { preview: false, viewColumn: vscode.ViewColumn.One });
    }

    // 显示题解
    public showSolution (problemID: string) {
        console.log('AcWingController::showSolution() ' + problemID);
        const url = `https://www.acwing.com/problem/content/discussion/index/${problemID}/1/`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // 显示原题链接
    public showSource (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/${problemID}`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // 显示讨论组
    public showDiscussion (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/content/discussion/index/${problemID}/1/`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // 显示视频链接
    public showSolutionVideo (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/content/video/${problemID}/`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // 显示提交记录
    public showSubmitRecord (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/content/submission/${problemID}`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // 测试代码
    public async testSolution (problemID: string, uri: vscode.Uri) {
        console.log('AcWingController::testSolution()', problemID, uri);
        const data = await fs.readFileSync(uri.fsPath, "utf8");

        const that = this;
        let cb = (event: WebSocket.MessageEvent):void => {
            let ev = JSON.parse(event.data.toString());
    
            if (ev.activity === 'problem_run_code_status') {
                that.onRunCodeStatus(ev);
            } else if (ev.activity === 'problem_submit_code_status') {
                that.onSubmitCodeStatus(ev);
            }
        }

        acwingManager.addSocketEventListener(cb);
        this.outputChannel.show();
        acwingManager.runCode(problemID, data, '3 4', 'C++');
        // acwingManager.removeSocketEventListener(cb);
    }

    // 提交代码
    public async submitSolution (problemID: string, uri: vscode.Uri) {
        console.log('AcWingController::submitSolution()', problemID, uri);
        const data = await fs.readFileSync(uri.fsPath, "utf8");

        const that = this;
        let cb = (event: WebSocket.MessageEvent):void => {
            let ev = JSON.parse(event.data.toString());
    
            if (ev.activity === 'problem_run_code_status') {
                that.onRunCodeStatus(ev);
            } else if (ev.activity === 'problem_submit_code_status') {
                that.onSubmitCodeStatus(ev);
            }
        }

        acwingManager.addSocketEventListener(cb);
        this.outputChannel.show();
        acwingManager.submitCode(problemID, data, 'C++');
    }


    private onRunCodeStatus (data: object) : void {
        console.log('onRunCodeStatus', data);
        // 状态
        let status = data['status'];
        let statusName = AcWingController.ACWIGN_STATUS_NAMES[status];

        // 状态名字 code_status_names[status]
        // 状态颜色 code_status_colors[code_status_names[status]]

        // 错误信息
        let stderrResult = data['stderr'];
        // 输出结果
        let stdoutResult = '';
        if (status === 'COMPILE_ERROR'){
            stdoutResult = data['compilation_log'];
        } else if ((typeof stderrResult !== "undefined") && stderrResult.length > 0) {
            stdoutResult = stderrResult;
        } else{
            stdoutResult = data['stdout'];
        }
        
        let timeResult = "";
        if (data['time']){
            timeResult = "运行时间：" + data['time'] + "ms";
        }
    
        if (status !== 'Uploading' && status !== 'Pending' && status !== 'Running'){
            // output ...
            this.outputChannel.appendLine(`代码运行状态：${statusName}\n`);

            this.outputChannel.appendLine("输入");
            this.outputChannel.appendLine(""); // TODO暂时不知道怎么处理

            this.outputChannel.appendLine("输出");
            this.outputChannel.appendLine(stdoutResult);
            this.outputChannel.appendLine(timeResult);
        } else {
            // loading输出
            this.outputChannel.appendLine(statusName + "...");
        }
    }

    private onSubmitCodeStatus (data: object) : void {
        let status = data['status'];
        let stderr = data['stderr'];
        let testcase_input = data['testcase_input'];
        let testcase_output = data['testcase_output'];
        let testcase_user_output = data['testcase_user_output'];

        // 编译错误信息
        let compilationResult = "";
        if (status === 'COMPILE_ERROR'){
            compilationResult = data['compilation_log'];
        } else if ((typeof stderr !== "undefined") && stderr.length > 0)  {
            compilationResult = stderr;
        }

        let statusName = AcWingController.ACWIGN_STATUS_NAMES[status];

        if (status !== 'Uploading' && status !== 'Pending' && status !== 'Judging'){
            if (status === 'ACCEPTED') {
                this.outputChannel.appendLine(`代码提交状态：${statusName}\n`);
                return;
            }

            if (testcase_input.length > 0 && testcase_input[testcase_input.length - 1] === '\n') {
                testcase_input = testcase_input.substring(0, testcase_input.length - 1);
            }
            // 'color', "dimgray"
            this.outputChannel.appendLine("错误数据如下所示");
            this.outputChannel.appendLine(testcase_input);

            this.outputChannel.appendLine("输出");
            this.outputChannel.appendLine(testcase_user_output);

            this.outputChannel.appendLine("标准答案");
            this.outputChannel.appendLine(testcase_output);

            // if($run_code_stdin.attr("preventEnter") === undefined){
            //     text = text.replace(/[\n]/g, "<br>&#8203;");
            // }
        } else {
            // loading输出
            this.outputChannel.appendLine(statusName + "...");
        }
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
