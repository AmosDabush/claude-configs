---
description: Sync ~/.claude configs to git repo and commit
---

Run the sync script and commit changes to the claude-configs repo.

Steps:
1. Run `~/claude-configs/sync.sh` to copy files from ~/.claude to the repo
2. Run `cd ~/claude-configs && git status` to show what changed
3. Ask user for commit message (or use default "Sync claude configs")
4. Run `git add . && git commit -m "<message>" && git push`
5. Report success or any errors
