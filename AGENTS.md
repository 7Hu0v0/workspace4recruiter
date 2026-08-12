# Agent Startup

When the user says `工作台启动`, treat this repository as a customizable recruiter workbench template.

## Startup Flow

1. Read `skills/recruiter-workbench/SKILL.md`.
2. Before opening a localhost URL, start a static server from the repository root with `npm start` or `python3 -m http.server 8080`, keep that process running, then open `http://localhost:8080/index.html`.
3. If the browser shows `ERR_CONNECTION_REFUSED`, do not debug the HTML first. Start or restart the static server and retry the same URL.
4. Inspect `index.html`, `talent-reserve.html`, and `target-company/` only as needed.
5. Ask for missing customization details before writing personal data:
   - display name
   - role or recruiting scope
   - target organization names
   - preferred module labels
   - embeddable document URL, if any
   - backend sync URL and token, if any
6. Keep all user-specific data local to the user's copy. Do not commit private names, company data, tokens, contacts, or document links back to this template repository.
7. After editing, scan for obvious private residue before finishing.

## Privacy Rules

- Do not add real candidates, contact details, private links, internal project names, access tokens, or employer-specific materials unless the user explicitly asks and the target is their private fork.
- Prefer placeholders in reusable examples.
- Keep remote sync disabled by default.

## Useful Files

- `index.html`: main workbench application.
- `talent-reserve.html`: standalone talent reserve board.
- `target-company/`: target organization mapping module.
- `skills/recruiter-workbench/SKILL.md`: startup and customization skill.
