# Database Configuration (Global)

This file contains global database configuration used by the `/db` command.

## Credentials Location

**IMPORTANT:** Database credentials are stored separately in:
```
~/.claude/db-credentials.env
```

Load credentials before use:
```bash
source ~/.claude/db-credentials.env
```

## Paths

```
DB_QUERY_SCRIPT=/Users/amosdabush/.claude/cmd_db/db-query.js
CREDENTIALS_FILE=/Users/amosdabush/.claude/db-credentials.env
```

## Env File Locations

| Env Type | Path | Query Flag |
|----------|------|------------|
| `cmd-db-env` | `/Users/amosdabush/.claude/cmd_db/.env` | `--local` |
| `local-env` | Current project's `.env` | (none) |
| `credentials` | `~/.claude/db-credentials.env` | N/A |

## Available Databases

| Name | Host Variable | User Variable | DB Variable |
|------|---------------|---------------|-------------|
| dev (coview-dev) | `DEV_POSTGRES_HOST` | `DEV_POSTGRES_USER` | `DEV_POSTGRES_DB` |
| qa (naharia) | `QA_POSTGRES_HOST` | `QA_POSTGRES_USER` | `QA_POSTGRES_DB` |
| lior_test2 | `LIOR_TEST2_POSTGRES_HOST` | `LIOR_TEST2_POSTGRES_USER` | `LIOR_TEST2_POSTGRES_DB` |

## Query Command Template

```bash
# Load credentials first
source ~/.claude/db-credentials.env

# With local-env (current project's .env) - no flag
node ${DB_QUERY_SCRIPT} "SQL_QUERY"

# With dcc-env (db-connector-cloud's .env) - use --local flag
node ${DB_QUERY_SCRIPT} "SQL_QUERY" --local
```

## Security Notes

- Credentials file should have permissions `600` (owner read/write only)
- Never commit `db-credentials.env` to version control
- Consider rotating passwords periodically
