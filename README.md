# Recruiter Workbench

[在线预览 Demo](https://7hu0v0.github.io/workspace4recruiter/demo.html?v=20260812-local-ip)

一个可由 agent 定制的招聘个人工作台。默认版本不包含个人姓名、公司信息、私有文档链接或预置候选人数据。

## 工作台启动

把这个仓库交给 WorkBuddy、Codex、Claude Code 或其他代码 agent，然后说：

```text
工作台启动
```

agent 应先阅读 [AGENTS.md](AGENTS.md) 和 [skills/recruiter-workbench/SKILL.md](skills/recruiter-workbench/SKILL.md)，再引导你配置：

- 使用者姓名或显示名
- 招聘方向与岗位族
- 目标组织/团队名称
- 首页导览卡片与底部快捷入口是否保留
- 是否接入可嵌入文档或自托管同步后端
- 需要保留、隐藏或改名的模块

## 功能

- 首页导览：四个系统入口、悬浮侧边栏和底部快捷跳转。
- ToDo：按今天、明天、昨天创建日任务，支持归档往期任务。
- OKR：周、月、半年规划与复盘。
- CRM：候选人运营表格、人脉档案、周/月/半年追踪与汇总。
- 目标组织：按业务方向维护目标组织、团队和进度。
- 人才储备：独立人才储备看板。
- 话术模板：按聊天、打招呼、邮件场景维护触达文案。
- 数据管理：本地备份、恢复、快照、修订回滚和可选同步后端配置。

## 直接使用

推荐用本地静态服务器打开。只在浏览器输入 `localhost` 不会自动启动服务；如果看到 `ERR_CONNECTION_REFUSED` 或 `ERR_EMPTY_RESPONSE`，说明服务还没启动、端口不对，或 `localhost` 被系统解析到了另一个本地服务。

```bash
npm start
```

然后访问终端打印出来的 `Workbench` 地址，默认是 `http://127.0.0.1:8080/index.html`。

如果 `8080` 被占用，启动脚本会自动换到下一个可用端口，并在终端打印实际访问地址。

等价 Python 命令：

```bash
python3 -m http.server 8080
```

也可以直接打开 `index.html`。如果要使用模块间跳转和浏览器权限，推荐用静态服务器，并优先使用终端打印的 `127.0.0.1` 地址。

## 数据与隐私

- 默认数据只存储在浏览器 `localStorage`。
- 默认不配置任何远端表格链接。
- 默认不同步到后端，只有用户主动填写同步地址并开启后才会请求远端。
- 示例目标组织是占位符，可由 agent 或用户替换。

## 目录

```text
.
├── AGENTS.md
├── demo.html
├── index.html
├── talent-reserve.html
├── target-company/
└── skills/recruiter-workbench/
```

## License

MIT
