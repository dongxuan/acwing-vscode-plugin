// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import { Disposable } from "vscode";
import { Problem } from './Problem'
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
  private explorerProblemsMap: Map<string, Problem> = new Map<string, Problem>();
  private problemContentMap: Map<string, ProblemContent> = new Map<string, ProblemContent>();
  
  private acWingSocket: WebSocket | undefined;
  private acWingSocketReady: boolean = false; 
  private acWingHeartbeatIntervalID: NodeJS.Timer | undefined;

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

  public async getProblemContentById(id: string): Promise<ProblemContent | undefined> {
    let item: ProblemContent | undefined = this.problemContentMap.get(id);
    if (item) {
      return item;
    }
    item  = await this.fetchProblemContent(id);
    return item;
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
      // console.log('find node :', node);
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

  public createAcWingSocket () {
    console.log('createAcWingSocket()');
    if (this.acWingSocket) {
      this.acWingSocket.close();
    }

    this.onCloseAcWingSocket();
  
    this.acWingSocket = new WebSocket("wss://www.acwing.com/wss/socket/", {
      headers: HEADERS
    });

    // set listener
    const that = this;
    this.acWingSocket.on('open', function open() {
      console.log('open socket.')
    });

    this.acWingSocket.on('message', function message(data) {
      console.log('received: %s', data);
      let ev = JSON.parse(data.toString());

      if ("socket" === ev.activity && ev.state== "ready") {
        // set socket ready Flag
        that.acWingSocketReady = true;
        console.log('acWingSocket ready.');

        // 心跳包维持
        that.acWingHeartbeatIntervalID = setInterval(function() {
          that.acWingSocket?.send({ activity: "heartbeat"})
        }, 3e4);
      }
    });
  
    this.acWingSocket.on('error', function message(data) {
      console.log('error: %s', data);
    });
  
    this.acWingSocket.on('close', function message(data) {
      console.log('close: %s', data);
      that.onCloseAcWingSocket();
    });
  }

  private onCloseAcWingSocket() {
    console.log('onCloseAcWingSocket()');

    this.acWingSocketReady = false;
    if (this.acWingHeartbeatIntervalID) {
      clearInterval(this.acWingHeartbeatIntervalID);
      this.acWingHeartbeatIntervalID = undefined;
    }
  }

  private sendAcWingSocket(data: string): boolean {
    console.log('sendAcWingSocket() ' + data);

    if (!this.acWingSocketReady) {
      this.createAcWingSocket();

      const that = this;
      setTimeout(function() {
        that.acWingSocket?.send(data);
      }, 3000);
      return false;
    } else {
      this.acWingSocket?.send(data);
      return true;
    }
  }

  public addSocketEventListener (cb: (event: WebSocket.MessageEvent) => void) {
    return this.acWingSocket?.addEventListener("message", cb);
  }

  public removeSocketEventListener (cb: (event: WebSocket.MessageEvent) => void) {
    return this.acWingSocket?.removeEventListener("message", cb);
  }

  public runCode (problemID: string, code:string, input: string, lang: string): boolean {
    let data = {
      'activity': "problem_run_code",
      'problem_id': parseInt(problemID),
      'code': code,
      'language': lang,
      'input': input,
    };
    console.log('runCode()', data);
    return this.sendAcWingSocket(JSON.stringify(data));
  }

  public submitCode (problemID: string, code:string, lang: string) {
    const data = {
      'activity': "problem_submit_code",
      'problem_id': problemID,
      'code': code,
      'language': lang,
      'mode': 'normal',
      'problem_activity_id': 0,
      'record': [],
      'program_time': 0,
    }
    console.log('submitCode()', data);
    return this.sendAcWingSocket(JSON.stringify(data));
  }
}

export const acwingManager: AcwingManager = new AcwingManager();
