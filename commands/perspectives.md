Get multiple perspectives on a question by spawning parallel Claude instances.

## Usage
```
/perspectives [count] <question>
```

## Instructions

When user runs this command:

1. Parse the arguments:
   - Optional count (2-5, default 3)
   - The question/topic to get perspectives on

2. Spawn multiple parallel Task agents with different perspective prompts:

   **Perspective 1 - Practical:** "Answer with a practical, implementation-focused perspective"
   **Perspective 2 - Analytical:** "Answer with a thorough, analytical perspective considering edge cases"
   **Perspective 3 - Creative:** "Answer with a creative, alternative approach perspective"
   **Perspective 4 - Critical:** "Answer with a critical, devil's advocate perspective - what could go wrong"
   **Perspective 5 - Simple:** "Answer with a simplified, beginner-friendly explanation"

3. Run all perspectives in PARALLEL using the Task tool with `run_in_background: true`

4. Collect all responses and present them clearly:
   ```
   🔀 Perspectives on: "<question>"

   --- Perspective 1: Practical ---
   <response>

   --- Perspective 2: Analytical ---
   <response>

   ...
   ```

## Example

```
User: /perspectives 3 what is the best way to handle authentication?