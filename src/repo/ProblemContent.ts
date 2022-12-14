/*
 * @Author: richard 
 * @Date: 2022-11-17 14:57:06 
 * @Last Modified by:   richard 
 * @Last Modified time: 2022-11-17 14:57:06 
 */

import { StringDecoder } from "string_decoder";
import { Command, Uri } from "vscode";

export class ProblemContent {
    public id: string;
    private _name: string = "";
    private _difficulty: string  = "";
    private _limit: string = "";
    private _accepted: string = "";
    private _submissions: string = "";
    private _source: string = "";
    private _tags: string[] = [];
    private _contentHtml: string = "";
    private _codeTemplate: object | undefined = undefined;
    private _codeStdin: string = "";

    constructor(id: string) { 
        this.id = id;
    }

    public get difficulty(): string {
        return this._difficulty;
    }
    public set difficulty(value: string) {
        this._difficulty = value;
    }

    public get limit(): string {
        return this._limit;
    }
    public set limit(value: string) {
        this._limit = value;
    }

    public get accepted(): string {
        return this._accepted;
    }
    public set accepted(value: string) {
        this._accepted = value;
    }

    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
    }

    public get contentHtml(): string {
        return this._contentHtml;
    }
    public set contentHtml(value: string) {
        this._contentHtml = value;
    }
    public get tags(): string[] {
        return this._tags;
    }
    public set tags(value: string[]) {
        this._tags = value;
    }

    public get source(): string {
        return this._source;
    }
    public set source(value: string) {
        this._source = value;
    }
    public get submissions(): string {
        return this._submissions;
    }
    public set submissions(value: string) {
        this._submissions = value;
    }

    public get codeTemplate(): object | undefined {
        return this._codeTemplate;
    }
    
    public set codeTemplate(value: object | undefined) {
        this._codeTemplate = value;
    }

    public get codeStdin(): string {
        return this._codeStdin;
    }

    public set codeStdin(value: string) {
        this._codeStdin = value;
    }
}
