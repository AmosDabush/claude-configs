/**
 * Claude Commands
 * Message handling, streaming, sessions, modes
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getUserState, scheduleSave } = require('../state');
const {
  getSession, setSession, clearSession, incrementSession,
  getSessionHistory, getSessionByShortId, resumeSession, clearHistory,
  getCliSessions, getCliProjects
} = require('../sessions');
const { sendLongMessage, getModeFlag } = require('../utils');
const { generateVoice, generateVoiceChunked } = require('../tts');
const { MODE_DESCRIPTIONS, RESPONSE_STYLE_OPTIONS, TTS_ENGINES } = require('../config');

// Store pending process logs for clickable display
const pendingLogs = new Map();

// Clean up old logs periodically (keep for 10 minutes)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key] of pendingLogs) {
    const timestamp = parseInt(key.split('_')[1]);
    if (timestamp < tenMinutesAgo) {
      pendingLogs.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Register Claude commands
 */
function register(bot, isAuthorized) {

  // /new - start fresh session
  bot.onText(/\/new/, (msg) => {
    if (!isAuthorized(msg)) return;
    clearSession(msg.chat.id);
    bot.sendMessage(msg.chat.id, '🆕 Started fresh session. Claude won\'t remember previous messages.');
  });

  // /session - toggle session mode
  bot.onText(/\/session(?:\s+(on|off))?/, (msg, match) => {
    if (!isAuthorized(msg)) return;

    const userState = getUserState(msg.chat.id);
    const arg = match[1]?.toLowerCase();

    if (arg === 'on') {
      userState.sessionMode = true;
      scheduleSave();
      bot.sendMessage(msg.chat.id, '💬 *Session mode enabled*\nMessages will continue conversation. Use /new to start fresh.', { parse_mode: 'Markdown' });
      return;
    }

    if (arg === 'off') {
      userState.sessionMode = false;
      clearSession(msg.chat.id);
      scheduleSave();
      bot.sendMessage(msg.chat.id, '⚡ *On-demand mode enabled*\nEach message is independent.', { parse_mode: 'Markdown' });
      return;
    }

    // Show current mode with buttons
    const session = getSession(msg.chat.id);
    const modeIcon = userState.sessionMode ? '💬' : '⚡';
    const modeName = userState.sessionMode ? 'Session' : 'On-Demand';

    let statusText = `⚙️ *Conversation Mode*\n\nCurrent: ${modeIcon} *${modeName}*\n`;

    if (userState.sessionMode && session) {
      statusText += `\n📍 Active session:\n`;
      statusText += `ID: \`${session.sessionId.substring(0, 8)}...\`\n`;
      statusText += `Messages: ${session.messageCount}\n`;
    } else if (userState.sessionMode) {
      statusText += `\nNo active session yet. Send a message to start one.\n`;
    }

    statusText += `\n⚡ On-demand = each message independent\n💬 Session = Claude remembers context`;

    const keyboard = [[
      { text: userState.sessionMode ? '⚡ Switch to On-Demand' : '✓ ⚡ On-Demand', callback_data: 'session:off' },
      { text: userState.sessionMode ? '✓ 💬 Session' : '💬 Switch to Session', callback_data: 'session:on' }
    ]];

    bot.sendMessage(msg.chat.id, statusText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  });

  // /sessions - list past sessions
  bot.onText(/\/sessions/, (msg) => {
    if (!isAuthorized(msg)) return;
    sendSessionsMenu(bot, msg.chat.id);
  });

  // /mode - switch permission mode
  bot.onText(/\/mode/, (msg) => {
    if (!isAuthorized(msg)) return;
    sendModeMenu(bot, msg.chat.id, getUserState(msg.chat.id));
  });

  // /cancel - cancel current request
  bot.onText(/\/cancel/, (msg) => {
    if (!isAuthorized(msg)) return;

    const userState = getUserState(msg.chat.id);

    if (userState.currentClaudeProc) {
      userState.currentClaudeProc.kill();
      userState.currentClaudeProc = null;
      userState.isProcessing = false;
      bot.sendMessage(msg.chat.id, '🛑 Cancelled your request');
    } else if (userState.isProcessing) {
      userState.isProcessing = false;
      bot.sendMessage(msg.chat.id, '🔄 Reset processing state');
    } else {
      bot.sendMessage(msg.chat.id, '✅ Nothing to cancel');
    }
  });

  // /persist - toggle session persistence across bot restarts
  bot.onText(/\/persist(?:\s+(on|off))?/, (msg, match) => {
    if (!isAuthorized(msg)) return;

    const userState = getUserState(msg.chat.id);
    const arg = match[1]?.toLowerCase();

    if (arg === 'on') {
      userState.persistSession = true;
      scheduleSave();
      bot.sendMessage(msg.chat.id, '💾 *Session persistence enabled*\nYour active session will survive bot restarts.', { parse_mode: 'Markdown' });
      return;
    }

    if (arg === 'off') {
      userState.persistSession = false;
      scheduleSave();
      bot.sendMessage(msg.chat.id, '🔄 *Session persistence disabled*\nBot restarts will start a fresh session.', { parse_mode: 'Markdown' });
      return;
    }

    // Show current status with toggle buttons
    const session = getSession(msg.chat.id);
    const persistIcon = userState.persistSession ? '💾' : '🔄';
    const persistName = userState.persistSession ? 'ON' : 'OFF';

    let statusText = `💾 *Session Persistence*\n\nCurrent: ${persistIcon} *${persistName}*\n`;

    if (userState.persistSession) {
      statusText += `\nYour active session will be restored after bot restarts.\n`;
      if (session) {
        statusText += `\n📍 Active session: \`${session.sessionId.substring(0, 8)}...\``;
      }
    } else {
      statusText += `\nBot restarts will start a fresh session.\n`;
    }

    const keyboard = [[
      { text: userState.persistSession ? '🔄 Disable' : '💾 Enable', callback_data: userState.persistSession ? 'persist:off' : 'persist:on' }
    ]];

    bot.sendMessage(msg.chat.id, statusText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  });

  // /fast <question> - quick answer without file tools
  bot.onText(/\/fast\s+(.+)/, async (msg, match) => {
    if (!isAuthorized(msg)) return;

    const userState = getUserState(msg.chat.id);
    const question = match[1].trim();

    if (userState.isProcessing) {
      bot.sendMessage(msg.chat.id, '⏳ Already processing. Use /cancel first.');
      return;
    }

    userState.isProcessing = true;
    bot.sendChatAction(msg.chat.id, 'typing');

    try {
      const response = await runClaude(question, userState.currentPath, true, userState.currentMode);
      await sendLongMessage(bot, msg.chat.id, `⚡ ${response}`, msg.message_id);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`, { reply_to_message_id: msg.message_id });
    } finally {
      userState.isProcessing = false;
    }
  });

  // /interactive - toggle interactive mode
  bot.onText(/\/interactive(?:\s+(on|off))?/, (msg, match) => {
    if (!isAuthorized(msg)) return;

    const userState = getUserState(msg.chat.id);
    const arg = match[1]?.toLowerCase();

    if (arg === 'on') {
      userState.interactiveMode = true;
      scheduleSave();
      bot.sendMessage(msg.chat.id, '🔄 *Interactive mode enabled*\nClaude will run as persistent process.', { parse_mode: 'Markdown' });
      return;
    }

    if (arg === 'off') {
      stopInteractiveSession(userState);
      userState.interactiveMode = false;
      scheduleSave();
      bot.sendMessage(msg.chat.id, '⚡ *Interactive mode disabled*\nEach message spawns new process.', { parse_mode: 'Markdown' });
      return;
    }

    // Show current mode with buttons
    const modeIcon = userState.interactiveMode ? '🔄' : '⚡';
    const modeName = userState.interactiveMode ? 'ON' : 'OFF';
    const procStatus = userState.interactiveProc ? '(process running)' : '(no process)';

    const keyboard = [[
      { text: userState.interactiveMode ? '⚡ Turn OFF' : '🔄 Turn ON', callback_data: userState.interactiveMode ? 'interactive:off' : 'interactive:on' }
    ]];

    bot.sendMessage(msg.chat.id,
      `🔄 *Interactive Mode*\n\nCurrent: ${modeIcon} *${modeName}* ${procStatus}\n\n` +
      `ON = Claude runs persistently, handles context\n` +
      `OFF = Each message spawns new process`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
  });

  // /terminal - toggle visible iTerm window
  bot.onText(/\/terminal(?:\s+(on|off))?/, (msg, match) => {
    if (!isAuthorized(msg)) return;

    const userState = getUserState(msg.chat.id);
    const arg = match[1]?.toLowerCase();

    if (arg === 'on') {
      userState.showTerminal = true;
      scheduleSave();
      // If interactive session running, restart it with terminal
      if (userState.interactiveProc) {
        stopInteractiveSession(userState);
        startInteractiveSession(userState, msg.chat.id, bot);
      }
      bot.sendMessage(msg.chat.id, '🖥 *Terminal mode enabled*\nClaude will open in visible iTerm window.', { parse_mode: 'Markdown' });
      return;
    }

    if (arg === 'off') {
      userState.showTerminal = false;
      scheduleSave();
      // If interactive session running, restart it without terminal
      if (userState.interactiveProc) {
        stopInteractiveSession(userState);
        startInteractiveSession(userState, msg.chat.id, bot);
      }
      bot.sendMessage(msg.chat.id, '🔇 *Terminal mode disabled*\nClaude runs in background.', { parse_mode: 'Markdown' });
      return;
    }

    // Show current mode with buttons
    const modeIcon = userState.showTerminal ? '🖥' : '🔇';
    const modeName = userState.showTerminal ? 'iTerm' : 'Background';

    const keyboard = [[
      { text: userState.showTerminal ? '🔇 Background' : '🖥 iTerm', callback_data: userState.showTerminal ? 'terminal:off' : 'terminal:on' }
    ]];

    bot.sendMessage(msg.chat.id,
      `🖥 *Terminal Display*\n\nCurrent: ${modeIcon} *${modeName}*\n\n` +
      `iTerm = See Claude working in visible window\n` +
      `Background = Runs silently, output to Telegram only`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
  });

  // /thought - toggle thought process log (off/on/auto)
  bot.onText(/\/thought(?:\s+(off|on|auto))?/, (msg, match) => {
    if (!isAuthorized(msg)) return;

    const userState = getUserState(msg.chat.id);
    const arg = match[1]?.toLowerCase();

    if (arg === 'auto') {
      userState.thoughtMode = 'auto';
      scheduleSave();
      bot.sendMessage(msg.chat.id, '🧠 *Thought log: AUTO*\nThought process will show automatically after each response.', { parse_mode: 'Markdown' });
      return;
    }

    if (arg === 'on') {
      userState.thoughtMode = 'on';
      scheduleSave();
      bot.sendMessage(msg.chat.id, '🧠 *Thought log: ON*\nClick the tools button to view thought process.', { parse_mode: 'Markdown' });
      return;
    }

    if (arg === 'off') {
      userState.thoughtMode = 'off';
      scheduleSave();
      bot.sendMessage(msg.chat.id, '🔇 *Thought log: OFF*', { parse_mode: 'Markdown' });
      return;
    }

    // Show current mode with buttons
    const mode = userState.thoughtMode || 'off';
    const modeIcons = { off: '🔇', on: '🧠', auto: '✨' };
    const modeNames = { off: 'OFF', on: 'ON (button)', auto: 'AUTO' };

    const keyboard = [
      [
        { text: mode === 'off' ? '✓ 🔇 Off' : '🔇 Off', callback_data: 'thought:off' },
        { text: mode === 'on' ? '✓ 🧠 On' : '🧠 On', callback_data: 'thought:on' },
        { text: mode === 'auto' ? '✓ ✨ Auto' : '✨ Auto', callback_data: 'thought:auto' }
      ]
    ];

    bot.sendMessage(msg.chat.id,
      `🧠 *Thought Process Log*\n\nCurrent: ${modeIcons[mode]} *${modeNames[mode]}*\n\n` +
      `🔇 *Off* - No thought log\n` +
      `🧠 *On* - Click button to view\n` +
      `✨ *Auto* - Shows automatically`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
  });

  // /resume - show session picker (like Claude CLI)
  bot.onText(/\/resume/, (msg) => {
    if (!isAuthorized(msg)) return;
    sendSessionsMenu(bot, msg.chat.id);
  });
}

/**
 * Send sessions menu - shows both bot sessions and Mac CLI sessions
 */
function sendSessionsMenu(bot, chatId, showCliSessions = true) {
  const { getUserState } = require('../state');
  const userState = getUserState(chatId);
  const history = getSessionHistory(chatId);

  // Get Mac CLI sessions for current project
  const cliSessions = showCliSessions ? getCliSessions(userState.currentPath, 8) : [];

  if (history.length === 0 && cliSessions.length === 0) {
    bot.sendMessage(chatId, '📭 No session history yet.\nStart a conversation or check Mac CLI sessions.', {
      reply_markup: {
        inline_keyboard: [[{ text: '📂 Browse All Projects', callback_data: 'clibrowse:list' }]]
      }
    });
    return;
  }

  const keyboard = [];

  // Show Mac CLI sessions first (from current project)
  if (cliSessions.length > 0) {
    keyboard.push([{ text: `🖥 Mac Sessions (${userState.currentProject})`, callback_data: 'noop' }]);

    for (let i = 0; i < Math.min(cliSessions.length, 5); i++) {
      const s = cliSessions[i];
      const topic = s.topic || '(no topic)';
      const shortId = s.sessionId.substring(0, 6);

      keyboard.push([{
        text: `🖥 ${topic.substring(0, 30)}${topic.length > 30 ? '...' : ''} (${s.messageCount}💬)`,
        callback_data: `cli:${shortId}`
      }]);
    }
  }

  // Show bot session history
  if (history.length > 0) {
    keyboard.push([{ text: '📱 Telegram Sessions', callback_data: 'noop' }]);

    for (let i = 0; i < history.length; i++) {
      const s = history[i];
      const project = path.basename(s.projectPath);
      const topic = s.topic || '(no topic)';
      const shortId = s.sessionId.substring(0, 6);

      keyboard.push([{
        text: `📱 ${project} - ${topic.substring(0, 25)}${topic.length > 25 ? '...' : ''} (${s.messageCount}💬)`,
        callback_data: `resume:${shortId}`
      }]);
    }
  }

  // Add browse other projects button
  keyboard.push([{ text: '📂 Browse All Projects', callback_data: 'clibrowse:list' }]);
  keyboard.push([{ text: '🗑 Clear Telegram History', callback_data: 'resume:clear' }]);

  const headerText = cliSessions.length > 0
    ? `📚 *Sessions*\n\n🖥 = Mac CLI sessions (${userState.currentProject})\n📱 = Telegram bot sessions\n\nSelect to resume:`
    : '📚 *Session History*\n\nSelect a session to resume:';

  bot.sendMessage(chatId, headerText, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * Send projects list for browsing CLI sessions
 */
function sendProjectsSessionsMenu(bot, chatId) {
  const projects = getCliProjects();

  if (projects.length === 0) {
    bot.sendMessage(chatId, '📭 No Mac CLI projects found.');
    return;
  }

  // Sort by name and limit
  const sortedProjects = projects
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 15);

  const keyboard = sortedProjects.map(p => [{
    text: `📁 ${p.name}`,
    callback_data: `clibrowse:${p.encoded.substring(0, 50)}`
  }]);

  keyboard.push([{ text: '⬅️ Back', callback_data: 'clibrowse:back' }]);

  bot.sendMessage(chatId, '📂 *All Mac Projects*\n\nSelect a project to see its sessions:', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * Send sessions for a specific CLI project
 */
function sendProjectSessionsList(bot, chatId, encodedPath) {
  const projects = getCliProjects();
  const project = projects.find(p => p.encoded.startsWith(encodedPath));

  if (!project) {
    bot.sendMessage(chatId, '❌ Project not found');
    return;
  }

  const sessions = getCliSessions(project.decoded, 10);

  if (sessions.length === 0) {
    bot.sendMessage(chatId, `📭 No sessions in *${project.name}*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '⬅️ Back to Projects', callback_data: 'clibrowse:list' }]]
      }
    });
    return;
  }

  const keyboard = sessions.map(s => {
    const topic = s.topic || '(no topic)';
    const shortId = s.sessionId.substring(0, 6);
    return [{
      text: `🖥 ${topic.substring(0, 30)}${topic.length > 30 ? '...' : ''} (${s.messageCount}💬)`,
      callback_data: `cliproj:${encodedPath.substring(0, 30)}:${shortId}`
    }];
  });

  keyboard.push([{ text: '⬅️ Back to Projects', callback_data: 'clibrowse:list' }]);

  bot.sendMessage(chatId, `📁 *${project.name}*\n\nSelect a session to resume:`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * Send mode menu
 */
function sendModeMenu(bot, chatId, userState) {
  const keyboard = [
    [{ text: userState.currentMode === 'default' ? '✓ 🔒 Default' : '🔒 Default', callback_data: 'mode:default' }],
    [{ text: userState.currentMode === 'fast' ? '✓ ⚡ Fast' : '⚡ Fast', callback_data: 'mode:fast' }],
    [{ text: userState.currentMode === 'plan' ? '✓ 📋 Plan' : '📋 Plan', callback_data: 'mode:plan' }],
    [{ text: userState.currentMode === 'yolo' ? '✓ 🔥 YOLO' : '🔥 YOLO', callback_data: 'mode:yolo' }]
  ];

  bot.sendMessage(chatId,
    `⚙️ *Mode*\n\nCurrent: *${userState.currentMode}*\n\n${MODE_DESCRIPTIONS[userState.currentMode]}\n\nSelect mode:`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
  );
}

/**
 * Run Claude Code (non-streaming)
 */
function runClaude(prompt, cwd, fast = false, mode = 'default') {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const toolsFlag = fast ? '--tools ""' : '';
    const modeFlag = getModeFlag(mode);
    const cmd = `claude -p '${escapedPrompt}' ${toolsFlag} ${modeFlag} < /dev/null`;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📨 [${new Date().toLocaleTimeString()}] NEW REQUEST ${fast ? '⚡FAST' : ''}`);
    console.log(`   Path: ${cwd}`);
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
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout || 'Done (no output)');
    });

    console.log(`   PID: ${proc.pid}`);
  });
}

/**
 * Run Claude Code with streaming
 */
function runClaudeStreaming(prompt, cwd, onUpdate, resumeSessionId = null, mode = 'default', projectName = 'unknown', onProcStart = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const modeFlag = getModeFlag(mode);
    const resumeFlag = resumeSessionId ? `--resume '${resumeSessionId}'` : '';
    const cmd = `claude -p '${escapedPrompt}' --output-format stream-json --verbose ${modeFlag} ${resumeFlag} < /dev/null`;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📨 [${new Date().toLocaleTimeString()}] STREAMING REQUEST`);
    console.log(`   Project: ${projectName}`);
    console.log(`   Path: ${cwd}`);
    console.log(`${'='.repeat(50)}`);

    const proc = spawn('bash', ['-c', cmd], {
      cwd: cwd,
      env: { ...process.env, PATH: `/Users/amosdabush/.local/bin:${process.env.PATH}` }
    });

    console.log(`   PID: ${proc.pid}`);
    if (resumeSessionId) console.log(`   Resuming session: ${resumeSessionId}`);

    if (onProcStart) onProcStart(proc);

    let fullText = '';
    let buffer = '';
    let sessionId = null;

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);

          if (json.session_id) {
            sessionId = json.session_id;
          }

          if (json.type === 'assistant' && json.message?.content) {
            for (const block of json.message.content) {
              if (block.type === 'text' && block.text) {
                fullText = block.text;
                onUpdate(fullText);
              }
            }
          } else if (json.type === 'result') {
            if (json.result) fullText = json.result;
            if (json.session_id) sessionId = json.session_id;
          }
        } catch (e) {}
      }
    });

    proc.stderr.on('data', (data) => {
      console.log(`   Stderr: ${data.toString().substring(0, 200)}`);
    });

    proc.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ [${new Date().toLocaleTimeString()}] STREAM COMPLETED in ${duration}s`);
      if (sessionId) console.log(`   Session ID: ${sessionId}`);
      resolve({ text: fullText || 'Done (no output)', sessionId });
    });

    proc.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      proc.kill();
      reject(new Error('Timeout'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Start an interactive Claude session using stream-json
 */
function startInteractiveSession(userState, chatId, bot, resumeId = null, initialMessage = null) {
  const cwd = userState.currentPath;
  const mode = userState.currentMode;
  const modeFlag = getModeFlag(mode);
  const homeDir = process.env.HOME || require('os').homedir();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🔄 [${new Date().toLocaleTimeString()}] STARTING INTERACTIVE SESSION (stream-json)`);
  console.log(`   Path: ${cwd}`);
  console.log(`   Mode: ${mode}`);
  if (resumeId) console.log(`   Resuming: ${resumeId}`);
  console.log(`${'='.repeat(50)}`);

  // Build args for claude
  // Note: removed -p flag as it prevents --resume from loading conversation history
  const args = ['--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose'];
  if (modeFlag) {
    args.push(...modeFlag.trim().split(/\s+/).filter(Boolean));
  }
  if (resumeId) {
    args.push('--resume', resumeId);
  }

  console.log(`   Args: ${args.join(' ')}`);

  // Spawn Claude with stream-json
  const proc = spawn(`${homeDir}/.local/bin/claude`, args, {
    cwd: cwd,
    env: { ...process.env, PATH: `${homeDir}/.local/bin:${process.env.PATH}` },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log(`   PID: ${proc.pid}`);
  console.log(`   stdout readable: ${proc.stdout.readable}, stderr readable: ${proc.stderr.readable}`);

  // Set encoding for streams
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  // State for streaming
  let buffer = '';
  let currentMessageId = null;
  let lastText = '';
  let lastUpdate = 0;
  let isReady = false;
  let typingInterval = null;
  let currentStatus = '';
  let resultReceived = false;  // Prevent processing after result
  let processLog = [];  // Track all steps for thought process log

  // Initialize tracking in userState
  userState.interactiveStartTime = null;
  userState.interactiveToolsUsed = [];

  // Cancel button keyboard
  const cancelKeyboard = {
    inline_keyboard: [[{ text: '🛑 Cancel', callback_data: 'interactive:cancel' }]]
  };

  // Format elapsed time
  const formatElapsed = (startTime) => {
    if (!startTime) return '0s';
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs}s`;
  };

  // Update status message with elapsed time
  const updateStatusMessage = async (status, showCancel = true) => {
    // Log to process log FIRST (before any early returns)
    const cleanStatus = status.replace(/^🔄\s*/, '').replace(/^🧠\s*/, '').replace(/^📋\s*/, '');
    if (cleanStatus && !processLog.includes(cleanStatus)) {
      processLog.push(cleanStatus);
    }

    // Skip UI update if no thinking message
    if (!userState.interactiveThinkingMsgId) return;

    const elapsed = formatElapsed(userState.interactiveStartTime);
    const toolCount = userState.interactiveToolsUsed?.length > 0 ? ` [${userState.interactiveToolsUsed.length}]` : '';
    const fullStatus = `${status}${toolCount} (${elapsed})`;

    if (fullStatus === currentStatus) return;
    currentStatus = fullStatus;

    try {
      await bot.editMessageText(fullStatus, {
        chat_id: chatId,
        message_id: userState.interactiveThinkingMsgId,
        reply_markup: showCancel ? cancelKeyboard : undefined
      });
    } catch (e) {}
  };

  // Start timer to update elapsed time every 3 seconds
  const startTimer = () => {
    if (userState.interactiveTimerInterval) return;
    userState.interactiveTimerInterval = setInterval(() => {
      if (currentStatus && userState.interactiveStartTime) {
        updateStatusMessage(currentStatus.split(' [')[0].split(' (')[0]);
      }
    }, 3000);
  };

  const stopTimer = () => {
    if (userState.interactiveTimerInterval) {
      clearInterval(userState.interactiveTimerInterval);
      userState.interactiveTimerInterval = null;
    }
  };

  // Send typing indicator periodically while processing
  const startTyping = () => {
    if (typingInterval) return;
    bot.sendChatAction(chatId, 'typing');
    typingInterval = setInterval(() => {
      bot.sendChatAction(chatId, 'typing');
    }, 4000);
  };

  const stopTyping = () => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  };

  // IMMEDIATELY attach stdout handler
  proc.stdout.on('data', async (data) => {
    const chunk = data.toString();
    console.log(`   [stdout] ${chunk.length} bytes`);

    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;

      // Skip processing if we already got the result (prevents duplicates)
      if (resultReceived) continue;

      try {
        const json = JSON.parse(line);

        // System init - Claude is ready
        if (json.type === 'system' && json.subtype === 'init') {
          console.log(`   Claude ready, session: ${json.session_id}`);
          isReady = true;
          if (initTimeout) clearTimeout(initTimeout);
          userState.interactiveSessionId = json.session_id;

          // Send pending message
          if (userState.pendingMessage) {
            const msg = userState.pendingMessage;
            userState.pendingMessage = null;
            console.log(`   [init] Sending pending message: "${msg.substring(0, 50)}..."`);

            const sent = sendToInteractive(userState, msg, bot, chatId);
            console.log(`   [init] sendToInteractive returned: ${sent}`);

            if (sent) {
              startTyping();
              startTimer();
              updateStatusMessage('🔄 Processing...');
            } else {
              console.log(`   [init] ERROR: Failed to send pending message!`);
              bot.sendMessage(chatId, '❌ Failed to send message to Claude. Try again.');
            }
          } else {
            console.log(`   [init] No pending message`);
          }
          continue;
        }

        // Assistant response - update on every change
        if (json.type === 'assistant' && json.message?.content) {
          for (const block of json.message.content) {
            if (block.type === 'text' && block.text) {
              const text = block.text;
              stopTyping();  // Got text, stop typing indicator

              if (!currentMessageId) {
                // First message - check if we have a "Thinking..." message to update
                if (userState.interactiveThinkingMsgId) {
                  // Set BEFORE await to prevent race condition with concurrent data events
                  currentMessageId = userState.interactiveThinkingMsgId;
                  userState.interactiveThinkingMsgId = null;
                  try {
                    await bot.editMessageText(text.substring(0, 4000) + ' ▌', {
                      chat_id: chatId,
                      message_id: currentMessageId
                    });
                    lastText = text;
                    lastUpdate = Date.now();
                  } catch (e) { console.log('Edit thinking error:', e.message); }
                } else if (!currentMessageId) {
                  // Double-check still null (another event might have set it)
                  // No thinking message - send new
                  try {
                    const sent = await bot.sendMessage(chatId, text.substring(0, 4000) + ' ▌');
                    currentMessageId = sent.message_id;
                    lastText = text;
                    lastUpdate = Date.now();
                  } catch (e) { console.log('Send error:', e.message); }
                }
              } else if (text !== lastText) {
                // Text changed - update (throttle to avoid rate limits)
                const now = Date.now();
                if (now - lastUpdate > 500) {  // Reduced from 1500ms to 500ms
                  lastUpdate = now;
                  lastText = text;
                  try {
                    await bot.editMessageText(text.substring(0, 4000) + ' ▌', {
                      chat_id: chatId,
                      message_id: currentMessageId
                    });
                  } catch (e) {}
                }
              }
            }

            // Show thinking indicator
            if (block.type === 'thinking') {
              startTyping();
              updateStatusMessage('🧠 Thinking...');
            }

            // Handle TodoWrite tool - show todos progress
            if (block.type === 'tool_use' && block.name === 'TodoWrite') {
              const todos = block.input?.todos || [];
              if (todos.length > 0) {
                const completed = todos.filter(t => t.status === 'completed').length;
                const inProgress = todos.filter(t => t.status === 'in_progress').length;
                const pending = todos.filter(t => t.status === 'pending').length;

                let todoStatus = '📋 Todos: ';
                if (completed > 0) todoStatus += `✅${completed} `;
                if (inProgress > 0) todoStatus += `🔄${inProgress} `;
                if (pending > 0) todoStatus += `⏳${pending}`;

                // Find current in_progress todo
                const current = todos.find(t => t.status === 'in_progress');
                if (current) {
                  todoStatus = `🔄 ${current.activeForm || current.content}`;
                }

                updateStatusMessage(todoStatus);
              }
            }

            // Show tool use activity - update message with what Claude is doing
            if (block.type === 'tool_use') {
              startTyping();
              const toolName = block.name || 'tool';
              const input = block.input || {};
              if (!userState.interactiveToolsUsed) userState.interactiveToolsUsed = [];
              userState.interactiveToolsUsed.push(toolName);
              console.log(`   [tool] ${toolName}`);

              // Build detailed status
              let statusText = '🔄 ';
              if (toolName === 'Read') {
                const file = input.file_path ? path.basename(input.file_path) : 'file';
                statusText += `Reading ${file}`;
              } else if (toolName === 'Write') {
                const file = input.file_path ? path.basename(input.file_path) : 'file';
                statusText += `Writing ${file}`;
              } else if (toolName === 'Edit') {
                const file = input.file_path ? path.basename(input.file_path) : 'file';
                statusText += `Editing ${file}`;
              } else if (toolName === 'Bash') {
                const cmd = input.command ? input.command.substring(0, 30) : 'command';
                statusText += `Running: ${cmd}${input.command?.length > 30 ? '...' : ''}`;
              } else if (toolName === 'Glob') {
                statusText += `Searching: ${input.pattern || 'files'}`;
              } else if (toolName === 'Grep') {
                statusText += `Grep: ${input.pattern?.substring(0, 20) || 'pattern'}`;
              } else if (toolName === 'Task') {
                statusText += `Agent: ${input.description || 'task'}`;
              } else if (toolName === 'WebFetch') {
                statusText += `Fetching URL`;
              } else {
                statusText += `${toolName}`;
              }

              updateStatusMessage(statusText);
            }
          }
        }

        // Tool result - check for errors
        if (json.type === 'user' && json.message?.content) {
          for (const block of json.message.content) {
            if (block.type === 'tool_result' && block.is_error) {
              updateStatusMessage('❌ Tool failed');
            }
          }
        }

        // Result - response complete
        if (json.type === 'result') {
          resultReceived = true;  // Prevent further processing
          stopTyping();
          stopTimer();

          // Use lastText (from streaming) preferably, fall back to json.result
          const finalText = lastText || json.result || '';
          const elapsed = formatElapsed(userState.interactiveStartTime);
          const toolCount = userState.interactiveToolsUsed?.length || 0;

          // Delete the thinking message if we have a response
          if (userState.interactiveThinkingMsgId) {
            try {
              await bot.deleteMessage(chatId, userState.interactiveThinkingMsgId);
            } catch (e) {}
            userState.interactiveThinkingMsgId = null;
          }

          // Handle response
          if (finalText) {
            if (finalText.length <= 4000) {
              if (currentMessageId) {
                // Edit existing streaming message
                try {
                  await bot.editMessageText(finalText, {
                    chat_id: chatId,
                    message_id: currentMessageId
                  });
                } catch (e) {}
              } else if (!userState.interactiveThinkingMsgId || userState.interactiveThinkingMsgId === null) {
                // No streaming happened AND no thinking message being processed - send new message
                // This guards against race conditions
                await bot.sendMessage(chatId, finalText);
              }
            } else {
              // Long message - delete partial and send chunks
              if (currentMessageId) {
                try { await bot.deleteMessage(chatId, currentMessageId); } catch (e) {}
              }
              await sendLongMessage(bot, chatId, finalText);
            }

            // Send voice if voiceMode is 'auto'
            const voiceMode = userState.voiceMode || 'off';
            if (voiceMode === 'auto') {
              await sendVoiceResponse(bot, chatId, finalText, userState);
            }
          }

          // Send summary only if we had a request in progress
          if (userState.interactiveStartTime) {
            const summaryParts = [`✅ Done (${elapsed}`];
            if (toolCount > 0) summaryParts.push(`*${toolCount} tools*`);
            summaryParts[summaryParts.length - 1] += ')';
            const summaryText = summaryParts.join(', ');

            // Build keyboard buttons based on modes
            const keyboardRow = [];
            const timestamp = Date.now();
            const voiceMode = userState.voiceMode || 'off';
            const thoughtMode = userState.thoughtMode || 'off';

            console.log(`[thought btn] mode=${thoughtMode}, toolCount=${toolCount}, processLog.length=${processLog.length}`);

            // Thought log button: show if mode is 'on' and there's something to show
            if (thoughtMode === 'on' && (toolCount > 0 || processLog.length > 0)) {
              const logId = `log_${timestamp}`;
              pendingLogs.set(logId, processLog.slice());
              const btnText = toolCount > 0 ? `🧠 ${toolCount} tools` : `🧠 ${processLog.length} steps`;
              keyboardRow.push({ text: btnText, callback_data: `showlog:${logId}` });
            }

            // Voice button: show if mode is 'on' (not auto, not off)
            if (voiceMode === 'on' && finalText && finalText.length > 10) {
              const voiceId = `voice_${timestamp}`;
              pendingLogs.set(voiceId, finalText);
              keyboardRow.push({ text: '🔊 Voice', callback_data: `getvoice:${voiceId}` });
            }

            // If thought mode is 'auto', show thought log automatically
            if (thoughtMode === 'auto' && processLog.length > 0) {
              const logLines = processLog.map((step, i) => `${i + 1}. ${step}`).join('\n');
              const logText = `${summaryText}\n\n🧠 *Thought Process:*\n\`\`\`\n${logLines}\n\`\`\``;
              if (logText.length <= 4000) {
                // Add voice button if voiceMode is 'on'
                if (keyboardRow.length > 0) {
                  await bot.sendMessage(chatId, logText, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [keyboardRow.filter(b => b.callback_data.startsWith('getvoice:'))] }
                  });
                } else {
                  await bot.sendMessage(chatId, logText, { parse_mode: 'Markdown' });
                }
              } else {
                // Send as file if too long
                await bot.sendMessage(chatId, summaryText, { parse_mode: 'Markdown' });
                const buffer = Buffer.from(logLines, 'utf-8');
                await bot.sendDocument(chatId, buffer, { caption: '🧠 Thought Process Log' }, { filename: 'thought-process.txt', contentType: 'text/plain' });
              }
            } else if (keyboardRow.length > 0) {
              // Show buttons (tools and/or voice)
              await bot.sendMessage(chatId, summaryText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [keyboardRow] }
              });
            } else {
              await bot.sendMessage(chatId, summaryText, { parse_mode: 'Markdown' });
            }
          }

          // Reset state for next message
          currentMessageId = null;
          lastText = '';
          resultReceived = false;  // Allow processing next message
          processLog = [];  // Clear process log
          userState.interactiveStartTime = null;
          userState.interactiveToolsUsed = [];
          currentStatus = '';

          if (json.session_id) {
            setSession(chatId, json.session_id, cwd, 'Interactive');
          }
        }
      } catch (e) {
        console.log(`   Parse error: ${e.message}`);
      }
    }
  });

  proc.stderr.on('data', (data) => {
    console.log(`   [stderr] ${data.toString().substring(0, 200)}`);
  });

  proc.on('close', (code) => {
    console.log(`🔄 [${new Date().toLocaleTimeString()}] SESSION CLOSED (code: ${code})`);
    if (initTimeout) clearTimeout(initTimeout);
    stopTyping();
    stopTimer();
    userState.interactiveProc = null;
    userState.isProcessing = false;
  });

  proc.on('error', (err) => {
    console.log(`   SPAWN ERROR: ${err.message}`);
    bot.sendMessage(chatId, `❌ Failed to start Claude: ${err.message}`);
  });

  // Store process
  userState.interactiveProc = proc;
  userState.isProcessing = false;
  console.log(`   [startInteractive] Proc stored, PID: ${proc.pid}`);

  // Retry mechanism: 1 second timeout, 5 retries
  let initRetryCount = 0;
  const maxRetries = 5;
  let initTimeout = null;

  const tryInit = () => {
    initTimeout = setTimeout(() => {
      if (!isReady && userState.pendingMessage) {
        initRetryCount++;
        console.log(`   [TIMEOUT] Retry ${initRetryCount}/${maxRetries} - sending message`);

        if (initRetryCount <= maxRetries) {
          const msg = userState.pendingMessage;
          const sent = sendToInteractive(userState, msg, bot, chatId);

          if (sent) {
            userState.pendingMessage = null;
            startTyping();
            startTimer();
            updateStatusMessage('🔄 Processing...');
          } else if (initRetryCount < maxRetries) {
            // Retry in 1 second
            tryInit();
          } else {
            console.log(`   [TIMEOUT] All retries failed`);
            bot.sendMessage(chatId, '❌ Failed to connect to Claude. Try /cancel and send again.');
          }
        }
      }
    }, 1000);
  };

  tryInit();

  // Queue initial message BEFORE any async operations
  if (initialMessage) {
    userState.pendingMessage = initialMessage;
    userState.interactiveStartTime = Date.now();
    userState.interactiveToolsUsed = [];
    console.log(`   [startInteractive] Pending message set: "${initialMessage.substring(0, 50)}..."`);
  } else {
    // Only show "started" message if no initial message (manual session start)
    bot.sendMessage(chatId,
      `🖥 *Interactive Claude started*\n\n` +
      `📁 ${cwd}\n` +
      `💬 Mode: ${mode}\n` +
      `${resumeId ? '▶️ Resuming session\n' : ''}` +
      `\n_Send messages here → Claude responds here_`,
      { parse_mode: 'Markdown' }
    );
  }

  return proc;
}

/**
 * Stop an interactive Claude session
 */
function stopInteractiveSession(userState) {
  console.log(`🛑 Stopping interactive session`);
  if (userState.interactiveProc && typeof userState.interactiveProc.kill === 'function') {
    userState.interactiveProc.kill();
  }
  // Clean up timer
  if (userState.interactiveTimerInterval) {
    clearInterval(userState.interactiveTimerInterval);
    userState.interactiveTimerInterval = null;
  }
  userState.interactiveProc = null;
  userState.isProcessing = false;
  userState.pendingMessage = null;
  userState.interactiveStartTime = null;
  userState.interactiveToolsUsed = [];
  userState.interactiveThinkingMsgId = null;
}

/**
 * Send message to interactive Claude (stream-json format)
 */
function sendToInteractive(userState, message, bot = null, chatId = null) {
  console.log(`   [sendToInteractive] proc exists: ${!!userState.interactiveProc}, stdin exists: ${!!userState.interactiveProc?.stdin}`);

  if (!userState.interactiveProc || !userState.interactiveProc.stdin) {
    console.log(`   [sendToInteractive] ERROR: No proc or stdin!`);
    return false;
  }

  // Format as JSON for stream-json input
  const jsonMessage = JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: message
    }
  });

  userState.interactiveProc.stdin.write(jsonMessage + '\n');
  console.log(`   [stdin] Sent: ${message.substring(0, 50)}...`);

  return true;
}

/**
 * Handle incoming message (main Claude interaction)
 */
async function handleMessage(bot, msg, isAuthorized) {
  if (!isAuthorized(msg)) return;

  // Skip commands
  if (msg.text && msg.text.startsWith('/')) return;

  // Skip non-text messages
  if (!msg.text) return;

  const chatId = msg.chat.id;
  const userState = getUserState(chatId);

  // INTERACTIVE MODE: use PTY session
  if (userState.interactiveMode) {
    // If PTY session exists, send message to it
    if (userState.interactiveProc) {
      // Send immediate "Thinking..." message with cancel button
      const cancelKeyboard = {
        inline_keyboard: [[{ text: '🛑 Cancel', callback_data: 'interactive:cancel' }]]
      };
      const thinkingMsg = await bot.sendMessage(chatId, '🔄 Processing... (0s)', {
        reply_to_message_id: msg.message_id,
        reply_markup: cancelKeyboard
      });
      userState.interactiveThinkingMsgId = thinkingMsg.message_id;
      // Reset tracking for new request
      userState.interactiveStartTime = Date.now();
      userState.interactiveToolsUsed = [];
      sendToInteractive(userState, msg.text, bot, chatId);
      return;
    }

    // Start new PTY session with this message
    // ALWAYS try to resume existing session for this project (unless /new was used)
    let existingSession = getSession(chatId);

    // Check if session matches current project
    if (existingSession && existingSession.projectPath !== userState.currentPath) {
      console.log(`[Interactive] Session project mismatch, clearing`);
      clearSession(chatId);
      existingSession = null;
    }

    // If no active session, check history for the most recent one in this project
    if (!existingSession) {
      const history = getSessionHistory(chatId);
      const recentSession = history.find(s => s.projectPath === userState.currentPath);
      if (recentSession) {
        existingSession = recentSession;
        // Restore it as active session
        resumeSession(chatId, recentSession);
        console.log(`[Interactive] Restored session from history: ${recentSession.sessionId.substring(0, 8)}...`);
      }
    }

    const resumeSessionId = existingSession?.sessionId || null;

    const sessionIndicator = resumeSessionId ? '💬 Resuming session...' : '🆕 Starting session...';
    const thinkingMsg = await bot.sendMessage(chatId, `🔄 ${sessionIndicator}`, { reply_to_message_id: msg.message_id });
    userState.interactiveThinkingMsgId = thinkingMsg.message_id;

    console.log(`[Interactive] Starting session for chat ${chatId}, resume: ${resumeSessionId || 'new'}`);
    startInteractiveSession(userState, chatId, bot, resumeSessionId, msg.text);
    return;
  }

  // NON-INTERACTIVE MODE: original behavior below

  // If already processing, send message to running Claude process
  if (userState.isProcessing && userState.currentClaudeProc) {
    try {
      // Send the new message to Claude's stdin
      userState.currentClaudeProc.stdin.write(msg.text + '\n');
      bot.sendMessage(chatId, `➡️ Sent to Claude`, { reply_to_message_id: msg.message_id });
    } catch (e) {
      bot.sendMessage(chatId, `⚠️ Could not send to Claude: ${e.message}`);
    }
    return;
  }

  // If processing but no proc (shouldn't happen), reset state
  if (userState.isProcessing) {
    userState.isProcessing = false;
  }

  userState.isProcessing = true;

  // Check for -r flag to force resume
  let prompt = msg.text;
  let forceResume = false;
  if (prompt.startsWith('-r ')) {
    forceResume = true;
    prompt = prompt.substring(3).trim();
  }

  // Check for existing session
  const existingSession = (userState.sessionMode || forceResume) ? getSession(chatId) : null;
  let resumeSessionId = existingSession?.sessionId || null;

  // If project changed, clear session
  if (existingSession && existingSession.projectPath !== userState.currentPath) {
    clearSession(chatId);
    resumeSessionId = null;
  }

  // Send initial message
  const sessionIndicator = (!userState.sessionMode && !forceResume) ? '⚡' : (resumeSessionId ? '💬' : '🆕');
  let sentMsg;
  try {
    sentMsg = await bot.sendMessage(chatId, `${sessionIndicator} Thinking...`, { reply_to_message_id: msg.message_id });
  } catch (e) {
    userState.isProcessing = false;
    return;
  }

  let lastUpdate = Date.now();
  let lastText = '';

  // Prepend voice response style prompt when voice is enabled
  let finalPrompt = prompt;
  if (userState.voiceEnabled && userState.voiceSettings.responseLevel !== 'off') {
    const stylePrompt = RESPONSE_STYLE_OPTIONS.find(r => r.id === userState.voiceSettings.responseLevel)?.prompt;
    if (stylePrompt) {
      finalPrompt = `[${stylePrompt}]\n\n${prompt}`;
    }
  }

  try {
    const result = await runClaudeStreaming(
      finalPrompt,
      userState.currentPath,
      async (text) => {
        // Update message every 1.5 seconds
        if (Date.now() - lastUpdate > 1500 && text !== lastText && text.length > 0) {
          lastUpdate = Date.now();
          lastText = text;
          try {
            const displayText = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
            await bot.editMessageText(displayText + ' ▌', {
              chat_id: chatId,
              message_id: sentMsg.message_id
            });
          } catch (e) {}
        }
      },
      resumeSessionId,
      userState.currentMode,
      userState.currentProject,
      (proc) => { userState.currentClaudeProc = proc; }
    );

    userState.currentClaudeProc = null;

    // Save session
    if ((userState.sessionMode || forceResume) && result.sessionId) {
      if (existingSession) {
        incrementSession(chatId);
      } else {
        setSession(chatId, result.sessionId, userState.currentPath, prompt);
      }
    }

    const response = result.text;

    // Final update
    if (response.length <= 4000) {
      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: sentMsg.message_id
      });
    } else {
      await bot.deleteMessage(chatId, sentMsg.message_id);
      await sendLongMessage(bot, chatId, response, msg.message_id);
    }

    // Send voice if voiceMode is 'auto'
    if ((userState.voiceMode || 'off') === 'auto' && response.length > 0) {
      await sendVoiceResponse(bot, chatId, response, userState);
    }
  } catch (error) {
    userState.currentClaudeProc = null;
    try {
      await bot.editMessageText(`❌ Error: ${error.message}`, {
        chat_id: chatId,
        message_id: sentMsg.message_id
      });
    } catch (e) {
      bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  } finally {
    userState.isProcessing = false;
  }
}

/**
 * Send voice response with chunking and progress
 */
async function sendVoiceResponse(bot, chatId, response, userState) {
  const engineName = TTS_ENGINES[userState.voiceSettings.ttsEngine || 'edge'].name;
  const lines = response.split('\n').filter(l => l.trim().length > 0);
  const presetName = userState.voiceSettings.chunkPreset || 'medium';

  // Determine if chunking is needed
  const needsChunking = presetName !== 'none' && lines.length > 10;

  if (needsChunking) {
    // Send progress message
    let progressMsg = null;
    try {
      progressMsg = await bot.sendMessage(chatId, `🎙 Processing VM 1/? with ${engineName}...`);
    } catch (e) {}

    let sentCount = 0;
    try {
      await generateVoiceChunked(
        response,
        userState.voiceSettings,
        async (buffer, format, chunkNum, totalChunks) => {
          try {
            await bot.sendVoice(chatId, buffer, {
              caption: totalChunks > 1 ? `🔊 ${chunkNum}/${totalChunks}` : undefined
            }, {
              filename: `response_${chunkNum}.${format}`,
              contentType: format === 'wav' ? 'audio/wav' : 'audio/mpeg'
            });
            sentCount++;
          } catch (sendErr) {
            console.log(`Voice send error (chunk ${chunkNum}):`, sendErr?.message);
          }
        },
        async (statusText) => {
          if (progressMsg && statusText) {
            try {
              await bot.editMessageText(statusText, {
                chat_id: chatId,
                message_id: progressMsg.message_id
              });
            } catch (e) {}
          }
        }
      );

      // Delete progress message when done
      if (progressMsg) {
        try { await bot.deleteMessage(chatId, progressMsg.message_id); } catch (e) {}
      }

      if (sentCount === 0) {
        bot.sendMessage(chatId, '🔇 _Voice generation failed_', { parse_mode: 'Markdown' });
      }
    } catch (voiceError) {
      console.log('Chunked voice error:', voiceError?.message || voiceError);
      if (progressMsg) {
        try { await bot.deleteMessage(chatId, progressMsg.message_id); } catch (e) {}
      }
      bot.sendMessage(chatId, `🔇 _Voice failed: ${voiceError?.message || 'unknown error'}_`, { parse_mode: 'Markdown' });
    }
  } else {
    // Single voice message
    try {
      const result = await generateVoice(response, userState.voiceSettings);
      if (result && result.buffer) {
        await bot.sendVoice(chatId, result.buffer, {}, {
          filename: `response.${result.format}`,
          contentType: result.format === 'wav' ? 'audio/wav' : 'audio/mpeg'
        });
      } else {
        bot.sendMessage(chatId, '🔇 _Voice generation failed - text too short_', { parse_mode: 'Markdown' });
      }
    } catch (voiceError) {
      console.log('Voice error:', voiceError?.message || voiceError);
      bot.sendMessage(chatId, `🔇 _Voice failed: ${voiceError?.message || 'unknown error'}_`, { parse_mode: 'Markdown' });
    }
  }
}

/**
 * Handle Claude-related callbacks
 */
async function handleCallback(bot, query, userState) {
  const data = query.data;
  const chatId = query.message.chat.id;

  // Mode selection
  if (data.startsWith('mode:')) {
    const newMode = data.substring(5);
    userState.currentMode = newMode;
    scheduleSave();

    const modeNames = { 'default': '🔒 Default', 'fast': '⚡ Fast', 'plan': '📋 Plan', 'yolo': '🔥 YOLO' };
    bot.answerCallbackQuery(query.id, { text: `✅ Mode: ${modeNames[newMode]}` });
    bot.sendMessage(chatId, `✅ Mode changed to *${modeNames[newMode]}*`, { parse_mode: 'Markdown' });
    return true;
  }

  // Session mode toggle
  if (data.startsWith('session:')) {
    const mode = data.substring(8);
    if (mode === 'on') {
      userState.sessionMode = true;
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ Session mode enabled' });
      bot.sendMessage(chatId, '💬 *Session mode enabled*\nMessages will continue conversation.', { parse_mode: 'Markdown' });
    } else {
      stopInteractiveSession(userState);  // Stop interactive when switching to on-demand
      userState.sessionMode = false;
      clearSession(chatId);
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ On-demand mode' });
      bot.sendMessage(chatId, '⚡ *On-demand mode enabled*\nEach message is independent.', { parse_mode: 'Markdown' });
    }
    return true;
  }

  // Interactive mode toggle
  if (data.startsWith('interactive:')) {
    const mode = data.substring(12);
    if (mode === 'on') {
      userState.interactiveMode = true;
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ Interactive mode enabled' });
      bot.sendMessage(chatId, '🔄 *Interactive mode enabled*\nClaude will run as persistent process.', { parse_mode: 'Markdown' });
    } else if (mode === 'cancel') {
      // Cancel current request
      if (userState.interactiveProc) {
        userState.interactiveProc.kill();
        bot.answerCallbackQuery(query.id, { text: '🛑 Cancelled' });
        // Delete thinking message
        if (userState.interactiveThinkingMsgId) {
          try { bot.deleteMessage(chatId, userState.interactiveThinkingMsgId); } catch (e) {}
          userState.interactiveThinkingMsgId = null;
        }
        bot.sendMessage(chatId, '🛑 Request cancelled');
      } else {
        bot.answerCallbackQuery(query.id, { text: 'Nothing to cancel' });
      }
    } else {
      stopInteractiveSession(userState);
      userState.interactiveMode = false;
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ Interactive mode disabled' });
      bot.sendMessage(chatId, '⚡ *Interactive mode disabled*\nEach message spawns new process.', { parse_mode: 'Markdown' });
    }
    return true;
  }

  // Terminal mode toggle
  if (data.startsWith('terminal:')) {
    const mode = data.substring(9);
    if (mode === 'on') {
      userState.showTerminal = true;
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ Terminal enabled' });
      bot.sendMessage(chatId, '🖥 *Terminal mode enabled*\nClaude will open in visible iTerm window.', { parse_mode: 'Markdown' });
    } else {
      userState.showTerminal = false;
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ Terminal disabled' });
      bot.sendMessage(chatId, '🔇 *Terminal mode disabled*\nClaude runs in background.', { parse_mode: 'Markdown' });
    }
    return true;
  }

  // Get voice for last message (clickable button)
  if (data.startsWith('getvoice:')) {
    const voiceId = data.substring(9);
    const text = pendingLogs.get(voiceId);
    if (text && text.length > 10) {
      bot.answerCallbackQuery(query.id, { text: '🔊 Generating voice...' });
      try {
        const voiceResult = await generateVoice(text, userState.voiceSettings);
        if (voiceResult && voiceResult.buffer) {
          await bot.sendVoice(chatId, voiceResult.buffer, {
            caption: '🔊 Voice response'
          }, {
            filename: `response.${voiceResult.format}`,
            contentType: voiceResult.format === 'wav' ? 'audio/wav' : 'audio/mpeg'
          });
          // Remove the voice button after generating
          try {
            const currentText = query.message.text;
            const remainingButtons = query.message.reply_markup?.inline_keyboard?.[0]?.filter(
              b => !b.callback_data.startsWith('getvoice:')
            ) || [];
            if (remainingButtons.length > 0) {
              bot.editMessageReplyMarkup({ inline_keyboard: [remainingButtons] }, {
                chat_id: chatId,
                message_id: query.message.message_id
              });
            } else {
              bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: chatId,
                message_id: query.message.message_id
              });
            }
          } catch (e) {}
        }
      } catch (err) {
        bot.sendMessage(chatId, `❌ Voice error: ${err.message}`);
      }
      pendingLogs.delete(voiceId);
    } else {
      bot.answerCallbackQuery(query.id, { text: '❌ Text expired' });
    }
    return true;
  }

  // Show process log (clickable button)
  if (data.startsWith('showlog:')) {
    const logId = data.substring(8);
    const log = pendingLogs.get(logId);
    if (log && Array.isArray(log) && log.length > 0) {
      const logLines = log.map((step, i) => `${i + 1}. ${step}`).join('\n');
      const logText = `🧠 *Thought Process:*\n\`\`\`\n${logLines}\n\`\`\``;
      bot.answerCallbackQuery(query.id, { text: '🧠 Showing log' });
      // Edit the message to include the log
      try {
        const currentText = query.message.text;
        bot.editMessageText(`${currentText}\n\n${logText}`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        });
      } catch (e) {
        // If edit fails, send as new message
        bot.sendMessage(chatId, logText, { parse_mode: 'Markdown' });
      }
      pendingLogs.delete(logId);
    } else {
      bot.answerCallbackQuery(query.id, { text: '❌ Log expired' });
    }
    return true;
  }

  // Thought process log mode (off/on/auto)
  if (data.startsWith('thought:')) {
    const mode = data.substring(8);
    console.log(`[thought callback] data=${data}, mode=${mode}`);
    userState.thoughtMode = mode;
    scheduleSave();
    const modeIcons = { off: '🔇', on: '🧠', auto: '✨' };
    const modeNames = { off: 'OFF', on: 'ON', auto: 'AUTO' };
    bot.answerCallbackQuery(query.id, { text: `${modeIcons[mode]} Thought ${modeNames[mode]}` });
    bot.sendMessage(chatId, `${modeIcons[mode]} Thought log *${modeNames[mode]}*`, { parse_mode: 'Markdown' });
    return true;
  }

  // Persist session toggle
  if (data.startsWith('persist:')) {
    const mode = data.substring(8);
    if (mode === 'on') {
      userState.persistSession = true;
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ Persistence enabled' });
      bot.sendMessage(chatId, '💾 *Session persistence enabled*\nYour session will survive bot restarts.', { parse_mode: 'Markdown' });
    } else {
      userState.persistSession = false;
      scheduleSave();
      bot.answerCallbackQuery(query.id, { text: '✅ Persistence disabled' });
      bot.sendMessage(chatId, '🔄 *Session persistence disabled*\nBot restarts will start fresh.', { parse_mode: 'Markdown' });
    }
    return true;
  }

  // Session resume
  if (data.startsWith('resume:')) {
    const shortId = data.substring(7);

    if (shortId === 'clear') {
      clearHistory(chatId);
      bot.answerCallbackQuery(query.id, { text: '✅ History cleared' });
      bot.sendMessage(chatId, '🗑 Session history cleared.');
      return true;
    }

    const session = getSessionByShortId(chatId, shortId);
    if (!session) {
      bot.answerCallbackQuery(query.id, { text: '❌ Session not found' });
      return true;
    }

    resumeSession(chatId, session);
    userState.sessionMode = true;
    userState.currentPath = session.projectPath;
    userState.currentProject = path.basename(session.projectPath);
    scheduleSave();

    bot.answerCallbackQuery(query.id, { text: '✅ Session resumed' });
    bot.sendMessage(chatId,
      `💬 *Session resumed*\n\n` +
      `📁 Project: *${userState.currentProject}*\n` +
      `📝 Topic: ${session.topic || '(none)'}\n` +
      `💬 Messages: ${session.messageCount}\n\n` +
      `Type your next message to continue.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  // CLI session resume (Mac sessions)
  if (data.startsWith('cli:')) {
    const shortId = data.substring(4);

    // Find the CLI session
    const cliSessions = getCliSessions(userState.currentPath, 20);
    const session = cliSessions.find(s => s.sessionId.startsWith(shortId));

    if (!session) {
      bot.answerCallbackQuery(query.id, { text: '❌ Session not found' });
      return true;
    }

    // Stop any existing interactive session
    stopInteractiveSession(userState);

    // Enable session mode and set the CLI session to resume
    userState.sessionMode = true;
    userState.pendingCliResume = session.sessionId;  // Store for next message
    scheduleSave();

    bot.answerCallbackQuery(query.id, { text: '✅ Mac session selected' });

    // If interactive mode, start with resume
    if (userState.interactiveMode) {
      startInteractiveSession(userState, chatId, bot, session.sessionId);
      bot.sendMessage(chatId,
        `🖥 *Resuming Mac session*\n\n` +
        `📝 Topic: ${session.topic || '(none)'}\n` +
        `💬 Messages: ${session.messageCount}\n\n` +
        `Interactive session started with --resume.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      // For non-interactive, store sessionId and use on next message
      setSession(chatId, session.sessionId, userState.currentPath, session.topic);
      bot.sendMessage(chatId,
        `🖥 *Mac session ready to resume*\n\n` +
        `📝 Topic: ${session.topic || '(none)'}\n` +
        `💬 Messages: ${session.messageCount}\n\n` +
        `Send your next message to continue this session.`,
        { parse_mode: 'Markdown' }
      );
    }
    return true;
  }

  // CLI browse - list projects or show project sessions
  if (data.startsWith('clibrowse:')) {
    const action = data.substring(10);

    if (action === 'list') {
      bot.answerCallbackQuery(query.id, { text: '📂 Projects' });
      sendProjectsSessionsMenu(bot, chatId);
      return true;
    }

    if (action === 'back') {
      bot.answerCallbackQuery(query.id, { text: '⬅️ Back' });
      sendSessionsMenu(bot, chatId);
      return true;
    }

    // Show sessions for specific project
    bot.answerCallbackQuery(query.id, { text: '📁 Loading...' });
    sendProjectSessionsList(bot, chatId, action);
    return true;
  }

  // CLI project session resume (from browse)
  if (data.startsWith('cliproj:')) {
    const parts = data.substring(8).split(':');
    const encodedPath = parts[0];
    const shortId = parts[1];

    // Find project and session
    const projects = getCliProjects();
    const project = projects.find(p => p.encoded.startsWith(encodedPath));

    if (!project) {
      bot.answerCallbackQuery(query.id, { text: '❌ Project not found' });
      return true;
    }

    const sessions = getCliSessions(project.decoded, 20);
    const session = sessions.find(s => s.sessionId.startsWith(shortId));

    if (!session) {
      bot.answerCallbackQuery(query.id, { text: '❌ Session not found' });
      return true;
    }

    // Stop any existing interactive session
    stopInteractiveSession(userState);

    // Switch to the project and set up session
    userState.currentPath = project.decoded;
    userState.currentProject = project.name;
    userState.sessionMode = true;
    scheduleSave();

    bot.answerCallbackQuery(query.id, { text: '✅ Session selected' });

    // If interactive mode, start with resume
    if (userState.interactiveMode) {
      startInteractiveSession(userState, chatId, bot, session.sessionId);
      bot.sendMessage(chatId,
        `🖥 *Resuming session from ${project.name}*\n\n` +
        `📝 Topic: ${session.topic || '(none)'}\n` +
        `💬 Messages: ${session.messageCount}\n\n` +
        `Interactive session started with --resume.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      setSession(chatId, session.sessionId, project.decoded, session.topic);
      bot.sendMessage(chatId,
        `🖥 *Session ready from ${project.name}*\n\n` +
        `📝 Topic: ${session.topic || '(none)'}\n` +
        `💬 Messages: ${session.messageCount}\n\n` +
        `📁 Switched to: ${project.decoded}\n\n` +
        `Send your next message to continue.`,
        { parse_mode: 'Markdown' }
      );
    }
    return true;
  }

  // Command callbacks
  if (data === 'cmd:sessions') {
    bot.answerCallbackQuery(query.id, { text: '/sessions' });
    sendSessionsMenu(bot, chatId);
    return true;
  }

  if (data === 'cmd:session') {
    bot.answerCallbackQuery(query.id, { text: '/session' });
    const session = getSession(chatId);
    const modeIcon = userState.sessionMode ? '💬' : '⚡';
    const modeName = userState.sessionMode ? 'Session' : 'On-Demand';
    let statusText = `⚙️ *Conversation Mode*\n\nCurrent: ${modeIcon} *${modeName}*\n`;
    if (userState.sessionMode && session) {
      statusText += `\n📍 Active session:\nID: \`${session.sessionId.substring(0, 8)}...\`\nMessages: ${session.messageCount}\n`;
    } else if (userState.sessionMode) {
      statusText += `\nNo active session yet. Send a message to start one.\n`;
    }
    statusText += `\n⚡ On-demand = each message independent\n💬 Session = Claude remembers context`;
    const keyboard = [[
      { text: userState.sessionMode ? '⚡ Switch to On-Demand' : '✓ ⚡ On-Demand', callback_data: 'session:off' },
      { text: userState.sessionMode ? '✓ 💬 Session' : '💬 Switch to Session', callback_data: 'session:on' }
    ]];
    bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
    return true;
  }

  if (data === 'cmd:new') {
    bot.answerCallbackQuery(query.id, { text: '/new' });
    stopInteractiveSession(userState);  // Stop interactive when starting fresh
    clearSession(chatId);
    bot.sendMessage(chatId, '🆕 Started fresh session. Claude won\'t remember previous messages.');
    return true;
  }

  if (data === 'cmd:interactive') {
    bot.answerCallbackQuery(query.id, { text: '/interactive' });
    const modeIcon = userState.interactiveMode ? '🔄' : '⚡';
    const modeName = userState.interactiveMode ? 'ON' : 'OFF';
    const keyboard = [[
      { text: userState.interactiveMode ? '⚡ Turn OFF' : '🔄 Turn ON', callback_data: userState.interactiveMode ? 'interactive:off' : 'interactive:on' }
    ]];
    bot.sendMessage(chatId,
      `🔄 *Interactive Mode*\n\nCurrent: ${modeIcon} *${modeName}*`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
    return true;
  }

  if (data === 'cmd:terminal') {
    bot.answerCallbackQuery(query.id, { text: '/terminal' });
    const modeIcon = userState.showTerminal ? '🖥' : '🔇';
    const modeName = userState.showTerminal ? 'iTerm' : 'Background';
    const keyboard = [[
      { text: userState.showTerminal ? '🔇 Background' : '🖥 iTerm', callback_data: userState.showTerminal ? 'terminal:off' : 'terminal:on' }
    ]];
    bot.sendMessage(chatId,
      `🖥 *Terminal Display*\n\nCurrent: ${modeIcon} *${modeName}*`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
    return true;
  }

  if (data === 'cmd:resume') {
    bot.answerCallbackQuery(query.id, { text: '/resume' });
    sendSessionsMenu(bot, chatId);
    return true;
  }

  if (data === 'cmd:mode') {
    bot.answerCallbackQuery(query.id, { text: '/mode' });
    sendModeMenu(bot, chatId, userState);
    return true;
  }

  if (data === 'cmd:cancel') {
    bot.answerCallbackQuery(query.id, { text: '/cancel' });
    if (userState.currentClaudeProc) {
      userState.currentClaudeProc.kill();
      userState.currentClaudeProc = null;
      userState.isProcessing = false;
      bot.sendMessage(chatId, '🛑 Cancelled your request');
    } else if (userState.interactiveProc) {
      userState.interactiveProc.kill();
      bot.sendMessage(chatId, '🛑 Cancelled interactive request');
    } else {
      bot.sendMessage(chatId, '✅ Nothing to cancel');
    }
    return true;
  }

  if (data === 'cmd:persist') {
    bot.answerCallbackQuery(query.id, { text: '/persist' });
    const persistIcon = userState.persistSession ? '💾' : '🔄';
    const persistName = userState.persistSession ? 'ON' : 'OFF';
    const keyboard = [[
      { text: userState.persistSession ? '🔄 Disable' : '💾 Enable', callback_data: userState.persistSession ? 'persist:off' : 'persist:on' }
    ]];
    bot.sendMessage(chatId,
      `💾 *Session Persistence*\n\nCurrent: ${persistIcon} *${persistName}*\n\n` +
      `When ON, your active session survives bot restarts.`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
    return true;
  }

  if (data === 'cmd:thought') {
    bot.answerCallbackQuery(query.id, { text: '/thought' });
    const mode = userState.thoughtMode || 'off';
    const modeIcons = { off: '🔇', on: '🧠', auto: '✨' };
    const modeNames = { off: 'OFF', on: 'ON (button)', auto: 'AUTO' };
    const keyboard = [
      [
        { text: mode === 'off' ? '✓ 🔇 Off' : '🔇 Off', callback_data: 'thought:off' },
        { text: mode === 'on' ? '✓ 🧠 On' : '🧠 On', callback_data: 'thought:on' },
        { text: mode === 'auto' ? '✓ ✨ Auto' : '✨ Auto', callback_data: 'thought:auto' }
      ]
    ];
    bot.sendMessage(chatId,
      `🧠 *Thought Process Log*\n\nCurrent: ${modeIcons[mode]} *${modeNames[mode]}*\n\n` +
      `🔇 *Off* - No thought log\n` +
      `🧠 *On* - Click button to view\n` +
      `✨ *Auto* - Shows automatically`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
    );
    return true;
  }

  return false;
}

module.exports = {
  register,
  handleMessage,
  handleCallback,
  sendSessionsMenu,
  sendModeMenu,
  runClaude,
  runClaudeStreaming,
  startInteractiveSession,
  stopInteractiveSession,
  sendToInteractive
};
