# Screen Configuration Reference

> Source: `common.screen_settings`, `common.column_settings`
> Generated: 2025-12-14
> Database: qa_naharia

---

## HOW SCREENS ARE CONFIGURED

### Architecture

1. **`common.screen_settings`** defines screens and which columns appear
2. **`common.column_settings`** defines available columns
3. `feature_order` in screen_settings is a comma-separated list of column_ids

### Screen Settings Table Structure

| Column | Type | Purpose |
|--------|------|---------|
| `screen_id` | VARCHAR | Unique screen identifier |
| `screen_label` | VARCHAR | Hebrew display name |
| `feature_order` | VARCHAR | Comma-separated column_ids |
| `first_row_sort` | VARCHAR | Default primary sort column |
| `second_row_sort` | VARCHAR | Default secondary sort column |
| `user_name` | VARCHAR | User-specific settings |
| `agg_info_by` | VARCHAR | Aggregation field |
| `search_by` | VARCHAR | Search field |

### Column Settings Table Structure

| Column | Type | Purpose |
|--------|------|---------|
| `column_id` | INTEGER | Unique ID referenced by feature_order |
| `column_name` | VARCHAR | Technical name |
| `heb_name` | VARCHAR | Hebrew display name |
| `column_key` | VARCHAR | Maps to data field |

---

## EXAMPLE: "ממתינים לניתוח" (Waiting for Surgery)

**Screen ID**: `totalWaitingSurgery`
**Label**: ממתינים לניתוח
**feature_order**: `65,67,8,68,71,70,72,73,77,75,64`

### Decoding the Columns

| Order | column_id | column_name | heb_name | column_key |
|-------|-----------|-------------|----------|------------|
| 1 | 65 | ? | ? | ? |
| 2 | 67 | ? | ? | ? |
| 3 | 8 | age | גיל | age |
| 4 | 68 | ? | ? | ? |
| 5 | 71 | ? | ? | ? |
| ... | ... | ... | ... | ... |

**Sort**: First by column 72, then by column 73

---

## ALL SCREENS (qa_naharia)

| screen_id | screen_label (Hebrew) | feature_order | Columns |
|-----------|----------------------|---------------|---------|
| `unavaliableEmployees` | לא זמינים | 62,55,54,61,57 | 5 |
| `occRooms` | תפוסים | 74,80,65,8,67,79,68,69,70 | 9 |
| `totalWaitingSurgery` | ממתינים לניתוח | 65,67,8,68,71,70,72,73,77,75,64 | 11 |
| `consultationCases` | מקרי ייעוץ | 4,45,6,7,8,48,46,12,14,16 | 10 |
| `hospitalizationsCases` | ממתינים לשיבוץ לאשפוז | 4,20,23,11,6,7,8,12,13,14 | 10 |
| `transfersCases` | העברות | 4,20,24,25,11,6,7,8,12,13,14 | 11 |
| `medicalSatellite` | לווינים רפואיים | 6,65,7,8,83,37,13,34,85 | 9 |
| `discharge-na` | מטופלים עם מכתב שחרור רפואי | 6,65,7,8,83,37,13,85,84 | 9 |
| `waitingAdministrativeRelease` | ממתינים לשחרור | 4,20,18,65,8,12,13,14,17,19,78,15,16 | 13 |
| `patientsInfoScreen` | מטופלים | 10,25,38,4,11,65,9,8,12,13,14,44,78,15,16 | 15 |
| `waitingHospitalization` | ממתינים לאשפוז | 4,20,18,65,8,12,13,14,19,23,24,25 | 12 |
| `decisionsCases` | החלטות | 22,4,18,6,65,8,12,13,14,17,15,19,16 | 13 |
| `avaliableEmployees` | זמינים | 1,62,55,54,61,52 | 6 |
| `delayedConsultations` | ייעוצים מעוכבים | 4,45,65,8,12,13,14,46,48,47 | 10 |
| `nursingSatellite` | לווינים סיעודיים | 6,65,7,8,83,37,13,85,84 | 9 |

---

## COLUMN REFERENCE (First 33 columns)

| column_id | column_name | heb_name | column_key |
|-----------|-------------|----------|------------|
| 1 | arrivalMode | אופן הגעה | arrivalMode |
| 2 | admReason | סיבת קבלה | admReason |
| 3 | longDwellTime | זמן שהייה כולל | admissionDate |
| 4 | dwellTime | זמן שהייה כולל | admissionDate |
| 5 | admissionDate | זמן המתנה | admissionDate |
| 6 | name | שם | name |
| 7 | idNumber | תעודת זהות | idNumber |
| 8 | age | גיל | age |
| 9 | infectionsArr | זיהום | infections |
| 10 | triageScore | דירוג טריאז | triageScore |
| 11 | clinicalReason | סיבת פנייה קלינית | mainReason |
| 12 | roomDesc | אגף | roomDesc |
| 13 | bedDesc | מיטה | bedDesc |
| 14 | erAssign | תחום רפואי | erAssign |
| 15 | imaging | דימות | imaging |
| 16 | consults | ייעוץ | consults |
| 17 | chargeDoc | רופא | chargeDoc |
| 18 | MainComplaint | תלונה עיקרית | MainComplaint |
| 19 | doctorDecision | החלטה | doctorDecision |
| 20 | timeSinceDesicion | זמן מקביעת החלטה | desicionDateTime |
| 21 | timeSinceTriage | זמן המתנה לקבלה סיעודית | savingDateTime |
| 22 | waitingDoctorTime | זמן המתנה לרופא | savingDateTimeNurse |
| 23 | intendedWard | מחלקת יעד | intendedWard |
| 24 | planMabarCode | שיבוץ למחלקה | planMabarCode |
| 25 | transportStatusDesc | סטטוס שינוע | transportStatusDesc |
| 29 | indicationTypeDesc | סוג הדימות | indicationTypeDesc |
| 30 | serviceGroupDesc | סוגי שירותים | serviceGroupDesc |
| 31 | indicationStatusId | סטטוס דימות | status |
| 32 | indicationStartDate | זמן שחלף מהזמנה | indicationStartDate |
| 33 | indicationStartDateEnd | זמן שחלף מביצוע | indicationStartDate |

---

## HOW TO ANSWER: "Which columns are in screen X?"

### Step 1: Query screen_settings
```sql
SELECT screen_id, screen_label, feature_order
FROM common.screen_settings
WHERE screen_id = 'totalWaitingSurgery';
```

### Step 2: Parse feature_order
`65,67,8,68,71,70,72,73,77,75,64` → Array of column_ids

### Step 3: Query column_settings
```sql
SELECT column_id, column_name, heb_name, column_key
FROM common.column_settings
WHERE column_id IN (65,67,8,68,71,70,72,73,77,75,64);
```

### Step 4: Join to get complete picture
```sql
SELECT
    ss.screen_id,
    ss.screen_label,
    cs.column_id,
    cs.column_name,
    cs.heb_name,
    cs.column_key
FROM common.screen_settings ss
CROSS JOIN LATERAL unnest(string_to_array(ss.feature_order, ',')) WITH ORDINALITY AS f(col_id, pos)
JOIN common.column_settings cs ON cs.column_id = f.col_id::int
WHERE ss.screen_id = 'totalWaitingSurgery'
ORDER BY f.pos;
```

---

## SATELLITE SCREENS

Two screens specifically for satellite patients:

1. **`medicalSatellite`** (לווינים רפואיים)
   - Columns: 6,65,7,8,83,37,13,34,85

2. **`nursingSatellite`** (לווינים סיעודיים)
   - Columns: 6,65,7,8,83,37,13,85,84

The difference between medical and nursing satellites is tracked via screen configuration, not data fields.

---

## EVIDENCE-BASED NOTES

### What Can Be Stated
1. Screen columns are defined via `feature_order` (comma-separated column_ids)
2. Column metadata lives in `column_settings`
3. Sort order is defined by `first_row_sort` and `second_row_sort`
4. User-specific screen settings are supported (`user_name` field)

### What is UNKNOWN
- How new screens are created (UI or direct DB)
- How column_settings are maintained
- Whether column_ids 26-28 exist (gap in data)
- Full list of columns beyond 33

---

*END OF SCREEN CONFIGURATION REFERENCE*
