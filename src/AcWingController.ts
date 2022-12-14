/*
 * @Author: richard 
 * @Date: 2022-11-17 14:55:29 
 * @Last Modified by: richard
 * @Last Modified time: 2022-11-17 16:48:47
 */
import * as fs from "fs";
import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import * as path from "path";
import * as fse from "fs-extra";
import * as filenamify from 'filenamify';

import { ConfigurationChangeEvent, Disposable, languages, workspace, FileSystemProvider, ExtensionContext } from "vscode";
import { customCodeLensProvider, CustomCodeLensProvider } from "./preview/CustomCodeLensProvider";
import { acwingManager } from "./repo/AcwingManager";
import { problemPreviewView } from './preview/ProblemPreviewView';
import { ProblemTreeProvider } from './explorer/ProblemTreeView';
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

    public async signIn() {
        console.log('signIn()');
        const pageOption: vscode.InputBoxOptions = {
			title: "acwing cookies",
			prompt: "??????AcWing??????????????????cookies???????????????",
		};

		let inputCookie: string  = await vscode.window.showInputBox(pageOption) || "";
		if (!inputCookie) {
            // vscode.window.showErrorMessage('??????cookies');
			return;
		}
        acwingManager.setCookie(inputCookie);
    }

    public clearCache() {
        console.log('clearCache()');
        acwingManager.clearCache();
        this.mContext.globalState.update('lastPage', 1);
    }

    // ?????????????????????
    public async exploreProblem (problemID: string, problem: Problem) {
        console.log('AcWingController::previewProblem() ' + problemID);
        if (!problemID) {
            problemID = await this.inputProblemID();
        }
        if (!problemID) return;

        // ????????????????????????
        const mode = workspace.getConfiguration().get<string>("acWing.clickProblemItem", 'Problem');
        if (mode === 'Problem') {
            return this.previewProblem(problemID, problem);
        } else if (mode === 'Code') {
            return this.editProblem(problemID);
        } else {
            // ?????????????????????????????????
            problemPreviewView.show(problemID, problem, true);
            return this.editProblem(problemID);
        }
    }

    // ????????????
    public async previewProblem (problemID: string, problem: Problem) {
        console.log('AcWingController::previewProblem() ' + problemID);
        if (!problemID) {
            problemID = await this.inputProblemID();
        }
        if (!problemID) return;
        problemPreviewView.show(problemID, problem, false);
    }

    // ???????????????
    public async editProblem (problemID: string, isSideMode: boolean = false) {
        if (!problemID) {
            problemID = await this.inputProblemID();
        }
        if (!problemID) return;

        let problemContent = await acwingManager.getProblemContentById(problemID);

        if (!problemContent) {
            console.error('getProblemContentById() failed ' + problemID);
            return;
        }
        // ?????????????????????
        const language = workspace.getConfiguration().get<string>("acWing.defaultLanguage", 'C++');

        // ????????????
        let fileFolder = workspace.getConfiguration().get<string>("acWing.workspaceFolder", '');
        if (!fileFolder) {
            fileFolder = this.mContext.globalStorageUri.fsPath;
        }
        let fileName: string = problemContent.name.trim();
        fileName = fileName.replace(/ /g, "");
        fileName = filenamify(fileName, {replacement: ''});
        fileName += '.' + AcWingController.LANG_SUFFIX_MAP[language]
        let finalPath: string = path.join(fileFolder, fileName);

        // create file
        try {
            this.createProblemCode(problemID, problemContent, finalPath, language);
            // ????????????
            vscode.window.showTextDocument(vscode.Uri.file(finalPath), 
                { 
                    preview: false, 
                    viewColumn: isSideMode ? vscode.ViewColumn.Two: vscode.ViewColumn.One 
                });
        } catch (err) {
            vscode.window.showErrorMessage('Error ' + err);
        }
    }

    public async inputProblemID (): Promise<string> {
        const pageOption: vscode.InputBoxOptions = {
			title: "??????????????????",
			prompt: "/problem/content/XXX/,XXX????????????????????????????????????????????????",
		};
        let str = await vscode.window.showInputBox(pageOption) || "";
        return str;
    }

    // ????????????
    public showSolution (problemID: string) {
        console.log('AcWingController::showSolution() ' + problemID);
        const url = `https://www.acwing.com/problem/content/solution/${problemID}/1/`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // ??????????????????
    public showSource (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/content/${problemID}/`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // ???????????????
    public showDiscussion (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/content/discussion/index/${problemID}/1/`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // ??????????????????
    public showSolutionVideo (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/content/video/${problemID}/`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // ??????????????????
    public showSubmitRecord (problemID: string) {
        console.log('AcWingController::showSource() ' + problemID);
        const url = `https://www.acwing.com/problem/content/submission/${problemID}`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    // ????????????
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

        // ????????????
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

    // ????????????
    public async runSolution (problemID: string, uri: vscode.Uri, lang: string) {
        console.log('AcWingController::runSolution()', problemID, uri);

        if (!lang || !AcWingController.LANG_SUFFIX_MAP[lang]) {
            console.log(`runSolution() failed lang is invaild ${lang}`);
            vscode.window.showErrorMessage(`??????????????????"${lang}"`);
            return;
        }

        // ??????
        let problemContent = await acwingManager.getProblemContentById(problemID);
        if (!problemContent) {
            console.log(`runSolution() failed get problem content ${problemID}`);
            vscode.window.showErrorMessage(`??????${problemID}????????????????????????.`);
            return;
        }

        // ????????????
        if (vscode.window.activeTextEditor?.document.isDirty) {
            await vscode.window.activeTextEditor?.document.save();
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
        this.outputChannel.appendLine('RunSolution...');
        this.sendToSocket(data);
    }

    // ????????????
    public async submitSolution (problemID: string, uri: vscode.Uri, lang: string) {
        console.log('AcWingController::submitCode()', problemID, uri);
        if (!lang || !AcWingController.LANG_SUFFIX_MAP[lang]) {
            console.log(`submitCode() failed lang is invaild ${lang}`);
            vscode.window.showErrorMessage(`??????????????????"${lang}"`);
            return;
        }

        // ????????????
        if (vscode.window.activeTextEditor?.document.isDirty) {
            await vscode.window.activeTextEditor?.document.save();
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
        this.outputChannel.appendLine('SubmitSolution...');
        this.sendToSocket(data);
    }

    public initWebSocket () {
        console.log('initWebSocket()');
        if (this.webSocket) {
            // ???????????????
            console.log('initWebSocket() close socket.');
            this.webSocket.close();
        }

        if (!acwingManager.isLogin() || !acwingManager.getCookie()) {
            console.log('initWebSocket() failed not login.');
            vscode.window.showInformationMessage('?????????acwing cooke.', ... ['OK']).then(function(val) {
				if (val) {
					vscode.commands.executeCommand('acWing.setCookie');
				}
			});
            this.outputChannel.appendLine('?????????cookie.');
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

                    // ???????????????
                    that.heartbeatIntervalID = setInterval(function () {
                        that.webSocket?.send({ activity: "heartbeat" });
                    }, 3e4);
                } else if (event.activity === 'problem_run_code_status') {
                    // ????????????
                    that.onRunCodeStatus(event);
                } else if (event.activity === 'problem_submit_code_status') {
                    // ????????????
                    that.onSubmitCodeStatus(event);
                }
            } catch(err) {
                console.log('[webSocket] received error => ', err);
            }
        });
      
        this.webSocket.on('error', function message(data) {
          console.log('[webSocket] => error: %s', data);
          if (data.message.indexOf('Unexpected server response: 403') >=0) {
            that.outputChannel.appendLine('??????cookie????????????cookie');
          } else {
            that.outputChannel.appendLine('Error ' + data);
          }
        });
      
        this.webSocket.on('close', function message(data) {
          console.log('[webSocket] => close: %s', data);
          that.onCloseWebSocket();
          that.outputChannel.appendLine('Close ' + data);
        });
    }

    // ?????????????????????3???
    private sendToSocket (data: object) {
        let str = JSON.stringify(data);
        if (this.isWebSocketReady && this.webSocket) {
            console.log(`[webSocket] <= ${str}`);
            this.webSocket.send(str);
            return;
        }

        console.log('sendToSocket() init websocket.');
        // ????????????
        this.initWebSocket();

        // ????????????
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
        // ??????
        let status = data['status'];
        let statusName = AcWingController.ACWIGN_STATUS_NAMES[status];

        // ???????????? code_status_names[status]
        // ???????????? code_status_colors[code_status_names[status]]

        // ????????????
        let stderrResult = data['stderr'];
        // ????????????
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
            timeResult = "???????????????" + data['time'] + "ms";
        }
    
        if (status !== 'Uploading' && status !== 'Pending' && status !== 'Running'){
            // output ...
            this.outputChannel.appendLine(`?????????????????????${statusName}\n`);

            this.outputChannel.appendLine("??????");
            this.outputChannel.appendLine(this.codeStdin);

            this.outputChannel.appendLine("??????");
            this.outputChannel.appendLine(stdoutResult);
            this.outputChannel.append(timeResult);
        } else {
            // loading??????
            this.outputChannel.appendLine(statusName + "...");
        }
    }

    private onSubmitCodeStatus (data: object) : void {
        let status = data['status'];
        let stderr = data['stderr'];
        let testcase_input = data['testcase_input'];
        let testcase_output = data['testcase_output'];
        let testcase_user_output = data['testcase_user_output'];

        // ??????????????????
        let compilationResult = "";
        if (status === 'COMPILE_ERROR'){
            compilationResult = data['compilation_log'];
        } else if ((typeof stderr !== "undefined") && stderr.length > 0)  {
            compilationResult = stderr;
        }

        let statusName = AcWingController.ACWIGN_STATUS_NAMES[status];

        if (status !== 'Uploading' && status !== 'Pending' && status !== 'Judging'){
            if (status === 'ACCEPTED') {
                this.outputChannel.appendLine(`?????????????????????${statusName}\n`);
                // vscode.window.showInformationMessage(`ACCEPTED`);
                // reload tree
                vscode.commands.executeCommand('acWing.refreshEntry');
                return;
            }

            if (testcase_input.length > 0 && testcase_input[testcase_input.length - 1] === '\n') {
                testcase_input = testcase_input.substring(0, testcase_input.length - 1);
            }
            // 'color', "dimgray"
            this.outputChannel.appendLine("????????????????????????");
            this.outputChannel.appendLine(testcase_input);

            this.outputChannel.appendLine("????????????");
            if (compilationResult) {
                this.outputChannel.appendLine(compilationResult);
            } else {
                this.outputChannel.appendLine(testcase_user_output);
            }

            this.outputChannel.appendLine("????????????");
            this.outputChannel.append(testcase_output);

            // reload tree
            vscode.commands.executeCommand('acWing.refreshEntry');

            // if($run_code_stdin.attr("preventEnter") === undefined){
            //     text = text.replace(/[\n]/g, "<br>&#8203;");
            // }
        } else {
            // loading??????
            this.outputChannel.appendLine(statusName + "...");
        }
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
