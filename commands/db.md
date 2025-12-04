---
description: Switch database connection and query instructions (user)
---
Args:`$ARGUMENTS` Config:`~/.claude/cmd_db/db-config.json`
Actions: help=list dbs, init=ask db+env, env=ask env only, db=ask db only, <name>=switch db
Query: `node ~/.claude/cmd_db/db-query.js --db <name> [--global|--local] "SQL"`
Env: local(project .env default), global(~/.claude/db-credentials.env)
History: --history, --run <n>, --clear-history
Schema: --tables, --schemas, --describe <table>

**IMPORTANT**: For `init`, `db`, or `help` actions:
1. FIRST read `~/.claude/cmd_db/db-config.json`
2. Extract database names from the `databases` object keys (e.g., "dev", "qa_naharia", "lior_test")
3. Use those exact names + their descriptions when presenting database options via AskUserQuestion
4. Always include the local/global env choice as a separate question
