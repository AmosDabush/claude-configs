#!/usr/bin/env node
/**
 * Claude Telegram Bot - Main Entry Point
 * Refactored modular version with persistence
 */

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Load modules
const { FILES, TTS_ENGINES, VOICE_CHUNK_PRESETS } = require('./lib/config');
const { getUserState, getAllUserStates, saveNow, getProjects, setSessionsModule, restoreActiveSessions } = require('./lib/state');
const { cleanupTempFiles, runQuickCommand, isGitRepo } = require('./lib/utils');
const sessions = require('./lib/sessions');

// Connect sessions module to state for persistence
setSessionsModule(sessions);

// Load command modules
const navigationCommands = require('./lib/commands/navigation');
const gitCommands = require('./lib/commands/git');
const voiceCommands = require('./lib/commands/voice');
const claudeCommands = require('./lib/commands/claude');
const parallelCommands = require('./lib/commands/parallel');

// ===== Write PID file (singleton handled by start.sh) =====
fs.writeFileSync(FILES.pid, process.pid.toString());
console.log(`Bot PID: ${process.pid}`);

// Cleanup on exit
process.on('exit', () => {
  try { fs.unlinkSync(FILES.pid); } catch (e) {}

  // Stop all interactive sessions
  const allStates = getAllUserStates();
  for (const [chatId, userState] of allStates) {
    if (userState.interactiveProc) {
      try { userState.interactiveProc.kill(); } catch (e) {}
    }
  }

  saveNow();
});
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

// ===== Load .env file =====
if (fs.existsSync(FILES.env)) {
  const envContent = fs.readFileSync(FILES.env, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

// ===== Configuration =====
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

// ===== Initialize bot =====
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Set bot commands menu
bot.setMyCommands([
  { command: 'menu', description: '📱 Main menu (all categories)' },
  { command: 'claude', description: '🤖 Claude session & settings' },
  { command: 'sessions', description: '📚 Browse & resume sessions' },
  { command: 'projects', description: '📂 Saved projects' },
  { command: 'browse', description: '🗂 Browse folders' },
  { command: 'git', description: '🌿 Git commands' },
  { command: 'voice', description: '🔊 Voice settings' },
  { command: 'help', description: '❓ All commands' },
  { command: 'all', description: '📋 List all commands' },
  { command: 'restart', description: '🔄 Restart bot' },
  { command: 'close', description: '👋 Close bot (all instances)' },
  { command: 'cancel', description: '🛑 Cancel current request' }
]).then(() => {
  console.log('✅ Bot commands menu set');
}).catch(err => {
  console.log('⚠️ Could not set commands menu:', err.message);
});

console.log('🤖 Claude Telegram Bot started!');
console.log(`📁 Data directory: ${path.dirname(FILES.sessions)}`);

// Cleanup old temp files on startup
cleanupTempFiles();

// Restore active sessions for users with persistSession enabled
restoreActiveSessions();

// Send restart notification if pending
if (fs.existsSync(FILES.restartNotify)) {
  try {
    const chatId = fs.readFileSync(FILES.restartNotify, 'utf-8').trim();
    fs.unlinkSync(FILES.restartNotify);
    if (chatId) {
      bot.sendMessage(chatId, '✅ Bot restarted successfully!');
      console.log(`📨 Sent restart notification to chat ${chatId}`);
    }
  } catch (e) {
    console.log('⚠️ Could not send restart notification:', e.message);
  }
}

// ===== Security check =====
function isAuthorized(msg) {
  if (!ALLOWED_USER_IDS.includes(msg.from.id)) {
    bot.sendMessage(msg.chat.id, '⛔ Unauthorized');
    console.log(`Unauthorized access attempt from user ${msg.from.id}`);
    return false;
  }
  return true;
}

// ===== Register commands =====
navigationCommands.register(bot, isAuthorized);
gitCommands.register(bot, isAuthorized);
voiceCommands.register(bot, isAuthorized);
claudeCommands.register(bot, isAuthorized);
parallelCommands.register(bot, isAuthorized);

// ===== Help commands =====
bot.onText(/\/start/, (msg) => {
  if (!isAuthorized(msg)) return;

  const userState = getUserState(msg.chat.id);
  const help = `
🤖 *Claude Code Bot*

*Navigation:*
/projects - Saved projects
/browse - Browse folders
/pwd - Current directory + mode

*Quick Commands:*
/ls, /tree, /files - Folder info
/repo, /status - Git info

*Claude:*
Just type → Send to Claude
-r msg → Quick resume
/sessions → Pick past session
/session → Toggle mode (⚡/💬)

⚡ On-demand = each message independent
💬 Session = Claude remembers context

Current: *${userState.currentProject}*
  `;

  bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
});

bot.onText(/\/(help|\?)/, (msg) => {
  if (!isAuthorized(msg)) return;

  const userState = getUserState(msg.chat.id);
  const modeIcon = userState.sessionMode ? '💬' : '⚡';
  const modeName = userState.sessionMode ? 'Session' : 'On-Demand';
  const chunkPreset = VOICE_CHUNK_PRESETS[userState.voiceSettings.chunkPreset || 'medium'];

  const helpText = `🤖 *Claude Code Bot*

📂 *Navigation:*
/projects - Saved projects (buttons)
/browse - Browse folders (buttons)
/pwd - Show current path + mode
/cd path - Change directory
/add name path - Add project

📋 *Quick Commands:*
/ls - List folder contents
/tree - Folder structure (depth 2)
/files - List all files
/repo - Git repo info
/branch - Current branch
/status or /gs - Git status

🔄 *Interactive:*
/interactive - Toggle interactive mode
/terminal - iTerm/background display
/resume - Resume last session

🤖 *Claude AI:*
Just type → Send to Claude
/sessions - List past sessions
/session - Toggle on-demand/session mode
/persist - Keep session after restart
/new - Start fresh session
/mode - Mode (default/fast/plan/yolo)
/cancel - Stop current request

🔊 *Voice:*
/voice - Toggle voice responses
/tts - Select TTS engine
/setvoice - Change voice
/setvoicespeed - Change speed
/voiceresponse - Response style
/voicechunk - Chunk size (${chunkPreset.icon} ${chunkPreset.name})

📜 *Logs:*
/logs - Last 50 lines
/logfile - Download full log

❓ /? or /help - This help
📱 /all - Interactive menu

📍 *${userState.currentProject}* | ${modeIcon} ${modeName} | ${userState.voiceEnabled ? '🔊' : '🔇'}`;

  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// ===== /all - List all commands =====
bot.onText(/\/all/, (msg) => {
  if (!isAuthorized(msg)) return;

  const userState = getUserState(msg.chat.id);

  const allCommands = `📋 *All Commands*

*📂 Navigation:*
/projects - Saved projects
/browse - Browse folders
/pwd - Current path
/cd <path> - Change directory
/add <name> <path> - Add project

*📋 Files:*
/ls - List files
/tree - Folder structure
/files - Find files

*🌿 Git:*
/git - Git menu
/status /gs - Git status
/branch - Current branch
/branches - All branches
/repo - Repo info

*🤖 Claude AI:*
Just type → Send to Claude
/sessions - Past sessions
/session - Toggle mode (⚡/💬)
/persist - Keep session after restart
/new - Fresh session
/mode - Permission mode
/thought - Thought process log
/cancel - Stop request
/fast <q> - Quick answer

*🔄 Interactive:*
/interactive - Toggle interactive mode
/terminal - iTerm/background display
/resume - Resume last session

*🔀 Parallel:*
/perspectives [n] <q> - Get n viewpoints
/investigate <problem> - Parallel branches

*🎙 Voice:*
/voice - Toggle voice
/tts - TTS engine
/setvoice - Voice settings
/setvoicespeed - Speed
/voiceresponse - Style
/voicechunk - Chunk size

*📜 Logs:*
/logs - Last 50 lines
/logfile - Download log
/clearlogs - Clear log

*⚙️ Other:*
/help - Help
/menu - Interactive menu
/restart - Restart bot

📍 *${userState.currentProject}*`;

  bot.sendMessage(msg.chat.id, allCommands, { parse_mode: 'Markdown' });
});

// ===== /menu - Interactive menu =====
bot.onText(/\/menu/, (msg) => {
  if (!isAuthorized(msg)) return;
  sendAllMenu(bot, msg.chat.id);
});

function sendAllMenu(bot, chatId, messageId = null) {
  const userState = getUserState(chatId);
  const modeIcon = userState.sessionMode ? '💬' : '⚡';
  const voiceIcon = userState.voiceEnabled ? '🔊' : '🔇';
  const interactiveIcon = userState.interactiveMode ? '🔄' : '⚡';

  const keyboard = [
    [{ text: '🤖 Claude AI', callback_data: 'all:claude' }, { text: '🔄 Interactive', callback_data: 'all:interactive' }],
    [{ text: '📂 Navigation', callback_data: 'all:nav' }, { text: '📋 Quick Commands', callback_data: 'all:files' }],
    [{ text: '🌿 Git', callback_data: 'all:git' }, { text: '🔀 Parallel', callback_data: 'all:parallel' }],
    [{ text: '🎙 Voice', callback_data: 'all:voice' }, { text: '📜 Logs', callback_data: 'all:logs' }],
    [{ text: '🛑 Cancel Request', callback_data: 'cmd:cancel' }]
  ];

  const text = `🤖 *Claude Code Bot*\n\n` +
    `📍 *${userState.currentProject}*\n` +
    `${modeIcon} ${userState.sessionMode ? 'Session' : 'On-Demand'} | ${voiceIcon}\n\n` +
    `Select a category:`;

  if (messageId) {
    return bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } else {
    return bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }
}

// ===== Claude Session Menu =====
bot.onText(/\/claude/, async (msg) => {
  if (!isAuthorized(msg)) return;

  const chatId = msg.chat.id;
  const userState = getUserState(chatId);
  const sessionIcon = userState.sessionMode ? '💬' : '⚡';
  const interactiveStatus = userState.interactiveMode ? 'ON' : 'OFF';
  const terminalStatus = userState.showTerminal ? 'iTerm' : 'Background';
  const procStatus = userState.interactiveProc ? '*(running)*' : '*(stopped)*';

  const thoughtIcon = userState.showProcessLog ? '🧠' : '🔇';
  const keyboard = [
    [
      { text: `🔄 Interactive: ${interactiveStatus}`, callback_data: 'cmd:interactive' },
      { text: `🖥 ${userState.showTerminal ? 'iTerm' : 'BG'}`, callback_data: 'cmd:terminal' }
    ],
    [{ text: '▶️ Resume Last Session', callback_data: 'cmd:resume' }],
    [{ text: '📚 Past Sessions', callback_data: 'cmd:sessions' }],
    [{ text: '🆕 New Session', callback_data: 'cmd:new' }],
    [{ text: `${sessionIcon} Toggle Mode`, callback_data: 'cmd:session' }, { text: '⚙️ Permission', callback_data: 'cmd:mode' }],
    [{ text: `${thoughtIcon} Thought Log`, callback_data: 'cmd:thought' }, { text: '💾 Persist', callback_data: 'cmd:persist' }],
    [{ text: '🛑 Cancel', callback_data: 'cmd:cancel' }]
  ];

  bot.sendMessage(chatId, `🤖 *Claude Session*\n\n` +
    `🔄 Interactive: ${interactiveStatus} ${procStatus}\n` +
    `🖥 Display: ${terminalStatus}\n\n` +
    `Interactive = Claude runs persistently\n` +
    `iTerm = See Claude in visible window\n\n` +
    `Just type a message to chat!`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
});

// ===== Close command - kill all bot instances =====
bot.onText(/\/close/, async (msg) => {
  if (!isAuthorized(msg)) return;

  await bot.sendMessage(msg.chat.id, '👋 Closing all bot instances...');

  // Give time for message to send
  setTimeout(() => {
    process.exit(0);
  }, 500);
});

// ===== Restart command =====
bot.onText(/\/restart/, async (msg) => {
  if (!isAuthorized(msg)) return;

  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, '🔄 Restarting bot (wrapper will restart)...');

  // Save chat ID for restart notification
  fs.writeFileSync(FILES.restartNotify, chatId.toString());

  // Exit with code 1 - wrapper.js will automatically restart
  setTimeout(() => {
    process.exit(1);
  }, 500);
});

// ===== Log commands =====
bot.onText(/\/logs(?:\s+(\d+))?/, async (msg, match) => {
  if (!isAuthorized(msg)) return;

  const lines = parseInt(match[1]) || 50;

  try {
    const output = await runQuickCommand(`tail -${lines} "${FILES.log}"`, process.env.HOME);

    if (output.length > 4000) {
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

bot.onText(/\/logfile/, async (msg) => {
  if (!isAuthorized(msg)) return;

  try {
    const content = fs.readFileSync(FILES.log, 'utf-8');
    const buffer = Buffer.from(content, 'utf-8');

    await bot.sendDocument(msg.chat.id, buffer, {
      caption: `📜 Full bot.log (${(content.length / 1024).toFixed(1)} KB)`
    }, {
      filename: `bot-log-${new Date().toISOString().slice(0, 10)}.txt`,
      contentType: 'text/plain'
    });
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`);
  }
});

bot.onText(/\/clearlogs/, async (msg) => {
  if (!isAuthorized(msg)) return;

  try {
    fs.writeFileSync(FILES.log, `🤖 Logs cleared at ${new Date().toISOString()}\n`);
    bot.sendMessage(msg.chat.id, '✅ Logs cleared');
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`);
  }
});

// ===== Callback query handler =====
bot.on('callback_query', async (query) => {
  if (!ALLOWED_USER_IDS.includes(query.from.id)) {
    bot.answerCallbackQuery(query.id, { text: '⛔ Unauthorized' });
    return;
  }

  const data = query.data;
  const chatId = query.message.chat.id;
  const userState = getUserState(chatId);

  // Try each command module's callback handler
  if (navigationCommands.handleCallback(bot, query, userState)) return;
  if (gitCommands.handleCallback(bot, query, userState)) return;
  if (voiceCommands.handleCallback(bot, query, userState)) return;
  if (claudeCommands.handleCallback(bot, query, userState)) return;
  if (parallelCommands.handleCallback(bot, query, userState)) return;

  // Handle /all menu callbacks
  if (data.startsWith('all:')) {
    handleAllMenuCallback(bot, query, userState);
    return;
  }

  // Handle log commands
  if (data === 'cmd:logs50' || data === 'cmd:logs100' || data === 'cmd:logfile' || data === 'cmd:clearlogs') {
    handleLogCallback(bot, query, chatId);
    return;
  }

  // PWD command
  if (data === 'cmd:pwd') {
    bot.answerCallbackQuery(query.id, { text: '/pwd' });
    const modeIcon = userState.sessionMode ? '💬' : '⚡';
    const modeName = userState.sessionMode ? 'Session' : 'On-Demand';
    const voiceIcon = userState.voiceEnabled ? '🔊' : '🔇';
    bot.sendMessage(chatId, `📁 Current: *${userState.currentProject}*\n\`${userState.currentPath}\`\nMode: ${modeIcon} ${modeName} | ${voiceIcon}`, { parse_mode: 'Markdown' });
    return;
  }

  // Projects command
  if (data === 'cmd:projects') {
    bot.answerCallbackQuery(query.id, { text: '/projects' });
    const projects = getProjects();
    const projectNames = Object.keys(projects);
    const keyboard = [];
    for (let i = 0; i < projectNames.length; i += 2) {
      const row = [];
      row.push({ text: projectNames[i] === userState.currentProject ? `✓ ${projectNames[i]}` : projectNames[i], callback_data: `proj:${projectNames[i]}` });
      if (projectNames[i + 1]) {
        row.push({ text: projectNames[i + 1] === userState.currentProject ? `✓ ${projectNames[i + 1]}` : projectNames[i + 1], callback_data: `proj:${projectNames[i + 1]}` });
      }
      keyboard.push(row);
    }
    bot.sendMessage(chatId, `📁 *Select a project:*\n\nCurrent: *${userState.currentProject}*`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Browse command
  if (data === 'cmd:browse') {
    bot.answerCallbackQuery(query.id, { text: '/browse' });
    const keyboard = navigationCommands.buildBrowseKeyboard(userState.currentPath);
    const isGit = isGitRepo(userState.currentPath);
    bot.sendMessage(chatId,
      `📂 *Browse:* \`${userState.currentPath}\`\n${isGit ? '📦 This is a git repo' : '📁 Navigate to select a folder'}\n\n📦 = git repo (click to select)\n📁 = folder (click to enter)`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
    return;
  }
});

/**
 * Handle /all menu callbacks
 */
function handleAllMenuCallback(bot, query, userState) {
  const section = query.data.substring(4);
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  // Back button
  if (section === 'back') {
    bot.answerCallbackQuery(query.id, { text: '⬅️ Back' });
    sendAllMenu(bot, chatId, messageId);
    return;
  }

  // Navigation section
  if (section === 'nav') {
    bot.answerCallbackQuery(query.id, { text: '📂 Navigation' });
    const keyboard = [
      [{ text: '📂 Projects', callback_data: 'cmd:projects' }],
      [{ text: '🗂 Browse Folders', callback_data: 'cmd:browse' }],
      [{ text: '📍 Current Path', callback_data: 'cmd:pwd' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`📂 *Navigation*\n\nManage projects and folders:`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Quick Commands section
  if (section === 'files') {
    bot.answerCallbackQuery(query.id, { text: '📋 Quick Commands' });
    const keyboard = [
      [{ text: '📄 List Files (ls)', callback_data: 'cmd:ls' }],
      [{ text: '🌳 Tree View', callback_data: 'cmd:tree' }],
      [{ text: '🔍 Find Files', callback_data: 'cmd:files' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`📋 *Quick Commands*\n\nBrowse files and folders:`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Claude AI section
  if (section === 'claude') {
    bot.answerCallbackQuery(query.id, { text: '🤖 Claude AI' });
    const sessionIcon = userState.sessionMode ? '💬' : '⚡';
    const keyboard = [
      [{ text: '📚 Past Sessions', callback_data: 'cmd:sessions' }],
      [{ text: `${sessionIcon} Session Mode`, callback_data: 'cmd:session' }, { text: '🆕 New Session', callback_data: 'cmd:new' }],
      [{ text: '💾 Persist Session', callback_data: 'cmd:persist' }, { text: '⚙️ Permission Mode', callback_data: 'cmd:mode' }],
      [{ text: '🧠 Thought Log', callback_data: 'cmd:thought' }],
      [{ text: '🛑 Cancel Request', callback_data: 'cmd:cancel' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`🤖 *Claude AI*\n\n` +
      `${sessionIcon} Mode: ${userState.sessionMode ? 'Session (remembers context)' : 'On-Demand (independent)'}\n` +
      `⚙️ Permission: ${userState.currentMode}\n` +
      `🧠 Thought Log: ${userState.showProcessLog ? 'ON' : 'OFF'}\n\n` +
      `Just type a message to chat with Claude!`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Interactive section
  if (section === 'interactive') {
    bot.answerCallbackQuery(query.id, { text: '🔄 Interactive' });
    const interactiveStatus = userState.interactiveMode ? 'ON' : 'OFF';
    const terminalStatus = userState.showTerminal ? 'iTerm' : 'Background';
    const procStatus = userState.interactiveProc ? '*(running)*' : '*(stopped)*';
    const keyboard = [
      [{ text: `🔄 Interactive: ${interactiveStatus}`, callback_data: 'cmd:interactive' }],
      [{ text: `🖥 Display: ${terminalStatus}`, callback_data: 'cmd:terminal' }],
      [{ text: '▶️ Resume Session', callback_data: 'cmd:resume' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`🔄 *Interactive Mode*\n\n` +
      `🔄 Interactive: ${interactiveStatus} ${procStatus}\n` +
      `🖥 Display: ${terminalStatus}\n\n` +
      `Interactive = Claude runs persistently\n` +
      `iTerm = See Claude in visible window`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Parallel section
  if (section === 'parallel') {
    bot.answerCallbackQuery(query.id, { text: '🔀 Parallel' });
    const keyboard = [
      [{ text: '🔀 Perspectives - Multiple viewpoints', callback_data: 'cmd:perspectives' }],
      [{ text: '🌳 Investigate - Parallel branches', callback_data: 'cmd:investigate' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`🔀 *Parallel Operations*\n\n` +
      `Get multiple AI perspectives or break down complex problems into parallel investigations.\n\n` +
      `• *Perspectives* - Ask same question, get different viewpoints\n` +
      `• *Investigate* - Claude breaks problem into branches, investigates each in parallel`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Git section
  if (section === 'git') {
    bot.answerCallbackQuery(query.id, { text: '🌿 Git' });
    const keyboard = [
      [{ text: '📊 Status', callback_data: 'cmd:status' }],
      [{ text: '🌿 Branch', callback_data: 'cmd:branch' }],
      [{ text: '🌲 All Branches', callback_data: 'cmd:branches' }],
      [{ text: '📦 Repo Info', callback_data: 'cmd:repo' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`🌿 *Git*\n\nGit operations:`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Voice section
  if (section === 'voice') {
    bot.answerCallbackQuery(query.id, { text: '🎙 Voice' });
    const voiceIcon = userState.voiceEnabled ? '🔊' : '🔇';
    const engineInfo = TTS_ENGINES[userState.voiceSettings.ttsEngine || 'edge'];
    const chunkPreset = VOICE_CHUNK_PRESETS[userState.voiceSettings.chunkPreset || 'medium'];
    const keyboard = [
      [{ text: `${voiceIcon} Toggle Voice`, callback_data: 'cmd:voice' }],
      [{ text: `🔧 TTS Engine: ${engineInfo.icon} ${engineInfo.name}`, callback_data: 'cmd:tts' }],
      [{ text: '🎙 Change Voice', callback_data: 'cmd:setvoice' }],
      [{ text: '⏩ Voice Speed', callback_data: 'cmd:setvoicespeed' }],
      [{ text: `📦 Chunks: ${chunkPreset.icon} ${chunkPreset.name}`, callback_data: 'cmd:voicechunk' }],
      [{ text: '🎭 Response Style', callback_data: 'cmd:voiceresponse' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`🎙 *Voice Settings*\n\nVoice: ${userState.voiceEnabled ? 'ON 🔊' : 'OFF 🔇'}\nEngine: ${engineInfo.icon} ${engineInfo.name}\nChunks: ${chunkPreset.icon} ${chunkPreset.name}`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }

  // Logs section
  if (section === 'logs') {
    bot.answerCallbackQuery(query.id, { text: '📜 Logs' });
    const keyboard = [
      [{ text: '📜 Last 50 Lines', callback_data: 'cmd:logs50' }],
      [{ text: '📜 Last 100 Lines', callback_data: 'cmd:logs100' }],
      [{ text: '📥 Download Full Log', callback_data: 'cmd:logfile' }],
      [{ text: '🗑 Clear Logs', callback_data: 'cmd:clearlogs' }],
      [{ text: '⬅️ Back', callback_data: 'all:back' }]
    ];
    bot.editMessageText(`📜 *Logs*\n\nView bot logs:`, {
      chat_id: chatId, message_id: messageId,
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
    return;
  }
}

/**
 * Handle log callbacks
 */
function handleLogCallback(bot, query, chatId) {
  const data = query.data;

  if (data === 'cmd:logs50') {
    bot.answerCallbackQuery(query.id, { text: '/logs 50' });
    runQuickCommand(`tail -50 "${FILES.log}"`, process.env.HOME).then(output => {
      if (output.length > 4000) {
        const buffer = Buffer.from(output, 'utf-8');
        bot.sendDocument(chatId, buffer, { caption: '📜 Last 50 lines' }, { filename: 'bot-logs.txt', contentType: 'text/plain' });
      } else {
        bot.sendMessage(chatId, `📜 *Last 50 lines:*\n\`\`\`\n${output}\n\`\`\``, { parse_mode: 'Markdown' });
      }
    });
    return;
  }

  if (data === 'cmd:logs100') {
    bot.answerCallbackQuery(query.id, { text: '/logs 100' });
    runQuickCommand(`tail -100 "${FILES.log}"`, process.env.HOME).then(output => {
      const buffer = Buffer.from(output, 'utf-8');
      bot.sendDocument(chatId, buffer, { caption: '📜 Last 100 lines' }, { filename: 'bot-logs.txt', contentType: 'text/plain' });
    });
    return;
  }

  if (data === 'cmd:logfile') {
    bot.answerCallbackQuery(query.id, { text: '/logfile' });
    try {
      const content = fs.readFileSync(FILES.log, 'utf-8');
      const buffer = Buffer.from(content, 'utf-8');
      bot.sendDocument(chatId, buffer, { caption: `📜 Full bot.log (${(content.length / 1024).toFixed(1)} KB)` }, { filename: `bot-log-${new Date().toISOString().slice(0, 10)}.txt`, contentType: 'text/plain' });
    } catch (e) {
      bot.sendMessage(chatId, `❌ Error: ${e.message}`);
    }
    return;
  }

  if (data === 'cmd:clearlogs') {
    bot.answerCallbackQuery(query.id, { text: '/clearlogs' });
    try {
      fs.writeFileSync(FILES.log, `🤖 Logs cleared at ${new Date().toISOString()}\n`);
      bot.sendMessage(chatId, '✅ Logs cleared');
    } catch (e) {
      bot.sendMessage(chatId, `❌ Error: ${e.message}`);
    }
    return;
  }
}

// ===== Handle regular messages (Claude interaction) =====
bot.on('message', async (msg) => {
  await claudeCommands.handleMessage(bot, msg, isAuthorized);
});

// ===== Error handling =====
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

console.log('✅ Bot is ready!');
