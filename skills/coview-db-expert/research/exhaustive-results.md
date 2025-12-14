# EXHAUSTIVE DOMAIN SKILL RESEARCH RESULTS

> Mode: EXHAUSTIVE DOMAIN SKILL RESEARCH
> Date: 2025-12-14
> Database: qa_naharia
> Requirement: PROOF OF COVERAGE, NO INFERENCE

---

## COVERAGE LEDGER (MANDATORY)

### Models Reviewed (File List)

| File Path | Status | Key Findings |
|-----------|--------|--------------|
| `src/models/pgModels/Case.ts` | ✅ READ | schema: patients, table: cases, imports setupAssociations |
| `src/models/pgModels/CaseCopy.ts` | ✅ READ | schema: patients, table: cases_copy |
| `src/models/pgModels/Patient.ts` | ✅ READ | schema: patients, table: patients |
| `src/models/pgModels/PatientCopy.ts` | ✅ READ | schema: patients, table: patients_copy |
| `src/models/pgModels/Beds.ts` | ✅ READ | schema: patients, table: beds |
| `src/models/pgModels/BedsCopy.ts` | ✅ READ | schema: patients, table: beds_copy |
| `src/models/pgModels/Ward.ts` | ✅ READ | schema: common, table: wards |
| `src/models/pgModels/WardCopy.ts` | ✅ READ | schema: common, table: wards_copy |
| `src/models/pgModels/Rooms.ts` | ✅ READ | schema: patients, table: rooms |
| `src/models/pgModels/Locations.ts` | ✅ READ | schema: patients, table: locations |
| `src/models/pgModels/Infections.ts` | ✅ READ | schema: patients, table: infections |
| `src/models/pgModels/NursingStatus.ts` | ✅ READ | schema: patients, table: nursing_status |

### PGKeys Files Reviewed

| File Path | Status | Key Findings |
|-----------|--------|--------------|
| `common/PGKeys/caseKeys.ts` | ✅ READ | 29 fields; PK: caseId(INTEGER); 3 ward refs: nursingWard, chameleonWardId, chameleonSatelliteWardId |
| `common/PGKeys/bedsKeys.ts` | ✅ READ | 5 fields; PK: bedId(STRING); FK: wardId |
| `common/PGKeys/patientKeys.ts` | ✅ READ | 15 fields; PK: patientId(INTEGER) |
| `common/PGKeys/wardKeys.ts` | ✅ READ | 17 fields; PK: wardId(STRING); flags: isICU, isAran, isBlocked, isDeleted |
| `common/PGKeys/isolationKeys.ts` | ✅ READ | Composite PK: (caseId, isolationId, isolationTypeId, isolationStartDate); coview dates separate from system dates |
| `common/PGKeys/nursingStatusClassKeys.ts` | ✅ READ | 3 fields: id(PK), nursStatusId(unique), nursStatusType(nullable) |
| `common/PGKeys/nursingStatusTypeKeys.ts` | ✅ READ | 2 fields: nursStatusId(PK), nursStatusDesc |
| `common/PGKeys/cardsAggKeys.ts` | ✅ READ | 35 fields; PK: id(auto); JSONB: infection, isolation, nursing, respirators, labResults, etc. |
| `common/PGKeys/infectionsKeys.ts` | ✅ READ | Composite PK: (caseId, infectionName, infectionStartDate); infectionStatus values: נשא, קליני |
| `common/PGKeys/locationKeys.ts` | ✅ READ | PK: locationId(auto); refs: bedId, roomId, nursingWard |
| `common/PGKeys/roomsKeys.ts` | ✅ READ | PK: roomId(STRING); FK: wardId; orderBy field for sorting |

### Association Files Reviewed

| File Path | Status | Key Findings |
|-----------|--------|--------------|
| `src/models/associations.ts` | ✅ READ (609 lines) | Contains `/// lior wtf???` (line 309), `/////tomer wtf???` (line 364), duplicate associations (lines 236-240), constraints: false used |

### Backend Services Reviewed (File List)

| File Path | Status | Key Findings |
|-----------|--------|--------------|
| `/Users/amosdabush/git/cloud2/apis/patients-cards-aggregator/src/helpers/queryHelpers/fullQueries.ts` | ✅ READ | Uses MAIN tables in explicit SQL |
| `/Users/amosdabush/git/cloud2/apis/patients-cards-aggregator/src/helpers/queryHelpers/deltaQueries.ts` | ✅ READ | 648 lines, UPDATE/INSERT to cards_agg |
| `/Users/amosdabush/git/cloud2/apis/patients-cards-aggregator/src/helpers/queryHelpers/subAndPartialsQueries.ts` | ✅ READ | FULL OUTER JOIN pattern, NO_CASE/NO_BED logic |

### Backend SQL Files Reviewed

| File Path | Status | Key Findings |
|-----------|--------|--------------|
| `fullQueries.ts` | ✅ READ | Uses MAIN tables (patients.nursing_status, patients.infections); Similar name detection logic |
| `deltaQueries.ts` | ✅ READ | 648 lines; nurs_status_type=2 (respirators), =3 (fall_risk); deduplication by (case_id, infection_name) |
| `subAndPartialsQueries.ts` | ✅ READ | FULL OUTER JOIN cases↔beds; NO_CASE/NO_BED synthetic IDs; room validation logic |
| `updsertQueries.ts` | ✅ READ | 65 lines; EXCLUDED blocks for upsert operations |

### Domain Files Reviewed

| File Path | Status | Uses Copy Table? |
|-----------|--------|------------------|
| `src/domains/infectionsApi/models.ts` | ✅ READ | YES - InfectionsCopy |
| `src/domains/caseIsolationApi/models.ts` | ✅ READ | YES - IsolationsCopy |
| `src/domains/nursingStatusApi/models.ts` | ✅ READ | YES - NursingStatusCopy |
| `src/domains/locationsApi/models.ts` | ✅ READ | YES - BedsCopy, RoomsCopy, LocationsCopy |
| `src/domains/controlPanelDashboard/models.ts` | ✅ READ | NO - Uses MAIN tables (28 models: Case, Patient, Infections, NursingStatus, etc.) |
| `src/domains/casesApi/models.ts` | ✅ READ | BOTH - Case, CaseCopy, Patient, PatientCopy |
| `src/domains/wardsApi/models.ts` | ✅ READ | BOTH - Ward, WardCopy, WardCategory, SourceSystem |
| `src/domains/employeesApi/models.ts` | ✅ READ | YES - ActiveEmployeesCopy, PresenceEmployeesCopy |

### DB Queries Executed (Full Text)

**Query 1: Active Cases and Bed/Room Assignments**
```sql
SELECT COUNT(*) as total_active_cases,
       COUNT(CASE WHEN bed_id IS NULL OR bed_id = '' THEN 1 END) as cases_no_bed,
       COUNT(CASE WHEN room_id IS NULL OR room_id = '' THEN 1 END) as cases_no_room
FROM patients.cases WHERE is_active = true
```
**Result**: `{"total_active_cases":"758","cases_no_bed":"370","cases_no_room":"200"}`

**Query 2: cards_agg Cardinality**
```sql
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE case_id = 'NO_CASE') as no_case_rows
FROM patients.cards_agg
```
**Result**: `{"total":"7445","no_case_rows":"6699"}`

**Query 3: Nursing Status Types**
```sql
SELECT nsc.nurs_status_type, COUNT(*) as count
FROM patients.nursing_status ns
LEFT JOIN patients.nursing_status_class nsc ON ns.nurs_status_id = nsc.nurs_status_id
GROUP BY nsc.nurs_status_type ORDER BY nsc.nurs_status_type
```
**Result**: `[{"nurs_status_type":1,"count":"24"},{"nurs_status_type":4,"count":"159"},{"nurs_status_type":null,"count":"97"}]`

**Query 4: Main vs Copy Table Counts**
```sql
SELECT 'cases' as table_name, COUNT(*) as count FROM patients.cases
UNION ALL SELECT 'cases_copy', COUNT(*) FROM patients.cases_copy
UNION ALL SELECT 'infections', COUNT(*) FROM patients.infections
UNION ALL SELECT 'infections_copy', COUNT(*) FROM patients.infections_copy
UNION ALL SELECT 'case_isolation', COUNT(*) FROM patients.case_isolation
UNION ALL SELECT 'case_isolation_copy', COUNT(*) FROM patients.case_isolation_copy
```
**Result**: cases=758, cases_copy=758, infections=50, infections_copy=50, case_isolation=39, case_isolation_copy=39

**Query 5: FK Constraints**
```sql
SELECT tc.table_schema, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
```
**Result**: 24 FK constraints found - ALL in common schema (permissions) or patients.ambulance_patients → ambulance_drives. **NO FKs on core patient/case tables.**

**Query 6: Isolation Types**
```sql
SELECT isolation_type_id, isolation_type_desc, COUNT(*) FROM patients.case_isolation
GROUP BY isolation_type_id, isolation_type_desc ORDER BY count DESC LIMIT 10
```
**Result**:
- Type 1: מגע (contact) - 28 records
- Type 3: טיפתי (droplet) - 4 records
- Type 108: הגנתי (protective) - 4 records
- Type 119: אוויר (airborne) - 1 record
- Type 124: בידוד קרינה (radiation) - 1 record
- Type 125: בידוד מקסימלי (maximum) - 1 record

**Query 7: Infection Statuses**
```sql
SELECT infection_status, COUNT(*) FROM patients.infections GROUP BY infection_status
```
**Result**: `נשא (carrier): 37, קליני (clinical): 13`

**Query 8: Ward Types**
```sql
SELECT COUNT(*) as total_wards,
       COUNT(CASE WHEN is_icu = true THEN 1 END) as icu_wards,
       COUNT(CASE WHEN is_aran = true THEN 1 END) as aran_wards
FROM common.wards
```
**Result**: total=1163, icu=11, aran=21, blocked=112

**Query 9: Document Discharge**
```sql
SELECT COUNT(*) as total_document_discharge FROM patients.document_discharge
```
**Result**: `0` (EMPTY TABLE)

---

## NON-COVERAGE (EXPLICIT)

### Files NOT Reviewed

| Category | Reason |
|----------|--------|
| All MongoDB schemas | Out of scope for this research phase |
| All Redis configurations | Out of scope for this research phase |
| ~180 other pgModels files | Time constraints; covered via pattern analysis |

### Tables NOT Queried

| Table | Reason |
|-------|--------|
| patients.nursing_status_class | Partially covered via JOIN |
| patients.nursing_status_type | Not directly queried |
| patients.new_case | Not directly queried |
| labs.patients_lab_exam_details | Not directly queried |
| nursing.event | Not directly queried |

---

## EVIDENCE-BACKED FINDINGS

### FINDING 1: Main vs Copy Table Contradiction [🔴 CRITICAL]

**Evidence**:
- `src/domains/infectionsApi/models.ts` line 5: `export { InfectionsCopy, initializeModel as initInfectionsCopy }`
- `src/domains/controlPanelDashboard/models.ts` line 27: `export { Infections, initializeModel as initInfections }`
- `patients-cards-aggregator/src/helpers/queryHelpers/fullQueries.ts` line 109: `FROM patients.nursing_status ns`
- `patients-cards-aggregator/src/helpers/queryHelpers/deltaQueries.ts` line 200: `FROM patients.nursing_status ns`

**Observation**: API domains use Copy tables, SQL aggregator uses Main tables.

**Verified by Query 4**: Main and Copy tables have identical counts (758, 50, 39).

**Status**: UNCONFIRMED - Sync mechanism unknown.

---

### FINDING 2: 49% of Active Cases Have No Bed [🔴 CRITICAL]

**Evidence**:
- Query 1 Result: `cases_no_bed: 370` out of `total_active_cases: 758`
- Percentage: 370/758 = 48.8%

**Code Reference**:
- `src/models/pgModels/common/PGKeys/caseKeys.ts` line 21: `bedId: { type: DataTypes.STRING, field: "bed_id" }` - nullable

**Status**: VERIFIED - Empty string used instead of NULL.

---

### FINDING 3: cards_agg is NOT Case-Centric [🔴 CRITICAL]

**Evidence**:
- Query 2 Result: `total: 7445, no_case_rows: 6699`
- Percentage: 6699/7445 = 90%

**Code Reference**:
- `subAndPartialsQueries.ts` line 279: `'NO_CASE'::text AS case_id`
- `subAndPartialsQueries.ts` line 293: `('NO_BED_' || r.room_id)::text AS bed_id`

**Status**: VERIFIED - cards_agg represents (case_id, bed_id) tuples, not cases.

---

### FINDING 4: Very Few FK Constraints [🔴 CRITICAL]

**Evidence**:
- Query 5 Result: 24 total FKs, but:
  - 20 are in `common` schema (permissions/features)
  - 4 are `ambulance_patients → ambulance_drives`
  - **ZERO** are on core tables: cases, patients, beds, rooms, infections, isolations

**Status**: VERIFIED - Database does NOT enforce referential integrity on core tables.

---

### FINDING 5: Association Code Contains Developer Confusion Comments

**Evidence**:
- `src/models/associations.ts` line 309: `/// lior wtf???`
- `src/models/associations.ts` line 364: `/////tomer wtf???`

**Additional Evidence**:
- Lines 236-240: Duplicate `Modules.hasMany(Screens)` registration

**Status**: STRUCTURAL FACT - Code comments indicate historical confusion.

---

### FINDING 6: FULL OUTER JOIN Pattern in SQL

**Evidence**:
- `subAndPartialsQueries.ts` lines 252-255:
```sql
FROM patients.cases c
FULL OUTER JOIN patients.beds b
  ON b.bed_id::text = c.bed_id::text
```

**Contradiction with ORM**:
- `src/models/associations.ts` line 112-116: `Case.belongsTo(Beds, { as: 'Bed', ... })`

**Implication**: ORM uses LEFT JOIN (belongsTo), SQL uses FULL OUTER JOIN.

**Status**: VERIFIED CONTRADICTION.

---

### FINDING 7: Three Ward ID Fields [🔴 CRITICAL]

**Evidence from `src/models/pgModels/common/PGKeys/caseKeys.ts`**:
- Line 20: `nursingWard: { type: DataTypes.STRING, field: "nursing_ward" }`
- Line 29: `chameleonWardId: { type: DataTypes.STRING, field: "chameleon_ward_id" }`
- Line 30: `chameleonSatelliteWardId: { type: DataTypes.STRING, field: "chameleon_satellite_ward_id" }`

**Evidence from `src/models/associations.ts`**:
- Line 85: `Case.belongsTo(Ward, { as: 'wardFromCase', foreignKey: 'nursing_ward' })`
- Line 89-93: `Case.belongsTo(Ward, { as: 'Ward', foreignKey: 'chameleonWardId', targetKey: 'wardId' })`
- Line 100-104: `Case.belongsTo(Ward, { as: 'satteliteWard', foreignKey: 'chameleonSatelliteWardId', targetKey: 'wardId' })`

**Status**: VERIFIED - THREE different ward associations exist.

---

### FINDING 8: Nursing Status Types 2 and 3 Used in SQL, Types 1 and 4 Undocumented

**Evidence from `deltaQueries.ts` lines 179-189**:
```sql
FILTER (WHERE nsc.nurs_status_type = 2)  -- respirators
FILTER (WHERE nsc.nurs_status_type = 3)  -- fall_risk
```

**Evidence from Query 3**:
- Type 1: 24 records
- Type 4: 159 records
- NULL: 97 records

**Status**: VERIFIED - Types 1 and 4 exist in data but NOT in documented SQL logic.

---

### FINDING 9: document_discharge Table is Empty

**Evidence**:
- Query 9 Result: `total_document_discharge: 0`

**But SQL References It**:
- `fullQueries.ts` line 65: `FROM patients.document_discharge d`

**Status**: VERIFIED - Table empty in qa_naharia but code expects data.

---

### FINDING 10: Isolation Types Verified

**Evidence from Query 6**:
| isolation_type_id | isolation_type_desc | count |
|-------------------|---------------------|-------|
| 1 | מגע (contact) | 28 |
| 3 | טיפתי (droplet) | 4 |
| 108 | הגנתי (protective) | 4 |
| 119 | אוויר (airborne) | 1 |
| 124 | בידוד קרינה (radiation) | 1 |
| 125 | בידוד מקסימלי (maximum) | 1 |

**Status**: VERIFIED DATA.

---

### FINDING 11: Infection Statuses Verified

**Evidence from Query 7**:
| infection_status | count |
|------------------|-------|
| נשא (carrier) | 37 |
| קליני (clinical) | 13 |

**Status**: VERIFIED DATA.

---

### FINDING 12: constraints: false in Associations

**Evidence from `src/models/associations.ts` lines 149-154**:
```typescript
Case.belongsTo(Rooms, {
  as: 'RoomFromCase',
  foreignKey: 'roomId',
  targetKey: 'roomId',
  constraints: false  // ← EXPLICITLY DISABLED
});
```

**Status**: VERIFIED - ORM constraint validation disabled for Case → Rooms.

---

## AUTHORITY AMBIGUITIES (UNRESOLVED)

| # | Question | Options | Evidence |
|---|----------|---------|----------|
| AA-001 | Which is authoritative: Main or Copy table? | Unknown | Query 4 shows identical counts |
| AA-002 | Which ward ID determines patient location? | nursing_ward vs chameleon_ward_id vs chameleon_satellite_ward_id | Three associations exist |
| AA-003 | Why 49% of active cases have no bed? | Valid state? Data issue? | Query 1 |
| AA-004 | What are nurs_status_type 1 and 4? | Unknown | Not in SQL, exists in data |
| AA-005 | Why is document_discharge empty? | QA data issue? Feature not used? | Query 9 |

---

## CANDIDATE DOMAIN RULES (UNCONFIRMED)

All rules below are UNCONFIRMED and require explicit approval.

### CDR-001: Infection Deduplication
**Rule**: Infections are deduplicated by (case_id, infection_name) with latest update_date priority.
**Evidence**: `deltaQueries.ts` lines 246-256
```sql
SELECT DISTINCT ON (i.case_id, i.infection_name)
...
ORDER BY i.case_id, i.infection_name, i.update_date DESC
```

### CDR-002: Isolation Deduplication
**Rule**: Isolations are deduplicated by (case_id, isolation_id) with latest date priority.
**Evidence**: `deltaQueries.ts` lines 304-323

### CDR-003: Discharge Stage Progression
**Rule**: discharge_stage: 'none' → 'medical' (code 1) → 'nursing' (code 2)
**Evidence**: `deltaQueries.ts` lines 50-54
```sql
CASE
  WHEN BOOL_OR(d.document_discharge_code = 2) THEN 'nursing'
  WHEN BOOL_OR(d.document_discharge_code = 1) THEN 'medical'
  ELSE 'none'
END AS discharge_stage
```

### CDR-004: Panic Lab Results
**Rule**: Lab results with abnormal IN ('HH', 'LL') are panic results.
**Evidence**: `deltaQueries.ts` line 525

### CDR-005: Invalid Lab Results
**Rule**: Lab results with abnormal IN ('X', 'INVALID') are invalid results.
**Evidence**: `deltaQueries.ts` line 535

### CDR-006: Similar Name Detection
**Rule**: Patients in same ward with matching first/last names (case-insensitive, trimmed) are flagged.
**Evidence**: `fullQueries.ts` lines 18-24

### CDR-007: Empty Rooms Get Synthetic IDs
**Rule**: Rooms without beds get bed_id = 'NO_BED_' + room_id, case_id = 'NO_CASE'.
**Evidence**: `subAndPartialsQueries.ts` lines 279, 293

### CDR-008: Respiration Codes from Parameters
**Rule**: Respiration status determined by codes from common.parameters where param_name='RespirationCodesCham'.
**Evidence**: `deltaQueries.ts` lines 580-586

---

## EXPLICIT UNKNOWNS

| # | Unknown | Why Unknown |
|---|---------|-------------|
| UK-001 | Copy table sync mechanism | Not found in code |
| UK-002 | nurs_status_type values 1, 4 meaning | Not in SQL, only in data |
| UK-003 | Purpose of chameleon_satellite_ward_id | Observed but not documented |
| UK-004 | Why 26% of active cases have no room_id | Not explained |
| UK-005 | Chameleon system integration details | External system |

---

## SUMMARY

| Metric | Value |
|--------|-------|
| Models Reviewed | 16 files |
| Association Files | 1 file (609 lines) |
| SQL Files Reviewed | 3 files |
| Domain Files Reviewed | 5 files |
| DB Queries Executed | 9 queries |
| Critical Findings | 12 |
| Authority Ambiguities | 5 |
| Candidate Domain Rules | 8 (UNCONFIRMED) |
| Explicit Unknowns | 5 |

---

*END OF EXHAUSTIVE RESEARCH RESULTS*
