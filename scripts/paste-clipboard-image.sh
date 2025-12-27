#!/bin/bash
# Save clipboard image to temp file and output the path
# Used for pasting images into Claude Code

TEMP_FILE="/tmp/claude_clipboard_$(date +%s).png"

# Save clipboard image to file using osascript
osascript -e "try
    set imgData to the clipboard as «class PNGf»
    set filePath to POSIX file \"$TEMP_FILE\"
    set fileRef to open for access filePath with write permission
    write imgData to fileRef
    close access fileRef
    return \"$TEMP_FILE\"
on error
    return \"\"
end try" 2>/dev/null

# Check if file was created and has content
if [[ -f "$TEMP_FILE" && -s "$TEMP_FILE" ]]; then
    echo "$TEMP_FILE"
else
    echo ""
fi
