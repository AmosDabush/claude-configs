# RTL Skill - Hebrew BiDi Support

Transform Hebrew text for display in LTR terminals using the Unicode Bidirectional Algorithm.

## Problem

Terminals like iTerm2 and Warp don't properly support RTL (Right-to-Left) text. Hebrew appears backwards or garbled.

## Solution

This skill implements a simplified BiDi (Bidirectional) algorithm based on Unicode UAX #9 to transform Hebrew text for correct visual display.

## Usage

```bash
# Transform a string
node ~/.claude/skills/rtl/bidi-transform.js "שלום עולם"
# Output: םלוע םולש

# Transform via stdin
echo "שלום world" | node ~/.claude/skills/rtl/bidi-transform.js
# Output: world םולש

# Run test suite
node ~/.claude/skills/rtl/bidi-transform.js --test
```

## How It Works

1. **Segment Detection**: Splits text into RTL (Hebrew/Arabic), LTR (Latin), numbers, whitespace, and punctuation
2. **Base Direction**: Determined by first strong directional character (UAX #9 Rule P2)
3. **Character Processing**:
   - Hebrew/Arabic: Characters reversed within each run
   - Latin/Numbers: Stay in original order
   - Brackets: Mirrored when adjacent to RTL text
4. **Segment Reordering**: For RTL base direction, segments are reversed

## Limitations

- Simplified implementation (not full UAX #9)
- Some complex nested BiDi cases may not render perfectly
- Emoji and special characters may have edge cases

## Files

- `bidi-transform.js` - Main transformation script
- `SKILL.md` - This documentation

## Revert

If issues occur, restore the simple reversal approach:
```bash
cp ~/.claude/commands/rtl.md.backup ~/.claude/commands/rtl.md
```
