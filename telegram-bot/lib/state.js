/**
 * User State Management with Persistence
 * Handles per-user state (project, mode, voice settings, etc.)
 */

const fs = require('fs');
const path = require('path');
const { FILES, DEFAULT_PROJECTS, DEFAULT_VOICE_SETTINGS } = require('./config');

// In-memory state
const userStates = new Map();
let projects = { ...DEFAULT_PROJECTS };

// Reference to sessions module (set later to avoid circular deps)
let sessionsModule = null;

/**
 * Set sessions module reference (called from bot.js)
 */
function setSessionsModule(mod) {
  sessionsModule = mod;
}

// Debounce save operations
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 2000;

/**
 * Get default state for a new user
 */
function getDefaultUserState() {
  return {
    currentProject: 'home',
    currentPath: projects.home || '/Users/amosdabush',
    isProcessing: false,
    currentClaudeProc: null,
    currentMode: 'default',
    sessionMode: true,
    persistSession: false,  // When true, active session survives bot restart
    voiceMode: 'off',       // 'off' = disabled, 'on' = show button, 'auto' = auto-generate
    voiceSettings: { ...DEFAULT_VOICE_SETTINGS },
    messageQueue: [],  // Queue for messages received during processing
    // Interactive mode settings
    interactiveMode: true,  // DEFAULT ON - Claude runs persistently
    interactiveProc: null,  // Reference to persistent Claude process
    showTerminal: false,    // Show in visible iTerm window
    interactiveLogFile: null,  // Log file path for terminal view
    thoughtMode: 'off'      // 'off' = disabled, 'on' = show button, 'auto' = auto-show
  };
}

/**
 * Get or create user state
 */
function getUserState(chatId) {
  if (!userStates.has(chatId)) {
    userStates.set(chatId, getDefaultUserState());
  }
  return userStates.get(chatId);
}

/**
 * Update user state and trigger save
 */
function updateUserState(chatId, updates) {
  const state = getUserState(chatId);
  Object.assign(state, updates);
  scheduleSave();
  return state;
}

/**
 * Get all user states (for iteration)
 */
function getAllUserStates() {
  return userStates;
}

/**
 * Load user states from file
 */
function loadUserStates() {
  try {
    if (fs.existsSync(FILES.userState)) {
      const data = JSON.parse(fs.readFileSync(FILES.userState, 'utf-8'));

      for (const [chatIdStr, state] of Object.entries(data.users || {})) {
        const chatId = parseInt(chatIdStr);
        // Merge with defaults to handle new fields
        const mergedState = {
          ...getDefaultUserState(),
          ...state,
          voiceSettings: {
            ...DEFAULT_VOICE_SETTINGS,
            ...(state.voiceSettings || {})
          },
          // Reset runtime-only state
          isProcessing: false,
          currentClaudeProc: null,
          interactiveProc: null,
          interactiveLogFile: null
        };

        // Migrate old boolean fields to new mode strings
        if (typeof state.voiceEnabled === 'boolean') {
          mergedState.voiceMode = state.voiceEnabled ? 'auto' : 'off';
          delete mergedState.voiceEnabled;
        }
        if (typeof state.showProcessLog === 'boolean') {
          mergedState.thoughtMode = state.showProcessLog ? 'auto' : 'off';
          delete mergedState.showProcessLog;
        }

        userStates.set(chatId, mergedState);
      }

      console.log(`📂 Loaded ${userStates.size} user states from file`);
    }
  } catch (e) {
    console.log('⚠️ Could not load user states:', e.message);
  }
}

/**
 * Restore active sessions after loading user states
 * Must be called after sessions module is loaded
 */
function restoreActiveSessions() {
  if (!sessionsModule) {
    console.log('⚠️ Sessions module not set, cannot restore active sessions');
    return;
  }

  try {
    if (fs.existsSync(FILES.userState)) {
      const data = JSON.parse(fs.readFileSync(FILES.userState, 'utf-8'));
      let restored = 0;

      for (const [chatIdStr, state] of Object.entries(data.users || {})) {
        const chatId = parseInt(chatIdStr);
        // If user had persistSession enabled and has a saved activeSession, restore it
        if (state.persistSession && state.activeSession) {
          sessionsModule.resumeSession(chatId, state.activeSession);
          restored++;
        }
      }

      if (restored > 0) {
        console.log(`📂 Restored ${restored} active sessions`);
      }
    }
  } catch (e) {
    console.log('⚠️ Could not restore active sessions:', e.message);
  }
}

/**
 * Save user states to file
 */
function saveUserStates() {
  try {
    const data = {
      users: {},
      savedAt: new Date().toISOString()
    };

    for (const [chatId, state] of userStates) {
      // Don't persist runtime-only fields
      const { isProcessing, currentClaudeProc, interactiveProc, interactiveLogFile, ...persistableState } = state;

      // If persistSession is enabled, save the active session too
      if (state.persistSession && sessionsModule) {
        const activeSession = sessionsModule.getSession(chatId);
        if (activeSession) {
          persistableState.activeSession = activeSession;
        }
      }

      data.users[chatId] = persistableState;
    }

    fs.writeFileSync(FILES.userState, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('⚠️ Could not save user states:', e.message);
  }
}

/**
 * Schedule a debounced save
 */
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveUserStates();
    saveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Force immediate save (for shutdown)
 */
function saveNow() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  saveUserStates();
  saveProjects();
}

// ===== Project Management =====

/**
 * Load projects from file
 */
function loadProjects() {
  try {
    if (fs.existsSync(FILES.projects)) {
      const data = JSON.parse(fs.readFileSync(FILES.projects, 'utf-8'));
      // Merge with defaults (user projects override defaults)
      projects = { ...DEFAULT_PROJECTS, ...data.projects };
      console.log(`📂 Loaded ${Object.keys(data.projects || {}).length} custom projects`);
    }
  } catch (e) {
    console.log('⚠️ Could not load projects:', e.message);
  }
}

/**
 * Save projects to file
 */
function saveProjects() {
  try {
    // Only save projects that aren't in defaults or have different paths
    const customProjects = {};
    for (const [name, projectPath] of Object.entries(projects)) {
      if (!DEFAULT_PROJECTS[name] || DEFAULT_PROJECTS[name] !== projectPath) {
        customProjects[name] = projectPath;
      }
    }

    const data = {
      projects: customProjects,
      savedAt: new Date().toISOString()
    };

    fs.writeFileSync(FILES.projects, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('⚠️ Could not save projects:', e.message);
  }
}

/**
 * Get all projects
 */
function getProjects() {
  return projects;
}

/**
 * Add or update a project
 */
function addProject(name, projectPath) {
  projects[name.toLowerCase()] = projectPath;
  saveProjects();
}

/**
 * Remove a project
 */
function removeProject(name) {
  const key = name.toLowerCase();
  if (projects[key]) {
    delete projects[key];
    saveProjects();
    return true;
  }
  return false;
}

/**
 * Check if project exists
 */
function hasProject(name) {
  return !!projects[name.toLowerCase()];
}

/**
 * Get project path
 */
function getProjectPath(name) {
  return projects[name.toLowerCase()];
}

// Initialize on module load
loadUserStates();
loadProjects();

module.exports = {
  // User state
  getUserState,
  updateUserState,
  getAllUserStates,
  getDefaultUserState,

  // Persistence
  loadUserStates,
  saveUserStates,
  saveNow,
  scheduleSave,
  setSessionsModule,
  restoreActiveSessions,

  // Projects
  getProjects,
  addProject,
  removeProject,
  hasProject,
  getProjectPath,
  loadProjects,
  saveProjects
};
