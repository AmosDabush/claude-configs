# Claude Telegram Bot

בוט טלגרם שמחבר אותך ל-Claude AI מכל מקום דרך הטלפון.

## ארכיטקטורה

```
+---------------+          +------------------+          +----------------+
|   Telegram    |  Long    |   Bot Server     |  spawn   |   Claude CLI   |
|   (טלפון)     | <------> |   (המאק שלך)     | <------> | (~/.local/bin) |
+---------------+ Polling  +------------------+          +----------------+
                                                                 |
                                                                 | API
                                                                 v
                                                         +----------------+
                                                         |   Anthropic    |
                                                         |   Servers      |
                                                         +----------------+
```

**הבוט רץ על המאק שלך** ומקשיב לטלגרם. כשמגיעה הודעה, הוא מריץ את `claude` בטרמינל ושולח את התשובה בחזרה.

## מבנה הקבצים

```
~/.claude/telegram-bot/
├── bot.js                 # Entry point - 766 שורות
├── start.sh               # Script להפעלה/ריסטארט
├── .env                   # BOT_TOKEN, ALLOWED_USER_IDS
├── bot.log                # לוגים
├── package.json           # dependencies
│
├── data/                  # נתונים שמורים
│   ├── sessions.json      # היסטוריית sessions של Claude
│   ├── user-state.json    # הגדרות המשתמש
│   ├── projects.json      # פרויקטים מותאמים אישית
│   └── bot.pid            # PID של התהליך
│
└── lib/
    ├── config.js          # קונפיגורציה - TTS engines, presets, defaults
    ├── state.js           # ניהול state + persistence
    ├── sessions.js        # ניהול sessions של Claude
    ├── utils.js           # פונקציות עזר - sendLongMessage, cleanTextForTTS
    │
    ├── commands/
    │   ├── claude.js      # 🔥 הלוגיקה המרכזית - 1800+ שורות
    │   ├── navigation.js  # /projects, /browse, /cd, /pwd
    │   ├── git.js         # /status, /branch, /repo, /ls, /tree
    │   ├── voice.js       # /voice, /tts, /setvoice
    │   └── parallel.js    # /perspectives, /investigate
    │
    └── tts/
        ├── index.js       # Router + chunking
        ├── edge.js        # Edge TTS (Microsoft)
        ├── google.js      # Google TTS
        ├── piper.js       # Piper (local)
        └── coqui.js       # Coqui (local)
```

## התקנה

### דרישות
- Node.js 18+
- Claude CLI מותקן (`~/.local/bin/claude`)
- Telegram Bot Token (מ-@BotFather)

### שלבים

1. **צור את קובץ .env:**
```bash
cd ~/.claude/telegram-bot
cat > .env << 'EOF'
BOT_TOKEN=your-telegram-bot-token
ALLOWED_USER_IDS=123456789,987654321
EOF
```

2. **התקן dependencies:**
```bash
npm install
```

3. **הפעל:**
```bash
./start.sh
```

## פקודות

### ניווט
| פקודה | תיאור |
|-------|--------|
| `/projects` | בחירת פרויקט מרשימה |
| `/browse` | דפדוף בתיקיות עם כפתורים |
| `/pwd` | הצגת נתיב נוכחי + מצב |
| `/cd <path>` | מעבר לתיקייה |
| `/add <name> <path>` | הוספת פרויקט |

### Claude AI
| פקודה | תיאור |
|-------|--------|
| (טקסט חופשי) | שליחה ל-Claude |
| `/sessions` | רשימת sessions קודמים |
| `/session` | החלפה בין On-Demand/Session mode |
| `/new` | session חדש |
| `/mode` | בחירת permission mode |
| `/cancel` | ביטול בקשה |
| `/fast <q>` | תשובה מהירה (ללא tools) |

### Interactive Mode
| פקודה | תיאור |
|-------|--------|
| `/interactive` | הפעלה/כיבוי מצב אינטראקטיבי |
| `/terminal` | החלפה בין iTerm לרקע |
| `/resume` | חידוש session אחרון |
| `/persist` | שמירת session גם אחרי restart |

### Git ופקודות מהירות
| פקודה | תיאור |
|-------|--------|
| `/status` או `/gs` | Git status |
| `/branch` | Branch נוכחי |
| `/branches` | כל ה-branches |
| `/repo` | מידע על repo |
| `/ls` | תוכן תיקייה |
| `/tree` | מבנה תיקיות |
| `/files` | חיפוש קבצים |

### Voice (TTS)
| פקודה | תיאור |
|-------|--------|
| `/voice` | הפעלה/כיבוי קול |
| `/tts` | בחירת TTS engine |
| `/setvoice` | בחירת קול |
| `/setvoicespeed` | מהירות דיבור |
| `/voicechunk` | גודל chunks |
| `/voiceresponse` | סגנון תשובה |

### Parallel Operations
| פקודה | תיאור |
|-------|--------|
| `/perspectives [n] <q>` | קבלת n נקודות מבט (2-5) |
| `/investigate <problem>` | פירוק בעיה וחקירה במקביל |

### אחר
| פקודה | תיאור |
|-------|--------|
| `/menu` | תפריט ראשי |
| `/help` או `/?` | עזרה |
| `/all` | כל הפקודות |
| `/logs` | צפייה בלוגים |
| `/restart` | הפעלה מחדש |

## מצבי עבודה

### Session Mode vs On-Demand

**On-Demand (ברירת מחדל):**
- כל הודעה היא שיחה נפרדת
- Claude לא זוכר הודעות קודמות
- מהיר יותר

**Session Mode:**
- Claude זוכר את כל השיחה
- אפשר להמשיך מאיפה שהפסקת
- משתמש ב-`--resume` של Claude CLI

### Interactive Mode

**Interactive ON (ברירת מחדל):**
- Claude רץ כתהליך מתמשך
- תקשורת דרך stdin/stdout
- הכי מהיר לשיחות רציפות

**Interactive OFF:**
- כל הודעה מפעילה תהליך חדש
- איטי יותר, אבל יציב יותר

### Permission Modes

| מצב | תיאור |
|-----|--------|
| `default` | Claude מבקש אישור לפעולות |
| `fast` | תשובות מהירות, ללא כלים |
| `plan` | רק תכנון, ללא ביצוע |
| `yolo` | ללא אישורים (מסוכן!) |

## TTS Engines

| Engine | תיאור | עברית |
|--------|--------|-------|
| Edge TTS | Microsoft, איכות הכי טובה | כן |
| Google TTS | מהיר, טוב | כן |
| Piper | מקומי, הכי מהיר | לא |
| Coqui | מקומי, אנגלית | לא |

### Voice Chunk Presets

הבוט מחלק תשובות ארוכות ל-chunks ושולח אודיו בהדרגה:

| Preset | Pattern | תיאור |
|--------|---------|--------|
| Small | 1-2-3-4-5-5... | אודיו ראשון הכי מהיר |
| Medium | 2-4-8-8... | ברירת מחדל |
| Large | 2-4-8-12-12... | פחות הודעות |
| None | Full | הכל בבת אחת |

## דוגמה: זרימת הודעה מלאה

1. **שולחים בטלגרם:** "מה זה git rebase?"

2. **הבוט מקבל** (Long Polling מטלגרם)

3. **בדיקת הרשאות:** `isAuthorized(msg)`

4. **Interactive Mode פועל?**
   - **כן:** כותב ל-stdin של Claude:
     ```json
     {"type": "user", "message": {"role": "user", "content": "מה זה git rebase?"}}
     ```
   - **לא:** מריץ פקודה חדשה:
     ```bash
     claude -p "מה זה git rebase?" --output-format stream-json
     ```

5. **Streaming:** הבוט מעדכן את ההודעה בטלגרם כל כמה שניות עם התוכן החדש

6. **סיום:** ההודעה הסופית נשלחת

7. **Voice מופעל?** אם כן:
   - טקסט עובר `cleanTextForTTS()` (ניקוי markdown, טבלאות וכו')
   - נשלח ל-TTS engine
   - נשלח כהודעה קולית

## Callbacks ותפריטים

כל תפריט בנוי מ-inline keyboard עם callback_data:

```javascript
// דוגמה מ-bot.js
const keyboard = [
  [{ text: '🤖 Claude AI', callback_data: 'all:claude' }],
  [{ text: '📂 Navigation', callback_data: 'all:nav' }],
  ...
];
```

**זרימת callback:**
1. משתמש לוחץ על כפתור
2. `bot.on('callback_query')` מופעל
3. הבוט בודק את ה-callback_data
4. מעביר ל-handler המתאים:
   - `navigationCommands.handleCallback()`
   - `gitCommands.handleCallback()`
   - `voiceCommands.handleCallback()`
   - `claudeCommands.handleCallback()`
   - `parallelCommands.handleCallback()`

## State Management

### User State (per chat)
```javascript
{
  currentProject: 'home',
  currentPath: '/Users/...',
  isProcessing: false,
  currentMode: 'default',
  sessionMode: true,
  persistSession: false,
  voiceEnabled: false,
  voiceSettings: { ttsEngine: 'edge', ... },
  interactiveMode: true,
  interactiveProc: null,
  showProcessLog: true
}
```

**נשמר ב:** `data/user-state.json`

### Sessions
```javascript
{
  chatId: "123456",
  sessionId: "abc-123",
  project: "backend",
  path: "/Users/.../backend",
  lastMessage: "..."
}
```

**נשמר ב:** `data/sessions.json`

## קבצים חשובים

### lib/commands/claude.js
הקובץ המרכזי - מטפל ב:
- שליחת הודעות ל-Claude
- Streaming של תשובות
- Interactive mode (stdin/stdout)
- Voice responses
- Session management

### lib/utils.js
פונקציות עזר:
- `sendLongMessage()` - שליחת הודעות ארוכות (מעל 4096 תווים)
- `cleanTextForTTS()` - ניקוי markdown/טבלאות לקול
- `runQuickCommand()` - הרצת פקודות shell

### lib/config.js
קונפיגורציה:
- TTS engines
- Voice presets
- Default projects
- Permission modes

## פתרון בעיות

### הבוט לא מגיב
```bash
# בדוק אם רץ
ps aux | grep "node bot.js"

# ראה לוגים
tail -f ~/.claude/telegram-bot/bot.log

# הפעל מחדש
~/.claude/telegram-bot/start.sh
```

### Claude לא מגיב
```bash
# בדוק ש-claude CLI עובד
claude -p "test"

# ראה שה-PATH נכון
which claude
```

### TTS לא עובד
```bash
# בדוק edge-tts
edge-tts --text "test" --voice en-US-AriaNeural --write-media /tmp/test.mp3

# או עבור piper
~/.local/bin/piper --model ~/.local/share/piper-voices/en_US-amy-medium.onnx --output_file /tmp/test.wav <<< "test"
```

## הפעלה/עצירה

```bash
# הפעלה
~/.claude/telegram-bot/start.sh

# עצירה
kill $(cat ~/.claude/telegram-bot/data/bot.pid)

# או מהטלגרם
/restart
```

## אבטחה

- **ALLOWED_USER_IDS:** רק משתמשים מורשים יכולים להשתמש בבוט
- **אל תשתף את BOT_TOKEN**
- **YOLO mode מסוכן:** נותן ל-Claude לעשות הכל ללא אישור
