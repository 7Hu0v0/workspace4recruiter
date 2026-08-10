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
3. 你想预置哪些目标组织或团队？
4. 是否要接入在线表格或同步后端？没有也可以先用本地模式。
```

## Customization Workflow

1. Inspect `README.md` and `AGENTS.md` for repository-level rules.
2. Inspect `index.html` for visible labels and defaults.
3. Inspect `target-company/data-store.js` when changing default business directions.
4. Inspect `talent-reserve.html` when changing talent reserve fields or copy.
5. Make scoped edits. Do not add private defaults to this template repository.
6. Run a residue scan before finishing.

Use placeholders when the target is a reusable public template. Use real names, links, and tokens only in a user's private fork or local copy after explicit instruction.

## Common Edits

- Display name: update visible user label and greeting text in `index.html`.
- Recruiting scope: update the landing-page subtitle/description and planning placeholders.
- Target organizations: update `loadTargetOrgNames()` in `index.html`, and update seed businesses in `target-company/data-store.js`.
- Online sheet: keep the default empty in public templates; for a private copy, set it through the UI or update the `MINGDAN_KEY` initialization.
- Backend sync: keep `autoSync: false` by default. Only set `baseUrl` or token in a private local copy.
- Module naming: update sidebar labels, `SYSTEM_META`, breadcrumbs, and matching `data-type` labels together.

## Privacy Checklist

Before delivering changes, scan at least:

```bash
rg -n "Jefferson|7Hu0v0|WorkBuddy|腾讯|企业微信|doc\\.weixin|scode=|token|secret|api[_-]?key|/Users/|@[^\\s]+\\.[^\\s]+" .
```

Review matches manually. Some generic words such as `token` may be valid UI labels, but real token values, private URLs, emails, phone numbers, and personal paths must not remain in the public template.

## Validation

For static validation, run a local server and open the workbench:

```bash
python3 -m http.server 8080
```

Check that `index.html` loads, target organization mapping opens, and `talent-reserve.html` opens from the CRM module.
