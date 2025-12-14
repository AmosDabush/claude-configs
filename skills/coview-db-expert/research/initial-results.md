# FULL DOMAIN SKILL RESEARCH RESULTS

> Comprehensive research completed under STRICT DOMAIN SKILL DISCOVERY MODE
> Date: 2025-12-14
> Database: qa_naharia (QA/Naharia)

---

## RESEARCH SCOPE

### Sources Analyzed

| Source | Location | Status |
|--------|----------|--------|
| db-connector-cloud models | `packages/db-connector-cloud/src/models/pgModels/` | ✅ Analyzed |
| db_context_ai.yml | `/Users/amosdabush/db_context_env/output/db_context_ai.yml` | ✅ Analyzed (structural only) |
| patients-cards-aggregator | `apis/patients-cards-aggregator/src/helpers/queryHelpers/` | ✅ Analyzed (HIGH-VALUE) |
| coview-backend-services | `coview-backend-services/coview-dashboard-cloud/` | ✅ Analyzed |
| qa_naharia database | Live observational queries | ✅ Verified |

---

## ENTITY AND RELATIONSHIP OVERVIEW (STRUCTURAL)

### Database Schemas Identified

| Schema | Purpose | Table Count |
|--------|---------|-------------|
| `patients` | Patient/case data, beds, rooms | ~40+ tables |
| `common` | Reference data, wards, permissions | ~50+ tables |
| `labs` | Lab test results | 6 tables |
| `nursing` | Nursing activities, events | 8 tables |
| `staff` | Employee/staff data | 4 tables |
| `ambulance` | Ambulance codes | 7 tables |
| `logistics` | Operational logistics | 1 table |
| `public` | System tables | 7 tables |

### Core Entity Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CENTRAL: Case                               │
│                    (patients.cases)                                 │
│                    PK: case_id (integer)                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│    Patient    │      │     Ward      │      │     Bed       │
│ patients.     │      │ common.wards  │      │ patients.beds │
│ patients      │      │               │      │               │
│ PK:patient_id │      │ PK: ward_id   │      │ PK: bed_id    │
└───────────────┘      └───────────────┘      └───────────────┘
                                │
                                ▼
                       ┌───────────────┐
                       │     Room      │
                       │ patients.rooms│
                       │ PK: room_id   │
                       └───────────────┘
```

### Case-Connected Entities

| Entity | Table | FK to Case | Relationship |
|--------|-------|------------|--------------|
| Infections | patients.infections | case_id | hasMany |
| Isolations | patients.case_isolation | case_id | hasMany |
| NursingStatus | patients.nursing_status | case_id | hasOne |
| Nurses | patients.nurses | case_id | hasMany |
| Consultations | patients.consultations | case_id | hasMany |
| Transports | patients.transport | case_id | hasMany |
| Indications | patients.indications | case_id | hasMany |
| Surgery | patients.surgery | case_id | hasMany |
| SurgeryWaiting | patients.surgery_waiting | case_id | hasMany |
| PatientsInSurgery | patients.patients_in_surgery | case_id | hasMany |
| Condition | patients.condition | case_id | hasMany |
| DocumentDischarge | patients.document_discharge | case_id | hasMany |
| NewCase | patients.new_case | case_id | hasOne |

### Ward Hierarchy

```
Ward (common.wards)
├── WardCategory (common.ward_category) via category_id
├── Rooms (patients.rooms) via ward_id
├── HigherWards (common.higher_wards) via ward_id
└── MalradWards (common.malrad_wards) via ward_id
```

### Staff Structure

```
ActiveEmployees (staff.active_employees)
└── PresenceEmployees (staff.presence_employees) via employee_id

Patient (patients.patients)
└── NursingEvent (nursing.event) via patient_id, case_id
```

---

## IDENTIFIED PATTERNS AND ARCHITECTURES

### 1. Copy Table Pattern (STRUCTURAL)

**Observation**: Most core tables have `_copy` variants.

| Main Table | Copy Table |
|------------|------------|
| patients.cases | patients.cases_copy |
| patients.patients | patients.patients_copy |
| patients.beds | patients.beds_copy |
| patients.rooms | patients.rooms_copy |
| patients.infections | patients.infections_copy |
| patients.case_isolation | patients.case_isolation_copy |
| common.wards | common.wards_copy |
| ... | ... |

**Note**: Purpose of copy tables NOT confirmed. Marked as UNCONFIRMED.

### 2. Cards Aggregation Pattern (STRUCTURAL)

**Discovery**: A pre-aggregated table `patients.cards_agg` exists.

**Structure** (43 columns):
- Patient info: case_id, patient_id, id_number, first_name, last_name, father_name, sex, birth_date
- Location: department_id, ward_desc, room_id, room_desc, bed_id, bed_desc
- Ward info: chameleon_ward_id, chameleon_satellite_ward_id, chameleon_ward_desc, chameleon_satellite_ward_desc
- Aggregated JSONB: infection, isolation, monitor, consultation, nursing, respirators, lab_results, panic_result, invalid_result, discharge_docs, nurses, fall_risk, imaging, blocked_bed
- Flags: revisit, no_nursing_doc, no_medical_doc, has_similar_name, has_events
- Status: discharge_stage, days_in_ward
- Meta: updated_time, order_by

### 3. Explicit SQL Aggregation Queries (HIGH-VALUE EVIDENCE)

**Source**: `apis/patients-cards-aggregator/src/helpers/queryHelpers/`

**Identified Query Patterns**:

| Query | Purpose | Key Logic |
|-------|---------|-----------|
| `fullInsert_query` | Full card rebuild | Joins cases, beds, patients, locations, rooms, wards |
| `infectionsDeltaQuery` | Incremental infection sync | Groups by case_id, infection_name |
| `isolationsDeltaQuery` | Incremental isolation sync | Deduplicates by case_id, isolation_id |
| `nursingStatusDeltaQuery` | Incremental nursing sync | Filters by nurs_status_type |
| `labsDeltaQuery` | Incremental lab sync | Groups by case_id |
| `dischargeDeltaQuery` | Incremental discharge sync | Uses document_discharge_code |
| `consultationsDeltaQuery` | Incremental consultation sync | Groups by case_id |

### 4. Sequelize Query Builder Pattern (STRUCTURAL)

**Source**: `coview-backend-services/coview-dashboard-cloud/src/helpers/tableHelpers/queryHelpers.ts`

**Pattern**: Generic `applyQueryFeatures` function with:
- KeyMap for field mapping
- TypeMap for type coercion
- Filter building with special cases (age → birthDate range)
- Pagination support
- Include/nested association handling

---

## CANDIDATE DOMAIN RULES (UNCONFIRMED)

### CDR-001: Similar Name Detection

**Description**: Cases in the same ward with matching first/last names are flagged.

**Evidence**:
```sql
-- From fullQueries.ts: similarNameFullAgg
WHERE p1.id_number <> p2.id_number
  AND (
    LOWER(TRIM(p1.first_name)) = LOWER(TRIM(p2.first_name)) OR
    LOWER(TRIM(p1.last_name)) = LOWER(TRIM(p2.last_name)) OR
    LOWER(TRIM(p1.first_name)) = LOWER(TRIM(p2.last_name)) OR
    LOWER(TRIM(p1.last_name)) = LOWER(TRIM(p2.first_name))
  )
```

**Domain Scope**: Patient Safety / Identification

**Status**: UNCONFIRMED

---

### CDR-002: Nursing Status Type Classification

**Description**: Nursing status has distinct type classifications.

**Evidence**:
```sql
-- From deltaQueries.ts
FILTER (WHERE nsc.nurs_status_type = 2) AS respirators,
FILTER (WHERE nsc.nurs_status_type = 3) AS fall_risk,
```

**Observed Values in qa_naharia**:
- Type 1: 4 records
- Type 2: 6 records (respirators)
- Type 3: 1 record (fall_risk)
- Type 4: 7 records

**Domain Scope**: Nursing

**Status**: UNCONFIRMED - Type 1 and 4 meanings not identified

---

### CDR-003: Discharge Stage Progression

**Description**: Discharge follows a stage-based progression.

**Evidence**:
```sql
-- From fullQueries.ts: dischargeFullAgg
CASE
  WHEN BOOL_OR(d.document_discharge_code = 2) THEN 'nursing'
  WHEN BOOL_OR(d.document_discharge_code = 1) THEN 'medical'
  ELSE 'none'
END AS discharge_stage
```

**Stages**:
- `none`: No discharge documentation
- `medical`: Medical discharge doc (code 1)
- `nursing`: Nursing discharge doc (code 2)

**Domain Scope**: Discharge

**Status**: UNCONFIRMED - Priority/ordering not confirmed

---

### CDR-004: Room Validation Requirements

**Description**: Room assignments require validation against rooms and locations tables.

**Evidence**:
```sql
-- From subAndPartialsQueries.ts
CASE
  WHEN COALESCE(c.room_id, l.room_id) IS NULL
    OR NOT EXISTS (SELECT 1 FROM patients.rooms r2 WHERE r2.room_id = COALESCE(c.room_id, l.room_id))
    OR NOT EXISTS (SELECT 1 FROM patients.locations l2 WHERE l2.room_id = COALESCE(c.room_id, l.room_id))
  THEN NULL
  ELSE {{FIELD}}
END
```

**Domain Scope**: Location Management

**Status**: UNCONFIRMED

---

### CDR-005: Panic Lab Results Classification

**Description**: Lab results with specific abnormal codes are classified as panic/invalid.

**Evidence**:
```sql
-- From fullQueries.ts: labsFullAgg
FILTER (WHERE lab.abnormal IN ('HH', 'LL')) AS panic_result,
FILTER (WHERE lab.abnormal IN ('X', 'INVALID')) AS invalid_result
```

**Codes**:
- `HH`, `LL`: Panic results
- `X`, `INVALID`: Invalid results

**Domain Scope**: Labs

**Status**: UNCONFIRMED

---

### CDR-006: Respiration Code Configuration

**Description**: Respiration status is determined by codes from configuration.

**Evidence**:
```sql
-- From fullQueries.ts: respirationFullAgg
SELECT regexp_replace(param_value, '[() ]', '', 'g') AS raw
FROM common.parameters
WHERE param_name = 'RespirationCodesCham'
  AND param_group = 'תפוסה מחלקתית'
```

**Domain Scope**: Respiration / ICU

**Status**: UNCONFIRMED - Actual codes not retrieved

---

### CDR-007: Ward Association via Chameleon IDs

**Description**: Cases track both primary ward and satellite ward via Chameleon system IDs.

**Evidence**:
- `chameleon_ward_id`: Primary ward
- `chameleon_satellite_ward_id`: Satellite ward
- Both used in similar-name detection ward matching

**Domain Scope**: Ward Management

**Status**: UNCONFIRMED - Chameleon system integration not detailed

---

### CDR-008: Isolation Deduplication Logic

**Description**: Isolations are deduplicated by case + isolation_id with latest date priority.

**Evidence**:
```sql
-- From deltaQueries.ts
SELECT DISTINCT ON (iso.case_id, iso.isolation_id)
...
ORDER BY iso.case_id, iso.isolation_id, latest_date DESC
```

**Domain Scope**: Isolation

**Status**: UNCONFIRMED

---

### CDR-009: Infection Deduplication Logic

**Description**: Infections are deduplicated by case + infection_name with latest update priority.

**Evidence**:
```sql
-- From deltaQueries.ts
SELECT DISTINCT ON (i.case_id, i.infection_name)
...
ORDER BY i.case_id, i.infection_name, i.update_date DESC
```

**Domain Scope**: Infections

**Status**: UNCONFIRMED

---

### CDR-010: Empty Room Representation

**Description**: Rooms without beds or cases are represented with synthetic IDs.

**Evidence**:
```sql
-- From subAndPartialsQueries.ts: emptyRoomsSelect
'NO_CASE'::text AS case_id,
('NO_BED_' || r.room_id)::text AS bed_id,
```

**Domain Scope**: Location Display

**Status**: UNCONFIRMED

---

## NOTED AMBIGUITIES AND CONFLICTS

### A1: Copy Table Purpose

**Ambiguity**: Multiple `_copy` tables exist but their purpose is not documented in code.

**Possible Purposes**:
- ETL staging tables
- Audit/history tables
- Backup tables
- Sync source tables

**Status**: UNRESOLVED

---

### A2: Nursing Status Types 1 and 4

**Ambiguity**: Types 2 (respirators) and 3 (fall_risk) are identified in code. Types 1 and 4 exist in data but are not referenced in explicit SQL.

**Evidence**: qa_naharia has records with nurs_status_type 1 (4 records) and 4 (7 records).

**Status**: UNRESOLVED

---

### A3: cards_agg vs Source Tables Authority

**Ambiguity**: It's unclear whether `patients.cards_agg` is authoritative or derived.

**Evidence**:
- It's populated by explicit SQL aggregation
- It has an auto-increment `id` separate from `case_id`
- Composite key: (case_id, bed_id)

**Status**: UNRESOLVED - likely derived/materialized view

---

### A4: Chameleon System Integration

**Ambiguity**: References to "chameleon" IDs suggest external system integration.

**Observed Fields**:
- chameleon_ward_id
- chameleon_satellite_ward_id
- permissions_chameleon table
- user_chameleon table

**Status**: UNRESOLVED - external system details unknown

---

### A5: MongoSchemas vs PostgreSQL

**Ambiguity**: MongoDB schemas exist for ambulance data (Patients, Drives) with 30-day TTL.

**Evidence**: From db-connector-cloud mongoCollection schemas.

**Question**: What triggers MongoDB vs PostgreSQL storage?

**Status**: UNRESOLVED

---

## STRUCTURAL FACTS (AUTO-ALLOWED)

### Primary Keys Verified

| Table | Primary Key | Type |
|-------|-------------|------|
| patients.cases | case_id | integer |
| patients.patients | patient_id | integer |
| patients.beds | bed_id | varchar |
| patients.rooms | room_id | varchar |
| common.wards | ward_id | varchar |
| patients.cards_agg | id (serial) + (case_id, bed_id) unique | integer |

### Schema Conventions

| Convention | Value |
|------------|-------|
| Naming | snake_case |
| Boolean defaults | NULL (not false) |
| Timestamps | timestamp without time zone |
| JSONB defaults | '[]'::jsonb or NULL |
| IDs | Mostly varchar (some integer) |

### Model Initialization Pattern

```typescript
export class Model extends ModelBaseClass {}

export async function initializeModel() {
  const { sequelize } = await PGConnector.getPool();
  Model.init({ ...modelKeys }, {
    sequelize,
    schema: "patients", // or "common", etc.
    modelName: "Model",
    tableName: "table_name",
    timestamps: false,
    underscored: true,
  });
}
```

### Domain Bundle Pattern

```typescript
// Each domain exports:
export {
  casesDomain,           // { models, init(), setupAssociations() }
  casesModels,           // Direct model access
  initCasesDomain,       // Initialize function
  type CasesModels,      // TypeScript type
}
```

---

## LIVE DATABASE VERIFICATION (qa_naharia)

### Connection Verified

- Host: coview-naharia.cluster-cb6ay6kuwljx.il-central-1.rds.amazonaws.com
- Database: coview
- Schemas: 8 confirmed

### Sample Counts

| Metric | Value |
|--------|-------|
| Active cases | 758 |
| Nursing status class records by type | 1:4, 2:6, 3:1, 4:7 |

---

## RESEARCH COMPLETION STATUS

| Phase | Status |
|-------|--------|
| Model exploration | ✅ Complete |
| db_context_ai.yml analysis | ✅ Complete |
| Backend services analysis | ✅ Complete |
| Explicit SQL analysis | ✅ Complete |
| Observational queries | ✅ Complete |
| Candidate rules identified | ✅ 10 rules |
| Ambiguities noted | ✅ 5 items |

---

## NEXT STEPS (Pending Approval)

1. **Resolve Ambiguities**: Request clarification on A1-A5
2. **Confirm Candidate Rules**: Submit CDR-001 through CDR-010 for approval
3. **Define Skill Scope**: Based on confirmed rules, define skill capabilities
4. **Domain Isolation**: Map which rules apply to which domains

---

*END OF RESEARCH RESULTS*
