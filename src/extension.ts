// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { problemPreviewView } from './problemPreviewView';
import { ProblemTreeProvider } from './problemTreeView';
import { acwingManager } from './repo/acwingManager';
import { codeLensController } from "./CodeLensController";
import { AcWingController } from "./AcWingController";
import { acWingTreeItemDecorationProvider } from "./AcWingTreeItemDecorationProvider";
import { Problem } from './repo/Problem';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "acwing" is now active!');
	vscode.window.registerFileDecorationProvider(acWingTreeItemDecorationProvider);


	const problemTreeProvider = new ProblemTreeProvider();
	let acWingTreeView = vscode.window.createTreeView("acWing", {treeDataProvider: problemTreeProvider});
	acWingTreeView.title = "1";
	problemTreeProvider.setTreeView(acWingTreeView);
	context.subscriptions.push(acWingTreeView);

	const acWingController = new AcWingController(context);
	vscode.commands.registerCommand('acWing.refreshEntry', () => problemTreeProvider.refresh());
	vscode.commands.registerCommand('acWing.prevPage', () => problemTreeProvider.prevPage());
	vscode.commands.registerCommand('acWing.nextPage', () => problemTreeProvider.nextPage());
	vscode.commands.registerCommand('acWing.gotoPage', () => problemTreeProvider.gotoPage());

	// 登录设置cookie
	vscode.commands.registerCommand("acWing.setCookie", () => acWingController.signIn());
	
	// 预览题目
	vscode.commands.registerCommand("acWing.previewProblem",
		async (id: string, problem: Problem) => acWingController.previewProblem(id, problem));

	// 编辑题目	
	vscode.commands.registerCommand("acWing.editProblem", 
		async (id: string) => acWingController.editProblem(id));

	// 原题链接
	vscode.commands.registerCommand("acWing.showSource", 
		(async (id: string) => acWingController.showSource(id)));

	// 题解
	vscode.commands.registerCommand("acWing.showSolution", 
		(async (id: string) => acWingController.showSolution(id)));

	// 视频题解
	vscode.commands.registerCommand("acWing.showSolutionVideo", 
		(async (id: string) => acWingController.showSolutionVideo(id)));

	// 讨论组
	vscode.commands.registerCommand("acWing.showDiscussion", 
		(async (id: string) => acWingController.showDiscussion(id)));	

	// 提交记录
	vscode.commands.registerCommand("acWing.showSubmitRecord", 
		(async (id: string) => acWingController.showSubmitRecord(id)));	

	// 测试代码	
	vscode.commands.registerCommand("acWing.runSolution", 
		(async (problemID: string, uri: vscode.Uri, lang: string) => acWingController.runSolution(problemID, uri, lang)));

	// 提交代码
	vscode.commands.registerCommand("acWing.submitSolution", 
		(async (problemID: string, uri: vscode.Uri, lang: string) => acWingController.submitSolution(problemID, uri, lang)));

	// 配置
	vscode.commands.registerCommand("acWing.configure", () => {
		vscode.commands.executeCommand("workbench.action.openSettings", `AcWing`);
	})

	context.subscriptions.push(codeLensController);
}


// This method is called when your extension is deactivated
export function deactivate() {}
