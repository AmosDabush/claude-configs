# DEEP DOMAIN SKILL RESEARCH RESULTS

> Focus: Depth, doubt, risk exposure
> Mode: STRICT DOMAIN SKILL DISCOVERY
> Date: 2025-12-14
> Optimized for: Core invariants, dangerous relationships, authority conflicts

---

## CRITICAL FINDINGS SUMMARY

| Category | Count | Risk Level |
|----------|-------|------------|
| Candidate Domain Rules | 47 | - |
| Source-of-Truth Conflicts | 8 | 🔴 HIGH |
| Cross-Domain Violations | 6 | 🔴 HIGH |
| Builder vs SQL Contradictions | 5 | 🟡 MEDIUM |
| Authority Ambiguities | 12 | 🔴 HIGH |
| Dangerous Assumptions | 9 | 🔴 HIGH |

---

## SECTION 1: SOURCE-OF-TRUTH CONFLICTS

### SOT-001: Main Table vs Copy Table Authority [🔴 CRITICAL]

**Discovery**: API domains use `_copy` tables while explicit SQL uses main tables.

**Evidence**:

| Component | Table Used | Source |
|-----------|------------|--------|
| infectionsApi domain | `InfectionsCopy` | db-connector-cloud |
| patients-cards-aggregator | `patients.infections` | explicit SQL |
| caseIsolationApi domain | `IsolationsCopy` | db-connector-cloud |
| patients-cards-aggregator | `patients.case_isolation` | explicit SQL |
| nursingStatusApi domain | `NursingStatusCopy` | db-connector-cloud |
| patients-cards-aggregator | `patients.nursing_status` | explicit SQL |
| consultationsApi domain | `ConsultationCopy` | db-connector-cloud |
| patients-cards-aggregator | `patients.consultations` | explicit SQL |

**Data Observation** (qa_naharia):
- Main and copy tables have identical counts
- Sync mechanism unknown

**Risk**: If tables diverge, system behavior becomes unpredictable.

**Status**: UNCONFIRMED - Which is authoritative?

---

### SOT-002: Multiple Ward ID Fields [🔴 CRITICAL]

**Discovery**: Cases reference wards via THREE different fields.

**Fields**:
- `nursing_ward` (string, e.g., "פגים", "פנא")
- `chameleon_ward_id` (string, e.g., "670", "15068592")
- `chameleon_satellite_ward_id` (string, nullable)

**Association Evidence**:
```typescript
// From associations.ts
Case.belongsTo(Ward, { as: 'wardFromCase', foreignKey: 'nursing_ward' });
Case.belongsTo(Ward, { as: 'Ward', foreignKey: 'chameleonWardId', targetKey: 'wardId' });
Case.belongsTo(Ward, { as: 'satteliteWard', foreignKey: 'chameleonSatelliteWardId' });
```

**Data Observation** (qa_naharia):
- 54 active cases have BOTH chameleon_ward_id AND chameleon_satellite_ward_id
- nursing_ward values are Hebrew descriptions
- chameleon_ward_id values are numeric strings

**Risk**: Which field determines actual ward location?

**Status**: UNCONFIRMED

---

### SOT-003: cards_agg Cardinality Mismatch [🟡 MEDIUM]

**Discovery**: `patients.cards_agg` has 10x more rows than cases.

**Data Observation** (qa_naharia):
- Total rows: 7,445
- Distinct cases: 747 (plus 6,699 with case_id='NO_CASE')
- Distinct beds: 7,199

**Implication**: cards_agg is NOT a case table. It's a (case_id, bed_id) materialized view.

**Risk**: Treating cards_agg as case-authoritative would be incorrect.

**Status**: UNCONFIRMED

---

### SOT-004: Case Without Location [🔴 CRITICAL]

**Discovery**: Active cases may lack bed/room assignments.

**Data Observation** (qa_naharia):
- Active cases: 758
- Cases without bed_id: 371 (49%)
- Cases without room_id: 200 (26%)

**Risk**: Assuming all cases have physical locations is dangerous.

**Status**: UNCONFIRMED - Is this valid state?

---

### SOT-005: Empty String vs NULL [🟡 MEDIUM]

**Discovery**: Empty strings (`''`) are used instead of NULL for missing values.

**Evidence** (qa_naharia):
```
case_bed: ""
case_room: ""
```

**Risk**: Queries using `IS NULL` will miss empty string values.

**Status**: UNCONFIRMED - Is this intentional?

---

### SOT-006: Bed ID Authority [🔴 CRITICAL]

**Discovery**: Multiple tables claim bed_id authority.

**Tables with bed_id**:
- `patients.cases.bed_id`
- `patients.beds.bed_id` (PK)
- `patients.locations.bed_id`
- `patients.blocked_beds.bed_id`

**Join Pattern** (from explicit SQL):
```sql
FROM patients.cases c
FULL OUTER JOIN patients.beds b ON b.bed_id::text = c.bed_id::text
LEFT JOIN patients.locations l ON l.bed_id::text = b.bed_id::text
```

**Risk**: FULL OUTER JOIN implies cases and beds may not match.

**Status**: UNCONFIRMED - What is the master bed list?

---

### SOT-007: No Database Foreign Keys [🔴 CRITICAL]

**Discovery**: Very few FK constraints exist in PostgreSQL.

**Observed FK** (qa_naharia):
- Only ambulance_patients → ambulance_drives

**Implication**: All other relationships are ORM-managed only.

**Risk**: Database cannot enforce referential integrity.

**Status**: STRUCTURAL FACT (but domain risk remains)

---

### SOT-008: Document Discharge Empty [🟡 MEDIUM]

**Discovery**: `patients.document_discharge` is empty in qa_naharia.

**Data Observation**: 0 records

**But SQL References It**:
```sql
FROM patients.document_discharge d
```

**Risk**: Discharge logic may be untested in QA.

**Status**: UNCONFIRMED - Is this expected?

---

## SECTION 2: CROSS-DOMAIN BOUNDARY VIOLATIONS

### CDB-001: nursingStatusApi vs controlPanelDashboard [🔴 CRITICAL]

**Discovery**: Same entity, different tables across domains.

| Domain | Model Used |
|--------|------------|
| nursingStatusApi | NursingStatusCopy |
| controlPanelDashboard | NursingStatus |

**Risk**: Domains may see different data states.

**Status**: UNCONFIRMED

---

### CDB-002: Association Duplication [🟡 MEDIUM]

**Discovery**: Same associations defined multiple times in associations.ts.

**Evidence**:
```typescript
// Line 62-66
Patient.hasMany(NursingEvent, { as: 'nursingEvents', foreignKey: 'patientId' });

// Line 291-295
Patient.hasMany(NursingEvent, { as: 'patientNursingEvents', foreignKey: 'patientId' });
```

```typescript
// Line 236-237
Modules.hasMany(Screens, { foreignKey: "module_id" });

// Line 239-240 (DUPLICATE)
Modules.hasMany(Screens, { foreignKey: "module_id" });
```

**Code Comments Found**:
- `/// lior wtf???` (line 309)
- `/////tomer wtf???` (line 364)

**Risk**: Association behavior may be unpredictable.

**Status**: STRUCTURAL FACT (code smell)

---

### CDB-003: Copy Model Cross-Referencing [🔴 CRITICAL]

**Discovery**: 17+ API domains use Copy tables.

**Domains Using Copy Tables**:
- infectionsApi → InfectionsCopy
- caseIsolationApi → IsolationsCopy
- nursingStatusApi → NursingStatusCopy
- consultationsApi → ConsultationCopy
- dischargeApi → DocumentDischargeCopy
- newCaseApi → NewCaseCopy
- monitorApi → MonitoredCopy
- surgeryApiCloud → SurgeryCopy
- surgeryApi → SurgeryWaitingCopy, PatientsInSurgeryCopy
- transportApi → TransportsCopy
- doctorDecisionApi → ErReleaseCopy
- patientConditionApi → PatientConditionCopy
- labsApi → LabsExamCopy
- resultDocsApi → ResultDocsCopy
- indicationsApi → IndicationsCopy
- locationsApi → BedsCopy, RoomsCopy, LocationsCopy
- employeesApi → ActiveEmployeesCopy, PresenceEmployeesCopy
- wardsApi → WardCopy
- casesApi → CaseCopy, PatientCopy

**Domain Using Main Tables**:
- controlPanelDashboard → All main tables

**Risk**: Cross-domain data inconsistency.

**Status**: UNCONFIRMED

---

### CDB-004: labs Schema Isolation [🟡 MEDIUM]

**Discovery**: Labs data lives in separate schema.

**Schema**: `labs`
**Tables**: `labs.patients_lab_exam_details`

**But Referenced By**: patients.cards_agg (via explicit SQL)

**Risk**: Cross-schema joins may have performance/consistency issues.

**Status**: UNCONFIRMED

---

### CDB-005: nursing Schema Isolation [🟡 MEDIUM]

**Discovery**: Nursing events live in separate schema.

**Schema**: `nursing`
**Tables**: `nursing.event`

**Referenced In SQL**:
```sql
FROM nursing."event" e
```

**Risk**: Schema boundary may indicate domain boundary.

**Status**: UNCONFIRMED

---

### CDB-006: common Schema Authority [🟡 MEDIUM]

**Discovery**: Reference data in common schema.

**Tables**:
- `common.wards`
- `common.ward_category`
- `common.parameters`
- `common.higher_wards`

**Risk**: Changes to common may affect all domains.

**Status**: UNCONFIRMED

---

## SECTION 3: BUILDER VS SQL CONTRADICTIONS

### BSC-001: Sequelize Field Names vs SQL Field Names [🟡 MEDIUM]

**Discovery**: Model uses camelCase, SQL uses snake_case.

**Model**:
```typescript
bedId: { field: "bed_id" }
wardId: { field: "ward_id" }
```

**SQL**:
```sql
c.bed_id::text
c.chameleon_ward_id::text
```

**Risk**: Case mismatch in dynamic queries.

**Status**: STRUCTURAL FACT

---

### BSC-002: Association Constraints Disabled [🟡 MEDIUM]

**Discovery**: Some associations explicitly disable constraints.

**Evidence**:
```typescript
Case.belongsTo(Rooms, {
  as: 'RoomFromCase',
  foreignKey: 'roomId',
  constraints: false  // ← DISABLED
});
```

**Risk**: ORM cannot verify relationship validity.

**Status**: STRUCTURAL FACT

---

### BSC-003: Type Mismatch in Joins [🔴 CRITICAL]

**Discovery**: Explicit SQL casts all IDs to text.

**Evidence**:
```sql
ON b.bed_id::text = c.bed_id::text
```

**Model Definition**:
```typescript
bedId: { type: DataTypes.STRING(255) }  // Already string
```

**Risk**: Double-casting or type mismatches possible.

**Status**: UNCONFIRMED

---

### BSC-004: FULL OUTER JOIN vs belongsTo [🔴 CRITICAL]

**Discovery**: SQL uses FULL OUTER JOIN, models use belongsTo.

**SQL**:
```sql
FROM patients.cases c
FULL OUTER JOIN patients.beds b ON b.bed_id = c.bed_id
```

**Model**:
```typescript
Case.belongsTo(Beds, { ... })  // Implies LEFT JOIN
```

**Risk**: ORM queries will not match SQL behavior.

**Status**: UNCONFIRMED

---

### BSC-005: Cards Aggregator Writes Directly [🔴 CRITICAL]

**Discovery**: Explicit SQL bypasses ORM entirely.

**Evidence**:
```sql
INSERT INTO patients.cards_agg (...)
DELETE FROM patients.cards_agg t
UPDATE patients.cards_agg ca SET ...
```

**Risk**: ORM hooks/validations not triggered.

**Status**: STRUCTURAL FACT

---

## SECTION 4: CANDIDATE DOMAIN RULES (UNCONFIRMED)

### Ward Assignment Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-001 | Case must have chameleon_ward_id | SQL uses chameleon_ward_id for department_id | Ward | UNCONFIRMED |
| CDR-002 | chameleon_satellite_ward_id indicates secondary location | Similar name detection uses both | Ward | UNCONFIRMED |
| CDR-003 | nursing_ward is display name, not FK | Values are Hebrew text | Ward | UNCONFIRMED |
| CDR-004 | Ward hierarchy exists via higher_wards | HigherWards model | Ward | UNCONFIRMED |
| CDR-005 | Ward can be blocked (is_blocked) | wardKeys | Ward | UNCONFIRMED |
| CDR-006 | Ward can be deleted (is_deleted) | wardKeys | Ward | UNCONFIRMED |
| CDR-007 | Ward has category (ward_category) | wardKeys, WardCategory model | Ward | UNCONFIRMED |
| CDR-008 | ICU wards flagged (is_icu) | wardKeys | Ward | UNCONFIRMED |
| CDR-009 | Aran wards flagged (is_aran) | wardKeys | Ward | UNCONFIRMED |

### Location Assignment Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-010 | Room must exist in rooms AND locations | SQL validation | Location | UNCONFIRMED |
| CDR-011 | Room fallback: COALESCE(c.room_id, l.room_id) | SQL | Location | UNCONFIRMED |
| CDR-012 | Empty rooms get synthetic bed ID: NO_BED_{room_id} | SQL | Location | UNCONFIRMED |
| CDR-013 | Cases without beds get case_id='NO_CASE' in cards_agg | SQL | Location | UNCONFIRMED |
| CDR-014 | Beds belong to wards (beds.ward_id) | bedsKeys | Location | UNCONFIRMED |
| CDR-015 | Locations link beds to rooms | locationKeys | Location | UNCONFIRMED |
| CDR-016 | Blocked beds tracked separately | BlockedBeds model | Location | UNCONFIRMED |

### Patient/Case Lifecycle Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-017 | Case has is_active flag | caseKeys | Case Lifecycle | UNCONFIRMED |
| CDR-018 | Case tracks admission_date | caseKeys | Case Lifecycle | UNCONFIRMED |
| CDR-019 | Case tracks discharge_date | caseKeys | Case Lifecycle | UNCONFIRMED |
| CDR-020 | Case tracks days_in_ward | caseKeys | Case Lifecycle | UNCONFIRMED |
| CDR-021 | Case may have absence flag | caseKeys | Case Lifecycle | UNCONFIRMED |
| CDR-022 | revisit indicates readmission | caseKeys, SQL | Case Lifecycle | UNCONFIRMED |
| CDR-023 | Patient can have multiple cases | Patient hasMany Case | Case Lifecycle | UNCONFIRMED |

### Infection/Isolation Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-024 | Infection has status: נשא (carrier), קליני (clinical) | qa_naharia data | Infection | UNCONFIRMED |
| CDR-025 | Infection deduplicated by (case_id, infection_name) | SQL | Infection | UNCONFIRMED |
| CDR-026 | Isolation type 1 = מגע (contact) | qa_naharia data | Isolation | UNCONFIRMED |
| CDR-027 | Isolation type 3 = טיפתי (droplet) | qa_naharia data | Isolation | UNCONFIRMED |
| CDR-028 | Isolation type 108 = הגנתי (protective) | qa_naharia data | Isolation | UNCONFIRMED |
| CDR-029 | Isolation type 119 = אוויר (airborne) | qa_naharia data | Isolation | UNCONFIRMED |
| CDR-030 | Isolation deduplicated by (case_id, isolation_id) | SQL | Isolation | UNCONFIRMED |
| CDR-031 | Isolation has coview dates separate from system dates | SQL fields | Isolation | UNCONFIRMED |

### Nursing Status Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-032 | nurs_status_type 2 = respirators | SQL filter | Nursing | UNCONFIRMED |
| CDR-033 | nurs_status_type 3 = fall_risk | SQL filter | Nursing | UNCONFIRMED |
| CDR-034 | nurs_status_type 1 = UNKNOWN | qa_naharia data (4 records) | Nursing | UNCONFIRMED |
| CDR-035 | nurs_status_type 4 = UNKNOWN | qa_naharia data (7 records) | Nursing | UNCONFIRMED |
| CDR-036 | NursingStatus linked to NursingStatusClass | Association | Nursing | UNCONFIRMED |
| CDR-037 | NursingStatusClass linked to NursingStatusType | Association | Nursing | UNCONFIRMED |

### Discharge Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-038 | discharge_stage: none → medical → nursing | SQL CASE logic | Discharge | UNCONFIRMED |
| CDR-039 | document_discharge_code 1 = medical | SQL | Discharge | UNCONFIRMED |
| CDR-040 | document_discharge_code 2 = nursing | SQL | Discharge | UNCONFIRMED |
| CDR-041 | new_case.nursing_doc and medical_doc track documentation | SQL | Discharge | UNCONFIRMED |

### Lab Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-042 | abnormal 'HH'/'LL' = panic results | SQL filter | Labs | UNCONFIRMED |
| CDR-043 | abnormal 'X'/'INVALID' = invalid results | SQL filter | Labs | UNCONFIRMED |
| CDR-044 | Labs in separate schema (labs.) | Schema structure | Labs | UNCONFIRMED |

### Similar Name Detection Rules

| # | Rule | Evidence | Domain | Status |
|---|------|----------|--------|--------|
| CDR-045 | Same ward comparison includes satellite wards | SQL logic | Patient Safety | UNCONFIRMED |
| CDR-046 | Name match is case-insensitive, trimmed | SQL: LOWER(TRIM(...)) | Patient Safety | UNCONFIRMED |
| CDR-047 | Cross-name match (first=last, last=first) | SQL | Patient Safety | UNCONFIRMED |

---

## SECTION 5: AUTHORITY AMBIGUITIES

| # | Ambiguity | Options | Risk |
|---|-----------|---------|------|
| AA-001 | Main vs Copy table authority | Main is source? Copy is source? Bidirectional sync? | 🔴 HIGH |
| AA-002 | Which ward ID field is authoritative | nursing_ward? chameleon_ward_id? chameleon_satellite_ward_id? | 🔴 HIGH |
| AA-003 | cards_agg authority | Derived view? Authoritative? Cache? | 🟡 MEDIUM |
| AA-004 | Bed assignment source | cases.bed_id? beds table? locations table? | 🔴 HIGH |
| AA-005 | Room assignment source | cases.room_id? rooms table? locations table? | 🔴 HIGH |
| AA-006 | nurs_status_type meanings | Types 1 and 4 unknown | 🟡 MEDIUM |
| AA-007 | Copy table sync mechanism | Triggers? ETL? Manual? | 🔴 HIGH |
| AA-008 | Chameleon system integration | External system? IDs meaning? | 🟡 MEDIUM |
| AA-009 | is_active lifecycle | When set/unset? By whom? | 🔴 HIGH |
| AA-010 | Empty string vs NULL semantics | Intentional? Bug? | 🟡 MEDIUM |
| AA-011 | FULL OUTER JOIN semantics | Cases without beds? Beds without cases? | 🔴 HIGH |
| AA-012 | Cross-schema boundaries | When to join across schemas? | 🟡 MEDIUM |

---

## SECTION 6: DANGEROUS ASSUMPTIONS

| # | Assumption | Why Dangerous | Evidence |
|---|------------|---------------|----------|
| DA-001 | All active cases have beds | 49% of active cases have no bed | qa_naharia data |
| DA-002 | Main and copy tables are identical | No sync mechanism documented | Code review |
| DA-003 | ORM associations match SQL joins | ORM uses belongsTo, SQL uses FULL OUTER JOIN | Code comparison |
| DA-004 | All ward IDs reference same entity | Three different ward ID fields | Case model |
| DA-005 | Database enforces referential integrity | Only 1 FK constraint found | Schema query |
| DA-006 | cards_agg is case-centric | 90% of rows are NO_CASE | qa_naharia data |
| DA-007 | Nursing status types are documented | Types 1 and 4 undocumented | SQL + data |
| DA-008 | Document discharge exists in QA | 0 records in qa_naharia | Data query |
| DA-009 | API domains and SQL use same data | Different table sets | Code review |

---

## SECTION 7: UNRESOLVED CONTRADICTIONS

### UC-001: Atomic Swap Pattern

**From casesApi/associations.ts**:
```typescript
// The coview-cases-cloud project uses an atomic swap pattern
// and doesn't need any model relationships.
```

**Contradiction**: If atomic swap, why have Copy tables? What is being swapped?

---

### UC-002: Association Comments

**From associations.ts**:
```typescript
/// lior wtf???
/////tomer wtf???
```

**Implication**: Developers were confused about these associations.

---

### UC-003: Multiple Same-Target Associations

**Example**:
```typescript
Patient.hasMany(NursingEvent, { as: 'nursingEvents', ... });
Patient.hasMany(NursingEvent, { as: 'patientNursingEvents', ... });
```

**Question**: Why two aliases for the same relationship?

---

### UC-004: Duplicate Model Registrations

**Example**:
```typescript
Modules.hasMany(Screens, { foreignKey: "module_id" });
Modules.hasMany(Screens, { foreignKey: "module_id" });  // DUPLICATE
```

**Question**: Is this intentional or a bug?

---

## SECTION 8: DATA OBSERVATIONS (qa_naharia)

| Metric | Value | Notes |
|--------|-------|-------|
| Active cases | 758 | |
| Cases without bed | 371 (49%) | Empty string, not NULL |
| Cases without room | 200 (26%) | |
| cards_agg total rows | 7,445 | |
| cards_agg NO_CASE rows | 6,699 (90%) | Empty beds/rooms |
| Isolation records | 39 | Main = Copy |
| Infection records | 50 | Main = Copy |
| Nursing status records | 280 | Main = Copy |
| Consultation records | 2 | Very low |
| Document discharge records | 0 | Empty |
| Schemas | 8 | patients, common, labs, nursing, staff, ambulance, logistics, public |
| FK constraints | ~4 | Almost none |

---

## NEXT STEPS (Awaiting Approval)

1. **Resolve Authority Questions** (AA-001 through AA-012)
2. **Confirm Candidate Rules** (CDR-001 through CDR-047)
3. **Address Dangerous Assumptions** (DA-001 through DA-009)
4. **Investigate Contradictions** (UC-001 through UC-004)
5. **Define Domain Boundaries** based on schema isolation

---

*END OF DEEP RESEARCH RESULTS*
