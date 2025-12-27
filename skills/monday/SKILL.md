---
name: "monday"
description: "Fetch and manage bugs from Monday.com COVIEW board. Query bugs by assignee, status, severity."
---

# Monday.com Bug Tracker Skill

## Quick Start

**Just ask naturally:**
- "תביא לי את הדוק של C-555"
- "דוקים לכל הבאגים שלי ב-Code Review"
- "דוקים לבאגים HIGH"
- "דוק לבאג עם פילטר בשם"
- "מה הבאגים שלי?"
- "עדכן את C-555 ל-Done"

**Or use commands:**
```bash
/monday bugs                    # All my bugs
/monday docs C-555 C-554        # Download docs by bug number
/monday docs C-555 --original   # Without metadata page
/monday set-status C-555 "Done" # Update status
```

## Configuration

| Key | Value |
|-----|-------|
| API Endpoint | https://api.monday.com/v2 |
| Board ID | 9815738160 (COVIEW - Backlog) |
| User ID | 97673527 (Amos Dabush) |
| Account | mohgov.monday.com |

### Column IDs

| Column | ID | Description |
|--------|-----|-------------|
| Assignee | `multiple_person_mkv1gsr7` | Person assigned to bug |
| Dev Status | `color_mkttqd24` | Development status (Code Review, Pending Deploy, etc.) |
| Bug Severity | `color_mkttf1dq` | Critical, High, Medium, Low |

## Token Management

Token is stored in: `~/.claude/skills/monday/.env`

To update token:
1. Go to https://mohgov.monday.com/apps/manage/tokens
2. Generate new token with `me:write` scope
3. Update `~/.claude/skills/monday/.env`

## API Usage

### Fetch My Bugs

```bash
node ~/.claude/skills/monday/monday-api.js bugs
```

### Fetch Item Details

```bash
node ~/.claude/skills/monday/monday-api.js item <item_id>
```

### Update Bug Status

```bash
node ~/.claude/skills/monday/monday-api.js set-status <item_id> "Done"
```

Valid statuses: `Done`, `In Progress`, `Code Review`, `Pending Deploy`, `Stuck`

### GraphQL Query Examples

**Fetch all items with columns:**
```graphql
{
  boards(ids: [9815738160]) {
    items_page(limit: 100) {
      items {
        id
        name
        column_values(ids: ["multiple_person_mkv1gsr7", "color_mkttqd24", "color_mkttf1dq"]) {
          id
          text
        }
      }
    }
  }
}
```

**Fetch single item:**
```graphql
{
  items(ids: [<item_id>]) {
    id
    name
    column_values {
      id
      text
    }
  }
}
```

**Update status column:**
```graphql
mutation {
  change_column_value(
    item_id: <item_id>,
    board_id: 9815738160,
    column_id: "color_mkttqd24",
    value: "{\"label\":\"Done\"}"
  ) {
    id
    name
  }
}
```

## Dev Status Values

| Status | Meaning |
|--------|---------|
| Code Review | Ready for code review |
| Pending Deploy | Code merged, waiting for deployment |
| In Progress | Currently being worked on |
| Done | Completed |
| Stuck | Blocked |

## Bug Severity Values

| Severity | Priority |
|----------|----------|
| Critical | P0 - Fix immediately |
| High | P1 - Fix this sprint |
| Medium | P2 - Fix when possible |
| Low | P3 - Nice to have |

## Instructions for Claude

When user invokes `/monday` or asks about Monday bugs/docs:

### Basic Commands

1. **`/monday bugs`** - Fetch all bugs assigned to Amos Dabush
   - Run: `node ~/.claude/skills/monday/monday-api.js bugs`
   - Display: Name, Status, Severity, ID

2. **`/monday item <id>`** - Fetch specific bug details
   - Run: `node ~/.claude/skills/monday/monday-api.js item <id>`
   - Display: Full item details with all columns

3. **`/monday set-status <id> "<status>"`** - Update bug status
   - Run: `node ~/.claude/skills/monday/monday-api.js set-status <id> "<status>"`
   - Valid statuses: Done, In Progress, Code Review, Pending Deploy, Stuck

4. **`/monday docs C-555 C-554 ...`** - Download bug documents
   - Accepts bug numbers (C-XXX) or item IDs
   - Run: `node ~/.claude/skills/monday/monday-api.js docs C-555 C-554`

### Natural Language Queries

When user asks about bugs or docs in natural language:

1. **Fetch bugs**: `node ~/.claude/skills/monday/monday-api.js bugs`
2. **Filter** by what user asked (status, severity, date, name, etc.)
3. **Run docs**: `node ~/.claude/skills/monday/monday-api.js docs C-555 C-554 ...`
4. **Open files**: `open ~/.claude/skills/monday/downloads/*.pdf`

**Examples:**
| בקשה | פעולה |
|------|-------|
| "דוקים לבאגים ב-Code Review" | Filter: Dev Status = "Code Review" |
| "דוקים לבאגים HIGH" | Filter: Severity = "High" |
| "דוק לבאג על פילטר" | Filter: name contains "פילטר" |
| "דוקים לכל הבאגים שלי" | No filter |

## Troubleshooting

### Token Expired
Error: `{"errors":["Not Authenticated"]}`
Solution: Generate new token at https://mohgov.monday.com/apps/manage/tokens

### Empty Results
- Check if user is assigned (column `multiple_person_mkv1gsr7`)
- Try fetching all items without filter first

### Rate Limiting
Monday.com has rate limits. If you hit them, wait a few seconds.

---

## Doc Downloads

Downloads bug documents from Monday.com as PDF, Markdown, or Word.

### Download Docs
```bash
# As PDF (default)
node ~/.claude/skills/monday/monday-api.js docs <item_id>

# As Markdown
node ~/.claude/skills/monday/monday-api.js docs <item_id> --md

# As Word
node ~/.claude/skills/monday/monday-api.js docs <item_id> --docx

# Multiple bugs at once
node ~/.claude/skills/monday/monday-api.js docs <id1> <id2> <id3> --pdf
```

### Where files are saved
`~/.claude/skills/monday/downloads/`

### How it works
1. Playwright opens Monday.com (headless) with auto-login
2. Navigates to the doc
3. For PDF: Uses Print → page.pdf() (preserves Hebrew)
4. For MD/DOCX: Clicks menu → Export → format
5. Downloads the file

### Parallel Downloads
Downloads run in batches of max 6:
- 11 docs → 6+5 (achieves 11/11 success)
- Status display with progress per item
- Downloads folder link shown immediately
- Note: More than 6 concurrent causes Monday.com timeouts

### Credentials
Stored in `~/.claude/skills/monday/.env`:
- `MONDAY_EMAIL` - Login email
- `MONDAY_PASSWORD` - Login password

## Instructions for Claude - Doc Downloads

**When user asks for bug docs (e.g., "תביא לי את הדוקים של C-541, C-555, C-549"):**

### Step 1: Get bugs list and find item IDs
```bash
node ~/.claude/skills/monday/monday-api.js bugs
```
From output, extract item IDs from the Link field:
- `Link: .../pulses/10847290328?doc_id=...` → item ID is `10847290328`

### Step 2: Download all docs
```bash
node ~/.claude/skills/monday/monday-api.js docs <id1> <id2> <id3> --pdf
```
Default format is PDF. User can specify: `--md` or `--docx`

### Step 3: Open files and report
After download, open the files directly and report:
```bash
# Open all downloaded PDFs
open ~/.claude/skills/monday/downloads/*.pdf

# Or open the folder
open ~/.claude/skills/monday/downloads/
```

Report to user:
```
הורדתי 3 קבצים ופתחתי אותם:
- C-541 - תיאור הבאג.pdf
- C-555 - תיאור הבאג.pdf
- C-549 - תיאור הבאג.pdf

הקבצים נשמרו ב: ~/.claude/skills/monday/downloads/
```

### Complete Example Flow:
```
User: "תביא לי את הדוקים של C-541, C-555"

Claude:
1. Runs: node ~/.claude/skills/monday/monday-api.js bugs | grep -E "C-541|C-555"
   Output shows:
   - C-541 → item ID 10847290328
   - C-555 → item ID 10850501476

2. Runs: node ~/.claude/skills/monday/monday-api.js docs 10847290328 10850501476 --pdf

3. Opens the files: open ~/.claude/skills/monday/downloads/*.pdf

4. Reports:
   הורדתי 2 קבצים ופתחתי אותם:
   - C-541 - התוכן ברכיב מידע....pdf
   - C-555 - סינון לפי שינוע....pdf
```

### Formats
- `--pdf` → PDF document (default, with metadata header)
- `--docx` → Microsoft Word
- `--md` → Markdown text

### Metadata Header (PDF only)
By default, PDFs include a metadata page with:
- Dev Status, Assignee, Owner, Bug Severity
- Item Type, Priority, Reporter, Date
- QA Status, Bug Type, Prod/Test, Feature, Epic

To skip metadata and get original doc only:
```bash
/monday docs 10847290328 --original
```

### Downloads folder
`~/.claude/skills/monday/downloads/`

To open folder: `open ~/.claude/skills/monday/downloads/`

## Changelog

| Date | Change |
|------|--------|
| 2025-12-26 | Added doc download with Playwright |
| 2025-12-25 | Initial skill creation |
