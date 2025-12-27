/**
 * Configuration module - Constants, projects, TTS settings, voice chunk presets
 */

const path = require('path');
const fs = require('fs');

// Paths
const BOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(BOT_DIR, 'data');
const PIPER_VOICES_DIR = path.join(process.env.HOME, '.local/share/piper-voices');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const FILES = {
  sessions: path.join(DATA_DIR, 'sessions.json'),
  userState: path.join(DATA_DIR, 'user-state.json'),
  projects: path.join(DATA_DIR, 'projects.json'),
  log: path.join(BOT_DIR, 'bot.log'),
  env: path.join(BOT_DIR, '.env'),
  pid: path.join(DATA_DIR, 'bot.pid'),
  restartNotify: path.join(DATA_DIR, 'restart-notify.txt')
};

// Default projects (will be merged with persisted projects)
const DEFAULT_PROJECTS = {
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

// TTS Engine configuration
const TTS_ENGINES = {
  piper: { name: 'Piper', icon: '🏠', description: 'Local (fastest, Hebrew→Google)' },
  google: { name: 'Google TTS', icon: '🔵', description: 'Cloud (fast, Hebrew)' },
  edge: { name: 'Edge TTS', icon: '☁️', description: 'Cloud (best quality, Hebrew)' },
  coqui: { name: 'Coqui', icon: '🐸', description: 'Local (English, Hebrew→Google)' }
};

// Piper voice models
const PIPER_MODELS = {
  en: path.join(PIPER_VOICES_DIR, 'en_US-amy-medium.onnx'),
  he: path.join(PIPER_VOICES_DIR, 'he_IL-motek-medium.onnx')
};

// Coqui models
const COQUI_MODELS = {
  en: 'tts_models/en/ljspeech/vits',
  multilingual: 'tts_models/multilingual/multi-dataset/xtts_v2'
};

// Voice chunk presets - defines how to split long responses for TTS
// Each array defines line counts: [first chunk, second chunk, third chunk, ...]
// Last value repeats for remaining chunks
const VOICE_CHUNK_PRESETS = {
  small: {
    name: 'Small',
    icon: '🔹',
    description: '1-2-3-4-5-5-5... (fastest first audio)',
    pattern: [1, 2, 3, 4, 5],  // Start with 1 line for fastest feedback
    repeat: 5
  },
  medium: {
    name: 'Medium',
    icon: '🔸',
    description: '2-4-8-8-8... (default)',
    pattern: [2, 4, 8],
    repeat: 8
  },
  large: {
    name: 'Large',
    icon: '🟠',
    description: '2-4-8-12-12-12...',
    pattern: [2, 4, 8, 12],
    repeat: 12
  },
  xl: {
    name: 'XL',
    icon: '🟡',
    description: '4-4-8-8-10-12-14-14-14...',
    pattern: [4, 4, 8, 8, 10, 12, 14],
    repeat: 14
  },
  xxl: {
    name: 'XXL',
    icon: '🟢',
    description: '5-10-15-20-20-20... (original)',
    pattern: [5, 10, 15, 20],
    repeat: 20
  },
  xxxl: {
    name: 'XXXL',
    icon: '🔵',
    description: '10-20-40-40... (large chunks)',
    pattern: [10, 20, 40],
    repeat: 40
  },
  none: {
    name: 'None',
    icon: '⬜',
    description: 'Full message (no split)',
    pattern: null,  // Special: no chunking
    repeat: null
  }
};

// Voice options for Edge TTS
const EDGE_VOICE_OPTIONS = {
  english: [
    { id: 'en-US-ChristopherNeural', name: '🇺🇸 Christopher (Male)' },
    { id: 'en-US-GuyNeural', name: '🇺🇸 Guy (Male)' },
    { id: 'en-US-AriaNeural', name: '🇺🇸 Aria (Female)' },
    { id: 'en-US-JennyNeural', name: '🇺🇸 Jenny (Female)' },
    { id: 'en-GB-RyanNeural', name: '🇬🇧 Ryan (British Male)' },
    { id: 'en-GB-SoniaNeural', name: '🇬🇧 Sonia (British Female)' }
  ],
  hebrew: [
    { id: 'he-IL-AvriNeural', name: '🇮🇱 Avri (Male)' },
    { id: 'he-IL-HilaNeural', name: '🇮🇱 Hila (Female)' }
  ]
};

// Google TTS voice options (accent via TLD)
const GOOGLE_VOICE_OPTIONS = {
  english: [
    { id: 'com', name: '🇺🇸 American English' },
    { id: 'co.uk', name: '🇬🇧 British English' },
    { id: 'com.au', name: '🇦🇺 Australian English' },
    { id: 'co.in', name: '🇮🇳 Indian English' }
  ],
  hebrew: [
    { id: 'co.il', name: '🇮🇱 Hebrew (Israel)' },
    { id: 'com', name: '🇮🇱 Hebrew (Default)' }
  ]
};

// Speed options for Edge TTS
const SPEED_OPTIONS = [
  { id: '-50%', name: '🐢 Very Slow (0.5x)' },
  { id: '-25%', name: '🚶 Slow (0.75x)' },
  { id: '+0%', name: '🚗 Normal (1x)' },
  { id: '+25%', name: '🏃 Fast (1.25x)' },
  { id: '+50%', name: '🚀 Very Fast (1.5x)' },
  { id: '+100%', name: '⚡ Ultra Fast (2x)' }
];

// Google speed options
const GOOGLE_SPEED_OPTIONS = [
  { id: 'normal', name: '🚗 Normal' },
  { id: 'slow', name: '🐢 Slow' }
];

// Response style options for voice
const RESPONSE_STYLE_OPTIONS = [
  { id: 'off', name: '📝 Off - Normal text', prompt: '' },
  { id: 'normal', name: '🗣 Normal - Light formatting', prompt: 'Respond clearly. Minimize markdown, avoid complex formatting.' },
  { id: 'casual', name: '💬 Casual - Conversational', prompt: 'Respond in natural conversational speech. No markdown, no bullet points. Short sentences.' },
  { id: 'very_casual', name: '🎙 Very Casual - Natural speech', prompt: `OUTPUT_STYLE = "spoken explanation". Speak as if explaining things out loud in a relaxed conversation. Do NOT paste code blocks unless explicitly asked. Never read code, scripts, URLs, or endpoints verbatim. Describe what code does in plain language. Explain the idea, purpose, and flow, not the syntax. If there is an endpoint or URL, explain what it represents without saying the actual path. If there is a script, explain what it achieves step by step without quoting lines. If there is configuration, explain the intent, not keys and values. Use short sentences. Use everyday language. It should sound like spoken explanation, not documentation. Prefer "basically", "the idea here is", "what's happening is", "in practice". Assume the listener is technical but does not want to see raw code. Focus on understanding, not implementation details. Hard rule: If you are about to show code, stop and explain it instead. Only show code if explicitly asked. NEVER use emojis.` },
  { id: 'bro', name: '🤙 Bro - Friend chat', prompt: `STYLE_MODE = "bro". You are talking to a friend. Both of you are technical. No teaching, no documentation, no formality. Just vibes. Tone: Very casual, friendly, slight humor encouraged, sound like spoken language not written text. Language rules: Short sentences. Break thoughts. Feel like WhatsApp or Discord voice chat. It's OK to be a bit messy. Hard rules: NEVER paste code. NEVER read code, endpoints, URLs, function names, or config keys. NEVER sound like a tutorial. NEVER use emojis. Instead: Talk about what's going on. Explain the idea. Explain the intention. Explain the vibe of the solution. Assumptions: The other person is smart. No need to prove anything. No need to be precise unless it matters. If details are not critical, skip them, hand-wave them. Allowed: Light jokes, casual exaggeration, friendly sarcasm. Not allowed: Overdoing jokes, being cringe, emojis. Do NOT explain like a teacher. Talk like a friend.` }
];

// Mode descriptions
const MODE_DESCRIPTIONS = {
  'default': '🔒 Default - Asks for permissions',
  'fast': '⚡ Fast - Quick answers, no file tools (~3s)',
  'plan': '📋 Plan - Only plans, no execution',
  'yolo': '🔥 YOLO - Skip all permissions (dangerous!)'
};

// Default voice settings
const DEFAULT_VOICE_SETTINGS = {
  ttsEngine: 'edge',
  voice: 'en-US-JennyNeural',
  hebrewVoice: 'he-IL-HilaNeural',
  rate: '+25%',
  piperSpeed: 0.8,
  pitch: '+0Hz',
  googleTld: 'com',
  googleHebrewTld: 'co.il',
  googleSlow: false,
  responseLevel: 'very_casual',
  chunkPreset: 'medium'  // NEW: voice chunk preset
};

// Session settings
const MAX_SESSION_HISTORY = 20;

module.exports = {
  // Paths
  BOT_DIR,
  DATA_DIR,
  PIPER_VOICES_DIR,
  FILES,

  // Projects
  DEFAULT_PROJECTS,

  // TTS
  TTS_ENGINES,
  PIPER_MODELS,
  COQUI_MODELS,
  VOICE_CHUNK_PRESETS,
  EDGE_VOICE_OPTIONS,
  GOOGLE_VOICE_OPTIONS,
  SPEED_OPTIONS,
  GOOGLE_SPEED_OPTIONS,
  RESPONSE_STYLE_OPTIONS,
  DEFAULT_VOICE_SETTINGS,

  // Modes
  MODE_DESCRIPTIONS,

  // Session
  MAX_SESSION_HISTORY
};
