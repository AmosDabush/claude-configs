---
description: Switch database connection and query instructions (user)
---
Args:`$ARGUMENTS` Config:`~/.claude/cmd_db/db-config.json`
Actions: help=list dbs, init=ask db+env, env=ask env only, db=ask db only, <name>=switch db
Query: `node ~/.claude/cmd_db/db-query.js --db <name> [--global|--local] "SQL"`
Env options: local(project .env default), global(~/.claude/db-credentials.env)
