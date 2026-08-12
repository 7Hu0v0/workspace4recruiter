---
name: recruiter-workbench
description: Set up and customize the open-source Recruiter Workbench when the user says "工作台启动", asks an agent to read workspace4recruiter, or wants a local recruiting dashboard for planning, candidate tracking, target organization mapping, talent reserve boards, outreach templates, local backups, or optional backend sync.
---

# Recruiter Workbench

## Overview

Use this skill to turn this repository into a user's own recruiting workbench. Start from the privacy-safe template and only add user-specific details after asking for them.

## Trigger

When the user says `工作台启动`, respond in Chinese unless the user prefers another language. Explain that you will customize the workbench and ask for the minimum missing information.

Suggested first response:

```text
我已读取 Recruiter Workbench。为了帮你定制工作台，请告诉我：
1. 你的显示名是什么？
2. 你主要招聘哪些岗位/方向？
3. 你想预置哪些目标组织、团队或业务方向？
4. 首页导览、底部快捷入口、ToDo、OKR、CRM、目标组织、人才储备、话术模板、数据管理这些模块里，哪些要保留或改名？
5. 是否需要嵌入外部文档或接入同步后端？没有也可以先用本地模式。
```

## Customization Workflow

1. Inspect `README.md` and `AGENTS.md` for repository-level rules.
2. If opening the workbench locally, start a static server first with `npm start`; then open the Workbench URL printed in the terminal.
3. If `localhost` shows `ERR_CONNECTION_REFUSED`, the static server is not running or the wrong port is open. Start/restart the server and use the printed URL before changing HTML. If port 8080 is busy, `npm start` automatically chooses the next available port.
4. Inspect `index.html` for visible labels and defaults.
5. Inspect `target-company/data-store.js` when changing default business directions.
6. Inspect `talent-reserve.html` when changing talent reserve fields or copy.
7. Inspect the homepage navigation in `renderEmptyState()`, `SYSTEM_META`, and bottom jump bar handlers when changing first-screen modules.
8. Make scoped edits. Do not add private defaults to this template repository.
9. Run a residue scan before finishing.

Use placeholders when the target is a reusable public template. Use real names, links, and tokens only in a user's private fork or local copy after explicit instruction.

## Common Edits

- Display name: update visible user label and greeting text in `index.html`.
- Homepage: update the four system cards in `renderEmptyState()` and the bottom shortcut labels/handlers together.
- Recruiting scope: update the landing-page subtitle/description and planning placeholders.
- Target organizations: update `loadTargetOrgNames()` in `index.html`, and update seed businesses in `target-company/data-store.js`.
- Embeddable document: keep the default empty in public templates. For a private copy, ask the user for a URL that permits iframe embedding, then set it through the UI or update the `MINGDAN_KEY` initialization.
- Backend sync: keep `autoSync: false` and `baseUrl: ''` by default. Only set `baseUrl` or token in a private local copy.
- Module naming: update sidebar labels, `SYSTEM_META`, breadcrumbs, and matching `data-type` labels together.
- Data manager: treat snapshots, revisions, event logs, and git backup as private-user features. Keep public templates free of real repository URLs, tokens, and sync endpoints.

## Privacy Checklist

Before delivering changes, scan at least:

```bash
rg -n "doc\\.weixin|scode=|token|secret|api[_-]?key|/Users/|file:///|@[A-Za-z0-9._%+-]+\\.[A-Za-z]{2,}|[0-9]{3}[- ]?[0-9]{4}[- ]?[0-9]{4}" .
```

Review matches manually. Some generic words such as `token` may be valid UI labels, but real token values, private URLs, emails, phone numbers, and personal paths must not remain in the public template.

## Validation

For static validation, run a local server and open the workbench:

```bash
npm start
```

Then open `http://localhost:8080/index.html`. `python3 -m http.server 8080` is an equivalent fallback.

If the terminal says port 8080 was busy, open the alternative Workbench URL printed by `npm start`.

Check that `index.html` loads, target organization mapping opens, and `talent-reserve.html` opens from the CRM module. Keep the server process running while the browser tab is open.

Also check that the first screen shows the feature-introduction/navigation cards and that the `使用工作台` link in `demo.html` enters `index.html`.
