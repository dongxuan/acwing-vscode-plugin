/*
 * @Author: richard 
 * @Date: 2022-11-17 14:56:26 
 * @Last Modified by:   richard 
 * @Last Modified time: 2022-11-17 14:56:26 
 */

import { ConfigurationChangeEvent, Disposable, languages, workspace } from "vscode";
import { customCodeLensProvider, CustomCodeLensProvider } from "./CustomCodeLensProvider";

class CodeLensController implements Disposable {
    private internalProvider: CustomCodeLensProvider;
    private registeredProvider: Disposable | undefined;
    private configurationChangeListener: Disposable;

    constructor() {
        this.internalProvider = customCodeLensProvider;

        this.configurationChangeListener = workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
            if (event.affectsConfiguration("acWing.editor.shortcuts")) {
                this.internalProvider.refresh();
            }
        }, this);

        this.registeredProvider = languages.registerCodeLensProvider({ scheme: "file" }, this.internalProvider);
    }

    public dispose(): void {
        if (this.registeredProvider) {
            this.registeredProvider.dispose();
        }
        this.configurationChangeListener.dispose();
    }
}

export const codeLensController: CodeLensController = new CodeLensController();
