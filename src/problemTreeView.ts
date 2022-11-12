import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { acwingManager } from "./repo/acwingManager";
import { Problem } from './repo/Problem'

export class ProblemTreeProvider implements vscode.TreeDataProvider<Problem> {

	private _onDidChangeTreeData: vscode.EventEmitter<Problem | undefined | void> = new vscode.EventEmitter<Problem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Problem | undefined | void> = this._onDidChangeTreeData.event;

	constructor() {
	}

	public async refresh(): Promise<void> {
		await acwingManager.listProblems(1);
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Problem): vscode.TreeItem {
		let problemNode = new ProblemNode(
			`${element.id}. ${element.name}`,
			element.difficulty, element.id, element.state, vscode.TreeItemCollapsibleState.None);
		return problemNode;
	}

	async getChildren(element?: Problem): Promise<Problem[]> {
		// if (!this.workspaceRoot) {
		// 	vscode.window.showInformationMessage('No dependency in empty workspace');
		// 	return Promise.resolve([]);
		// }

		let problemNodes: Problem[] = [];
		if (!element) {
			// vscode.window.showInformationMessage('Loading problems ...');
			problemNodes = await acwingManager.listProblems(1);
		}
		return problemNodes;
	}
}

export class ProblemNode extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		private readonly level: string,
        public readonly problemID: string,
		public readonly state: number,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command,
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.problemID} - ${this.label}-${this.level}`;

		if (state == 1) {
			// 解决
			this.iconPath =  path.join(__filename, '..', '..', 'resources', 'check.png');
		} else if (state == 2) {
			// 未解决
			this.iconPath =  path.join(__filename, '..', '..', 'resources', 'x.png');
		} else {
			// 其他状态
			this.iconPath =  path.join(__filename, '..', '..', 'resources', 'blank.png');
		}
		this.command = {
            title: "Preview Problem",
            command: "acWing.previewProblem",
            arguments: [this.problemID],
        }
	}
	contextValue = 'dependency';
}