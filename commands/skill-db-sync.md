# /skill-db-sync

Sync database schema with coview-db-expert skill. Discovers new tables and columns added since last sync.

## What It Does

1. Connects to the database (default: dev)
2. Fetches all tables, columns, and foreign keys
3. Compares with the last known state
4. Reports any new tables or columns
5. Adds new items to Pending Review section in coview-db-expert SKILL.md

## Usage

Run the sync:
```bash
node ~/.claude/cmd_db/skill-db-sync.js --db dev
```

Options:
- `--db <name>` - Database to sync from (dev, qa_naharia, lior_test, lior_test2). Default: dev
- `--dry-run` - Show what would change without making changes
- `--verbose` - Show detailed output

## First Run

On first run, it establishes a baseline without reporting anything as new.
Future syncs detect only tables/columns added after that point.

## After Sync

If new items found, run `/skill-db-review` to add business descriptions.
