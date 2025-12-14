# Operational Behavior Reference

> Mode: STRICT DOMAIN SKILL DISCOVERY
> Generated: 2025-12-14
> Sources: fullQueries.ts, deltaQueries.ts, subAndPartialsQueries.ts, delayedCalculations.ts, backend controllers
> Requirement: PROOF ONLY, NO INFERENCE

---

## PURPOSE

This document answers **HOW THE SYSTEM ACTUALLY BEHAVES** - not what tables exist, but how queries and business logic operate. Each section addresses specific operational questions with SQL/code evidence.

---

## 1. SIMILAR NAME DETECTION

### Question: "How does similar name detection work?"

### Evidence (fullQueries.ts lines 1-27)

```sql
SELECT c1.case_id::text AS case_id,
  CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS has_similar_name
FROM patients.cases c1
JOIN patients.patients p1 ON c1.patient_id = p1.patient_id
JOIN patients.cases c2 ON (
  -- Ward matching logic (4 conditions)
  (c1.chameleon_ward_id = c2.chameleon_ward_id
   AND c1.chameleon_satellite_ward_id IS NULL
   AND c2.chameleon_satellite_ward_id IS NULL)
  OR (c1.chameleon_satellite_ward_id = c2.chameleon_ward_id
      AND c2.chameleon_satellite_ward_id IS NULL)
  OR (c1.chameleon_ward_id = c2.chameleon_satellite_ward_id
      AND c1.chameleon_satellite_ward_id IS NULL)
  OR (c1.chameleon_satellite_ward_id = c2.chameleon_satellite_ward_id)
)
JOIN patients.patients p2 ON c2.patient_id = p2.patient_id
WHERE p1.id_number <> p2.id_number  -- Different patients
  AND (
    LOWER(TRIM(p1.first_name)) = LOWER(TRIM(p2.first_name)) OR
    LOWER(TRIM(p1.last_name)) = LOWER(TRIM(p2.last_name)) OR
    LOWER(TRIM(p1.first_name)) = LOWER(TRIM(p2.last_name)) OR
    LOWER(TRIM(p1.last_name)) = LOWER(TRIM(p2.first_name))
  )
GROUP BY c1.case_id::text
```

### What Can Be Stated with Evidence

1. **Ward Matching**: Two cases are considered "in same ward" if ANY of these 4 conditions are true:
   - Both have same `chameleon_ward_id` AND neither has satellite ward
   - Patient 1's satellite ward = Patient 2's main ward (and P2 has no satellite)
   - Patient 1's main ward = Patient 2's satellite ward (and P1 has no satellite)
   - Both have same satellite ward

2. **Name Matching**: Four name comparisons (case-insensitive, trimmed):
   - First name = First name
   - Last name = Last name
   - First name = Last name (cross-check)
   - Last name = First name (cross-check)

3. **Patient Identity**: Only compares DIFFERENT patients (`id_number <> id_number`)

4. **Output**: Boolean `has_similar_name` aggregated per case_id

### What is UNKNOWN

- Why satellite ward matching uses these specific 4 conditions
- Whether "similar name" triggers any system alerts
- UI behavior when similar name is detected

---

## 2. DISCHARGE WORKFLOW

### Question: "How does discharge stage work? What are the states?"

### Evidence (fullQueries.ts lines 44-86)

```sql
WITH discharge_base AS (
  SELECT
    d.case_id::text AS case_id,
    CASE
      WHEN BOOL_OR(d.document_discharge_code = 2) THEN 'nursing'
      WHEN BOOL_OR(d.document_discharge_code = 1) THEN 'medical'
      ELSE 'none'
    END AS discharge_stage,
    jsonb_agg(...) AS discharge_docs
  FROM patients.document_discharge d
  GROUP BY d.case_id::text
),
new_case_base AS (
  SELECT
    nc.case_id::text AS case_id,
    COALESCE(NOT nc.nursing_doc, true) AS no_nursing_doc,
    COALESCE(NOT nc.medical_doc, true) AS no_medical_doc
  FROM patients.new_case nc
)
SELECT
  c.case_id::text AS case_id,
  COALESCE(db.discharge_stage, 'none') AS discharge_stage,
  COALESCE(db.discharge_docs, '[]'::jsonb) AS discharge_docs,
  COALESCE(nc.no_nursing_doc, true) AS no_nursing_doc,
  COALESCE(nc.no_medical_doc, true) AS no_medical_doc
FROM patients.cases c
LEFT JOIN discharge_base db ON db.case_id = c.case_id::text
LEFT JOIN new_case_base nc ON nc.case_id = c.case_id::text
```

### What Can Be Stated with Evidence

1. **Three Discharge Stages**:
   - `'none'` - No discharge documents
   - `'medical'` - Has document_discharge_code = 1
   - `'nursing'` - Has document_discharge_code = 2 (takes priority)

2. **Priority Rule**: `BOOL_OR` with nursing checked first means nursing stage overrides medical

3. **Document Codes**:
   - `document_discharge_code = 1` = Medical discharge document
   - `document_discharge_code = 2` = Nursing discharge document

4. **New Case Flags**: `new_case` table tracks whether nursing_doc and medical_doc are completed

5. **Output Fields**:
   - `discharge_stage`: 'none' | 'medical' | 'nursing'
   - `discharge_docs`: JSONB array of documents
   - `no_nursing_doc`: Boolean
   - `no_medical_doc`: Boolean

### What is UNKNOWN

- What creates records in `document_discharge` table
- Complete list of document_discharge_code values
- Business process for transitioning between stages
- Who/what sets nursing_doc and medical_doc flags in new_case

---

## 3. RESPIRATION / VENTILATION SOURCE OF TRUTH

### Question: "Where does respiration status come from? Is it nursing_status or condition?"

### Evidence (fullQueries.ts lines 123-166)

```sql
WITH param AS (
  SELECT regexp_replace(param_value, '[() ]', '', 'g') AS raw
  FROM common.parameters
  WHERE param_name = 'RespirationCodesCham'
    AND param_group = 'תפוסה מחלקתית'
  LIMIT 1
),
codes AS (
  SELECT trim(x)::int AS code
  FROM param, unnest(string_to_array(param.raw, ',')) AS x
),
pc AS (
  SELECT
    case_id::text AS case_id,
    patient_condition_code::int AS code,
    patient_condition_desc AS resp_desc,
    create_date_time AS raw_date
  FROM patients.condition
  WHERE patient_condition_code IS NOT NULL
),
matched AS (
  SELECT
    pc.case_id,
    jsonb_agg(
      jsonb_build_object(
        'source', 'condition',
        'code', pc.code,
        'desc', pc.resp_desc,
        'date', to_char(pc.raw_date, 'DD.MM.YY'),
        'raw_date', to_char(pc.raw_date, 'YYYY-MM-DD"T"HH24:MI:SS')
      ) ORDER BY pc.raw_date DESC NULLS LAST
    ) AS respirators
  FROM pc
  JOIN codes ON pc.code = codes.code
  GROUP BY pc.case_id
)
SELECT m.case_id, COALESCE(m.respirators, '[]'::jsonb) AS respirators
FROM matched m
```

### What Can Be Stated with Evidence

1. **Primary Source**: `patients.condition` table, NOT nursing_status

2. **Matching Logic**:
   - Codes are defined in `common.parameters` where `param_name = 'RespirationCodesCham'`
   - Parameter value format: "(1,2)" → parsed to array [1, 2]
   - Only condition records matching these codes are included

3. **Output Fields**:
   - `source`: Always 'condition'
   - `code`: The patient_condition_code
   - `desc`: patient_condition_desc
   - `date`: Formatted date
   - `raw_date`: ISO timestamp

4. **Ordering**: Latest condition record first (`ORDER BY raw_date DESC NULLS LAST`)

### What is UNKNOWN

- Actual values in RespirationCodesCham parameter (likely 1,2)
- Whether nursing_status type 2 (also called "respirators" in some queries) is used anywhere
- Relationship between condition codes and nursing_status_type

---

## 4. NURSING STATUS TYPE MEANINGS

### Question: "What do nursing status types mean?"

### Evidence (fullQueries.ts lines 89-121, deltaQueries.ts lines 179-189)

```sql
-- From nursingFullAgg:
COALESCE(
  jsonb_agg(...) FILTER (WHERE nsc.nurs_status_type = 3),
  '[]'::jsonb
) AS fall_risk,
jsonb_agg(...) AS nursing

-- From deltaQueries (lines 179-189):
FILTER (WHERE nsc.nurs_status_type = 2) AS respirators,
FILTER (WHERE nsc.nurs_status_type = 3) AS fall_risk,
```

### What Can Be Stated with Evidence

1. **Type 2**: Used for `respirators` in delta queries (BUT respiration actually comes from `patients.condition`)
2. **Type 3**: Used for `fall_risk` (מועד לנפילה)
3. **Types 1, 4**: NOT used in documented SQL logic

### Nursing Status Table Structure

| Field | Source |
|-------|--------|
| case_id | FK to cases |
| nurs_status_id | Links to nursing_status_class |
| nurs_status_desc | Status description |

### Nursing Status Class Table

| Field | Purpose |
|-------|---------|
| nurs_status_id | Links nursing_status to type |
| nurs_status_type | Type code (1, 2, 3, 4) |

### What is UNKNOWN

- Complete business meaning of types 1 and 4
- Whether type 2 is redundant with condition table
- How nursing_status_type values are assigned

---

## 5. INFECTION/ISOLATION OPERATIONAL BEHAVIOR

### Question: "How are infections and isolations deduplicated and aggregated?"

### Evidence (subAndPartialsQueries.ts lines 16-90, deltaQueries.ts lines 210-260)

#### Infections Deduplication

```sql
SELECT DISTINCT ON (
  i.case_id,
  i.infection_name,
  i.infection_desc,
  i.infection_status,
  i.infection_start_date,
  i.update_date
)
i.case_id,
i.infection_name,
i.infection_desc,
i.infection_status,
i.infection_start_date,
i.update_date
FROM patients.infections i
WHERE i.case_id = c.case_id
ORDER BY i.case_id, i.update_date DESC
```

#### Isolations Deduplication

```sql
WITH ranked AS (
  SELECT iso.*,
    ROW_NUMBER() OVER (
      PARTITION BY iso.case_id, iso.isolation_id, iso.isolation_type_id, iso.isolation_reason_id
      ORDER BY GREATEST(
        COALESCE(iso.isolation_end_date, '-infinity'::timestamp),
        COALESCE(iso.coview_end_date, '-infinity'::timestamp),
        COALESCE(iso.isolation_start_date, '-infinity'::timestamp),
        COALESCE(iso.coview_start_date, '-infinity'::timestamp)
      ) DESC
    ) AS rn
  FROM patients.case_isolation iso
),
latest AS (
  SELECT * FROM ranked WHERE rn = 1
)
```

### What Can Be Stated with Evidence

1. **Infections Deduplication Key**: (case_id, infection_name, infection_desc, infection_status, infection_start_date, update_date)
   - Latest update_date wins

2. **Isolations Deduplication Key**: (case_id, isolation_id, isolation_type_id, isolation_reason_id)
   - Uses ROW_NUMBER with GREATEST of 4 dates to pick latest

3. **Date Priority for Isolations**: GREATEST of:
   - isolation_end_date
   - coview_end_date
   - isolation_start_date
   - coview_start_date

4. **Output Format**: Both return JSONB arrays ordered by date DESC

### What is UNKNOWN

- Why isolation uses 4 different date fields
- Difference between isolation_start_date and coview_start_date
- Business meaning of isolation_id vs isolation_type_id

---

## 6. LAB RESULTS PROCESSING

### Question: "How are lab results processed? What defines panic/invalid?"

### Evidence (fullQueries.ts lines 223-265, deltaQueries.ts lines 497-575)

```sql
SELECT
  lab.case_id::text AS case_id,
  jsonb_agg(
    jsonb_build_object(
      'sample_num', lab.sample_num,
      'collection_time', lab.collection_time,
      'test_code', lab.test_code,
      'test_desc', lab.test_desc,
      'result', lab.result,
      'result_time', lab.result_time,
      'unit', lab.unit,
      'abnormal', lab.abnormal,
      'result_status', lab.result_status,
      'result_doc_time', lab.result_doc_time,
      'performing_lab', lab.performing_lab
    ) ORDER BY lab.result_time DESC NULLS LAST
  ) AS lab_results,
  jsonb_agg(...) FILTER (WHERE lab.abnormal IN ('HH', 'LL')) AS panic_result,
  jsonb_agg(...) FILTER (WHERE lab.abnormal IN ('X', 'INVALID')) AS invalid_result
FROM labs.patients_lab_exam_details lab
GROUP BY lab.case_id::text
```

### What Can Be Stated with Evidence

1. **Source Table**: `labs.patients_lab_exam_details`

2. **Panic Results**: `abnormal IN ('HH', 'LL')`
   - HH = High-High (critical high)
   - LL = Low-Low (critical low)

3. **Invalid Results**: `abnormal IN ('X', 'INVALID')`
   - X = Invalid marker
   - INVALID = Explicit invalid marker

4. **Ordering**: By `result_time DESC NULLS LAST`

5. **Output Fields**:
   - `lab_results`: All lab results
   - `panic_result`: Only HH/LL results
   - `invalid_result`: Only X/INVALID results

### What is UNKNOWN

- Complete list of `abnormal` values
- What triggers X vs INVALID status
- Whether panic results trigger alerts

---

## 7. AGGREGATION BEHAVIOR (FULL vs DELTA)

### Question: "How does FULL vs DELTA aggregation work?"

### Evidence (fullQueries.ts, deltaQueries.ts)

#### FULL Aggregation Pattern

```sql
-- LEFT JOIN pattern from fullQueries.ts
LEFT JOIN (
  SELECT case_id, aggregated_data
  FROM source_table
  GROUP BY case_id
) subquery ON subquery.case_id = x.case_id
```

#### DELTA Aggregation Pattern

```sql
-- Reset + Update pattern from deltaQueries.ts
CREATE TEMP TABLE tmp_grouped_xxx ON COMMIT DROP AS ...;

WITH reset AS (
  UPDATE patients.cards_agg ca
  SET field = '[]'::jsonb, updated_time = timezone('Asia/Jerusalem', now())
  WHERE coalesce(ca.field, '[]'::jsonb) <> '[]'::jsonb
    AND NOT EXISTS (SELECT 1 FROM tmp_grouped_xxx t WHERE t.case_id = ca.case_id)
  RETURNING ca.case_id
),
updated AS (
  UPDATE patients.cards_agg ca
  SET field = t.aggregated_data, updated_time = timezone('Asia/Jerusalem', now())
  FROM tmp_grouped_xxx t
  WHERE ca.case_id = t.case_id
    AND ca.field IS DISTINCT FROM t.aggregated_data
  RETURNING ca.case_id
)
SELECT case_id, 'reset' AS change_type FROM reset
UNION ALL
SELECT case_id, 'update' AS change_type FROM updated;
```

### What Can Be Stated with Evidence

1. **FULL**: Computes everything from scratch using LEFT JOINs
   - Used for initial load or full refresh
   - Joins against base `x` table (cases/beds)

2. **DELTA**: Two-phase update pattern
   - **Reset Phase**: Sets field to empty if source data no longer exists
   - **Update Phase**: Updates field if source data changed

3. **Change Detection**: Uses `IS DISTINCT FROM` to detect actual changes

4. **Temp Tables**: Delta uses `ON COMMIT DROP` temp tables for efficiency

5. **Timezone**: All updates use `timezone('Asia/Jerusalem', now())` for updated_time

### DELTA Queries Available

| Query | Updates |
|-------|---------|
| nursesDeltaQuery | nurses field |
| dischargeDeltaQuery | discharge_stage, discharge_docs, no_nursing_doc, no_medical_doc |
| nursingStatusDeltaQuery | nursing, fall_risk |
| infectionsDeltaQuery | infection |
| isolationsDeltaQuery | isolation |
| blockedBedsDeltaQuery | blocked_bed |
| eventsDeltaQuery | has_events |
| consultationsDeltaQuery | consultation |
| labsDeltaQuery | lab_results, panic_result, invalid_result |
| respirationDeltaQuery | respirators |

### What is UNKNOWN

- When FULL vs DELTA is triggered
- Frequency of delta updates
- Whether delta updates are transactional

---

## 8. DELAYED CALCULATIONS (CONSULTATIONS/IMAGING)

### Question: "How are delayed consultations and imaging calculated?"

### Evidence (delayedCalculations.ts)

#### Delayed Consultations

```typescript
const calcDelayedConsultations = (consults, cases, ...) => {
  const newArr = intersectionObject(consults, cases);
  // Counts per consultation type
  for (const [key, caseId] of Object.entries(newArr)) {
    for (const consult of consults[caseId]) {
      delayedConsultations.cases++;
      const consultType = consult.consultWardDesc;
      consultTypeCounts[consultType]++;
    }
  }
  // Sort by oldest request date
  const sortedConsultTypes = Object.keys(consultTypeDelays).sort((a, b) => {
    const caseA = consultTypeDelays[a].reduce((max, current) =>
      current.requestDate < max.requestDate ? current : max
    );
    // ...
  });
  top5ConsultTypes = sortedConsultTypes.slice(0, 5);
}
```

#### Delayed Imaging Statuses

```typescript
const ALLOWED_STATUSES = new Set(["CNF", "SCH", "DNE", "IP", "IPR", "TP"]);
```

### What Can Be Stated with Evidence

1. **Delayed Consultations**:
   - Calculated by intersecting consultations with active cases
   - Grouped by `consultWardDesc` (consultation type)
   - Top 5 types sorted by oldest request date
   - Tracks `longestWaiting` per type

2. **Delayed Imaging Statuses**:
   - CNF = Confirmed
   - SCH = Scheduled
   - DNE = Done
   - IP = In Progress
   - IPR = In Progress Review
   - TP = To Process

3. **Time Calculations**:
   - CT/US not decoded: Uses `DNE_Time` (performed time)
   - Delayed imaging: Uses `CNF_Time` or `indicationStartDate`

4. **Output Structure**:
   - `cases`: Total count
   - `topFive`: Top 5 types by delay
   - `longestCases`: Most delayed case IDs
   - `longestWaiting`: Oldest waiting date

### What is UNKNOWN

- What defines "delayed" (threshold)
- Business rules for escalation
- How statuses transition

---

## 9. NO_CASE / NO_BED SYNTHETIC IDS

### Question: "What are NO_CASE and NO_BED and how are they created?"

### Evidence (subAndPartialsQueries.ts lines 103-323)

#### Beds and Cases Select

```sql
SELECT
  COALESCE(c.case_id::text, 'NO_CASE') AS case_id,
  ...
  COALESCE(
    b.bed_id::text,
    'NO_BED_' || COALESCE(c.room_id, l.room_id)::text
  ) AS bed_id,
  ...
FROM patients.cases c
FULL OUTER JOIN patients.beds b ON b.bed_id::text = c.bed_id::text
```

#### Empty Rooms Select

```sql
SELECT
  'NO_CASE'::text AS case_id,
  ...
  ('NO_BED_' || r.room_id)::text AS bed_id,
  ...
FROM patients.rooms r
LEFT JOIN common.wards w ON w.ward_id = r.ward_id
WHERE
  NOT EXISTS (SELECT 1 FROM patients.locations l WHERE l.room_id = r.room_id AND l.bed_id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM patients.cases c WHERE c.room_id = r.room_id)
```

### What Can Be Stated with Evidence

1. **NO_CASE**: Used when a bed exists but has no patient assigned
   - Created via `COALESCE(c.case_id::text, 'NO_CASE')`
   - 90% of cards_agg rows are NO_CASE (empty beds)

2. **NO_BED_**: Synthetic bed ID for rooms without physical beds
   - Format: `'NO_BED_' || room_id`
   - Created when bed_id is NULL but room exists

3. **Empty Rooms Query**: Finds rooms with:
   - No beds in locations table (`NOT EXISTS ... bed_id IS NOT NULL`)
   - No cases assigned (`NOT EXISTS ... cases WHERE room_id`)

4. **FULL OUTER JOIN**: Ensures ALL beds appear, even without cases

### What is UNKNOWN

- How consumers distinguish synthetic from real IDs
- Performance impact of 90% empty rows
- Whether NO_CASE rows are needed for display purposes

---

## 10. ROOM VALIDATION LOGIC

### Question: "How is room validity checked?"

### Evidence (subAndPartialsQueries.ts lines 92-140)

```sql
CASE
  WHEN COALESCE(c.room_id, l.room_id) IS NULL
    OR NOT EXISTS (SELECT 1 FROM patients.rooms r2 WHERE r2.room_id = COALESCE(c.room_id, l.room_id))
    OR NOT EXISTS (SELECT 1 FROM patients.locations l2 WHERE l2.room_id = COALESCE(c.room_id, l.room_id))
  THEN NULL
  ELSE {{FIELD}}
END
```

### What Can Be Stated with Evidence

1. **Room is INVALID if**:
   - Both case.room_id and location.room_id are NULL
   - Room doesn't exist in `patients.rooms`
   - Room doesn't exist in `patients.locations`

2. **Room ID Priority**: `COALESCE(c.room_id, l.room_id)` - case takes precedence

3. **Affected Fields**: room_id, room_desc, order_by all use this validation

### What is UNKNOWN

- What causes room_id mismatches between tables
- How orphaned rooms are cleaned up

---

## 11. EVENTS DETECTION

### Question: "How are nursing events detected?"

### Evidence (fullQueries.ts lines 29-38, deltaQueries.ts lines 418-437)

```sql
-- Full
SELECT
  e.case_id::text AS case_id,
  TRUE AS has_events
FROM nursing."event" e
WHERE e.case_id IS NOT NULL
GROUP BY e.case_id::text

-- Delta
UPDATE patients.cards_agg AS ca
SET has_events = sub.has_events, updated_time = timezone('Asia/Jerusalem', now())
FROM (
  SELECT c.case_id::text AS case_id, COALESCE(ev.has_events, FALSE) AS has_events
  FROM patients.cases c
  LEFT JOIN (
    SELECT e.case_id::text AS case_id, TRUE AS has_events
    FROM nursing."event" e
    WHERE e.case_id IS NOT NULL
    GROUP BY e.case_id::text
  ) ev ON ev.case_id = c.case_id::text
) sub
WHERE ca.case_id = sub.case_id AND ca.has_events IS DISTINCT FROM sub.has_events
```

### What Can Be Stated with Evidence

1. **Source**: `nursing."event"` table
2. **Output**: Simple boolean `has_events`
3. **Logic**: TRUE if ANY event exists for case_id
4. **Change Detection**: Only updates if value actually changed

### What is UNKNOWN

- What types of events exist
- Event lifecycle and resolution
- Whether event count matters (currently just boolean)

---

## SUMMARY TABLE

| Topic | Source of Truth | Key Finding |
|-------|-----------------|-------------|
| Similar Name | fullQueries.ts | 4 ward conditions + 4 name comparisons |
| Discharge Stage | document_discharge | Code 2 (nursing) > Code 1 (medical) > none |
| Respiration | patients.condition | NOT nursing_status; uses RespirationCodesCham param |
| Fall Risk | nursing_status_class | nurs_status_type = 3 |
| Infections | patients.infections | Dedup by (case_id, infection_name, ..., update_date) |
| Isolations | patients.case_isolation | GREATEST of 4 dates for latest |
| Labs | labs.patients_lab_exam_details | Panic = HH/LL, Invalid = X/INVALID |
| Aggregation | cards_agg | FULL (LEFT JOIN) vs DELTA (reset+update) |
| Empty Beds | bedsAndCasesSelect | NO_CASE = 90% of cards_agg |
| Events | nursing.event | Boolean has_events flag |

---

## EVIDENCE SOURCES

| File | Path | Key Queries |
|------|------|-------------|
| fullQueries.ts | /apis/patients-cards-aggregator/src/helpers/queryHelpers/ | Similar name, discharge, nursing, respiration, labs, isolations |
| deltaQueries.ts | /apis/patients-cards-aggregator/src/helpers/queryHelpers/ | All delta update patterns |
| subAndPartialsQueries.ts | /apis/patients-cards-aggregator/src/helpers/queryHelpers/ | NO_CASE/NO_BED, room validation, infection/isolation subqueries |
| delayedCalculations.ts | /coview-backend-services/malrad-cloud/filters/ | Delayed consultations, delayed imaging |

---

## 12. COPY TABLE SYNC MECHANISM

### Question: "How are main and copy tables synchronized?"

### Evidence (All domain API services: infections.services.ts, surgeryWaiting.service.ts, documentDischarge.services.ts, etc.)

```typescript
// Pattern from infections.services.ts
console.log('🗑️ Truncating `infections copy` table...');
await truncateTable(sequelize, 'patients', 'infections_copy');

console.log('🚀 Performing bulk insert...');
await bulkInsert('patients.infections_copy', InfectionsCopy, successCon);

console.log('🔄 Swapping tables...');
await swapTables(sequelize, 'patients', 'infections');
```

### What Can Be Stated with Evidence

1. **Sync Pattern**: TRUNCATE → BULK INSERT → SWAP TABLES
   - Step 1: Truncate the `_copy` table (empty it completely)
   - Step 2: Bulk insert all new data into `_copy` table
   - Step 3: Swap table names (atomic rename operation)

2. **Services Using This Pattern**:
   | Service | Table | Copy Table |
   |---------|-------|------------|
   | infections | patients.infections | patients.infections_copy |
   | case-isolation | patients.case_isolation | patients.case_isolation_copy |
   | surgery | patients.surgery_waiting | patients.surgery_waiting_copy |
   | discharge | patients.document_discharge | patients.document_discharge_copy |
   | new-case | patients.new_case | patients.new_case_copy |
   | doctor-decision | patients.er_release | patients.er_release_copy |
   | indications | patients.indications | patients.indications_copy |
   | consultations | patients.consultations | patients.consultations_copy |

3. **Why This Pattern**:
   - Atomic swap ensures no downtime during updates
   - Data from Chameleon (external system) replaces entire table contents
   - No incremental updates - full replacement each sync

4. **Data Source**: External Chameleon system sends POST requests with `{ root: [...] }` payload

### What is UNKNOWN

- Frequency of sync from Chameleon
- What triggers the sync (schedule? event?)
- Error recovery if swap fails

---

## 13. ER PATIENT FLOW (MALRAD)

### Question: "What are the stages a patient goes through in the ER (מלר\"ד)?"

### Evidence (malradFiltersNew.ts, malradGeneralDict.ts)

```typescript
// Stage definitions from malradGeneralDict.ts
export const stageDict = {
  waitingTriage: "טריאז'",
  waitingNurse: "קבלה סיעודית",
  waitingDoctor: "ממתין לרופא",
  waitingDoctorDecision: "ללא החלטה",
  waitingAdministrativeRelease: "ממתין לשחרור",
  waitingHospitalization: "ממתין לאשפוז",
  waitingMedEvaluation: 'ממתין לבירור רפואי',
  waitingFinalDecision: "ממתינים להחלטה סופית",
  finalDecisions: "החלטות סופיות",
};
```

### Patient Flow Logic (malradFiltersNew.ts)

```typescript
// Simplified flow logic:
if (value.sheetStatus == 0) continue;  // Skip inactive cases

// 1. Check if patient needs triage
if (!triageCases[key]) {
  finalObj[key].waitingTriage = value.admissionDate;  // Waiting for triage
} else {
  finalObj[key].waitingTriage = false;  // Triage done
  finalObj[key].medicalAssociation = triageCases[key].erAssign;  // Medical association assigned
}

// 2. Check nursing reception
if (nurseCases[key] && triageCases[key] && savingDateTime) {
  finalObj[key].waitingNurse = false;  // Nursing done
} else if (triageCases[key]) {
  finalObj[key].waitingNurse = triageCases[key].savingDateTime;  // Waiting since triage
}

// 3. Check doctor
if (doctorCases[key] && savingDateTime) {
  finalObj[key].waitingDoctor = false;  // Doctor done
} else if (nurseCases[key]) {
  finalObj[key].waitingDoctor = savingDateTime;  // Waiting since nurse
}

// 4. Check decision
if (desicionCases[key] && doctorCases[key]) {
  finalObj[key].waitingDoctorDecision = false;
  finalObj[key].decisions = desicionCases[key].doctorDecision;

  if (finalObj[key].decisions == "אשפוז") {
    finalObj[key].waitingHospitalization = desicionCases[key].decisionDateTime;
  }
  if (finalObj[key].decisions == "שחרור") {
    finalObj[key].waitingAdministrativeRelease = desicionCases[key].decisionDateTime;
  }
}
```

### What Can Be Stated with Evidence

1. **ER Patient Flow Stages**:
   ```
   Admission → waitingTriage → waitingNurse → waitingDoctor → waitingDoctorDecision
                                                                      ↓
                                                     ┌────────────────┴────────────────┐
                                                     ↓                                  ↓
                                            waitingHospitalization          waitingAdministrativeRelease
                                            (decision = "אשפוז")              (decision = "שחרור")
   ```

2. **Stage Transitions**:
   - `waitingTriage`: Patient arrives, waiting for triage assessment
   - `waitingNurse`: After triage, waiting for nursing reception
   - `waitingDoctor`: After nursing, waiting for doctor examination
   - `waitingDoctorDecision`: Doctor examined, waiting for decision
   - `decisions`: Decision made ("אשפוז" = hospitalization, "שחרור" = release)

3. **Special Conditions**:
   - `sheetStatus == 0`: Patient is inactive, skipped
   - `aranId`: ARAN (mass casualty) patients have special handling
   - Ambulance patients: Determined by `arrivalModeId` matching `arrivalModeNI` parameter

4. **Room Types**:
   - `walkingRoom`: Independent rooms (`independentRooms` parameter)
   - `lieDownRoom`: Lie-down rooms (`lieDownRooms` parameter)

### What is UNKNOWN

- Full list of doctorDecision values (beyond "אשפוז" and "שחרור")
- What happens after hospitalization decision
- How long each stage should take (SLAs)

---

## 14. INDICATION (IMAGING) STATUSES

### Question: "What do imaging/indication statuses mean?"

### Evidence (constants/index.ts in malrad-cloud)

```typescript
export const indicationsStatuses: Record<string, string> = {
  CAN: "בוטל",     // Canceled
  CNF: "הוזמן",    // Confirmed/Ordered
  SCH: "שובץ",     // Scheduled
  DNE: "בוצע",     // Done/Performed
  IP:  "פענוח זמני",  // In Progress - temporary interpretation
  IPR: "פענוח זמני",  // In Progress Review
  TP:  "פענוח זמני",  // To Process
  FR:  "פוענח",    // Final Result - interpreted
};

export const statusPrecedence: Record<string, number> = {
  CAN: 0, CNF: 1, SCH: 2, DNE: 3, IP: 4, IPR: 4, TP: 4, FR: 5
};

export const IndicationsGroupDict = {
  all: ["CAN", "CNF", "SCH", "DNE", "IP", "FR", "TP", "IPR"],
  delayed: ["CNF", "SCH"],           // Waiting to be done
  decoded: ["DNE", "IP", "FR"],      // Done or being interpreted
  notDone: ["CAN", "CNF", "SCH"],    // Not yet performed
  done: ["DNE"],                      // Performed
  canceled: ["CAN"],                  // Canceled
  notDoneCtUs: ["CNF", "SCH", "DNE", "IP", "TP", "IPR"],
  allowdInCPDashboard: ["CNF","SCH","DNE","IP","IPR","TP"]
};
```

### What Can Be Stated with Evidence

1. **Status Flow**:
   ```
   CNF (Ordered) → SCH (Scheduled) → DNE (Done) → IP/IPR/TP (Interpreting) → FR (Final Result)
                                 ↘
                                  CAN (Canceled)
   ```

2. **Status Meanings**:
   - `CNF` = הוזמן (Ordered/Confirmed) - imaging ordered
   - `SCH` = שובץ (Scheduled) - imaging scheduled
   - `DNE` = בוצע (Done) - imaging performed
   - `IP/IPR/TP` = פענוח זמני (Temporary interpretation) - being interpreted
   - `FR` = פוענח (Interpreted) - final result available
   - `CAN` = בוטל (Canceled) - imaging canceled

3. **Delayed Definition**:
   - `delayed` = statuses CNF or SCH (ordered but not done)
   - Used in delayedImaging calculations

4. **Precedence**: Lower number = earlier in workflow

### What is UNKNOWN

- What triggers status transitions
- Who changes statuses (system? user?)
- Integration with radiology systems

---

## 15. CONSULTATION STATUS FILTER

### Question: "Which consultations are considered active?"

### Evidence (ConsultsController.ts in malrad-cloud)

```typescript
for (let c of consultations) {
  // Filter: consultations with status != "בוצע" (done) are active
  if (c.consultStatus !== "בוצע") {
    if (!invitedConsults[c.caseId]) {
      invitedConsults[c.caseId] = [c];
    } else {
      invitedConsults[c.caseId].push(c);
    }
  }
  // All consultations (including done) go to allConsults
  if (!allConsults[c.caseId]) {
    allConsults[c.caseId] = [c];
  } else {
    allConsults[c.caseId].push(c);
  }
}
```

### What Can Be Stated with Evidence

1. **Active Consultation**: `consultStatus !== "בוצע"` (not "done")

2. **Data Structures**:
   - `invitedConsults`: Only consultations NOT done (active)
   - `allConsults`: All consultations including done

3. **Consultation Fields Fetched**:
   - `requestId`, `requestDate`, `caseId`
   - `consultWardDesc` (requesting specialty)
   - `consultStatus` (status)
   - `urgency`, `statusDate`

### What is UNKNOWN

- Complete list of consultStatus values
- What triggers status change to "בוצע"
- Urgency levels and their meanings

---

## 16. NEW CASE (IsNewDesc) LOGIC

### Question: "How is IsNewDesc (new case description) computed?"

### Evidence (newCase.services.ts)

```typescript
const { caseId, isNew, nursingDoc, medicalDoc } = rootConsultObj;
let { IsNewDesc } = rootConsultObj;

if (!medicalDoc && !nursingDoc)
  IsNewDesc = 'לא תועדה קבלה למטופל';    // "No reception documented"
else if (!nursingDoc && medicalDoc)
  IsNewDesc = 'לא תועדה קבלה סיעודית';   // "No nursing reception documented"
else if (nursingDoc && !medicalDoc)
  IsNewDesc = 'לא תועדה קבלה רפואית';    // "No medical reception documented"
else if (nursingDoc && medicalDoc && !isNew)
  IsNewDesc = '';                          // All documented, not new

const newCaseModel = {
  caseId,
  isNew,
  IsNewDesc,
  nursingDoc,
  medicalDoc,
  coviewStartDate: isNew ? updateTime : undefined,
  coviewEndDate: !isNew ? updateTime : undefined,
  updateDate: updateTime,
};
```

### What Can Be Stated with Evidence

1. **IsNewDesc Logic**:
   | medicalDoc | nursingDoc | isNew | IsNewDesc |
   |------------|------------|-------|-----------|
   | false | false | any | לא תועדה קבלה למטופל |
   | true | false | any | לא תועדה קבלה סיעודית |
   | false | true | any | לא תועדה קבלה רפואית |
   | true | true | false | (empty) |
   | true | true | true | (from input) |

2. **Timestamp Logic**:
   - `coviewStartDate`: Set when `isNew = true` (new case started)
   - `coviewEndDate`: Set when `isNew = false` (new case ended)

### What is UNKNOWN

- What triggers isNew = true/false
- Who sets nursingDoc and medicalDoc flags
- Lifecycle of new case status

---

## 17. ER PARAMETERS SYSTEM

### Question: "What parameters control ER behavior?"

### Evidence (constants/index.ts, ParametersController.ts)

```typescript
export const paramNames = new Set([
  // ER Ward Configuration
  'GeneralER_Dept',           // List of ER ward codes
  'arrivalModeNI',            // Ambulance arrival modes
  'refTypeNI',                // Referral types for NI

  // Room Configuration
  'independentRooms',         // Walking/independent room IDs
  'lieDownRooms',             // Lie-down room IDs
  'ER_IdTraumaRoom',          // Trauma room ID

  // Crowd/Alert Thresholds
  'GeneralERCrowd',           // Total ER crowd threshold [medium, high]
  'WaitToTriageCrowd',        // Waiting for triage threshold
  'WaitToNurseCrowd',         // Waiting for nurse threshold
  'WaitToDocCrowd',           // Waiting for doctor threshold
  'NonDesicionCrowd',         // No decision threshold
  'DesicionCrowd',            // Has decision threshold
  'WaitToHosptCrowd',         // Waiting for hospitalization threshold
  'WaitToDischargeCrowd',     // Waiting for discharge threshold

  // Medical Codes
  'ErOrthopedicCode',         // Orthopedic ER code
  'ErSurgicalCode',           // Surgical ER code
  'ErInternalCode',           // Internal medicine ER code

  // Time Calculation
  'ErWaitToNurseMetOfCalc',   // Method for calculating wait-to-nurse time
  'TemporaryDecisionsCodes',  // Temporary decision codes
  'HospAdmitID',              // Hospitalization admission ID

  // Max Time Parameters
  'maxTotal_admissionDate',
  'maxTotal_savingDateTime',
  'maxTotal_waitingDoctorTime',
  // ...
]);
```

### Alert Thresholds (alertsFields.ts)

```typescript
const ALERTS_FIELDS = ["total", "waitingTriage", "walkingRoom", "lieDownRoom"];

// Threshold logic:
colors = params[key];  // e.g., ["10", "20"]
if (colors) {
  value.high = Number(colors[colors.length - 1]);  // Last value = high threshold
  value.medium = colors.length === 1 ? -1 : Number(colors[0]);  // First = medium
}
```

### What Can Be Stated with Evidence

1. **Parameter Format**: Comma-separated values stored in `common.parameters`
   - Example: `GeneralERCrowd = "10,20"` → medium=10, high=20

2. **Alert Colors**:
   - Below medium: Normal
   - Between medium and high: Warning (yellow?)
   - Above high: Critical (red?)

3. **Parameter Loading**:
   - Loaded at startup from `common.parameters` table
   - Converted to arrays: `"1,2,3"` → `["1", "2", "3"]`

### What is UNKNOWN

- Default values when parameters missing
- Who updates parameters
- Complete parameter value examples

---

## 18. AMBULANCE SYSTEM (MONGODB)

### Question: "How does the ambulance tracking system work?"

### Evidence (ambulanceDrives.services.ts)

```typescript
// Uses MongoDB, NOT PostgreSQL
@InjectModel('Amb_Patients') private PatientsModel: Model<any>,
@InjectModel('Amb_Drives') private DrivesModel: Model<any>

// Key types for ride/patient identification
const rideKey = 1;
const patientKey = 2;

// Company-specific field mapping
getKeyFieldMap(typeId: number): Record<number, string> {
  const match = fieldMappingsList.find(
    (f: any) => f.company === company && f.key_type_id === typeId
  );
  if (match) {
    result[ambCompId] = match.field_name;
  }
}
```

### What Can Be Stated with Evidence

1. **Data Storage**: Ambulance data uses MongoDB collections (`amb_patients`, `amb_drives`), NOT PostgreSQL
2. **Company-Specific Mapping**: Different ambulance companies use different field names, mapped via `ambulance.field_mappings` table
3. **Reference Tables** (PostgreSQL cached at startup):
   - `patient_status_codes`
   - `dispatching_codes`
   - `field_mappings`
   - `healthcare_codes`
   - `medical_condition_codes`
   - `ambulance_codes`
   - `drive_priority`

4. **Cancellation Logic**:
   - `isCancel = true` marks cancelled rides/patients
   - `available = Date.now()` stores cancellation timestamp for rides

5. **Active Filter**: `isCancel: { $ne: true }, isActive: { $ne: true }`

### What is UNKNOWN

- How MongoDB syncs with PostgreSQL reference tables
- What triggers `isActive` flag
- Complete company list and their field mappings

---

## 19. GENDER CODES

### Question: "How is gender represented and displayed?"

### Evidence (ambulanceDrives.services.ts lines 330-339)

```typescript
getGenderText(gender: number | string | null | undefined): string {
  switch (gender?.toString()) {
    case '1':
      return 'ז';   // Male (זכר)
    case '2':
      return 'נ';   // Female (נקבה)
    case '0':
    default:
      return 'לא ידוע';  // Unknown
  }
}
```

### What Can Be Stated with Evidence

| Code | Hebrew | Meaning |
|------|--------|---------|
| 1 | ז | Male (זכר) |
| 2 | נ | Female (נקבה) |
| 0 | לא ידוע | Unknown |

### What is UNKNOWN

- Whether this coding is used consistently across all systems
- Whether additional gender codes exist

---

## 20. AGE DISPLAY LOGIC

### Question: "How is age calculated and displayed?"

### Evidence (ambulanceDrives.services.ts lines 303-328)

```typescript
calculateAgeDisplay(birthDateStr: string | null | undefined): string {
  if (!birthDateStr) return 'לא ידוע';

  const diffDays = Math.floor(diffMillis / (1000 * 60 * 60 * 24));
  const diffMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 +
                     (now.getMonth() - birthDate.getMonth());

  if (diffDays < 31) {
    return `${diffDays}י`;     // Days (ימים)
  } else if (diffMonths < 12) {
    return `${diffMonths}ח`;   // Months (חודשים)
  } else {
    // Calculate years with birthday adjustment
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  }
}
```

### What Can Be Stated with Evidence

| Age Range | Display Format | Example |
|-----------|----------------|---------|
| < 31 days | `Xי` (days) | `15י` |
| < 12 months | `Xח` (months) | `8ח` |
| ≥ 12 months | Years (number) | `25` |
| Unknown | לא ידוע | - |

### What is UNKNOWN

- Whether this display format is used elsewhere in the system

---

## 21. LOCATION SERVICE (3-TABLE UPDATE)

### Question: "How are beds, rooms, and locations synchronized?"

### Evidence (locations.services.ts lines 96-116)

```typescript
// Step 1: Update Beds
await truncateTable(sequelize, 'patients', 'beds_copy');
await bulkInsert('patients.beds_copy', BedsCopy, successBeds);
await swapTables(sequelize, 'patients', 'beds');

// Step 2: Update Rooms
await truncateTable(sequelize, 'patients', 'rooms_copy');
await bulkInsert('patients.rooms_copy', RoomsCopy, successRooms);
await swapTables(sequelize, 'patients', 'rooms');

// Step 3: Update Locations
await truncateTable(sequelize, 'patients', 'locations_copy');
await bulkInsert('patients.locations_copy', LocationsCopy, successLocations);
await swapTables(sequelize, 'patients', 'locations');
```

### What Can Be Stated with Evidence

1. **3-Table Update Pattern**: Beds → Rooms → Locations (sequential)
2. **Room Deduplication**: Rooms are deduplicated using `roomIdTracker`
3. **System Number**: Each location has a `systemNum` from `common.source_system`
4. **Single Source**: All three tables updated from same input payload

### What is UNKNOWN

- What happens if swap fails mid-sequence
- Whether this creates data inconsistency during update

---

## 22. LAB DATA PROCESSING

### Question: "How are lab results processed before storage?"

### Evidence (coview-labs/helpers/utils.ts)

```typescript
export function processLabsRoot(root: LabsExamAttributes[]): {
  successCon: OutRow[];
} {
  root.forEach((raw) => {
    let testCode = (raw.testCode ?? '').toString().trim();

    // Special case transformation
    if (testCode === '882947010') testCode = '0882947010';

    successCon.push({
      caseId: parsedCaseId,
      sampleNum: raw.sampleNum?.trim() ?? '',
      testCode,
      testDesc: raw.testDesc ?? null,
      result: raw.result ?? null,
      abnormal: raw.abnormal ?? null,
      resultStatus: raw.resultStatus ?? null,
      // ... more fields
    });
  });
}
```

### What Can Be Stated with Evidence

1. **TestCode Transformation**: `882947010` → `0882947010` (leading zero added)
2. **Field Defaults**: Empty strings for missing `sampleNum`, null for most other optional fields
3. **Date Handling**: Uses `newDateFixTime(date, '-')` for date normalization

### What is UNKNOWN

- Why testCode `882947010` requires special handling
- Complete list of testCode transformations

---

## 23. NURSING STATUS VALIDATION

### Question: "How is nursing status validated before storage?"

### Evidence (nursingStatus.service.ts lines 57-70)

```typescript
const statuses = await NursingStatusClass.findAll();

for (const dataObj of root) {
  const { caseId, nursStatusId, nursStatusDesc, nursStatusDate } = dataObj;

  // Validate status exists in reference table
  const status = statuses.find(
    (stat) => stat.nursStatusId == nursStatusId
  );

  if (!status) {
    errorArr.push({
      error: `status ${nursStatusId}| ${nursStatusDesc} not exist`,
    });
  }

  // Still inserts even if not found (logs error)
  insertData.push(nursingStatusObject);
}
```

### What Can Be Stated with Evidence

1. **Validation Against Reference**: `nursStatusId` must exist in `nursing_status_class` table
2. **Soft Validation**: Records are still inserted even if validation fails (error logged)
3. **Error Tracking**: Invalid statuses tracked in `errorArr` and returned in response

### What is UNKNOWN

- Whether validation failures trigger alerts
- How invalid statuses affect downstream processing

---

## 24. RESULT DOCS VALIDATION (HARD SKIP)

### Question: "How are result documents validated?"

### Evidence (resultDocs.services.ts lines 38-49)

```typescript
if (Array.isArray(root)) {
  for (const rootResultDataObj of root) {
    if (
      rootResultDataObj.orderId === null ||
      rootResultDataObj.labDocStatus === null ||
      (rootResultDataObj.statusTime &&
        !isValidDate(rootResultDataObj.statusTime)) ||
      rootResultDataObj.caseId === null
    ) {
      invalidCon.push(rootResultDataObj);  // Track but SKIP
      continue;  // DO NOT INSERT
    }
    successCon.push({ ... });  // Only valid records inserted
  }
}
```

### What Can Be Stated with Evidence

1. **Hard Validation (Skip)**: Invalid records are NOT inserted (unlike nursing status soft validation)
2. **Required Fields**:
   - `orderId` - must not be null
   - `labDocStatus` - must not be null
   - `caseId` - must not be null
   - `statusTime` - if present, must be valid date

3. **Invalid Records Tracking**: Stored in `invalidCon` array (but not persisted)

### Comparison: Soft vs Hard Validation

| Service | Validation Type | Invalid Records |
|---------|-----------------|-----------------|
| nursing_status | Soft | Inserted (error logged) |
| result_docs | Hard | Skipped (not inserted) |
| infections | None | All inserted |
| labs | None | All inserted |

### What is UNKNOWN

- Whether invalid records are reported/alerted
- What happens to skipped records

---

## 25. CASE ACTIVITY FILTERING (Dashboard Level)

### Question: "What defines an 'active' case? Why do some cases appear/disappear from dashboards?"

### Evidence (hospitalization.service.ts lines 70-76)

```typescript
const filteredCases = allCases.filter(
  (c) =>
    c.isActive &&                                    // MUST be active
    Boolean(c.admissionDate) &&                      // MUST have admission date
    c.nursingWard &&                                 // MUST have nursing ward
    hospitalizationWardIds.includes(c.nursingWard.trim()),  // MUST be in hospitalization ward
);
```

### Evidence (caseKeys.ts)

```typescript
isActive: { type: DataTypes.BOOLEAN, defaultValue: false, field: "is_active" },
```

### Evidence (processRootData.ts - Chameleon ingestion)

```typescript
isActive: validBoolean(isActive ?? false),  // Defaults to false if not provided
```

### Evidence (subAndPartialsQueries.ts - Aggregator)

```sql
-- NOTE: Aggregator has NO is_active filter
WHERE (c.case_id IS NOT NULL OR b.bed_id IS NOT NULL)
-- ALL cases are aggregated, active or not
```

### What Can Be Stated with Evidence

1. **Case Activity Filter (4 conditions)**:
   - `isActive = true` (from Chameleon)
   - `admissionDate` exists (not null/empty)
   - `nursingWard` exists (not null/empty)
   - `nursingWard` is in hospitalization ward list

2. **Filtering happens at DASHBOARD level, NOT aggregator**:
   - `cards_agg` contains ALL cases (active and inactive)
   - Dashboard services filter when fetching for display

3. **`isActive` comes from Chameleon**:
   - Ingested via `processRootData.ts`
   - Default is `false` if not provided
   - NOT computed locally - external system controls this

4. **Hospitalization ward filter**:
   - Uses `HospWards` parameter to get list of hospitalization ward IDs
   - Only cases in these wards appear in hospitalization dashboard

### What is UNKNOWN

- What triggers `isActive` change in Chameleon
- Whether other dashboards use the same filter conditions
- Whether `isActive = false` means "discharged" or something else

---

## 26. WARD-LEVEL PERMISSIONS

### Question: "How do permissions filter data? Why do users see different wards?"

### Evidence (wards.services.ts lines 103-131)

```typescript
async getNursingWards(userAdt: string, isAdmin: any, req: ExpressRequest) {
  const wardRes = await this.wardsRepo.getWardsWithCategory(filters, req);

  // Admin bypass - sees ALL wards
  if (isAdmin) return wardRes;

  // Non-admin filtered by permissions_chameleon
  const sAMAccountName = userAdt.split('@', 2)[0];
  const permissions = await PermissionsChameleon.findAll({
    attributes: ['userName', 'wardId'],
    where: { userName: sAMAccountName },
    raw: true,
  });

  if (permissions?.length) {
    const allowedWardIds = new Set(
      permissions.map((p) => p.wardId).filter((x): x is string => !!x),
    );
    return wardRes.filter((nw) => allowedWardIds.has(nw.id));
  }
  return [];  // No permissions = no wards
}
```

### Evidence (permissions.service.ts - Route-level)

```typescript
// Route-level permissions use AD groups
const userGroups = await this.ldapService.getUserGroups(username, domain);

// Check against routes_permissions table
const routePermissions = await RoutesPermissions.findAll({
  where: { routeId },
  include: [{ model: PermissionGroups }],
});

// User must be in at least one matching AD group
```

### What Can Be Stated with Evidence

1. **Two-Level Permission System**:
   - **Route-level**: AD groups control API endpoint access
   - **Ward-level**: `permissions_chameleon` controls data visibility

2. **Ward Permission Table**:
   - `common.permissions_chameleon` maps `userName` → `wardId`
   - User sees only wards where they have a record
   - No record = no access (empty list returned)

3. **Admin Bypass**:
   - Admin users skip the permission filter
   - Admins see ALL wards regardless of `permissions_chameleon`

4. **Username Extraction**:
   - `sAMAccountName = userAdt.split('@', 2)[0]`
   - Strips domain from email-style username

### What is UNKNOWN

- How `permissions_chameleon` records are created/managed
- Whether admin status is determined by AD group or DB flag
- Complete list of AD groups and their route mappings

---

## 27. VENTILATION DUAL-SOURCE CONFLICT

### Question: "Why do different screens show conflicting ventilation status?"

### Evidence (hospitalization.service.ts lines 124-133)

```typescript
// Dashboard service uses nursing_status with type 1
const respiratorStatuses = await pgModels.NursingStatus.findAll({
  where: { caseId: caseIds },
  include: [{
    model: pgModels.NursingStatusClass,
    as: 'nursStatusclass',
    where: { nursStatusType: 1 },  // TYPE 1
    required: true,
  }],
});
```

### Evidence (deltaQueries.ts - Aggregator)

```sql
-- Aggregator uses patients.condition with RespirationCodesCham parameter
WITH param AS (
  SELECT regexp_replace(param_value, '[() ]', '', 'g') AS raw
  FROM common.parameters
  WHERE param_name = 'RespirationCodesCham'
),
codes AS (
  SELECT trim(x)::int AS code
  FROM param, unnest(string_to_array(param.raw, ',')) AS x
),
-- Then matches against patients.condition
SELECT case_id, ...
FROM patients.condition
WHERE patient_condition_code IN (SELECT code FROM codes)
```

### What Can Be Stated with Evidence

| Consumer | Source Table | Filter Criteria |
|----------|--------------|-----------------|
| Hospitalization Dashboard | `nursing_status` + `nursing_status_class` | `nursStatusType = 1` |
| cards_agg (Aggregator) | `patients.condition` | `patient_condition_code IN RespirationCodesCham` |

1. **TWO DIFFERENT SOURCES for ventilation**:
   - Dashboard: `nursing_status` → `nursing_status_class.nursStatusType = 1`
   - Aggregator: `patients.condition` → `RespirationCodesCham` parameter codes

2. **These sources CAN have different data**:
   - A patient could have a condition code but no nursing_status record
   - Or vice versa
   - This explains screens showing conflicting ventilation status

3. **No reconciliation mechanism found**:
   - No code synchronizes these two sources
   - Each consumer queries independently

### Source Priority

| Source | Used By | Authority |
|--------|---------|-----------|
| `patients.condition` | Aggregator (cards_agg) | Pre-computed, cached |
| `nursing_status` type 1 | Dashboard services | Real-time query |

### What is UNKNOWN

- Which source is "authoritative" for clinical purposes
- Whether both should show the same status (data quality issue?)
- Whether there's a sync mechanism we haven't found

---

## UPDATED SUMMARY TABLE

| Topic | Source of Truth | Key Finding |
|-------|-----------------|-------------|
| Similar Name | fullQueries.ts | 4 ward conditions + 4 name comparisons |
| Discharge Stage | document_discharge | Code 2 (nursing) > Code 1 (medical) > none |
| Respiration | patients.condition | NOT nursing_status; uses RespirationCodesCham param |
| Fall Risk | nursing_status_class | nurs_status_type = 3 |
| Infections | patients.infections | Dedup by (case_id, infection_name, ..., update_date) |
| Isolations | patients.case_isolation | GREATEST of 4 dates for latest |
| Labs | labs.patients_lab_exam_details | Panic = HH/LL, Invalid = X/INVALID |
| Aggregation | cards_agg | FULL (LEFT JOIN) vs DELTA (reset+update) |
| Empty Beds | bedsAndCasesSelect | NO_CASE = 90% of cards_agg |
| Events | nursing.event | Boolean has_events flag |
| **Copy Table Sync** | Domain API services | TRUNCATE → BULK INSERT → SWAP TABLES |
| **ER Flow** | malradFiltersNew.ts | waitingTriage → waitingNurse → waitingDoctor → decision |
| **Indication Status** | constants/index.ts | CNF→SCH→DNE→IP/IPR/TP→FR (CAN = canceled) |
| **Consultations** | ConsultsController.ts | Active = status !== "בוצע" |
| **New Case** | newCase.services.ts | IsNewDesc based on nursingDoc + medicalDoc flags |
| **ER Parameters** | ParametersController.ts | Crowds, thresholds, room configs from common.parameters |
| **Ambulance System** | ambulanceDrives.services.ts | MongoDB for drives/patients, PostgreSQL for reference data |
| **Gender Codes** | ambulanceDrives.services.ts | 1=male(ז), 2=female(נ), 0=unknown |
| **Age Display** | ambulanceDrives.services.ts | <31d=Xי, <12m=Xח, else=years |
| **Location Update** | locations.services.ts | 3-table sequential update: beds→rooms→locations |
| **Lab Processing** | coview-labs/utils.ts | testCode 882947010→0882947010 transformation |
| **Nursing Status** | nursingStatus.service.ts | Soft validation against nursing_status_class |
| **Result Docs** | resultDocs.services.ts | Hard validation - invalid records skipped |
| **Case Activity Filter** | hospitalization.service.ts | isActive + admissionDate + nursingWard + wardCategory |
| **Ward Permissions** | wards.services.ts | permissions_chameleon table, admin bypass |
| **Ventilation Conflict** | DUAL SOURCE | Dashboard=nursing_status type 1, Aggregator=patients.condition |

---

## ADDITIONAL EVIDENCE SOURCES

| File | Path | Key Findings |
|------|------|-------------|
| infections.services.ts | /apis/infections/src/services/ | Copy table sync pattern |
| surgeryWaiting.service.ts | /apis/surgery/src/services/ | Copy table sync pattern |
| newCase.services.ts | /apis/new-case/src/services/ | IsNewDesc logic |
| malradFiltersNew.ts | /coview-backend-services/malrad-cloud/filters/ | ER patient flow stages |
| constants/index.ts | /coview-backend-services/malrad-cloud/ | Indication statuses |
| ParametersController.ts | /coview-backend-services/malrad-cloud/classes/ | Parameters system |
| ConsultsController.ts | /coview-backend-services/malrad-cloud/classes/ | Consultation active filter |
| alertsFields.ts | /coview-backend-services/malrad-cloud/filters/ | Alert threshold logic |
| ambulanceDrives.services.ts | /apis/ambulance-drives/src/services/ | MongoDB ambulance system, gender/age display |
| locations.services.ts | /apis/locations/src/services/ | 3-table update pattern, room deduplication |
| labs.services.ts | /apis/coview-labs/src/services/ | Copy table pattern for lab results |
| utils.ts | /apis/coview-labs/src/helpers/ | Lab testCode transformation |
| nursingStatus.service.ts | /apis/nursing-status/src/services/ | Status validation logic |
| transport.services.ts | /apis/transport/src/services/ | Copy table pattern for transport |
| monitors.services.ts | /apis/monitor-interface-api/src/services/ | Copy table pattern for monitors |
| condition.services.ts | /apis/coview-patient-condition/src/services/ | Copy table pattern for conditions |
| **hospitalization.service.ts** | /coview-backend-services/coview-dashboard-cloud/src/services/ | Case activity filter, ventilation via nursing_status type 1 |
| **wards.services.ts** | /coview-auth/common-service/src/services/ | Ward-level permissions, admin bypass |
| **permissions.service.ts** | /coview-auth/access-control/src/permissions/ | Route-level AD group permissions |
| **processRootData.ts** | /apis/coview-cases-cloud/src/helpers/ | isActive ingestion from Chameleon |
| **caseKeys.ts** | /packages/db-connector-cloud/src/models/pgModels/common/PGKeys/ | isActive field definition |

---

*END OF OPERATIONAL BEHAVIOR REFERENCE*
