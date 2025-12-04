Save the current conversation context to a project-specific checkpoint file.

## Instructions

1. Create `.claude/` directory in the current project if it doesn't exist
2. Create or update `.claude/context.md` with the following information:

### File Structure
```markdown
# Project Context Checkpoint

**Last Updated:** [current date and time]
**Project:** [project name from current working directory]

## Summary
[2-3 sentence summary of what was discussed/accomplished in this session]

## What Was Done
[Bullet list of completed tasks]

## Current State
[Description of the current state of the project/task]

## Pending/Next Steps
[What remains to be done]

## Key Decisions Made
[Important decisions or choices made during this session]

## Files Changed
[List of files created or modified]

## Reference Links
[Links to relevant documentation or other context files]

## Resume Instructions
[What to tell Claude in a new session to continue from this point]
```

3. Ask the user for any specific details they want to include
4. Write the context file
5. Confirm the file was saved and show its location

Keep the context concise but complete enough to resume work in a new session.
