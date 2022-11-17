# AcWing README
一款可以在vscode中开心的刷[acwing](https://www.acwing.com/)题目的插件。
大量代码~~参考~~（CTRL+V）自[vscode-leetcode插件](https://github.com/LeetCode-OpenSource/vscode-leetcode)，感恩。


## Features

* 支持AcWing题目分页预览
* 支持测试，提交代码

<p align="center">
  <img src="https://raw.githubusercontent.com/dongxuan/acwing-vscode-plugin/main/docs/p1.png" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/dongxuan/acwing-vscode-plugin/main/docs/p2.jpg" />
</p>


下个版本计划（~~如果有的话~~）：

* 添加搜索功能
* 按照标签，难度展示题目(?)
* 测试提交数据优化，新开网页显示结果，不再使用output（颜色不支持呀）


## Source code & Bug report

https://github.com/dongxuan/acwing-vscode-plugin

尽量修复，来不及修复的话，老哥们就fork一个自己改吧。

## Extension Settings

### 相关配置

* `acWing.cookies`: Acwing cookie配置，有cookie才可以进行代码测试提交
> 注意：由于AcWing一登录会踢掉另外一端，所以只好用配置cookie的方式登录。请打开acwing网站并登录，按F12调出控制台，并按下图截取cookie进行配置（不要使用js的document.cookie获取，那个获取的cookie不全）。

<p align="center">
  <img src="https://raw.githubusercontent.com/dongxuan/acwing-vscode-plugin/main/docs/cookie.jpg" />
</p>

* `acWing.defaultLanguage`: 默认编程语言
* `acWing.workspaceFolder`: 代码存储目录
* `acWing.colorizeProblems`: 是否显示难度的颜色
* `acWing.clickProblemItem`: 点击题目时的动作，可以配置为预览题目，打开编辑器，或者同时显示题目和编辑器
* `acWing.editor.shortcuts`: 配置编辑器中的快捷方式

### 快捷操作

* `acWing.setCookie`: 设置cookie
* `acWing.clear`: 清理缓存
* `acWing.gotoPage`: 跳转到题目页面
* `acWing.previewProblem`: 预览对应ID的题目
* `acWing.editProblem`: 编辑对应ID的题目

> 注意：题目ID是类似于 https://www.acwing.com/problem/content/39/
中的39，而非题目标题中的数字，AcWing中一些题目链接和标题的数字不匹配。


## Release Notes

### 1.0.0

初始版本，支持基础功能

---

**Enjoy!**
