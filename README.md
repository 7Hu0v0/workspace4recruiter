# Recruiter Workbench

一个可由 agent 定制的招聘个人工作台。默认版本不包含个人姓名、公司信息、私有文档链接或预置候选人数据，浏览器直接打开即可使用。

## 工作台启动

把这个仓库交给 WorkBuddy、Codex、Claude Code 或其他代码 agent，然后说：

```text
工作台启动
```

agent 应先阅读 [AGENTS.md](AGENTS.md) 和 [skills/recruiter-workbench/SKILL.md](skills/recruiter-workbench/SKILL.md)，再引导你配置：

- 使用者姓名或显示名
- 招聘方向与岗位族
- 目标组织/团队名称
- 是否接入在线表格或自托管同步后端
- 需要保留、隐藏或改名的模块

## 功能

- ToDo：按今天、明天、昨天创建日任务，支持归档往期任务。
- OKR：周、月、半年规划与复盘。
- CRM：候选人运营表格、人脉档案、周/月/半年追踪。
- 目标组织：按业务方向维护目标组织、团队和进度。
- 人才储备：独立人才储备看板。
- 话术模板：按聊天、打招呼、邮件场景维护触达文案。
- 数据管理：本地备份、恢复、快照和可选同步后端配置。

## 直接使用

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

也可以直接打开 `index.html`。如果要使用模块间跳转和浏览器权限，推荐用静态服务器。

## 数据与隐私

- 默认数据只存储在浏览器 `localStorage`。
- 默认不配置任何远端表格链接。
- 默认不同步到后端，只有用户主动填写同步地址并开启后才会请求远端。
- 示例目标组织是占位符，可由 agent 或用户替换。

## 目录

```text
.
├── AGENTS.md
├── index.html
├── talent-reserve.html
├── target-company/
└── skills/recruiter-workbench/
```

## License

MIT
