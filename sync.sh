#!/bin/bash

# Sync script for claude-configs
# Copies safe files from ~/.claude/ to this repo

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
        # Copy everything except node_modules
        rsync -a --exclude='node_modules' "$dir/" "$REPO_DIR/$name/"
        echo "✓ $name/"
    fi
done

# Sync agents/ if exists
if [ -d "$CLAUDE_DIR/agents" ]; then
    mkdir -p "$REPO_DIR/agents"
    cp -r "$CLAUDE_DIR/agents/"* "$REPO_DIR/agents/" 2>/dev/null
    echo "✓ agents/"
fi

# Sync skills/ if exists
if [ -d "$CLAUDE_DIR/skills" ]; then
    mkdir -p "$REPO_DIR/skills"
    rsync -a "$CLAUDE_DIR/skills/" "$REPO_DIR/skills/"
    echo "✓ skills/"
fi

# Sync settings.json (not settings.local.json)
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    cp "$CLAUDE_DIR/settings.json" "$REPO_DIR/"
    echo "✓ settings.json"
fi

# Sync telegram-bot/ (exclude node_modules, .env, logs)
if [ -d "$CLAUDE_DIR/telegram-bot" ]; then
    mkdir -p "$REPO_DIR/telegram-bot"
    rsync -a --exclude='node_modules' --exclude='.env' --exclude='*.log' "$CLAUDE_DIR/telegram-bot/" "$REPO_DIR/telegram-bot/"
    echo "✓ telegram-bot/"
fi

echo ""
echo "Done! Now you can:"
echo "  cd $REPO_DIR"
echo "  git status"
echo "  git add . && git commit -m 'Sync updates' && git push"
