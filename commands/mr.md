# GitLab MR Creation

Create a GitLab merge request for the current branch.

## Instructions

1. First check if there are uncommitted changes with `git status`
2. If there are changes, ask user if they want to commit them first
3. Get the current branch name
4. Create the MR following these rules:

### Assignee & Reviewer
- Assignee: Amos.Dabush
- Reviewer: maayan.koren

### Title Format
Convert the branch name to title:
1. Capitalize the first letter
2. Replace `-` with spaces
3. Keep the prefix (feature/, bugfix/, test/, etc.)

Examples:
| Branch Name               | MR Title                  |
|---------------------------|---------------------------|
| feature/super-component   | Feature/super component   |
| bugfix/fix-login-issue    | Bugfix/fix login issue    |
| feature/add-new-dashboard | Feature/add new dashboard |
| test/test-mr-creation     | Test/test mr creation     |

### Description
Match the description to what was actually changed in the commits on this branch vs main.

### Command Template
```bash
glab mr create \
  --title "TITLE_HERE" \
  --description "$(cat <<'EOF'
## Summary
- Description of changes here (based on actual commits)
EOF
)" \
  --target-branch main \
  --assignee "Amos.Dabush" \
  --reviewer "maayan.koren"
```

### Clean Commits
Do NOT include Claude footer in commits when committing before MR creation.

### Output
Return the MR title and URL when done.
