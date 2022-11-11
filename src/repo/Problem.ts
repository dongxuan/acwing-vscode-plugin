// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import { Command, Uri } from "vscode";


export class Problem {
    public id: string;
    public name: string;
    public state: number;
    public difficulty: string;
    public passRate: string;

    constructor(id: string, name: string, state: number, difficulty: string, passRate: string) { 
        this.id = id;
        this.name = name;
        this.state = state;
        this.difficulty = difficulty;
        this.passRate = passRate;
    }
}
