Load project context from a saved checkpoint file.

## Instructions

1. Check if `.claude/context.md` exists in the current project directory
2. If it exists, read and display the context file contents
3. Summarize the key points:
   - What was done previously
   - Current state
   - Next steps / pending tasks
   - Any important decisions or notes

4. If multiple context files exist (e.g., `context.md`, `domain-migration-context.md`, etc.), list them and ask the user which one to load

5. If no context file exists, inform the user and suggest:
   - Check `~/.claude/docs/` for global documentation
   - Use `/save-context` to create a checkpoint

## After Loading

Once context is loaded, ask the user:
"Context loaded. Would you like to continue from where you left off, or is there something specific you want to work on?"

## Context File Locations to Check
- `.claude/context.md` (primary)
- `.claude/domain-migration-context.md` (domain migration specific)
- `.claude/*.md` (any other markdown files in .claude folder)
