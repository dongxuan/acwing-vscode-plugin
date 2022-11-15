// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import { Command, Uri } from "vscode";

export enum ProblemState {
    EMPTY,
    ACCEPTED,
    TRY,
};

export class Problem {
    private _id: string = "";
    private _index: string = "";
    private _name: string = "";
    private _state: ProblemState = ProblemState.EMPTY;
    private _difficulty: string = "";
    private _passRate: string = "";

    constructor () {

    }

    public get id(): string {
        return this._id;
    }
    public set id(value: string) {
        this._id = value;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
    }

    public get state(): ProblemState {
        return this._state;
    }

    public set state(value: ProblemState) {
        this._state = value;
    }

    public get difficulty(): string {
        return this._difficulty;
    }

    public set difficulty(value: string) {
        this._difficulty = value;
    }

    public get passRate(): string {
        return this._passRate;
    }

    public set passRate(value: string) {
        this._passRate = value;
    }

    public get index(): string {
        return this._index;
    }
    
    public set index(value: string) {
        this._index = value;
    }
}
