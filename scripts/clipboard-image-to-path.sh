#!/bin/bash
# Save clipboard image to temp file and TYPE the path into the terminal
# Usage: Ctrl+Shift+V in iTerm2

TEMP_FILE="/tmp/claude_clipboard_$(date +%s).png"

# Try to save clipboard image
RESULT=$(osascript -e "
try
    set imgData to the clipboard as «class PNGf»
    set filePath to POSIX file \"$TEMP_FILE\"
    set fileRef to open for access filePath with write permission
    write imgData to fileRef
    close access fileRef
    return \"success\"
on error
    return \"no_image\"
end try
" 2>/dev/null)

# Check if file was created successfully
if [[ "$RESULT" == "success" && -f "$TEMP_FILE" && -s "$TEMP_FILE" ]]; then
    # Paste the path using clipboard (keyboard-layout independent)
    echo -n "$TEMP_FILE" | pbcopy
    osascript -e 'tell application "System Events" to keystroke "v" using command down' 2>/dev/null
else
    osascript -e "display notification \"No image in clipboard\" with title \"Clipboard Image\" sound name \"Basso\"" 2>/dev/null
fi
