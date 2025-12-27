Break down a problem into investigation branches and explore each in parallel.

## Usage
```
/investigate <problem description>
```

## Instructions

When user runs this command:

1. **Analyze the problem** and break it down into 3-5 investigation branches

   For example, "slow dashboard rendering" might break into:
   - Backend API performance and database queries
   - Frontend React component rendering
   - Network requests and payload sizes
   - Browser performance and memory usage

2. **Present the branches** to the user:
   ```
   🌳 Investigation Plan for: "<problem>"

   I'll investigate these branches in parallel:
   1. <branch 1>
   2. <branch 2>
   3. <branch 3>
   ...
   ```

3. **Spawn parallel Task agents** for each branch using `run_in_background: true`

   Each agent should:
   - Focus ONLY on its assigned investigation area
   - Search relevant code, configs, logs
   - Provide specific findings and recommendations
   - Be concise but thorough

4. **Collect results** from all branches using TaskOutput

5. **Present findings** organized by branch:
   ```
   🌳 Investigation Results

   --- Branch 1: Backend API ---
   <findings>

   --- Branch 2: Frontend ---
   <findings>
   ...
   ```

6. **Provide summary** with:
   - Key findings across all branches
   - Prioritized action items
   - Recommended next steps

## Example

```
User: /investigate memory leak in background worker