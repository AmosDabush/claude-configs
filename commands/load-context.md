Load project context from a saved checkpoint file.

## Instructions

1. **Find the project root**:
   - First, check if current directory is inside a git repository using `git rev-parse --show-toplevel`
   - If yes, use that as the project root
   - If not in a git repo, use the current working directory

2. **Search for context files** in `<project_root>/.claude/`:
   - Look for any `.md` files: `*.md`, `*-context.md`, `REFACTOR_SESSION.md`, etc.
   - Common patterns: `context.md`, `REFACTOR_SESSION.md`, `domain-migration-context.md`

3. **If context file(s) found**:
   - If single file: Read and display it
   - If multiple files: List them and ask user which one to load
   - Summarize key points:
     - What was done previously
     - Current state/status
     - Next steps / pending tasks
     - Any important decisions or notes

4. **If no context file exists**, inform the user and suggest:
   - Use `/save-context` to create a checkpoint
   - Check `~/.claude/docs/` for global documentation

## After Loading

Once context is loaded, ask the user:
"Context loaded. Would you like to continue from where you left off, or is there something specific you want to work on?"

## Context File Locations to Check (in order)
1. `<git_root>/.claude/*.md` (project-specific, priority)
2. `./.claude/*.md` (current directory fallback)
3. `~/.claude/docs/*.md` (global docs, mention only)
