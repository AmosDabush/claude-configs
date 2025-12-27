---
description: Start Telegram bot and open logs in iTerm
---

Start the Telegram bot and open logs in a new iTerm window.

Steps:
1. Run `~/.claude/telegram-bot/start.sh` to start/restart the bot
2. Open a new iTerm window with logs using AppleScript:
```bash
osascript -e 'tell application "iTerm"
    create window with default profile
    tell current session of current window
        write text "tail -f ~/.claude/telegram-bot/bot.log"
    end tell
end tell'
```
3. Report that bot is running
