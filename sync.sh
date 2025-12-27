#!/bin/bash

# Sync script for claude-configs
# Copies safe files from ~/.claude/ to this repo
# IMPORTANT: Sanitizes sensitive data from settings.json

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Syncing from $CLAUDE_DIR to $REPO_DIR"
echo ""

# Sync CLAUDE.md
if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    cp "$CLAUDE_DIR/CLAUDE.md" "$REPO_DIR/"
    echo "✓ CLAUDE.md"
fi

# Sync commands/
if [ -d "$CLAUDE_DIR/commands" ]; then
    mkdir -p "$REPO_DIR/commands"
    cp -r "$CLAUDE_DIR/commands/"* "$REPO_DIR/commands/" 2>/dev/null
    echo "✓ commands/"
fi

# Sync all cmd_* folders (excluding node_modules)
for dir in "$CLAUDE_DIR"/cmd_*; do
    if [ -d "$dir" ]; then
        name=$(basename "$dir")
        mkdir -p "$REPO_DIR/$name"
        rsync -a --exclude='node_modules' "$dir/" "$REPO_DIR/$name/"
        echo "✓ $name/"
    fi
done

# Sync skills/ (exclude node_modules)
if [ -d "$CLAUDE_DIR/skills" ]; then
    mkdir -p "$REPO_DIR/skills"
    rsync -a --exclude='node_modules' "$CLAUDE_DIR/skills/" "$REPO_DIR/skills/"
    echo "✓ skills/"
fi

# Sync docs/
if [ -d "$CLAUDE_DIR/docs" ]; then
    mkdir -p "$REPO_DIR/docs"
    cp -r "$CLAUDE_DIR/docs/"* "$REPO_DIR/docs/" 2>/dev/null
    echo "✓ docs/"
fi

# Sync ide/ (IDE integrations)
if [ -d "$CLAUDE_DIR/ide" ]; then
    mkdir -p "$REPO_DIR/ide"
    cp -r "$CLAUDE_DIR/ide/"* "$REPO_DIR/ide/" 2>/dev/null
    echo "✓ ide/"
fi

# Sync plugins/
if [ -d "$CLAUDE_DIR/plugins" ]; then
    mkdir -p "$REPO_DIR/plugins"
    cp -r "$CLAUDE_DIR/plugins/"* "$REPO_DIR/plugins/" 2>/dev/null
    echo "✓ plugins/"
fi

# Sync scripts/
if [ -d "$CLAUDE_DIR/scripts" ]; then
    mkdir -p "$REPO_DIR/scripts"
    cp -r "$CLAUDE_DIR/scripts/"* "$REPO_DIR/scripts/" 2>/dev/null
    echo "✓ scripts/"
fi

# Sync settings.json - SANITIZE SENSITIVE DATA
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    # Create sanitized version (replace passwords/tokens with placeholders)
    cat "$CLAUDE_DIR/settings.json" | \
        sed 's/"DATABASE_URL": "[^"]*"/"DATABASE_URL": "YOUR_DATABASE_URL_HERE"/g' | \
        sed 's/:\/\/[^:]*:[^@]*@/:\/\/USER:PASSWORD@/g' \
        > "$REPO_DIR/settings.json"
    echo "✓ settings.json (sanitized)"
fi

# Sync telegram-bot/ (exclude sensitive/temporary files)
if [ -d "$CLAUDE_DIR/telegram-bot" ]; then
    mkdir -p "$REPO_DIR/telegram-bot"
    rsync -a \
        --exclude='node_modules' \
        --exclude='.env' \
        --exclude='*.log' \
        --exclude='bot.log' \
        --exclude='sessions.json' \
        --exclude='temp_audio_*.mp3' \
        --exclude='*.pid' \
        --exclude='restart.lock' \
        --exclude='start.lock' \
        "$CLAUDE_DIR/telegram-bot/" "$REPO_DIR/telegram-bot/"
    echo "✓ telegram-bot/"
fi

echo ""
echo "Done! Now you can:"
echo "  cd $REPO_DIR"
echo "  git status"
echo "  git add . && git commit -m 'Sync updates' && git push"
echo ""
echo "⚠️  Remember: settings.json was sanitized - update credentials on new machine"
