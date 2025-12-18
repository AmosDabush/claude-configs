#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

// Configuration from environment
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found! Create .env file with BOT_TOKEN=your-token');
  process.exit(1);
}

if (ALLOWED_USER_IDS.length === 0) {
  console.error('❌ ALLOWED_USER_IDS not found! Add ALLOWED_USER_IDS=123,456 to .env');
  process.exit(1);
}

// Project shortcuts - add your projects here
const PROJECTS = {
  'home': '/Users/amosdabush',

  // ~/git projects
  'ai-stuff': '/Users/amosdabush/git/ai-stuff',
  'cloud2': '/Users/amosdabush/git/cloud2',
  'compose': '/Users/amosdabush/git/compose',
  'coview-compose-test': '/Users/amosdabush/git/coview-compose-test',
  'health': '/Users/amosdabush/git/health',
  'mcp-gmail': '/Users/amosdabush/git/mcp-gmail',
  'monthlyDemo': '/Users/amosdabush/git/monthlyDemo',
  'monthTech': '/Users/amosdabush/git/monthTech',
  'socket-tester': '/Users/amosdabush/git/socket-tester-gg',
  'socketIOclient': '/Users/amosdabush/git/socketIOclient',
  'sql-stuff': '/Users/amosdabush/git/sql-stuff',

  // ~/git/cloud2 projects
  'apis': '/Users/amosdabush/git/cloud2/apis',
  'coview-auth': '/Users/amosdabush/git/cloud2/coview-auth',
  'backend': '/Users/amosdabush/git/cloud2/coview-backend-services',
  'client': '/Users/amosdabush/git/cloud2/coview-client',
  'common': '/Users/amosdabush/git/cloud2/coview-common',
  'coview-compose': '/Users/amosdabush/git/cloud2/coview-compose',
  'others': '/Users/amosdabush/git/cloud2/others',
  'packages': '/Users/amosdabush/git/cloud2/packages',
};

// State
let currentProject = 'home';
let currentPath = PROJECTS.home;
let isProcessing = false;
let currentClaudeProc = null;
let currentMode = 'default'; // default, plan, yolo (dangerously-skip-permissions)

// Path cache for browse buttons (Telegram has 64 byte callback_data limit)
const pathCache = new Map();
let pathCacheId = 0;

function cachePath(fullPath) {
  // Check if already cached
  for (const [id, p] of pathCache) {
    if (p === fullPath) return id;
  }
  const id = `p${pathCacheId++}`;
  pathCache.set(id, fullPath);
  // Keep cache size reasonable
  if (pathCache.size > 500) {
    const firstKey = pathCache.keys().next().value;
    pathCache.delete(firstKey);
  }
  return id;
}

function getPathFromCache(id) {
  return pathCache.get(id);
}

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Set bot commands menu (appears when user clicks menu button or types /)
bot.setMyCommands([
  { command: 'projects', description: '📂 Saved projects' },
  { command: 'browse', description: '🗂 Browse folders' },
  { command: 'pwd', description: '📍 Current directory' },
  { command: 'ls', description: '📋 List folder contents' },
  { command: 'repo', description: '📦 Git repo info' },
  { command: 'status', description: '📊 Git status' },
  { command: 'branch', description: '🌿 Current branch' },
  { command: 'mode', description: '⚙️ Permission mode' },
  { command: 'logs', description: '📜 View bot logs' },
  { command: 'cancel', description: '🛑 Cancel request' },
  { command: 'help', description: '❓ All commands' }
]).then(() => {
  console.log('✅ Bot commands menu set');
}).catch(err => {
  console.log('⚠️ Could not set commands menu:', err.message);
});

console.log('🤖 Claude Telegram Bot started!');
console.log(`📁 Current project: ${currentProject} (${currentPath})`);

// Security check
function isAuthorized(msg) {
  if (!ALLOWED_USER_IDS.includes(msg.from.id)) {
    bot.sendMessage(msg.chat.id, '⛔ Unauthorized');
    console.log(`Unauthorized access attempt from user ${msg.from.id}`);
    return false;
  }
  return true;
}

// Send long messages in chunks
async function sendLongMessage(chatId, text, replyToId) {
  const MAX_LENGTH = 4000;
  const chunks = [];

  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point
    let breakPoint = remaining.lastIndexOf('\n', MAX_LENGTH);
    if (breakPoint === -1 || breakPoint < MAX_LENGTH / 2) {
      breakPoint = MAX_LENGTH;
    }

    chunks.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint);
  }

  for (let i = 0; i < chunks.length; i++) {
    const options = i === 0 ? { reply_to_message_id: replyToId } : {};
    await bot.sendMessage(chatId, chunks[i], options);
  }
}

// Get mode flag for Claude CLI
function getModeFlag() {
  switch (currentMode) {
    case 'yolo': return '--dangerously-skip-permissions';
    case 'plan': return '--permission-mode plan';
    default: return '';
  }
}

// Run Claude Code (non-streaming)
function runClaude(prompt, cwd, fast = false) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const toolsFlag = fast ? '--tools ""' : '';
    const modeFlag = getModeFlag();
    const cmd = `claude -p '${escapedPrompt}' ${toolsFlag} ${modeFlag} < /dev/null`;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📨 [${new Date().toLocaleTimeString()}] NEW REQUEST ${fast ? '⚡FAST' : ''}`);
    console.log(`   Project: ${currentProject}`);
    console.log(`   Path: ${cwd}`);
    console.log(`   Command: ${cmd}`);
    console.log(`${'='.repeat(50)}`);

    const proc = exec(cmd, {
      cwd: cwd,
      env: { ...process.env, PATH: `/Users/amosdabush/.local/bin:${process.env.PATH}` },
      shell: '/bin/bash',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 5 * 60 * 1000
    }, (error, stdout, stderr) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ [${new Date().toLocaleTimeString()}] COMPLETED in ${duration}s`);
      currentClaudeProc = null;
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout || 'Done (no output)');
    });

    console.log(`   PID: ${proc.pid}`);
    currentClaudeProc = proc;
  });
}

// Run Claude Code with streaming - returns updates via callback
function runClaudeStreaming(prompt, cwd, onUpdate) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const modeFlag = getModeFlag();
    const cmd = `claude -p '${escapedPrompt}' --output-format stream-json --verbose ${modeFlag} < /dev/null`;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📨 [${new Date().toLocaleTimeString()}] STREAMING REQUEST`);
    console.log(`   Project: ${currentProject}`);
    console.log(`   Path: ${cwd}`);
    console.log(`${'='.repeat(50)}`);

    const proc = spawn('bash', ['-c', cmd], {
      cwd: cwd,
      env: { ...process.env, PATH: `/Users/amosdabush/.local/bin:${process.env.PATH}` }
    });

    console.log(`   PID: ${proc.pid}`);
    currentClaudeProc = proc;

    let fullText = '';
    let buffer = '';

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.type === 'assistant' && json.message?.content) {
            for (const block of json.message.content) {
              if (block.type === 'text' && block.text) {
                fullText = block.text;
                onUpdate(fullText);
              }
            }
          } else if (json.type === 'result') {
            if (json.result) fullText = json.result;
          }
        } catch (e) {
          // Skip unparseable lines
        }
      }
    });

    proc.stderr.on('data', (data) => {
      console.log(`   Stderr: ${data.toString().substring(0, 200)}`);
    });

    proc.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ [${new Date().toLocaleTimeString()}] STREAM COMPLETED in ${duration}s`);
      currentClaudeProc = null;
      resolve(fullText || 'Done (no output)');
    });

    proc.on('error', (err) => {
      currentClaudeProc = null;
      reject(err);
    });

    setTimeout(() => {
      proc.kill();
      currentClaudeProc = null;
      reject(new Error('Timeout'));
    }, 5 * 60 * 1000);
  });
}

// Command: /start
bot.onText(/\/start/, (msg) => {
  if (!isAuthorized(msg)) return;

  const help = `
🤖 *Claude Code Bot*

*Navigation:*
/projects - Saved projects
/browse - Browse folders (📦=git, 📁=folder)
/pwd - Current directory

*Quick Commands (instant):*
/ls - List folder contents
/tree - Folder structure
/files - List files
/repo - Git repo info
/status - Git status
/cancel - Cancel request

*Claude:*
/fast <q> - Quick answer (~3s, no files)
Or just type → Full analysis (~10s)

Current: *${currentProject}*
  `;

  bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
});

// Command: /logs - get bot logs
bot.onText(/\/logs(?:\s+(\d+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;

  const lines = parseInt(match[1]) || 50; // Default 50 lines
  const logPath = path.join(process.env.HOME, '.claude/telegram-bot/bot.log');

  try {
    const output = await runQuickCommand(`tail -${lines} "${logPath}"`, process.env.HOME);

    if (output.length > 4000) {
      // Send as file if too long
      const buffer = Buffer.from(output, 'utf-8');
      await bot.sendDocument(msg.chat.id, buffer, {
        caption: `📜 Last ${lines} lines of bot.log`
      }, {
        filename: 'bot-logs.txt',
        contentType: 'text/plain'
      });
    } else {
      bot.sendMessage(msg.chat.id, `📜 *Last ${lines} lines:*\n\`\`\`\n${output}\n\`\`\``, { parse_mode: 'Markdown' });
    }
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Error reading logs: ${e.message}`);
  }
});

// Command: /logfile - send full log as file
bot.onText(/\/logfile/, async (msg) => {
  if (!isAuthorized(msg)) return;

  const logPath = path.join(process.env.HOME, '.claude/telegram-bot/bot.log');

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const buffer = Buffer.from(content, 'utf-8');

    await bot.sendDocument(msg.chat.id, buffer, {
      caption: `📜 Full bot.log (${(content.length / 1024).toFixed(1)} KB)`
    }, {
      filename: `bot-log-${new Date().toISOString().slice(0,10)}.txt`,
      contentType: 'text/plain'
    });
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`);
  }
});

// Command: /clearlogs - clear log file
bot.onText(/\/clearlogs/, async (msg) => {
  if (!isAuthorized(msg)) return;

  const logPath = path.join(process.env.HOME, '.claude/telegram-bot/bot.log');

  try {
    fs.writeFileSync(logPath, `🤖 Logs cleared at ${new Date().toISOString()}\n`);
    bot.sendMessage(msg.chat.id, '✅ Logs cleared');
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`);
  }
});

// Command: /mode - switch permission mode
bot.onText(/\/mode/, (msg) => {
  if (!isAuthorized(msg)) return;

  const modeDescriptions = {
    'default': '🔒 Default - Asks for permissions',
    'plan': '📋 Plan - Only plans, no execution',
    'yolo': '⚡ YOLO - Skip all permissions (dangerous!)'
  };

  const keyboard = [
    [{ text: currentMode === 'default' ? '✓ 🔒 Default' : '🔒 Default', callback_data: 'mode:default' }],
    [{ text: currentMode === 'plan' ? '✓ 📋 Plan' : '📋 Plan', callback_data: 'mode:plan' }],
    [{ text: currentMode === 'yolo' ? '✓ ⚡ YOLO' : '⚡ YOLO (dangerous)', callback_data: 'mode:yolo' }]
  ];

  bot.sendMessage(msg.chat.id,
    `⚙️ *Permission Mode*\n\nCurrent: *${currentMode}*\n\n${modeDescriptions[currentMode]}\n\nSelect mode:`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
  );
});

// Command: /help or /?
bot.onText(/\/(help|\?)/, (msg) => {
  if (!isAuthorized(msg)) return;

  const helpText = `🤖 *Claude Code Bot*

📂 *Navigation:*
/projects - Saved projects (buttons)
/browse - Browse folders (buttons)
/pwd - Show current path
/cd path - Change directory

📋 *Quick Commands:*
/ls - List folder contents
/tree - Folder structure (depth 2)
/tree 3 - Custom depth
/files - List all files
/repo - Git repo info
/branch - Current branch + remote
/branches - All branches
/status or /gs - Git status

🤖 *Claude AI:*
Just type → Full analysis with streaming
/fast question - Quick answer (no files)
/mode - Switch mode (default/plan/yolo)
/cancel - Stop current request

📜 *Logs:*
/logs - Last 50 lines
/logs 100 - Last N lines
/logfile - Download full log
/clearlogs - Clear logs

❓ /? or /help - This help

📍 Current: *${currentProject}*`;

  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// Command: /projects - show clickable buttons
bot.onText(/\/projects/, (msg) => {
  if (!isAuthorized(msg)) return;

  const projectNames = Object.keys(PROJECTS);

  // Create buttons in rows of 2
  const keyboard = [];
  for (let i = 0; i < projectNames.length; i += 2) {
    const row = [];
    row.push({ text: projectNames[i] === currentProject ? `✓ ${projectNames[i]}` : projectNames[i], callback_data: `proj:${projectNames[i]}` });
    if (projectNames[i + 1]) {
      row.push({ text: projectNames[i + 1] === currentProject ? `✓ ${projectNames[i + 1]}` : projectNames[i + 1], callback_data: `proj:${projectNames[i + 1]}` });
    }
    keyboard.push(row);
  }

  bot.sendMessage(msg.chat.id, `📁 *Select a project:*\n\nCurrent: *${currentProject}*`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
});

// Check if directory is a git repo
function isGitRepo(dirPath) {
  return fs.existsSync(path.join(dirPath, '.git'));
}

// Get directory contents for browsing
function getBrowseContents(dirPath) {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const folders = [];
    const files = [];

    for (const item of items) {
      if (item.name.startsWith('.')) continue; // Skip hidden
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        folders.push({
          name: item.name,
          path: fullPath,
          isGit: isGitRepo(fullPath)
        });
      } else {
        files.push(item.name);
      }
    }

    // Sort: git repos first, then folders, then by name
    folders.sort((a, b) => {
      if (a.isGit && !b.isGit) return -1;
      if (!a.isGit && b.isGit) return 1;
      return a.name.localeCompare(b.name);
    });

    return { folders, files };
  } catch (e) {
    return { folders: [], files: [] };
  }
}

// Build browse keyboard
function buildBrowseKeyboard(dirPath) {
  const { folders } = getBrowseContents(dirPath);
  const keyboard = [];

  // Cache paths and use short IDs
  const selectId = cachePath(dirPath);

  // Select current path button
  keyboard.push([{
    text: '✅ SELECT THIS PATH',
    callback_data: `bs:${selectId}`
  }]);

  // Go up button if not at root
  const parentPath = path.dirname(dirPath);
  if (parentPath !== dirPath) {
    const upId = cachePath(parentPath);
    keyboard.push([{
      text: '⬆️ .. (go up)',
      callback_data: `bn:${upId}`
    }]);
  }

  // Folder buttons - 1 per row for full visibility
  for (const f of folders) {
    const icon = f.isGit ? '📦' : '📁';
    const action = f.isGit ? 'bs' : 'bn'; // bs=browse_select, bn=browse_nav
    const folderId = cachePath(f.path);
    keyboard.push([{
      text: `${icon} ${f.name}`,
      callback_data: `${action}:${folderId}`
    }]);
  }

  return keyboard;
}

// Command: /browse - navigate folders with buttons
bot.onText(/\/browse(?:\s+(.+))?/, (msg, match) => {
  if (!isAuthorized(msg)) return;

  let browsePath = match[1] ? match[1].trim() : currentPath;
  if (browsePath.startsWith('~')) {
    browsePath = browsePath.replace('~', process.env.HOME);
  }

  if (!fs.existsSync(browsePath)) {
    bot.sendMessage(msg.chat.id, `❌ Path not found: ${browsePath}`);
    return;
  }

  const keyboard = buildBrowseKeyboard(browsePath);
  const isGit = isGitRepo(browsePath);

  bot.sendMessage(msg.chat.id,
    `📂 *Browse:* \`${browsePath}\`\n${isGit ? '📦 This is a git repo' : '📁 Navigate to select a folder'}\n\n📦 = git repo (click to select)\n📁 = folder (click to enter)`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    }
  );
});

// Handle button clicks
bot.on('callback_query', async (query) => {
  if (!ALLOWED_USER_IDS.includes(query.from.id)) {
    bot.answerCallbackQuery(query.id, { text: '⛔ Unauthorized' });
    return;
  }

  const data = query.data;

  // Handle project selection
  if (data.startsWith('proj:')) {
    const projectName = data.substring(5);

    if (PROJECTS[projectName]) {
      currentProject = projectName;
      currentPath = PROJECTS[projectName];

      bot.answerCallbackQuery(query.id, { text: `✅ Switched to ${projectName}` });
      bot.sendMessage(query.message.chat.id, `✅ Switched to *${projectName}*\n\`${currentPath}\``, { parse_mode: 'Markdown' });
    }
  }

  // Handle browse navigation (bn = browse_nav)
  else if (data.startsWith('bn:')) {
    const pathId = data.substring(3);
    const navPath = getPathFromCache(pathId);

    if (!navPath || !fs.existsSync(navPath)) {
      bot.answerCallbackQuery(query.id, { text: '❌ Path not found - try /browse again' });
      return;
    }

    const keyboard = buildBrowseKeyboard(navPath);
    const isGit = isGitRepo(navPath);

    bot.answerCallbackQuery(query.id, { text: `📂 ${path.basename(navPath)}` });

    try {
      await bot.editMessageText(
        `📂 *Browse:* \`${navPath}\`\n${isGit ? '📦 This is a git repo' : '📁 Navigate to select a folder'}\n\n📦 = git repo (click to select)\n📁 = folder (click to enter)`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
    } catch (e) {
      // Message not modified, ignore
    }
  }

  // Handle browse selection (bs = browse_select)
  else if (data.startsWith('bs:')) {
    const pathId = data.substring(3);
    const selectPath = getPathFromCache(pathId);

    if (!selectPath) {
      bot.answerCallbackQuery(query.id, { text: '❌ Path expired - try /browse again' });
      return;
    }

    currentPath = selectPath;
    currentProject = path.basename(selectPath);

    bot.answerCallbackQuery(query.id, { text: `✅ Selected ${currentProject}` });
    bot.sendMessage(query.message.chat.id, `✅ Switched to *${currentProject}*\n\`${currentPath}\``, { parse_mode: 'Markdown' });
  }

  // Handle mode selection
  else if (data.startsWith('mode:')) {
    const newMode = data.substring(5);
    currentMode = newMode;

    const modeNames = { 'default': '🔒 Default', 'plan': '📋 Plan', 'yolo': '⚡ YOLO' };
    bot.answerCallbackQuery(query.id, { text: `✅ Mode: ${modeNames[newMode]}` });
    bot.sendMessage(query.message.chat.id, `✅ Mode changed to *${modeNames[newMode]}*`, { parse_mode: 'Markdown' });
  }
});

// Command: /project <name>
bot.onText(/\/project\s+(.+)/, (msg, match) => {
  if (!isAuthorized(msg)) return;

  const projectName = match[1].trim().toLowerCase();

  if (PROJECTS[projectName]) {
    currentProject = projectName;
    currentPath = PROJECTS[projectName];
    bot.sendMessage(msg.chat.id, `✅ Switched to *${projectName}*\n\`${currentPath}\``, { parse_mode: 'Markdown' });
  } else if (fs.existsSync(projectName) || fs.existsSync(path.resolve(currentPath, projectName))) {
    // Allow direct path
    const fullPath = fs.existsSync(projectName) ? projectName : path.resolve(currentPath, projectName);
    currentProject = path.basename(fullPath);
    currentPath = fullPath;
    bot.sendMessage(msg.chat.id, `✅ Switched to *${currentProject}*\n\`${currentPath}\``, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, `❌ Project "${projectName}" not found.\nUse /projects to see available projects or /add to add one.`);
  }
});

// Command: /add <name> <path>
bot.onText(/\/add\s+(\S+)\s+(.+)/, (msg, match) => {
  if (!isAuthorized(msg)) return;

  const name = match[1].trim().toLowerCase();
  let projectPath = match[2].trim();

  // Expand ~
  if (projectPath.startsWith('~')) {
    projectPath = projectPath.replace('~', process.env.HOME);
  }

  if (!fs.existsSync(projectPath)) {
    bot.sendMessage(msg.chat.id, `❌ Path does not exist: \`${projectPath}\``, { parse_mode: 'Markdown' });
    return;
  }

  PROJECTS[name] = projectPath;
  bot.sendMessage(msg.chat.id, `✅ Added project *${name}*\n\`${projectPath}\`\n\n⚠️ Note: This is temporary. To make permanent, edit the bot.js file.`, { parse_mode: 'Markdown' });
});

// Command: /pwd
bot.onText(/\/pwd/, (msg) => {
  if (!isAuthorized(msg)) return;
  bot.sendMessage(msg.chat.id, `📁 Current: *${currentProject}*\n\`${currentPath}\``, { parse_mode: 'Markdown' });
});

// Command: /cancel - cancel current Claude request
bot.onText(/\/cancel/, (msg) => {
  if (!isAuthorized(msg)) return;

  if (currentClaudeProc) {
    currentClaudeProc.kill();
    currentClaudeProc = null;
    isProcessing = false;
    bot.sendMessage(msg.chat.id, '🛑 Cancelled current request');
  } else if (isProcessing) {
    isProcessing = false;
    bot.sendMessage(msg.chat.id, '🔄 Reset processing state');
  } else {
    bot.sendMessage(msg.chat.id, '✅ Nothing to cancel');
  }
});

// Command: /fast <question> - quick answer without file reading (~3s)
bot.onText(/\/fast\s+(.+)/, async (msg, match) => {
  if (!isAuthorized(msg)) return;

  const question = match[1].trim();

  if (isProcessing) {
    bot.sendMessage(msg.chat.id, '⏳ Already processing. Use /cancel first.');
    return;
  }

  isProcessing = true;
  bot.sendChatAction(msg.chat.id, 'typing');

  try {
    const response = await runClaude(question, currentPath, true); // fast=true
    await sendLongMessage(msg.chat.id, `⚡ ${response}`, msg.message_id);
  } catch (error) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`, { reply_to_message_id: msg.message_id });
  } finally {
    isProcessing = false;
  }
});

// Quick command helper - run shell command and return output
function runQuickCommand(cmd, cwd) {
  return new Promise((resolve) => {
    const proc = spawn('bash', ['-c', cmd], { cwd, env: process.env });
    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.stderr.on('data', (data) => output += data.toString());
    proc.on('close', () => resolve(output.trim() || 'No output'));
    setTimeout(() => { proc.kill(); resolve('Timeout'); }, 10000);
  });
}

// Command: /ls - quick folder listing
bot.onText(/\/ls(?:\s+(.+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const subpath = match[1] ? path.resolve(currentPath, match[1]) : currentPath;
  const output = await runQuickCommand(`ls -la "${subpath}"`, currentPath);
  bot.sendMessage(msg.chat.id, `📂 \`${subpath}\`\n\`\`\`\n${output.substring(0, 3500)}\n\`\`\``, { parse_mode: 'Markdown' });
});

// Command: /tree - folder structure
bot.onText(/\/tree(?:\s+(.+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const depth = match[1] || '2';
  const output = await runQuickCommand(`find . -maxdepth ${depth} -type d -not -path '*/\\.*' 2>/dev/null | head -50 | sed 's|[^/]*/|  |g'`, currentPath);
  bot.sendMessage(msg.chat.id, `🌳 *${currentProject}* (depth ${depth}):\n\`\`\`\n${output.substring(0, 3500)}\n\`\`\``, { parse_mode: 'Markdown' });
});

// Command: /files - list files
bot.onText(/\/files(?:\s+(.+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;
  const pattern = match[1] || '*';
  const output = await runQuickCommand(`find . -type f -name "${pattern}" | head -50`, currentPath);
  bot.sendMessage(msg.chat.id, `📄 Files (${pattern}):\n\`\`\`\n${output.substring(0, 3500)}\n\`\`\``, { parse_mode: 'Markdown' });
});

// Command: /status or /gs - git status
bot.onText(/\/(status|gs)/, async (msg) => {
  if (!isAuthorized(msg)) return;
  const output = await runQuickCommand('git status', currentPath);
  bot.sendMessage(msg.chat.id, `📊 Git Status:\n\`\`\`\n${output.substring(0, 3500)}\n\`\`\``, { parse_mode: 'Markdown' });
});

// Command: /branch - current branch
bot.onText(/\/branch$/, async (msg) => {
  if (!isAuthorized(msg)) return;
  const branch = await runQuickCommand('git branch --show-current', currentPath);
  const remote = await runQuickCommand('git remote get-url origin 2>/dev/null || echo "No remote"', currentPath);
  bot.sendMessage(msg.chat.id, `🌿 Branch: *${branch}*\n🔗 Remote: \`${remote}\``, { parse_mode: 'Markdown' });
});

// Command: /branches - all branches
bot.onText(/\/branches/, async (msg) => {
  if (!isAuthorized(msg)) return;
  const output = await runQuickCommand('git branch -a', currentPath);
  bot.sendMessage(msg.chat.id, `🌿 Branches:\n\`\`\`\n${output.substring(0, 3500)}\n\`\`\``, { parse_mode: 'Markdown' });
});

// Command: /repo - git repo info
bot.onText(/\/repo/, async (msg) => {
  if (!isAuthorized(msg)) return;
  const branch = await runQuickCommand('git branch --show-current', currentPath);
  const remote = await runQuickCommand('git remote get-url origin 2>/dev/null || echo "No remote"', currentPath);
  const lastCommit = await runQuickCommand('git log -1 --pretty=format:"%h - %s (%ar)"', currentPath);
  const status = await runQuickCommand('git status --short | head -10', currentPath);

  let msg_text = `📦 *Repo Info*\n\n`;
  msg_text += `📁 Project: *${currentProject}*\n`;
  msg_text += `🌿 Branch: *${branch}*\n`;
  msg_text += `🔗 Remote: \`${remote}\`\n`;
  msg_text += `📝 Last commit: ${lastCommit}\n`;
  if (status && status !== 'No output') {
    msg_text += `\n📊 Changes:\n\`\`\`\n${status}\n\`\`\``;
  } else {
    msg_text += `\n✅ Working tree clean`;
  }

  bot.sendMessage(msg.chat.id, msg_text, { parse_mode: 'Markdown' });
});

// Command: /cd <path>
bot.onText(/\/cd\s+(.+)/, (msg, match) => {
  if (!isAuthorized(msg)) return;

  let newPath = match[1].trim();

  // Expand ~
  if (newPath.startsWith('~')) {
    newPath = newPath.replace('~', process.env.HOME);
  }

  // Resolve relative paths
  if (!path.isAbsolute(newPath)) {
    newPath = path.resolve(currentPath, newPath);
  }

  if (!fs.existsSync(newPath)) {
    bot.sendMessage(msg.chat.id, `❌ Path does not exist: \`${newPath}\``, { parse_mode: 'Markdown' });
    return;
  }

  currentPath = newPath;
  currentProject = path.basename(newPath);
  bot.sendMessage(msg.chat.id, `✅ Changed to: \`${currentPath}\``, { parse_mode: 'Markdown' });
});

// Handle regular messages (questions for Claude) - WITH STREAMING
bot.on('message', async (msg) => {
  if (!isAuthorized(msg)) return;

  // Skip commands
  if (msg.text && msg.text.startsWith('/')) return;

  // Skip non-text messages
  if (!msg.text) return;

  // Check if already processing
  if (isProcessing) {
    bot.sendMessage(msg.chat.id, '⏳ Already processing a request. Use /cancel first.');
    return;
  }

  isProcessing = true;

  // Send initial message that we'll update
  let sentMsg;
  try {
    sentMsg = await bot.sendMessage(msg.chat.id, '⏳ Thinking...', { reply_to_message_id: msg.message_id });
  } catch (e) {
    isProcessing = false;
    return;
  }

  let lastUpdate = Date.now();
  let lastText = '';

  try {
    const response = await runClaudeStreaming(msg.text, currentPath, async (text) => {
      // Update message every 1.5 seconds to avoid rate limits
      if (Date.now() - lastUpdate > 1500 && text !== lastText && text.length > 0) {
        lastUpdate = Date.now();
        lastText = text;
        try {
          // Truncate if too long for Telegram (4096 char limit)
          const displayText = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
          await bot.editMessageText(displayText + ' ▌', {
            chat_id: msg.chat.id,
            message_id: sentMsg.message_id
          });
        } catch (e) {
          // Ignore edit errors (message not modified, etc)
        }
      }
    });

    // Final update with complete response
    if (response.length <= 4000) {
      await bot.editMessageText(response, {
        chat_id: msg.chat.id,
        message_id: sentMsg.message_id
      });
    } else {
      // Delete short message and send long one in chunks
      await bot.deleteMessage(msg.chat.id, sentMsg.message_id);
      await sendLongMessage(msg.chat.id, response, msg.message_id);
    }
  } catch (error) {
    try {
      await bot.editMessageText(`❌ Error: ${error.message}`, {
        chat_id: msg.chat.id,
        message_id: sentMsg.message_id
      });
    } catch (e) {
      bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
  } finally {
    isProcessing = false;
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

console.log('✅ Bot is ready! Send a message to @Claudegg_bot');
