// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { problemPreviewView } from './problemPreviewView';
import { ProblemTreeProvider, ProblemNode } from './problemTreeView';
import { acwingManager } from './repo/acwingManager';
import { codeLensController } from "./CodeLensController";
import { acWingController } from "./AcWingController";
import { acWingTreeItemDecorationProvider } from "./AcWingTreeItemDecorationProvider";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "acwing" is now active!');

	vscode.window.registerFileDecorationProvider(acWingTreeItemDecorationProvider);

	acwingManager.createAcWingSocket();

	const problemTreeProvider = new ProblemTreeProvider();
	let acWingTreeView = vscode.window.createTreeView("acWing", {treeDataProvider: problemTreeProvider});
	acWingTreeView.title = "1";
	problemTreeProvider.setTreeView(acWingTreeView);
	context.subscriptions.push(acWingTreeView);

	vscode.commands.registerCommand('acWing.refreshEntry', () => problemTreeProvider.refresh());
	vscode.commands.registerCommand('acWing.prevPage', () => problemTreeProvider.prevPage());
	vscode.commands.registerCommand('acWing.nextPage', () => problemTreeProvider.nextPage());
	vscode.commands.registerCommand('acWing.gotoPage', () => problemTreeProvider.gotoPage());

	vscode.commands.registerCommand("acWing.previewProblem", async (id: string) => problemPreviewView.show(id, false, context.extensionPath));
	vscode.commands.registerCommand("acWing.showProblem", (async (id: string) => problemPreviewView.showProblem(id, context.extensionPath)));

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
	vscode.commands.registerCommand("acWing.testSolution", 
		(async (problemID: string, uri: vscode.Uri) => acWingController.testSolution(problemID, uri)));

	// 提交代码
	vscode.commands.registerCommand("acWing.submitSolution", 
		(async (problemID: string, uri: vscode.Uri) => acWingController.submitSolution(problemID, uri)));

	context.subscriptions.push(codeLensController);
}


// This method is called when your extension is deactivated
export function deactivate() {}
