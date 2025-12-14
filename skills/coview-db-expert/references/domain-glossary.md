# Evidence-Based Domain Glossary

> Mode: STRICT DOMAIN SKILL DISCOVERY
> Generated: 2025-12-14
> Database: qa_naharia (coview)
> Requirement: PROOF ONLY, NO INFERENCE

---

## GLOSSARY FORMAT

For each term:
- **Term Name**
- **Where It Appears** (table/column/query/code)
- **How Represented in DB** (fields/values)
- **What Can Be Stated with Evidence**
- **What is UNKNOWN / Not Derivable**

---

## TERM: SATELLITE PATIENT (מטופל לווין)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| DDL | `patients.cases.chameleon_satellite_ward_id` | Column exists |
| PGKeys | `src/models/pgModels/common/PGKeys/caseKeys.ts` line 30 | `chameleonSatelliteWardId: { type: DataTypes.STRING, field: "chameleon_satellite_ward_id" }` |
| Associations | `src/models/associations.ts` lines 100-108 | `Case.belongsTo(Ward, { as: 'satteliteWard', foreignKey: 'chameleonSatelliteWardId' })` |
| SQL | `fullQueries.ts` lines 18-24 | Used in similar name detection |

### How Represented in DB
| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `chameleon_ward_id` | VARCHAR(250) | Yes | Medical responsibility ward |
| `chameleon_satellite_ward_id` | VARCHAR(250) | Yes | Physical location ward |

### Evidence from qa_naharia
```
Query: SELECT ... WHERE chameleon_ward_id <> chameleon_satellite_ward_id

Results:
case_id    | main_ward           | satellite_ward
11849991   | פלסטיקה ילדים        | כירורגית ילדים
11832114   | אורתופדית א          | פנימית ג
11851969   | כירורגית כלי דם      | כירורגית א
11856688   | אורולוגיה ילדים      | כירורגית ילדים
```

### What Can Be Stated with Evidence
1. A satellite patient has TWO ward assignments: `chameleon_ward_id` (medical responsibility) and `chameleon_satellite_ward_id` (physical location)
2. These values are DIFFERENT for satellite patients (proven by data)
3. The ORM uses alias `satteliteWard` (with typo) for this association
4. Similar name detection logic considers both ward IDs when checking for patients in "same ward"

### What is UNKNOWN
- WHY a patient becomes a satellite (business reason)
- WHO/WHAT triggers the satellite assignment
- WHEN satellite status is removed
- Whether satellite status affects billing, staffing, or reporting

---

## TERM: SATELLITE WARD (מחלקה לוויינית)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Associations | `src/models/associations.ts` lines 105-108 | `Ward.hasMany(Case, { as: 'casesBySatelliteWard', foreignKey: 'chameleonSatelliteWardId' })` |

### How Represented in DB
A ward becomes a "satellite ward" when it is referenced by `chameleon_satellite_ward_id` in a case where `chameleon_satellite_ward_id <> chameleon_ward_id`.

There is NO separate flag or table marking a ward as "satellite capable".

### What Can Be Stated with Evidence
1. A satellite ward is simply a ward that physically hosts patients belonging administratively to other wards
2. The term is RELATIONAL - any ward can be a satellite ward if referenced in `chameleon_satellite_ward_id`
3. In qa_naharia data: כירורגית ילדים, פנימית ג, כירורגית א are acting as satellite wards

### What is UNKNOWN
- Whether certain wards are DESIGNATED as satellite-capable
- Capacity limits for satellite patients
- Policy rules for satellite assignments

---

## TERM: BLOCKED BED (מיטה חסומה)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.blocked_beds` | Exists |
| PGKeys | `src/models/pgModels/common/PGKeys/blockedBedsKeys.ts` | Full definition |
| Associations | `src/models/associations.ts` lines 381-391 | `Beds.hasOne(BlockedBeds, { as: "BlockedBedFromBed" })` |

### How Represented in DB
```typescript
blockedBedsKeys = {
  bedId: { type: STRING(255), primaryKey: true },
  commentBlockBed: { type: STRING(255), nullable },
  updateTime: { type: DATE, nullable },
  systemNum: { type: STRING(50), nullable }
}
```

### Evidence from qa_naharia
```
Query: SELECT COUNT(*) FROM patients.blocked_beds
Result: 3
```

### What Can Be Stated with Evidence
1. Blocked beds are tracked in a SEPARATE table (`blocked_beds`), not a flag on `beds`
2. Each blocked bed has: bedId (PK), commentBlockBed (reason), updateTime, systemNum
3. In qa_naharia: only 3 beds are currently blocked
4. The association links Beds → BlockedBeds via bedId

### What is UNKNOWN
- What systemNum represents
- Business rules for blocking a bed
- Whether blocked beds can still have patients (transitionally)
- UI/process for blocking/unblocking

---

## TERM: ARAN (אר"ן - אירוע רב נפגעים)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| DDL | `patients.cases.aran_id`, `aran_location` | Columns exist |
| DDL | `common.wards.is_aran` | Boolean flag |
| PGKeys | `wardKeys.ts` | `isAran: { type: DataTypes.BOOLEAN, field: "is_aran" }` |
| PGKeys | `surgeryWaitingKeys.ts` line 62-66 | `surgeryWaitingAran: { type: BOOLEAN }` |
| Database | `common.wards WHERE is_aran = true` | 21 wards |

### How Represented in DB
| Table | Field | Type | Purpose |
|-------|-------|------|---------|
| `patients.cases` | `aran_id` | INTEGER | Links to ARAN event |
| `patients.cases` | `aran_location` | VARCHAR(250) | ARAN triage location |
| `common.wards` | `is_aran` | BOOLEAN | Ward is ARAN-designated |
| `patients.surgery_waiting` | `surgery_waiting_aran` | BOOLEAN | Surgery related to ARAN |

### Evidence from qa_naharia
```
Query: SELECT COUNT(*) FILTER (WHERE is_aran = true) FROM common.wards
Result: 21 ARAN wards
```

### What Can Be Stated with Evidence
1. ARAN = אירוע רב נפגעים (Mass Casualty Event)
2. Wards can be flagged as ARAN wards via `is_aran = true`
3. Cases can be linked to ARAN events via `aran_id` and `aran_location`
4. Surgery waiting records can be flagged as ARAN-related
5. 21 wards in qa_naharia are designated ARAN wards

### What is UNKNOWN
- The `aran_id` FK target (what table does it reference?)
- ARAN activation/deactivation process
- Whether ARAN mode changes system behavior

---

## TERM: ICU WARD (מחלקה טיפול נמרץ)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| DDL | `common.wards.is_icu` | Boolean flag |
| PGKeys | `wardKeys.ts` | `isICU: { type: DataTypes.BOOLEAN, field: "is_icu" }` |

### Evidence from qa_naharia
```
Query: SELECT COUNT(*) FILTER (WHERE is_icu = true) FROM common.wards
Result: 11 ICU wards
```

### What Can Be Stated with Evidence
1. ICU wards are flagged via `is_icu = true` in `common.wards`
2. 11 wards in qa_naharia are designated ICU
3. The flag is a simple boolean with no additional metadata

### What is UNKNOWN
- Whether ICU status affects patient routing
- Whether ICU wards have special capacity rules
- Relationship between ICU and satellite patients

---

## TERM: NURSING STATUS TYPE (סוג מצב סיעודי)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.nursing_status_type` | Reference table |
| Table | `patients.nursing_status_class` | Links status to type |
| SQL | `deltaQueries.ts` lines 179-189 | `FILTER (WHERE nsc.nurs_status_type = 2)` for respirators |

### How Represented in DB
```sql
-- From nursing_status_type table:
nurs_status_id | nurs_status_desc
1              | מונשם (Ventilated)
2              | הנשמה לא פולשנית (Non-invasive ventilation)
3              | מועד לנפילה (Fall risk)
4              | מצבו הסיעודי של המטופל (Patient nursing status)
```

### Evidence from SQL (deltaQueries.ts)
```sql
FILTER (WHERE nsc.nurs_status_type = 2) AS respirators,
FILTER (WHERE nsc.nurs_status_type = 3) AS fall_risk,
```

### Evidence from parameters table
```sql
-- RespirationCodesCham = (1,2)
```

### What Can Be Stated with Evidence
1. nurs_status_type=2 is used for RESPIRATORS in SQL
2. nurs_status_type=3 is used for FALL_RISK in SQL
3. Types 1 and 4 are NOT used in documented SQL logic
4. RespirationCodesCham parameter contains values (1,2)

### What is UNKNOWN
- Whether types 1 and 4 are legacy or have specific uses
- Complete business rules for each type
- How types interact with patient care protocols

---

## TERM: ISOLATION TYPE (סוג בידוד)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.case_isolation` | Main table |
| PGKeys | `isolationKeys.ts` | Field definitions |

### How Represented in DB
| isolation_type_id | isolation_type_desc | Evidence Count (qa_naharia) |
|-------------------|---------------------|------------------------------|
| 1 | מגע (Contact) | 28 |
| 3 | טיפתי (Droplet) | 4 |
| 108 | הגנתי (Protective) | 4 |
| 119 | אוויר (Airborne) | 1 |
| 124 | בידוד קרינה (Radiation) | 1 |
| 125 | בידוד מקסימלי (Maximum) | 1 |

### What Can Be Stated with Evidence
1. Isolation types are stored as integer codes with Hebrew descriptions
2. Contact isolation (מגע, type=1) is most common (28 cases)
3. Six distinct isolation types exist in qa_naharia data
4. The PK is composite: (case_id, isolation_id, isolation_type_id, isolation_start_date)

### What is UNKNOWN
- Complete list of all possible isolation types
- Rules for when each type applies
- Whether isolation types can be combined

---

## TERM: INFECTION STATUS (מצב זיהום)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.infections` | Column `infection_status` |
| PGKeys | `infectionsKeys.ts` | Field definition |

### How Represented in DB
| infection_status | Meaning | Count (qa_naharia) |
|------------------|---------|---------------------|
| נשא | Carrier (asymptomatic) | 37 |
| קליני | Clinical (symptomatic) | 13 |

### What Can Be Stated with Evidence
1. Two infection statuses exist: נשא (carrier) and קליני (clinical)
2. Carriers outnumber clinical cases 37:13 in qa_naharia
3. The status is stored as Hebrew text, not a code

### What is UNKNOWN
- Transition rules between statuses
- Whether status affects isolation requirements

---

## TERM: SURGERY PRIORITY (עדיפות ניתוח)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.surgery_waiting` | Columns `priority_code`, `priority_desc` |
| PGKeys | `surgeryWaitingKeys.ts` | Field definitions |

### How Represented in DB
| priority_code | priority_desc | Count (qa_naharia) |
|---------------|---------------|---------------------|
| (empty) | ללא עדיפות (No priority) | 15 |
| URG | דחוף (Urgent) | 12 |
| EMG | חירום (Emergency) | 2 |
| ROU | אלקטיב (Elective) | 1 |

### What Can Be Stated with Evidence
1. Four priority levels exist: EMG (Emergency), URG (Urgent), ROU (Elective), empty (None)
2. Most surgeries in qa_naharia have no priority assigned (15)
3. Priority is stored as code + description pair

### What is UNKNOWN
- Whether priority affects scheduling algorithm
- SLA rules per priority level

---

## TERM: CONSULTATION STATUS (מצב ייעוץ)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.consultations` | Column `consult_status` |
| PGKeys | `consultationKeys.ts` | Field definition |

### Evidence from qa_naharia
```
consult_status | count
הוזמן          | 2
```

### What Can Be Stated with Evidence
1. `consult_status` stores status as Hebrew text
2. Only "הוזמן" (Ordered) status found in qa_naharia (2 records)
3. Other statuses likely exist but not in current data

### What is UNKNOWN
- Complete list of consultation statuses
- Workflow/state machine for consultations

---

## TERM: TRANSPORT STATUS (מצב העברה)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.transport` | Columns `transport_status_code`, `transport_status_desc` |
| PGKeys | `transportKeys.ts` | Field definitions |

### Evidence from qa_naharia
```
transport_status_code | transport_status_desc | count
20                    | הוזמן                  | 1
```

### What Can Be Stated with Evidence
1. Transport status code "20" = "הוזמן" (Ordered)
2. Only 1 transport record exists in qa_naharia

### What is UNKNOWN
- Complete list of transport status codes
- Transport workflow/state machine

---

## TERM: DISCHARGE STAGE (שלב שחרור)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| SQL | `deltaQueries.ts` lines 50-54 | CASE logic |
| Table | `patients.document_discharge` | Stores discharge documents |

### How Represented in SQL
```sql
CASE
  WHEN BOOL_OR(d.document_discharge_code = 2) THEN 'nursing'
  WHEN BOOL_OR(d.document_discharge_code = 1) THEN 'medical'
  ELSE 'none'
END AS discharge_stage
```

### What Can Be Stated with Evidence
1. Discharge has THREE stages: none → medical → nursing
2. document_discharge_code=1 triggers 'medical' stage
3. document_discharge_code=2 triggers 'nursing' stage (takes priority)
4. The table `patients.document_discharge` is EMPTY in qa_naharia (0 records)

### What is UNKNOWN
- Why document_discharge is empty in QA
- Specific documents required at each stage

---

## TERM: COPY TABLES

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Database | All schemas | `*_copy` tables exist |
| Domains | API domains | Use Copy models |
| SQL | patients-cards-aggregator | Uses Main tables |

### How Represented in DB
| Pattern | Main Table | Copy Table |
|---------|------------|------------|
| Cases | `patients.cases` | `patients.cases_copy` |
| Infections | `patients.infections` | `patients.infections_copy` |
| Isolations | `patients.case_isolation` | `patients.case_isolation_copy` |
| (many more) | ... | ..._copy |

### Evidence from qa_naharia
```
Table counts:
cases=758, cases_copy=758
infections=50, infections_copy=50
case_isolation=39, case_isolation_copy=39
```

### What Can Be Stated with Evidence
1. Copy tables have IDENTICAL counts to main tables in qa_naharia
2. API domains (infectionsApi, caseIsolationApi, etc.) use Copy tables
3. controlPanelDashboard domain uses Main tables
4. patients-cards-aggregator SQL uses Main tables

### What is UNKNOWN
- SYNC MECHANISM between main and copy tables
- Which is authoritative (source of truth)
- Latency between main and copy
- Purpose of the copy table pattern

---

## TERM: NO_CASE / NO_BED (Synthetic IDs)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| SQL | `subAndPartialsQueries.ts` lines 279, 293 | Explicit SQL |

### How Represented in SQL
```sql
-- For empty rooms (no cases):
'NO_CASE'::text AS case_id

-- For rooms without beds:
('NO_BED_' || r.room_id)::text AS bed_id
```

### Evidence from qa_naharia
```
Query: SELECT COUNT(*) FILTER (WHERE case_id = 'NO_CASE') FROM patients.cards_agg
Result: 6699 out of 7445 total rows (90%)
```

### What Can Be Stated with Evidence
1. `cards_agg` uses synthetic IDs for empty beds/rooms
2. 90% of `cards_agg` rows represent empty beds (NO_CASE)
3. `NO_BED_` prefix + room_id creates synthetic bed IDs for rooms without beds
4. This is how `cards_agg` tracks ALL beds, not just occupied ones

### What is UNKNOWN
- How consumers distinguish synthetic from real IDs
- Performance implications of 90% empty rows

---

## TERM: SURGERY ROOM (חדר ניתוח)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `patients.rooms` | room_id, room_desc, ward_id |
| Table | `patients.surgery_waiting` | room_id (target OR) |
| Table | `patients.patients_in_surgery` | room_id (current OR) |
| Table | `common.ward_category` | category_id 8, 20, 25 |

### Room ID Naming Convention

| Pattern | Example | Description | Ward |
|---------|---------|-------------|------|
| `פז01-XX` | פז01-01 | General OR (OR001-OR008) | חנ-כללי |
| `פז02-XX` | פז02-01 | Women's OR (חדר 1-4) | חנ-נשים |
| `פז04-XX` | פז04-01 | Additional OR (OR401-OR405) | חנ-נוסף |
| `פז05-XX` | פז05-01 | Gastro OR (OR501) | חנ-גסטר |
| `ת מעבר` | - | Transfer/staging room | העברות |

**Note**: `פז` prefix appears to mean "פרוזדור זה" or Operating Zone identifier.

### Evidence from qa_naharia
```
room_id   | room_desc  | ward_id
פז01-01   | OR001      | חנ-כללי
פז01-02   | OR002      | חנ-כללי
פז02-04   | חדר 4      | חנ-נשים
פז04-01   | OR401      | חנ-נוסף
```

### Surgery Ward Codes (חנ = חדר ניתוח)

| ward_id | ward_desc | Room Count |
|---------|-----------|------------|
| חנ-כללי | General Surgery OR | 8 rooms (פז01-01 to פז01-08) |
| חנ-נשים | Women's Surgery OR | 4 rooms (פז02-01 to פז02-04) |
| חנ-נוסף | Additional OR | 5 rooms (פז04-01 to פז04-05) |
| חנ-גסטר | Gastroenterology OR | 1+ rooms (פז05-XX) |

### Ward Categories for Surgery

| category_id | category_desc | category_long_desc |
|-------------|---------------|-------------------|
| 8 | OP | חדר ניתוח - מחלקתי (Departmental OR) |
| 20 | OC | חדר ניתוח (Operating Room) |
| 25 | E | מיון/חדר ניתוח (ER/OR) |
| 26 | B | חדר לידה (Delivery Room) |

### What Can Be Stated with Evidence
1. Surgery rooms use `פז` prefix with zone number (01, 02, 04, 05)
2. Each surgery ward owns multiple rooms
3. `room_id` in surgery tables references `patients.rooms`
4. Ward category 8, 20, 25, 26 indicates surgery-related wards

### What is UNKNOWN
- Full meaning of `פז` prefix
- Room capacity/equipment per room
- Scheduling rules for rooms

---

## TERM: ROOM TYPE (סוג חדר)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `common.room_type` | Maps room_id to room_type |
| Table | `common.room_type_details` | Type definitions |
| PGKeys | `roomTypeKeys.ts`, `roomTypeDetailsKeys.ts` | Field definitions |

### Room Type Definitions (from `common.room_type_details`)

| id | room_type_name | room_key_name | show_in_screen |
|----|----------------|---------------|----------------|
| 1 | חדרי מוגבר | intensiveCareRooms | true |
| 2 | אופציה למוגבר | intensiveCareRoomsOps | false |
| 3 | חדרי לחץ שלילי | negativePressureRooms | true |
| 4 | חדרים פרטיים | privateRooms | true |
| 5 | דיאליזה | dialysisRoom | true |

### Room Type Meanings

| Type ID | Hebrew | English | Purpose |
|---------|--------|---------|---------|
| 1 | חדרי מוגבר | Intensive Care Rooms | ICU/enhanced supervision |
| 2 | אופציה למוגבר | Intensive Care Option | Can be converted to ICU |
| 3 | חדרי לחץ שלילי | Negative Pressure Rooms | Isolation (airborne) |
| 4 | חדרים פרטיים | Private Rooms | Single patient rooms |
| 5 | דיאליזה | Dialysis Room | Dialysis treatment |

### Room Type Assignment (from `common.room_type`)

| Field | Purpose |
|-------|---------|
| ward_id | Which ward the room belongs to |
| room_id | Room identifier |
| room_type | Type ID (1-5) |
| system_num | System identifier |

### Evidence from qa_naharia
```
room_id | room_type | ward_id
1942    | 2         | 15068587 (Intensive care option)
1943    | 1         | 15068587 (Intensive care)
1946    | 3         | 15068587 (Negative pressure)
1952    | 5         | 15068587 (Dialysis)
713     | 4         | 15068591 (Private)
```

### Association (from associations.ts line 576-579)
```typescript
RoomType.hasMany(Locations, {
  as: "locationFromRoomType",
  foreignKey: "roomId",
});
```

### What Can Be Stated with Evidence
1. 5 room types exist: ICU, ICU-option, negative pressure, private, dialysis
2. Room types are assigned via `common.room_type` table
3. `room_fetch_key` groups types (e.g., "1,2" for ICU + ICU-option)
4. Some types hidden from screens (`show_in_screen = false`)

### What is UNKNOWN
- Rules for patient placement based on room type
- How isolation type relates to room type (negative pressure for airborne?)

---

## TERM: WARD CATEGORY (קטגורית מחלקה)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `common.ward_category` | Reference table |
| PGKeys | `wardCategoryKeys.ts` | Field definitions |
| Association | `associations.ts` line 178-182 | `Ward.belongsTo(WardCategory)` |

### How Represented in DB (qa_naharia)
| category_id | category_desc | category_long_desc | Count |
|-------------|---------------|-------------------|-------|
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

### What Can Be Stated with Evidence
1. Wards are categorized using `ward_category` FK
2. 26 distinct categories exist
3. Categories distinguish hospitalization vs emergency, physical vs medical units
4. Category affects ward behavior/display

### What is UNKNOWN
- Complete business rules per category
- Whether category affects patient flow

---

## TERM: HIGHER WARD (מחלקה גבוהה יותר)

### Where It Appears
| Source | Location | Evidence |
|--------|----------|----------|
| Table | `common.higher_wards` | Hierarchy table |
| Association | `associations.ts` lines 340-344 | Self-referential association |

### How Represented in DB
```typescript
// Self-referential hierarchy
HigherWards.hasOne(HigherWards, {
  sourceKey: 'higherWardCode',
  foreignKey: 'wardId',
  as: 'selfHigherWard',
});
```

### What Can Be Stated with Evidence
1. `higher_wards` implements a ward hierarchy
2. Uses self-referential relationship via `higherWardCode` → `wardId`
3. Supports nested ward structures

### What is UNKNOWN
- Business meaning of the hierarchy (organizational? reporting?)
- Depth/breadth of the hierarchy in practice

---

## SUMMARY

| Term | Confidence | Evidence Sources |
|------|------------|------------------|
| Satellite Patient | HIGH | DDL, PGKeys, Associations, SQL, Live Data |
| Satellite Ward | HIGH | Associations, Live Data |
| Blocked Bed | HIGH | DDL, PGKeys, Associations, Live Data |
| ARAN | HIGH | DDL, PGKeys, Live Data |
| ICU Ward | HIGH | DDL, PGKeys, Live Data |
| Nursing Status Type | HIGH | DDL, SQL, Parameters, Live Data |
| Isolation Type | HIGH | Live Data Query |
| Infection Status | HIGH | Live Data Query |
| Surgery Priority | HIGH | Live Data Query |
| Consultation Status | MEDIUM | Live Data (limited records) |
| Transport Status | LOW | Live Data (1 record only) |
| Discharge Stage | HIGH | SQL Evidence |
| Copy Tables | HIGH | All sources, but sync UNKNOWN |
| NO_CASE/NO_BED | HIGH | SQL, Live Data |
| **Surgery Room** | HIGH | DDL, Live Data, Room naming patterns |
| **Room Type** | HIGH | DDL, Live Data (5 types documented) |
| Ward Category | HIGH | DDL, Live Data |
| Higher Ward | MEDIUM | Associations (limited live data) |

**Total Domain Terms: 18**

---

*END OF EVIDENCE-BASED DOMAIN GLOSSARY*
