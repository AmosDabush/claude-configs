# /skill-db-review

Review pending database items and add business descriptions to coview-db-expert skill.

## What It Does

1. Lists items in Pending Review section that need description
2. For each item, prompts for business description
3. Updates SKILL.md with the description
4. Marks item as reviewed

## Usage

List pending items:
```bash
node ~/.claude/cmd_db/skill-db-review.js --list
```

Add description to a table:
```bash
node ~/.claude/cmd_db/skill-db-review.js --add-description --table patients.new_table --desc "Stores patient data"
```

Mark as reviewed without description:
```bash
node ~/.claude/cmd_db/skill-db-review.js --mark-reviewed --table patients.new_table
```

## Interactive Review

When running interactively, Claude will:
1. Show each pending item with its technical details
2. Ask what it does from a business perspective
3. Add the description to SKILL.md
4. Mark as reviewed
