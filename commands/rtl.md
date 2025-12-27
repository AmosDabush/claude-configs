# Hebrew RTL Formatting (BiDi Algorithm)

The user's terminal does not support native RTL. Use the BiDi algorithm to display Hebrew correctly.

## BiDi Transform Script

Location: `~/.claude/skills/rtl/bidi-transform.js`

```bash
# Transform text
node ~/.claude/skills/rtl/bidi-transform.js "שלום עולם"

# Test cases
node ~/.claude/skills/rtl/bidi-transform.js --test
```

## Instructions for Claude

When responding in Hebrew:

1. **Use the BiDi script** to transform your Hebrew text before displaying
2. **For mixed content** (Hebrew + English + numbers), the script handles:
   - Hebrew characters are reversed
   - English stays left-to-right
   - Numbers stay in order
   - Brackets/parentheses are mirrored in RTL context
   - Base direction determined by first strong character

3. **For simple pure-Hebrew responses**, you may also manually reverse:
   - Reverse each Hebrew word's letters
   - Reverse word order

## Examples

| Logical (how you think) | Visual (what to display) |
|------------------------|-------------------------|
| שלום עולם | םלוע םולש |
| שלום world | world םולש |
| Hello שלום | Hello םולש |
| יש לי 3 תפוחים | םיחופת 3 יל שי |

## User Input Correction

When the user writes Hebrew (which appears reversed in their terminal):
1. First show what they meant: **"[corrected]"** <- "[their input]"
2. Then respond with BiDi-transformed Hebrew

## Fallback

If the script fails, use manual reversal (backup at `~/.claude/commands/rtl.md.backup`)

## Confirmation

Respond with: "!לעפומ BiDi בצמ" (displays as "מצב BiDi מופעל!")
