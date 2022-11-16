import * as fs from "fs";
import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import * as path from "path";
import * as fse from "fs-extra";
import * as chalk from 'chalk';

import { ConfigurationChangeEvent, Disposable, languages, workspace, FileSystemProvider, ExtensionContext } from "vscode";
import { customCodeLensProvider, CustomCodeLensProvider } from "./CustomCodeLensProvider";
import { acwingManager } from "./repo/acwingManager";
import { problemPreviewView } from './problemPreviewView';
import { ProblemTreeProvider } from './problemTreeView';
import { Problem } from "./repo/Problem";
import { ProblemContent } from "./repo/ProblemContent";

export class AcWingController implements Disposable {
    static readonly ACWIGN_STATUS_NAMES = {"Uploading":"Uploading","Pending":"Pending","Judging":"Judging","Running":"Running","Too many tasks":"Too many tasks","Upload Failed":"Upload Failed","Input Limit Exceeded":"Input Limit Exceeded","COMPILE_ERROR":"Compile Error","WRONG_ANSWER":"Wrong Answer","TIME_LIMIT_EXCEEDED":"Time Limit Exceeded","MEMORY_LIMIT_EXCEEDED":"Memory Limit Exceeded","OUTPUT_LIMIT_EXCEEDED":"Output Limit Exceeded","RUNTIME_ERROR":"Runtime Error","SEGMENTATION_FAULT":"Segmentation Fault","PRESENTATION_ERROR":"Presentation Error","INTERNAL_ERROR":"Internal Error","FLOAT_POINT_EXCEPTION":"Float Point Exception","NON_ZERO_EXIT_CODE":"Non Zero Exit Code","ACCEPTED":"Accepted","FINISHED":"Finished"};
    static readonly ACWIGN_STATUS_COLORS = {"Uploading":"#9d9d9d","Pending":"#9d9d9d","Judging":"#337ab7","Running":"#337ab7","Too many tasks":"#d05451","Upload Failed":"#d05451","Input Limit Exceeded":"#d05451","Compile Error":"#d05451","Wrong Answer":"#d05451","Time Limit Exceeded":"#d05451","Memory Limit Exceeded":"#d05451","Output Limit Exceeded":"#d05451","Runtime Error":"#d05451","Segmentation Fault":"#d05451","Presentation Error":"#d05451","Internal Error":"#d05451","Float Point Exception":"#d05451","Non Zero Exit Code":"#d05451","Accepted":"#449d44","Finished":"#449d44"};
    static readonly LANG_SUFFIX_MAP = {
        'C++': 'cpp',
        'C': 'c',
        'Java': 'java', 
        'Python': 'py',
        'Javascript': 'js',
        'Python3': 'py',
        'Go': 'go',
    }

    private webSocket: WebSocket | undefined;
    private isWebSocketReady: boolean = false; 
    private heartbeatIntervalID: NodeJS.Timer | undefined;
    private codeStdin: string = "";

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
    public async editProblem (problemID: string) {
        let problemContent = await acwingManager.getProblemContentById(problemID);

        if (!problemContent) {
            console.error('getProblemContentById() failed ' + problemID);
            return;
        }
        // TODO 获取默认的语言
        const language = 'C++';

        // TODO 默认文件地址
        const fileFolder: string = this.mContext.globalStorageUri.fsPath;
        const fileName: string = problemContent.name.trim() + '.' + AcWingController.LANG_SUFFIX_MAP[language];
        let finalPath: string = path.join(fileFolder, fileName);

        // create file
        this.createProblemCode(problemID, problemContent, finalPath, language);
    
        // TODO 显示几行
        vscode.window.showTextDocument(vscode.Uri.file(finalPath), 
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

    // 创建文件
    public async createProblemCode (problemID: string, problemContent: ProblemContent, 
        finalPath: string, lang: string) {

        if (await fse.pathExists(finalPath)) {
            console.log(`createProblemCode() ${finalPath} skip.`);
            return;
        }
        console.log(`createProblemCode() create ${finalPath} `);
        await fse.createFile(finalPath);

        let content: string = "";
        if (problemContent.codeTemplate) {
            content = problemContent.codeTemplate[lang] || "";
        }

        // 写入标题
        const header = 
`/*
* @acwing app=acwing.cn id=${problemID} lang=${lang}
*
* ${problemContent.name}
*/

// @acwing code start

`;

        const end = `
// @acwing code end`;
        await fse.writeFile(finalPath, header + content + end);
    }

    // 运行代码
    public async runSolution (problemID: string, uri: vscode.Uri, lang: string) {
        console.log('AcWingController::runSolution()', problemID, uri);

        if (!lang || !AcWingController.LANG_SUFFIX_MAP[lang]) {
            console.log(`runSolution() failed lang is invaild ${lang}`);
            vscode.window.showErrorMessage(`无效语言类型"${lang}"`);
            return;
        }

        let problemContent = await acwingManager.getProblemContentById(problemID);
        if (!problemContent) {
            console.log(`runSolution() failed get problem content ${problemID}`);
            vscode.window.showErrorMessage(`加载${problemID}失败，请稍后重试.`);
            return;
        }

        const codeData = await fs.readFileSync(uri.fsPath, "utf8");
        const data = {
            'activity': "problem_run_code",
            'problem_id': parseInt(problemID),
            'code': codeData,
            'language': lang,
            'input': problemContent.codeStdin,
        }
        this.codeStdin = problemContent.codeStdin;
        this.outputChannel.clear();
        this.outputChannel.show();
        this.sendToSocket(data);
    }

    // 提交代码
    public async submitSolution (problemID: string, uri: vscode.Uri, lang: string) {
        console.log('AcWingController::submitCode()', problemID, uri);
        if (!lang || !AcWingController.LANG_SUFFIX_MAP[lang]) {
            console.log(`submitCode() failed lang is invaild ${lang}`);
            vscode.window.showErrorMessage(`无效语言类型"${lang}"`);
            return;
        }

        const codeData = await fs.readFileSync(uri.fsPath, "utf8");
        const data = {
          'activity': "problem_submit_code",
          'problem_id': problemID,
          'code': codeData,
          'language': lang,
          'mode': 'normal',
          'problem_activity_id': 0,
          'record': [],
          'program_time': 0,
        }
        this.outputChannel.clear();
        this.outputChannel.show();
        this.sendToSocket(data);
    }

    public initWebSocket () {
        console.log('initWebSocket()');
        if (this.webSocket) {
            // 关闭之前的
            console.log('initWebSocket() close socket.');
            this.webSocket.close();
        }

        if (!acwingManager.isLogin() || !acwingManager.getCookie()) {
            console.log('initWebSocket() failed not login.');
            return;
        }

        this.webSocket = new WebSocket("wss://www.acwing.com/wss/socket/", {
          headers:  {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
            'Cookie': acwingManager.getCookie(),
          }
        });
    
        // set listener
        const that = this;
        this.webSocket.on('open', function open() {
            console.log('[webSocket] => open socket.')
        });
    
        this.webSocket.on('message', function message(data) {
            console.log('[webSocket] => received: %s', data);
            try {
                const event = JSON.parse(data.toString());

                if (event.activity === "socket" && event.state == "ready") {
                    that.isWebSocketReady = true;
                    console.log('[webSocket] => state ready.');

                    // 心跳包维持
                    that.heartbeatIntervalID = setInterval(function () {
                        that.webSocket?.send({ activity: "heartbeat" });
                    }, 3e4);
                } else if (event.activity === 'problem_run_code_status') {
                    // 运行结果
                    that.onRunCodeStatus(event);
                } else if (event.activity === 'problem_submit_code_status') {
                    // 提价结果
                    that.onSubmitCodeStatus(event);
                }
            } catch(err) {
                console.log('[webSocket] received error => ', err);
            }
        });
      
        this.webSocket.on('error', function message(data) {
          console.log('[webSocket] => error: %s', data);
        });
      
        this.webSocket.on('close', function message(data) {
          console.log('[webSocket] => close: %s', data);
          that.onCloseWebSocket();
        });
    }

    // 发送数据，尝试3次
    private sendToSocket (data: object) {
        let str = JSON.stringify(data);
        if (this.isWebSocketReady && this.webSocket) {
            console.log(`[webSocket] <= ${str}`);
            this.webSocket.send(str);
            return;
        }

        console.log('sendToSocket() init websocket.');
        // 尝试重连
        this.initWebSocket();

        // 等待几次
        const that = this;
        let count = 0;
        let func = function() {
            if (count >= 2) {
                console.log('retry count >= 2');
                return;
            }
            if (that.isWebSocketReady && that.webSocket) {
                console.log(`[webSocket] <= ${str}`);
                that.webSocket.send(str);
                return;
            }
            count++;
            console.log('retry count ' + count);
            setTimeout(func, 3000);
        };
        setTimeout(func, 3000);
    }
    
    private onCloseWebSocket() {
        console.log('onCloseWebSocket()');
    
        this.isWebSocketReady = false;
        if (this.heartbeatIntervalID) {
          clearInterval(this.heartbeatIntervalID);
          this.heartbeatIntervalID = undefined;
        }
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
            this.outputChannel.appendLine(this.codeStdin);

            this.outputChannel.appendLine("输出");
            this.outputChannel.appendLine(stdoutResult);
            this.outputChannel.append(timeResult);
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
                // vscode.window.showInformationMessage(`ACCEPTED`);
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
            this.outputChannel.append(testcase_output);

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
