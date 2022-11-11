// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import { Disposable } from "vscode";
import { Problem } from './Problem'
import fetch, { Headers } from 'node-fetch';
import * as cheerio from 'cheerio';

const COOKIE = 'aliyungf_tc=e5fce49a08e658ac929effce9bbf42c5d9f01a512ecaf1c39d33e9df323860b4; file_6712727_readed=""; file_4813_readed=""; file_566732_readed=""; file_4796_readed=""; file_52601_readed=""; file_52587_readed=""; file_5036_readed=""; file_4814_readed=""; file_63971_readed=""; file_5560006_readed=""; file_7222675_readed=""; csrftoken=e8dCfxXa4jEVuL8kpIapniod1o9eFbLjYMD6bMqZV8aWVl8EfJK7Ht5u0Ekp1ntH; sessionid=mpa5rruo7idpzmdvlly9t73fn5tgh4jg; csrftoken=7qGIq7tQE51FrJ9pGc16qKIynUxwVy9s6OrF3dZ7jRgal2sSbSnX3qn3ItOZSC4J';
const HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
  'Cookie': COOKIE
}

class AcwingManager implements Disposable {
  private explorerProblemsMap: Map<string, Problem> = new Map<string, Problem>();

  public async refreshCache(): Promise<void> {
    this.dispose();
    const nodes = await this.listProblems(1);
    for (const problem of nodes) {
        this.explorerProblemsMap.set(problem.id, problem);
    }
  }

  public getProblemsByPage(page: number): Problem[] {
    return [];
  }

  public getProblemsById(id: string): Problem | undefined {
    return this.explorerProblemsMap.get(id);
  }

  public dispose(): void {
    this.explorerProblemsMap.clear();
  }

  // 列出acwing 页面的问题 https://www.acwing.com/problem/{page}/
  public async listProblems(page: number): Promise<Problem[]> {
    console.log('listProblems() ' + page);

    try {
      let config = {
        method: 'get',
        headers: HEADERS
      }

      const response = await fetch(`https://www.acwing.com/problem/${page}/`, config);
      // if (!response.ok) {
      //   throw new Error(`Error! status: ${response.status}`);
      // }
      const html = await response.text();
      // console.log('result is: ', html);
      return this.parseProblems(html);
    } catch (error) {
      if (error instanceof Error) {
        console.error('error message: ', error.message);
      } else {
        console.error('unexpected error: ', error);
      }
    }
    return [];
  }

  private parseProblems(html: string): Problem[] {
    if (!html) {
      return [];
    }
    const $ = cheerio.load(html);
    let nodes: Problem[] = [];
    $('tbody tr').each(function (index, value) {
      let vd: string[] = [];
      $('td', this).each(function (i, v) {
        vd[i] = $(this).text().trim();
      });
      // TODO vd[0] 如何判断是否通过
      let node = new Problem(vd[1], vd[2], 0, vd[4], vd[3]);
      nodes.push(node);
      console.log('find node :', node);
    });
    return nodes;
  }
}

export const acwingManager: AcwingManager = new AcwingManager();
