# /script - יצירת סקריפטים למילוי שעות

צור סקריפטי JavaScript למילוי שעות באתרי דיווח.

**שימוש:**
- `/script` - שני הסקריפטים
- `/script moh` - MOH בלבד
- `/script oracle` - Oracle ADF בלבד

**מיקום קבצים:** `~/hours_logs_moh/YYYY-MM.json`

**MOH (One):** שדות `time_start_HH_N`, `time_start_MM_N`, `time_end_HH_N`, `time_end_MM_N`

**Oracle ADF:** התאמה לפי תאריך ב-`clockInDate::content`

צור סקריפט עם מערך monthData מהנתונים ב-JSON
