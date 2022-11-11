import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { acwingManager } from "./repo/acwingManager";

export class ProblemTreeProvider implements vscode.TreeDataProvider<ProblemNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<ProblemNode | undefined | void> = new vscode.EventEmitter<ProblemNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ProblemNode | undefined | void> = this._onDidChangeTreeData.event;

	constructor() {
	}

	public async refresh(): Promise<void> {
		await acwingManager.listProblems(1);
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ProblemNode): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: ProblemNode): Promise<ProblemNode[]> {
		// if (!this.workspaceRoot) {
		// 	vscode.window.showInformationMessage('No dependency in empty workspace');
		// 	return Promise.resolve([]);
		// }
		let problemNodes: ProblemNode[] = [];

		if (!element) {
			// vscode.window.showInformationMessage('Loading problems ...');
			const nodes = await acwingManager.listProblems(1);
			nodes.forEach(node => {
				let problemNode = new ProblemNode(
					`${node.id}. ${node.name}`,
					node.difficulty, node.id, node.state, vscode.TreeItemCollapsibleState.None);
				problemNodes.push(problemNode);
			})
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
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'dependency';
}