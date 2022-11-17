// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { problemPreviewView } from './preview/ProblemPreviewView';
import { ProblemTreeProvider } from './explorer/ProblemTreeView';
import { acwingManager } from './repo/AcwingManager';
import { codeLensController } from "./preview/CodeLensController";
import { AcWingController } from "./AcWingController";
import { acWingTreeItemDecorationProvider } from "./explorer/AcWingTreeItemDecorationProvider";
import { Problem } from './repo/Problem';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "acwing" is now active!');

	const problemTreeProvider = new ProblemTreeProvider();
	problemTreeProvider.init(context);

	const acWingController = new AcWingController(context);

	context.subscriptions.push(
		codeLensController,
		vscode.window.registerFileDecorationProvider(acWingTreeItemDecorationProvider),
		vscode.commands.registerCommand('acWing.refreshEntry', () => problemTreeProvider.refresh()),
		vscode.commands.registerCommand('acWing.prevPage', () => problemTreeProvider.prevPage()),
		vscode.commands.registerCommand('acWing.nextPage', () => problemTreeProvider.nextPage()),
		vscode.commands.registerCommand('acWing.gotoPage', () => problemTreeProvider.gotoPage()),
		vscode.commands.registerCommand("acWing.setCookie", () => acWingController.signIn()),
		vscode.commands.registerCommand("acWing.clear", () => acWingController.clearCache()),
		vscode.commands.registerCommand("acWing.exploreProblem", async (id: string, problem: Problem) => acWingController.exploreProblem(id, problem)),
		vscode.commands.registerCommand("acWing.previewProblem", async (id: string, problem: Problem) => acWingController.previewProblem(id, problem)),
		vscode.commands.registerCommand("acWing.editProblem", async (id: string) => acWingController.editProblem(id)),
		vscode.commands.registerCommand("acWing.showSource", (async (id: string) => acWingController.showSource(id))),
		vscode.commands.registerCommand("acWing.showSolution", (async (id: string) => acWingController.showSolution(id))),
		vscode.commands.registerCommand("acWing.showSolutionVideo", (async (id: string) => acWingController.showSolutionVideo(id))),
		vscode.commands.registerCommand("acWing.showDiscussion", (async (id: string) => acWingController.showDiscussion(id))),
		vscode.commands.registerCommand("acWing.showSubmitRecord", (async (id: string) => acWingController.showSubmitRecord(id))),
		vscode.commands.registerCommand("acWing.runSolution", (async (problemID: string, uri: vscode.Uri, lang: string) => acWingController.runSolution(problemID, uri, lang))),
		vscode.commands.registerCommand("acWing.submitSolution", (async (problemID: string, uri: vscode.Uri, lang: string) => acWingController.submitSolution(problemID, uri, lang))),
		vscode.commands.registerCommand("acWing.configure", () => vscode.commands.executeCommand("workbench.action.openSettings", `AcWing`))
	)
}


// This method is called when your extension is deactivated
export function deactivate() {
	
}
