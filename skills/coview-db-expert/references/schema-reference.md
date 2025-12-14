# Complete Database Schema Reference

> Generated: 2025-12-14
> Database: qa_naharia (coview)
> Mode: EXHAUSTIVE DOMAIN SKILL RESEARCH

---

## DATABASE OVERVIEW

### Schemas

| Schema | Purpose | Table Count |
|--------|---------|-------------|
| `patients` | Patient/case data, beds, rooms, clinical | 56 tables |
| `common` | Reference data, wards, permissions, screens | 52 tables |
| `labs` | Lab test results | 6 tables |
| `nursing` | Nursing activities, events, shifts | 8 tables |
| `staff` | Employee/staff data | 4 tables |
| `ambulance` | Ambulance/emergency codes | 7 tables |
| `logistics` | Operational continuity | 1 table |
| `public` | System/migration tables | 4 tables |

**Total: 138 tables**

---

## CORE ENTITY: CASE (patients.cases)

The **Case** is the central entity representing a patient's hospitalization episode.

### DDL

```sql
CREATE TABLE patients.cases (
    case_id             INTEGER PRIMARY KEY NOT NULL,
    patient_id          INTEGER,                        -- FK to patients.patients
    mabar_code          VARCHAR(250),                   -- External code
    nursing_ward        VARCHAR(250),                   -- Display name (Hebrew)
    bed_id              VARCHAR(255),                   -- Current bed
    room_id             VARCHAR(255),                   -- Current room
    is_active           BOOLEAN,                        -- Active hospitalization
    is_respirated       BOOLEAN,                        -- On ventilator
    creation_date       TIMESTAMP,
    update_date         TIMESTAMP,
    corona_status_id    VARCHAR(20),
    admission_date      TIMESTAMP,                      -- When admitted
    discharge_date      TIMESTAMP,                      -- When discharged
    chameleon_ward_id   VARCHAR(250),                   -- Main ward (medical responsibility)
    chameleon_satellite_ward_id VARCHAR(250),           -- Physical location ward
    days_in_ward        VARCHAR(250),
    med_ward_admission_date TIMESTAMP,
    admission_type      VARCHAR(250),                   -- Type code
    admission_type_desc VARCHAR(250),                   -- Type description
    transfer_category   VARCHAR(250),
    movement_date       TIMESTAMP,
    movement_time       TIMESTAMP,
    plan_mabar_code     VARCHAR(250),
    plan_nursing_ward   VARCHAR(250),
    absence             BOOLEAN,                        -- Patient temporarily away
    adm_reason          VARCHAR(250),
    reception_type      VARCHAR(50),
    arrival_mode        VARCHAR(250),
    referral_type       VARCHAR(250),
    revisit             BOOLEAN,                        -- Readmission
    adm_reason_id       VARCHAR(250),
    reception_type_id   VARCHAR(250),
    arrival_mode_id     VARCHAR(250),
    referral_type_id    VARCHAR(250),
    sheet_status        VARCHAR(250),
    sheet_status_time   TIMESTAMP,
    aran_id             INTEGER,                        -- ARAN (mass casualty) ID
    aran_location       VARCHAR(250),
    main_injury         VARCHAR(250),
    med_status_er       VARCHAR(250),
    med_status_hospital VARCHAR(250),
    visitor_type_id     VARCHAR(20),
    visitor_type_desc   VARCHAR(250)
);
```

### Key Fields Explained

| Field | Business Meaning |
|-------|------------------|
| `chameleon_ward_id` | **Medical responsibility ward** - which medical team owns the patient |
| `chameleon_satellite_ward_id` | **Physical location ward** - where patient actually is |
| `nursing_ward` | Display name (short Hebrew name like "פנא", "כירא") |
| `is_active` | TRUE = currently hospitalized |
| `revisit` | TRUE = patient was previously admitted within X days |
| `absence` | TRUE = patient temporarily left (e.g., for tests) |
| `aran_id` | Links to ARAN (mass casualty event) system |

---

## SATELLITE WARD CONCEPT

### What is a Satellite Patient?

A **satellite patient** is physically located in a different ward than their administrative assignment.

**Example**:
- Patient administratively in "נפרולוגיה" (Nephrology) - `chameleon_ward_id = 15068592`
- Physically located in "פנימית ו" (Internal Medicine F) - `chameleon_satellite_ward_id = 15068591`
- Display name: "פנו"

**Why this happens**:
1. ICU overflow - patient needs ICU care but ICU is full
2. Specialized treatment - patient needs equipment in another ward
3. Bed management - no available beds in primary ward

### Query to Find Satellite Patients

```sql
SELECT
    c.case_id,
    c.chameleon_ward_id AS main_ward,
    c.chameleon_satellite_ward_id AS physical_location,
    w1.ward_desc AS main_ward_name,
    w2.ward_desc AS physical_ward_name
FROM patients.cases c
LEFT JOIN common.wards w1 ON c.chameleon_ward_id = w1.ward_id
LEFT JOIN common.wards w2 ON c.chameleon_satellite_ward_id = w2.ward_id
WHERE c.chameleon_satellite_ward_id IS NOT NULL
  AND c.is_active = true;
```

---

## WARD HIERARCHY

### Ward Categories

| category_id | category_desc | category_long_desc | Meaning |
|-------------|---------------|-------------------|---------|
| 1 | WI | מיקום פיזי - אשפוז | Physical location - Hospitalization |
| 2 | UE | תת יח. רפואית - מלר"ד | Sub-unit - Emergency |
| 3 | SI | יח. רפואית - אשפוז | Medical unit - Hospitalization |
| 4 | UI | תת יח. רפואית - אשפוז | Sub medical unit - Hospitalization |
| 5 | HO | בית חולים | Hospital |
| 8 | OP | חדר ניתוח - מחלקתי | Operating room - Departmental |
| 11 | D | אגף | Wing/Department |
| 14 | SE | יח. רפואית - מלר"ד | Medical unit - Emergency |
| 15 | WE | מיקום פיזי - מלר"ד | Physical location - Emergency |
| 20 | OC | חדר ניתוח | Operating room |

### Special Ward Flags

| Flag | Meaning |
|------|---------|
| `is_icu` | Intensive Care Unit |
| `is_aran` | ARAN (Mass Casualty Event) ward |
| `is_blocked` | Ward is blocked/inactive |
| `is_deleted` | Ward is soft-deleted |
| `is_mugbar` | Enhanced supervision ward |

### ARAN (אר"ן) - Mass Casualty Event

**ARAN** = אירוע רב נפגעים (Mass Casualty Event)

ARAN wards are emergency wards activated during mass casualty events. They include:
- מידי קשה (Severe immediate)
- מידי בינוני (Moderate immediate)
- ארן קלים (Light casualties)
- חלכ (Non-surgical patients)

---

## NURSING STATUS TYPES

| nurs_status_id | nurs_status_desc | SQL Usage |
|----------------|------------------|-----------|
| 1 | מונשם (Ventilated) | Type 2 in status_class |
| 2 | הנשמה לא פולשנית (Non-invasive ventilation) | `nurs_status_type = 2` → respirators |
| 3 | מועד לנפילה (Fall risk) | `nurs_status_type = 3` → fall_risk |
| 4 | מצבו הסיעודי של המטופל (Patient nursing status) | General status |

---

## ADMISSION TYPES

| admission_type | admission_type_desc |
|----------------|---------------------|
| 1 | אשפוז מילדותי (Obstetric hospitalization) |
| 2 | יולדת (New mother) |
| 3 | יולדת אחרי ניתוח קיסרי (Post C-section) |
| 119 | אשפוז (General hospitalization) |
| 131 | שיקום כללי / מוגבר כחול (Rehab / Enhanced blue) |
| 133 | כירורגית ילדים (Pediatric surgery) |

---

## RECEPTION TYPES

| reception_type_id | reception_type |
|-------------------|----------------|
| 01 | קבלה רגילה (Regular admission) |
| 02 | לידה (Birth) |
| 03 | ילוד (Newborn) |
| 11 | העברה ממרפאות (Transfer from clinic) |

---

## ISOLATION TYPES

| isolation_type_id | isolation_type_desc | Meaning |
|-------------------|---------------------|---------|
| 1 | מגע | Contact isolation |
| 3 | טיפתי | Droplet isolation |
| 108 | הגנתי | Protective isolation |
| 119 | אוויר | Airborne isolation |
| 124 | בידוד קרינה | Radiation isolation |
| 125 | בידוד מקסימלי | Maximum isolation |

---

## INFECTION STATUSES

| infection_status | Meaning |
|------------------|---------|
| נשא | Carrier (asymptomatic) |
| קליני | Clinical (symptomatic) |

---

## SCREEN CONFIGURATION

### How Screens Are Configured

1. **common.screen_settings** defines screens with:
   - `screen_id`: Unique screen identifier
   - `screen_label`: Hebrew display name
   - `feature_order`: Comma-separated column IDs that appear in this screen

2. **common.column_settings** defines available columns:
   - `column_id`: Unique ID referenced in feature_order
   - `column_name`: Technical name
   - `heb_name`: Hebrew display name
   - `column_key`: Maps to data field

### Example Screen Configuration

**Screen**: "ממתינים לניתוח" (Waiting for Surgery)
- `screen_id`: totalWaitingSurgery
- `feature_order`: "65,67,8,68,71,70,72,73,77,75,64"

This means columns 65, 67, 8, etc. appear in order.

### Column ID Reference (Sample)

| column_id | column_name | heb_name |
|-----------|-------------|----------|
| 6 | name | שם |
| 7 | idNumber | תעודת זהות |
| 8 | age | גיל |
| 9 | infectionsArr | זיהום |
| 12 | roomDesc | אגף |
| 13 | bedDesc | מיטה |

---

## SURGERY WORKFLOW

### Tables Involved

1. **patients.surgery_waiting** - Patients waiting for surgery
2. **patients.patients_in_surgery** - Patients currently in surgery
3. **patients.surgery** - Surgery records

### Surgery Waiting Fields

| Field | Purpose |
|-------|---------|
| case_id | Link to patient case |
| order_ward_id | Ordering ward |
| priority_code | Surgery priority |
| priority_desc | Priority description |
| order_date | When surgery was ordered |
| surgery_order | Order number |
| procedure_code | Procedure type |
| procedure_desc | Procedure description |
| room_id | Target operating room |
| surgery_waiting_aran | ARAN-related surgery |

### Patients in Surgery Fields

| Field | Purpose |
|-------|---------|
| case_id | Link to patient case |
| ward_id | Surgery ward |
| procedure_code | Procedure code |
| procedure_desc | Procedure description |
| room_id | Operating room |
| entry_room_surgery | Time entered surgery room |

---

## KEY RELATIONSHIPS (ORM)

### Case Associations

```
Case → Patient (belongsTo via patient_id)
Case → Ward (belongsTo via chameleon_ward_id, as 'Ward')
Case → Ward (belongsTo via chameleon_satellite_ward_id, as 'satteliteWard')
Case → Ward (belongsTo via nursing_ward, as 'wardFromCase')
Case → Beds (belongsTo via bed_id, as 'Bed')
Case → Rooms (belongsTo via room_id, as 'Room')
Case → Infections (hasMany)
Case → Isolations (hasMany)
Case → NursingStatus (hasOne)
Case → Consultations (hasMany)
Case → Transports (hasMany)
```

### Ward Associations

```
Ward → WardCategory (belongsTo via ward_category)
Ward → Rooms (hasMany via ward_id)
Ward → HigherWards (link via ward_id)
```

---

## COPY TABLE PATTERN

### What Are Copy Tables?

Most core tables have `_copy` variants:
- `patients.cases` ↔ `patients.cases_copy`
- `patients.infections` ↔ `patients.infections_copy`
- etc.

### Usage Pattern

| Component | Table Used |
|-----------|------------|
| API Domains (infectionsApi, etc.) | Copy tables |
| Control Panel Dashboard | Main tables |
| SQL Aggregator (patients-cards-aggregator) | Main tables |

### Data Sync

Copy tables currently have **identical counts** to main tables in qa_naharia:
- cases: 758 = cases_copy: 758
- infections: 50 = infections_copy: 50
- case_isolation: 39 = case_isolation_copy: 39

**Sync mechanism**: Unknown (likely external ETL or triggers)

---

## cards_agg TABLE

### Purpose

Pre-aggregated view of patient cards with JSONB columns for complex data.

### Key Understanding

- **NOT case-centric**: 90% of rows are empty beds/rooms with `case_id = 'NO_CASE'`
- **Primary key**: `id` (auto-increment)
- **Unique key**: `(case_id, bed_id)`

### JSONB Columns

| Column | Contains |
|--------|----------|
| infection | Array of infection objects |
| isolation | Array of isolation objects |
| nursing | Array of nursing status objects |
| respirators | Array of respirator status |
| fall_risk | Array of fall risk status |
| lab_results | Array of lab results |
| panic_result | Array of panic lab results (HH/LL) |
| invalid_result | Array of invalid lab results (X/INVALID) |
| consultation | Array of consultations |
| nurses | Array of assigned nurses |
| blocked_bed | Array of bed block info |
| discharge_docs | Array of discharge documents |

---

## LEGACY EXPORTS

The system exports **119 models** via `pgModels/index.ts` for backward compatibility.

### Model Count by Category

| Category | Count |
|----------|-------|
| Patient/Case | 8 (Case, CaseCopy, Patient, PatientCopy, etc.) |
| Location | 10 (Beds, Rooms, Locations, Ward, etc. + copies) |
| Clinical | 20+ (Infections, Isolations, NursingStatus, etc.) |
| Surgery | 6 (Surgery, SurgeryWaiting, PatientsInSurgery + copies) |
| Staff | 4 (ActiveEmployees, PresenceEmployees + copies) |
| Permissions | 10+ (Screens, Features, Permissions, etc.) |
| Labs | 4 (LabsExam, ResultDocs + copies) |
| Ambulance | 6 (AmbulanceDrives, AmbulancePatients, codes) |

---

*END OF SCHEMA REFERENCE*
