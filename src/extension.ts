// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { problemPreviewView } from './problemPreviewView';
import { ProblemTreeProvider, ProblemNode } from './problemTreeView';
import { acwingManager } from './repo/acwingManager';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "acwing" is now active!');

	const problemTreeProvider = new ProblemTreeProvider();
	vscode.window.registerTreeDataProvider('acWing', problemTreeProvider);
	vscode.commands.registerCommand('acWing.refreshEntry', () => problemTreeProvider.refresh());
	vscode.commands.registerCommand("acWing.previewProblem", async (id: string) => problemPreviewView.show(id, false, context.extensionPath));
}

// This method is called when your extension is deactivated
export function deactivate() {}
