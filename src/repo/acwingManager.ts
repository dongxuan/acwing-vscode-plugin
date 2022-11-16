// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import { Disposable } from "vscode";
import { Problem, ProblemState } from './Problem'
import { ProblemContent } from './ProblemContent';
import fetch, { Headers } from 'node-fetch';
import * as cheerio from 'cheerio';
import * as WebSocket from 'ws';

const COOKIE = 'aliyungf_tc=e5fce49a08e658ac929effce9bbf42c5d9f01a512ecaf1c39d33e9df323860b4; file_6712727_readed=""; file_4813_readed=""; file_566732_readed=""; file_4796_readed=""; file_52601_readed=""; file_52587_readed=""; file_5036_readed=""; file_4814_readed=""; file_63971_readed=""; file_5560006_readed=""; file_7222675_readed=""; csrftoken=t08fEOGvrwSgU7Uo2BzS4oWGc1IR6CinLCbKe3fRNuerZDw8bfB41rzIbRLADT9c; sessionid=ab3xpwtltbhr4kirxacqwr6de4aqww2c; file_589_readed=""';
const HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
  'Cookie': COOKIE
}

class AcwingManager implements Disposable {
  private explorerProblemsMap: Map<number, Problem[]> = new Map<number, Problem[]>();
  private problemContentMap: Map<string, ProblemContent> = new Map<string, ProblemContent>();
  private maxPage = 0;

  public async refreshCache(): Promise<void> {
    this.dispose();
  }

  public async getProblemsByPage(page: number, force: boolean = false): Promise<Problem[] | undefined> {
    let items = this.explorerProblemsMap.get(page);
    if (!items || items.length == 0 || force) {
      items = await this.listProblems(page);
    }
    return items;
  }

  public async getProblemContentById(id: string, force: boolean = false): Promise<ProblemContent | undefined> {
    let item: ProblemContent | undefined = this.problemContentMap.get(id);
    if (!item || force) {
      item  = await this.fetchProblemContent(id);
    }
    return item;
  }

  public getMaxPage (): number {
    return this.maxPage;
  }

  public isLogin (): boolean {
    // TODO
    return true;
  }

  public getCookie (): string {
    // TODO
    return COOKIE;
  }

  public dispose(): void {
    this.explorerProblemsMap.clear();
    this.problemContentMap.clear();
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
      const html = await response.text();
      let items = this.parseProblems(html);
      if (items && items.length > 0) {
        this.explorerProblemsMap.set(page, items);
      }
      return items;
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
      let node = new Problem();
      // id: string, name: string, state: ProblemState, difficulty: string, passRate: string

      $('td', this).each(function (i, v) {
        switch(i) {
          case 0:
            let text = $(this).html() || "";
            if (text.indexOf("已通过这道题目") >= 0) {
              node.state = ProblemState.ACCEPTED;
            } else if (text.indexOf("尝试过") >= 0) {
              node.state = ProblemState.TRY;
            }
            break;
          case 1:
            node.index = $(this).text().trim();
            break;
          case 2:
            node.name = $(this).text().trim();
            node.id = $('a', this).attr('href') || "";
            let i = node.id.lastIndexOf('/', node.id.length - 2);
            node.id = node.id.substring(i + 1, node.id.length - 1);
            break;
          case 3:
            node.passRate = $(this).text().trim();
            break;
          case 4:
            node.difficulty = $(this).text().trim();
            break;       
        }
      });
      nodes.push(node);
      // console.log('find node :', node);
    });
    // 最后一页
    const that = this;
    $('.pagination li').each(function (index, value) {
      if ($(this).text().trim() === '»') {
        let text = $('a', this).attr('href') || "";
        text = text.substring('/problem/'.length, text.length - 1);
        that.maxPage = parseInt(text) || 0;
      }
      // »
    });
    return nodes;
  }

  // 获取问题的内容
  public async fetchProblemContent (id: string): Promise<ProblemContent| undefined> {
    console.log('getProblemContent() ' + id);

    try {
      let config = {
        method: 'get',
        headers: HEADERS
      }

      const response = await fetch(`https://www.acwing.com/problem/content/description/${id}/`, config);
      // if (!response.ok) {
      //   throw new Error(`Error! status: ${response.status}`);
      // }
      const html = await response.text();
      // console.log('result is: ', html);
      let item = this.parseProblemContent(id, html);
      if (item && item.name) {
        this.problemContentMap.set(id, item);
      }
      return item;
    } catch (error) {
      if (error instanceof Error) {
        console.error('error message: ', error.message);
      } else {
        console.error('unexpected error: ', error);
      }
    }
    return Promise.resolve(undefined);
  }

  private parseProblemContent(id: string, html: string): ProblemContent | undefined {
    if (!html) return undefined;

    let item = new ProblemContent(id);
    const $ = cheerio.load(html);
    item.name = $('.problem-content-title').text().replace(/\n/g, '').trim();
    item.contentHtml = $('.main-martor-content').html() || "";
    $('.table-responsive tbody tr').each(function (index, value) {
      let vd: string[] = [];
      switch (index) {
        case 0:
          // 难度
          item.difficulty = $('td span', this).text().trim();
          break;
        case 1:
          // 时空限制
          item.limit = $('td span', this).text().trim();
          break;
        case 2:
          // 通过
          item.accepted = $('td span', this).text().trim();
          break;
        case 3:
          // 未通过
          item.submissions = $('td span', this).text().trim();
          break;
        case 4:
          // 来源
          item.source = $('td span', this).text().trim();
          break;
        case 5:
          // 标签
          item.tags = [];
          let str = $('td', this).html() || "";
          let i = str.indexOf('keywords = "');
          let i2 = str.indexOf('".replace');
          if (i > 0 && i2 > 0 && i2 > i) {
            str = str.substring(i + 'keywords = "'.length, i2);
            if (str) {
              item.tags = str.split(',');
            }
          }
          break;
        default:
          console.log('parseProblemContent() error.');
      }
    });
    // 样例
    item.codeStdin = $('#run-code-stdin').text();

    // 解析代码模板
    let codeToolHtml: string = $('#code_tool_bar').html() || "";
    item.codeTemplate = this.parseCodeTemplate(codeToolHtml);
    console.log('parseProblemContent() ' + id, item);
    return item;
  }

  private parseCodeTemplate(codeToolHtml: string): object | undefined {
    if (!codeToolHtml) {
      return undefined;
    }

    const keyword = 'let problem_code_show_mappings = '
    let i1 = codeToolHtml.indexOf(keyword);
    if (i1 < 0) {
      return undefined;
    }
    let i2 = codeToolHtml.indexOf('</script>', i1 + keyword.length);
    if (i2 < 0) {
      return undefined;
    }
    try {
      let data = codeToolHtml.substring(i1 + keyword.length, i2);
      console.log('codeToolTemplate 1111 => ', data);

      let i3 = data.lastIndexOf("}");
      data = data.substring(0, i3 + 1);
      console.log('codeToolTemplate html => ', data);
      var obj = (0, eval)('(' + data + ')');
      return obj;
    } catch(e) {
      console.error(e);
    }
    return undefined;
  }
}

export const acwingManager: AcwingManager = new AcwingManager();
