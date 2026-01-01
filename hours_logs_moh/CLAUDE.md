# Hours Tracking System - MOH

## סטטוס נוכחי
- **חודש פעיל**: ינואר 2026 (`2026-01.json`)
- **היסטוריה**: דצמבר 2025 (`2025-12.json`)
- **תאריך עדכון אחרון**: 01/01/2026

## Purpose
Track work hours via natural Hebrew input, save to JSON, generate scripts for TWO timesheet systems.

## File Structure
```
hours_logs_moh/
├── 2026-01.json      ← Current month (active)
├── 2025-12.json      ← Previous months (history)
├── archive/          ← Old months auto-archived
└── CLAUDE.md
```

**Naming convention:** `YYYY-MM.json`

---

## Work Rules (חוקי עבודה)

### הסכם אישי
| פרמטר | ערך |
|-------|-----|
| הפסקה | 30 דקות (חובה, לא בתשלום) |
| יום עבודה רגיל | 8:36 (8.6 שעות) |
| שעות נוספות מתחילות | מהדקה ה-517 (שעה 8:37) |
| תעריף שעות נוספות | 150% (כל השעות הנוספות) |
| שעות תקן חודשי | ימי עבודה × 8.6 |

### חישוב שעות תקן
```
ימי עבודה = ימי החודש - סופ"ש (ו-ש) - חגים
שעות תקן = ימי עבודה × 8.6
```

### חגי ישראל 2025-2026

**2025:**
| חג | תאריך | ימי עבודה מופחתים |
|----|-------|-------------------|
| פורים | 14/03 | 1 |
| פסח | 13-19/04 | 2 (ראשון + שביעי) |
| יום העצמאות | 01/05 | 1 |
| שבועות | 02/06 | 1 |
| ראש השנה | 23-24/09 | 2 |
| יום כיפור | 02/10 | 1 |
| סוכות | 07/10 | 1 |
| שמחת תורה | 14/10 | 1 |

**2026:**
| חג | תאריך | ימי עבודה מופחתים |
|----|-------|-------------------|
| פורים | 03/03 | 1 |
| פסח | 02-08/04 | 2 |
| יום העצמאות | 22/04 | 1 |
| שבועות | 22/05 | 1 |
| ראש השנה | 12-13/09 | 2 |
| יום כיפור | 21/09 | 1 |
| סוכות | 26/09 | 1 |
| שמחת תורה | 03/10 | 1 |

### חישוב שעות (כללי)
```
ברוטו = יציאה - כניסה (זמן נוכחות)
נטו = ברוטו - 0:30 (שעות עבודה בפועל)
רגילות = min(נטו, 8:36)
נוספות = max(0, נטו - 8:36)
```

### חישוב שעות לפי MOH (משרד הבריאות)
**חשוב:** מערכת One של משרד הבריאות מחשבת תקן יומי שונה לפי יום בשבוע:

| יום | תקן יומי | הערה |
|-----|----------|------|
| ראשון - רביעי (א-ד) | 8.60 שעות (8:36) | יום רגיל |
| חמישי (ה) | 7.60 שעות (7:36) | יום קצר |

```
חישוב MOH:
ראשון-רביעי: נוספות = max(0, נטו - 8:36)
חמישי: נוספות = max(0, נטו - 7:36)
```

**למה זה חשוב?**
- החישוב שלי (8.6 לכל יום) יתן תוצאה שונה מ-MOH
- לדוגמה דצמבר 2025: אני חישבתי 14:03 נוספות, MOH הראה 18.05

### דוגמה
```
כניסה: 09:00, יציאה: 19:00
ברוטו: 10:00
נטו: 9:30 (אחרי הפסקה)
רגילות: 8:36 (100%)
נוספות: 0:54 (150%)
```

---

## How to Use
User says hours in Hebrew, Claude updates the current month file.

### Input Examples
| Hebrew Input | Meaning |
|--------------|---------|
| `אתמול תשע עד שבע` | Yesterday 09:00-19:00 |
| `היום עשר עד שבע וחצי` | Today 10:00-19:30 |
| `31/12 שמונה עד ארבע` | Dec 31, 08:00-16:00 |
| `עשר עד שתיים הפסקה שלוש עד שמונה` | 10:00-14:00 + 15:00-20:00 |
| `היום חופש` | Day off |
| `ראשון עד חמישי תשע עד שש` | Range: Sun-Thu 09:00-18:00 |
| `באותו אופן` | Same pattern as previous days |

### Time Parsing Rules
- `תשע` / `9` → 09:00
- `שבע וחצי` / `7:30` → 19:30 (PM if end time > start)
- `עשר ורבע` → 10:15
- `שש 45` → 18:45
- Start times: assume AM (07-12)
- End times: assume PM if > start time

### JSON Schema
```json
{
  "month": "12/2025",
  "entries": [
    {
      "date": "01/12/2025",
      "day": 1,
      "shifts": [{ "start": "09:00", "end": "19:00" }],
      "note": "optional note"
    }
  ]
}
```

- Single shift: one object in shifts array
- With break: multiple objects in shifts array
- Day off: `"shifts": []` with note (חופשה/שישי/שבת)

---

## Commands

| Command | Action |
|---------|--------|
| `/show` | Show current month entries table |
| `/show 12/2025` | Show specific month |
| `/summary` | Summary for current month (even if partial) |
| `/summary 12/2025` | Summary for specific month |
| `/summary 10/2025-12/2025` | Summary for range of months |
| `/summary all` | Summary for all saved months |
| `/salary` | Calculate salary for current month |
| `/salary 12/2025` | Calculate salary for specific month |
| `/script` | Generate BOTH scripts (MOH + Oracle) |
| `/script moh` | Generate MOH script only |
| `/script oracle` | Generate Oracle ADF script only |
| `/history` | List all saved months |
| `/new` | Start new month (keeps history) |

---

## `/summary` Output Format

Display table with all work days, then summary:

### Per-Day Table
| תאריך | יום | כניסה | יציאה | ברוטו | נטו | רגילות | נוספות |
|-------|-----|-------|-------|-------|-----|--------|--------|

### Summary Box
| מדד | הסבר | שעות |
|-----|------|------|
| **שעות תקן** | ימי עבודה × 8:36 | XX:XX |
| סה"כ ברוטו | כניסה עד יציאה | XX:XX |
| סה"כ נטו | ברוטו - הפסקות | XX:XX |
| שעות רגילות (100%) | סכום min(נטו_יומי, 8:36) | XX:XX |
| שעות נוספות (150%) | סכום max(0, נטו_יומי - 8:36) **יומי!** | XX:XX |
| **הפרש מתקן** | רגילות - תקן | +XX:XX / -XX:XX |
| ימי עבודה | | XX |
| ימי חופשה | | XX |

**חשוב:** שעות נוספות מחושבות **יומית**, לא חודשית!
- יום של 12 שעות = 3:24 נוספות (גם אם יום אחר היה קצר)
- הפרש מתקן יכול להיות שלילי גם כשיש שעות נוספות

### Multi-Month Summary
When summarizing multiple months, show:
1. Per-month breakdown
2. Grand total across all months

---

## `/new` Behavior
1. Current month file stays in place (becomes history)
2. Creates new file for new month: `YYYY-MM.json`
3. All history preserved

---

## Script Templates

### System 1: MOH Timesheet (משרד הבריאות)

Field pattern per day N (1-31):
- `time_start_HH_N` - start hour
- `time_start_MM_N` - start minutes
- `time_end_HH_N` - end hour
- `time_end_MM_N` - end minutes

```js
// ==== MOH Timesheet Filler ====
const monthData = [
  // { day: 1, startHH: "09", startMM: "00", endHH: "19", endMM: "00" },
];

function fillMOH(day, startHH, startMM, endHH, endMM) {
  if (!startHH || !endHH) return;

  const fields = {
    startHH: document.querySelector(`[name="time_start_HH_${day}"]`),
    startMM: document.querySelector(`[name="time_start_MM_${day}"]`),
    endHH: document.querySelector(`[name="time_end_HH_${day}"]`),
    endMM: document.querySelector(`[name="time_end_MM_${day}"]`)
  };

  if (!fields.startHH) { console.warn("Day not found:", day); return; }

  fields.startHH.value = startHH;
  fields.startMM.value = startMM;
  fields.endHH.value = endHH;
  fields.endMM.value = endMM;

  Object.values(fields).forEach(f => {
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
  });

  console.log(`✔ Day ${day}: ${startHH}:${startMM} - ${endHH}:${endMM}`);
}

monthData.forEach(r => fillMOH(r.day, r.startHH, r.startMM, r.endHH, r.endMM));
console.log("MOH Done!");
```

### System 2: Oracle ADF Timesheet

Field pattern: Match by date string in `clockInDate::content` fields.

```js
// ==== Oracle ADF Timesheet Filler ====
const monthData = [
  // { date: "01/01/2026", start: "09:00", end: "19:00" },
];

function fillByDate(dateStr, start, end) {
  if (!start || !end) return;
  const dateFields = document.querySelectorAll("[id*='clockInDate::content']");
  for (const field of dateFields) {
    if (field.value === dateStr) {
      const match = field.id.match(/dataTable:(\d+):/);
      if (!match) continue;
      const index = match[1];
      const startSel = `#pt1\\:dataTable\\:${index}\\:clockInTime\\:\\:content`;
      const endSel   = `#pt1\\:dataTable\\:${index}\\:clockOutTime\\:\\:content`;
      const startEl = document.querySelector(startSel);
      const endEl   = document.querySelector(endSel);
      if (!startEl || !endEl) return;
      startEl.value = start;
      startEl.dispatchEvent(new Event("input", { bubbles: true }));
      startEl.dispatchEvent(new Event("change", { bubbles: true }));
      endEl.value = end;
      endEl.dispatchEvent(new Event("input", { bubbles: true }));
      endEl.dispatchEvent(new Event("change", { bubbles: true }));
      console.log("✔ Filled:", dateStr, start, end);
      return;
    }
  }
  console.warn("❌ Date not found in DOM:", dateStr);
}

monthData.forEach(row => fillByDate(row.date, row.start, row.end));
console.log("Oracle Done!");
```

---

## Script Generation Logic

When `/script` is called:

1. Read entries from current month JSON
2. For each entry with shifts:
   - First shift start time = entry start
   - Last shift end time = entry end
3. Generate both scripts with populated monthData arrays
4. Days without shifts are skipped (not included in script)

---

## פקודת `/salary` - חישוב שכר

### נתוני שכר (עדכון: דצמבר 2025)

| פרמטר | ערך |
|-------|-----|
| תעריף שעתי | 159.34 ₪ |
| תעריף יומי | 1,338.26 ₪ |
| משכורת בסיס | 29,000 ₪ |
| שעות נוספות 150% | 239.01 ₪/שעה |
| נסיעות | 500 ₪ (קבוע) |
| הוצאות חנייה | 500 ₪ (קבוע) |

### ניכויים (אחוזים משוערים לברוטו ~34,000)

| ניכוי | אחוז | הערה |
|-------|------|------|
| מס הכנסה | ~22% | מדורג (לא קבוע) |
| ביטוח לאומי | ~5.7% | |
| ביטוח בריאות | ~4.7% | |
| **סה"כ מסים** | **~32.7%** | **זה מה שבאמת לוקחים** |
| קופות גמל | ~6.3% | חוזר לעובד (פנסיה) |
| **סה"כ ניכויים** | **~39%** | כולל פנסיה |

### הערות לחישוב שכר
- **תעדורות**: ניכוי על איחורים (~47 ₪/חודש) - לא ניתן לחזות מראש
- **מסים מדורגים**: 32.7% זה ממוצע לברוטו ~34,000. אם ברוטו עולה משמעותית, האחוז עולה
- **המעסיק מפריש**: עוד ~6.5% לפנסיה (לא מופיע בתלוש כניכוי)

### פורמט פלט `/salary`

```
═══════════════════════════════════════
       שכר חודש XX/XXXX
═══════════════════════════════════════

📊 פירוט תשלומים
───────────────────────────────────────
משכורת בסיס                   29,000.00 ₪
שעות נוספות 150% (XX.XX שעות)  X,XXX.XX ₪
נסיעות                           500.00 ₪
הוצאות חנייה                     500.00 ₪
───────────────────────────────────────
סה"כ תשלומים                  XX,XXX.XX ₪

📉 ניכויים (משוער ~39%)
───────────────────────────────────────
מס הכנסה (~22%)               X,XXX.XX ₪
ביטוח לאומי (~5.7%)           X,XXX.XX ₪
ביטוח בריאות (~4.7%)          X,XXX.XX ₪
קופות גמל (~6.3%)             X,XXX.XX ₪
───────────────────────────────────────
סה"כ ניכויים                  XX,XXX.XX ₪

═══════════════════════════════════════
💰 נטו לתשלום (משוער)         XX,XXX.XX ₪
═══════════════════════════════════════
```

### לוגיקת חישוב

```
1. קרא שעות מקובץ JSON של החודש
2. חשב שעות נוספות לפי כלל MOH:
   - א-ד: נוספות = max(0, נטו - 8:36)
   - ה: נוספות = max(0, נטו - 7:36)
3. חשב תשלומים:
   - בסיס: 29,000
   - נוספות: סה"כ_שעות_נוספות × 239.01
   - נסיעות: 500
   - חנייה: 500
4. חשב ניכויים (אחוזים מברוטו)
5. הצג פירוט + ברוטו + נטו משוער
```

---

## סיכום מהיר - חוקי עבודה ישראל

### שבוע עבודה
```
42 שעות נטו בשבוע (חוק ישראלי)
```

### תקן יומי MOH (עם הפסקה)

| יום | תקן נטו | הפסקה | נוכחות ברוטו |
|-----|---------|-------|--------------|
| א-ד | 8:36 | 0:30 | 9:06 |
| ה | 7:36 | 0:30 | 8:06 |

### למה חמישי קצר?
```
א-ד: 8:36 × 4 = 34:24
ה:   7:36 × 1 =  7:36
סה"כ:          42:00 ✓
```

### האם 8:24 אחיד עדיף?
```
42 ÷ 5 = 8:24 (8.4 שעות) - חלוקה שווה

הפרש מ-MOH:
א-ד: 12 דק × 4 = +48 דקות נוספות
ה:   48 דקות פחות נוספות
סה"כ: מתאזן לאפס

מסקנה: כמעט אותו דבר, MOH פשוט נותן חמישי קצר.
```

### הסכם אמוס - יתרונות
- 150% מהדקה הראשונה (חוק: 125% לשעתיים ראשונות)
- הפסקה 30 דק לא בתשלום = סטנדרט (לא חיסרון)

### נוסחאות חישוב
```
ברוטו = יציאה - כניסה
נטו = ברוטו - 0:30
נוספות (א-ד) = max(0, נטו - 8:36)
נוספות (ה) = max(0, נטו - 7:36)
```
