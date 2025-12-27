---
description: Fetch bugs from Monday.com COVIEW board (user)
---

Args: `$ARGUMENTS`
API: Monday.com GraphQL (https://api.monday.com/v2)
Board: 9815738160 (COVIEW - Backlog)
User: Amos Dabush (97673527)

## Commands

| Action | Description |
|--------|-------------|
| `bugs` | Fetch all bugs assigned to Amos Dabush |
| `item <id>` | Fetch specific bug details by ID |
| `test` | Test API connection |
| (empty) | Show help |

## Usage

```bash
# Fetch all my bugs
node ~/.claude/skills/monday/monday-api.js bugs

# Get specific item
node ~/.claude/skills/monday/monday-api.js item 10846559856

# Test connection
node ~/.claude/skills/monday/monday-api.js test
```

## When User Says

| Request | Action |
|---------|--------|
| `/monday` or `/monday bugs` | Run `node ~/.claude/skills/monday/monday-api.js bugs` and display results |
| `/monday item <id>` | Run `node ~/.claude/skills/monday/monday-api.js item <id>` |
| `/monday test` | Run `node ~/.claude/skills/monday/monday-api.js test` |
| "show my bugs" | Run bugs command |
| "what bugs do I have" | Run bugs command |

## Output Format

Group bugs by status (Code Review, Pending Deploy, Ready to Start, etc.)
Show severity with icons:
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- ⚪ Low/N/A

## Config Location

Token and settings: `~/.claude/skills/monday/.env`
Skill docs: `~/.claude/skills/monday/SKILL.md`
