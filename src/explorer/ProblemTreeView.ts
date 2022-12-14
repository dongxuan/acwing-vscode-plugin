/*
 * @Author: richard 
 * @Date: 2022-11-17 14:55:50 
 * @Last Modified by: richard
 * @Last Modified time: 2022-11-17 16:45:59
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as _ from "lodash";
import * as path from 'path';
import { acwingManager } from "../repo/AcwingManager";
import { Problem, ProblemState } from '../repo/Problem'

export class ProblemTreeProvider implements vscode.TreeDataProvider<Problem> {

	private _onDidChangeTreeData: vscode.EventEmitter<Problem | undefined | void> = new vscode.EventEmitter<Problem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Problem | undefined | void> = this._onDidChangeTreeData.event;

	private currentPage = 1;
	private problemList: Problem[] = [];
	private treeView: vscode.TreeView<Problem> | undefined;
	private mContext: vscode.ExtensionContext | undefined;

	constructor() {

	}

	public init (context: vscode.ExtensionContext) {
		this.currentPage = context.globalState.get('lastPage', 1);
		let acWingTreeView = vscode.window.createTreeView("acWing", {treeDataProvider: this});
		acWingTreeView.title = this.currentPage.toString();
		this.setTreeView(acWingTreeView);
		context.subscriptions.push(acWingTreeView);
		this.mContext = context;
	}

	public async refresh(): Promise<void> {
		// 强制拉去一下数据，刷新缓存
		let newProblemList = await acwingManager.getProblemsByPage(this.currentPage, true);
		// 检查一下，是否需要刷新UI, 其实主要是状态
		if (newProblemList && newProblemList.length == this.problemList.length) {
			for (let i = 0; i < newProblemList.length; i++) {
				if (!_.isEqual(newProblemList[i], this.problemList[i])) {
					// 有一个不一样，就刷新
					break;
				}
			}
			// 全都一致，不刷新
			console.log('ProblemTreeProvider refresh() skip.');
			return;
		}
		console.log('ProblemTreeProvider refresh() fire');
		this._onDidChangeTreeData.fire();
	}

	public async prevPage (): Promise<void> {
		let maxPage = acwingManager.getMaxPage();
		if (maxPage != 0 && this.currentPage >= maxPage) {
			return;
		}
		this.currentPage++;
		this.updateTitlte();
		this._onDidChangeTreeData.fire();
	}

	public async nextPage (): Promise<void> {
		if (this.currentPage <= 1) {
			return;
		}
		this.currentPage--;
		this.updateTitlte();
		this._onDidChangeTreeData.fire();
	}

	// 跳转到页面
	public async gotoPage (): Promise<void> {
		const pageOption: vscode.InputBoxOptions = {
			title: "请输入页码",
			prompt: "页码:",
		};
		const inputPage: string | undefined = await vscode.window.showInputBox(pageOption);
		if (!inputPage || isNaN(parseInt(inputPage))) {
			return;
		}

		let page = parseInt(inputPage);
		console.log('gotoPage() ' + page);

		if (page < 1 || (acwingManager.getMaxPage() != 0 && page > acwingManager.getMaxPage())) {
			return;
		}
		this.currentPage = page;
		this.updateTitlte();
		this._onDidChangeTreeData.fire();
	}


	public setTreeView(view: vscode.TreeView<Problem>) {
		this.treeView = view;
	}

	private updateTitlte () {
		if (!this.treeView) {
			return;
		}
		let maxPage = acwingManager.getMaxPage();
		this.treeView.title = `${this.currentPage}`;
		if (maxPage) {
			this.treeView.title = this.treeView.title + '/' + maxPage;
		}
	}

	getTreeItem(element: Problem): vscode.TreeItem {
		if (element.id === "notSignIn") {
            return {
                label: element.name,
                collapsibleState: vscode.TreeItemCollapsibleState.None,
                command: {
                    command: "acWing.setCookie",
                    title: "登录设置cookies",
					arguments: []
                },
            };
        }

		let iconPath: string = "";
   		if (element.state == ProblemState.ACCEPTED) {
			iconPath =  path.join(__filename, '..', '..', '..', 'resources', 'check.png');
		} else if (element.state == ProblemState.TRY) {
			iconPath = path.join(__filename, '..', '..', '..', 'resources', 'x.png');
		} else {
			iconPath =  path.join(__filename, '..', '..', '..', 'resources', 'blank.png');
		}
		return {
			label: `${element.index}. ${element.name}`,
			tooltip: `${element.difficulty}, 通过率 ${element.passRate}`,
			iconPath: iconPath,
			resourceUri: element.uri,
			collapsibleState: vscode.TreeItemCollapsibleState.None,
			command: {
				title: "Click Problem",
				command: "acWing.exploreProblem",
				arguments: [element.id, element],
			}
		};
	}

	async getChildren(element?: Problem): Promise<Problem[]> {
		if (!acwingManager.isLogin()) {
			vscode.window.showInformationMessage('请设置acwing cooke.', ... ['OK']).then(function(val) {
				if (val) {
					vscode.commands.executeCommand('acWing.setCookie');
				}
			});
			let problem = new Problem();
			problem.id = "notSignIn",
			problem.name = "Set cookie to sign in to acwing";
			return [ problem ];
		}

		if (!element) {
			let problemNodes = await acwingManager.getProblemsByPage(this.currentPage);
			if (problemNodes) {
				this.updateTitlte();
				this.mContext?.globalState.update('lastPage', this.currentPage);
				return problemNodes;
			}
		}
		return [];
	}
}