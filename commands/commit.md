Create a git commit for the current changes.

## Instructions

1. Run `git status` to see all changed/untracked files
2. Run `git diff --staged` and `git diff` to understand the changes
3. Run `git log -3 --oneline` to see recent commit style

4. Analyze the changes and draft a concise commit message:
   - Use conventional commit format if the repo uses it (feat:, fix:, chore:, etc.)
   - Keep the first line under 72 characters
   - Focus on WHAT changed and WHY, not HOW
   - Match the existing commit style in the repo

5. Show the user:
   - Files to be committed
   - Proposed commit message
   - Ask for confirmation or edits

6. Once confirmed:
   - Stage relevant files with `git add`
   - Commit with the message (NO emoji footer, NO Co-Authored-By)

## Important Rules
- Do NOT add any footer like "Generated with Claude Code"
- Do NOT add "Co-Authored-By" lines
- Do NOT add emojis unless the repo style uses them
- Keep commits clean and professional
- If user provides a message, use it as-is

## Example Flow
```
User: /commit
Assistant:
Changes detected:
- Modified: src/db.ts
- New file: src/helpers/utils.ts

Proposed commit message:
"Add database initialization wrapper"

Proceed with commit? (y/n/edit)
```
