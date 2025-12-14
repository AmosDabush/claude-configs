# Critical Operational Questions Assessment

> Mode: STRICT DOMAIN SKILL DISCOVERY
> Generated: 2025-12-14
> Purpose: Assess which critical questions can be answered with documented evidence

---

## ASSESSMENT CRITERIA

For each question:
- **CAN ANSWER**: Evidence exists in documented operational behaviors
- **PARTIAL**: Some aspects answerable, others UNKNOWN
- **UNKNOWN**: No evidence found, requires further investigation

---

## 1. CONFLICTING TRUTH SOURCES (Ventilation)

**Question**: Two screens show conflicting ventilation status. Which source is authoritative?

### Assessment: CAN ANSWER (Updated 2025-12-14 - Root Cause Found)

**What We Know (Section 27 - Ventilation Dual-Source Conflict)**:

| Consumer | Source Table | Filter Criteria |
|----------|--------------|-----------------|
| cards_agg (Aggregator) | `patients.condition` | `patient_condition_code IN RespirationCodesCham` |
| Hospitalization Dashboard | `nursing_status` + `nursing_status_class` | `nursStatusType = 1` |

**Evidence (hospitalization.service.ts)**:
```typescript
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

**Evidence (deltaQueries.ts - Aggregator)**:
```sql
FROM patients.condition
WHERE patient_condition_code IN (SELECT code FROM RespirationCodesCham param)
```

**Can Answer**:
- **TWO COMPLETELY DIFFERENT SOURCES are used**
- Dashboard services query `nursing_status` with `nursStatusType = 1`
- Aggregator queries `patients.condition` with `RespirationCodesCham` codes
- This explains WHY screens show conflicting data - they query different tables!
- NO reconciliation mechanism exists between these sources

**Root Cause of Conflict**:
- Patient could have a condition code but no nursing_status record
- Or vice versa
- Each consumer queries independently without cross-referencing

**Which is Authoritative**:
- UNKNOWN which is clinically authoritative
- This appears to be a data architecture issue, not intentional design

---

## 2. BED BLOCKING PARADOX

**Question**: Blocked bed allows patient assignment, then shows blocked again after refresh.

### Assessment: PARTIAL

**What We Know (Domain Glossary - Blocked Bed)**:

```typescript
// blocked_beds table structure
blockedBedsKeys = {
  bedId: { type: STRING(255), primaryKey: true },
  commentBlockBed: { type: STRING(255) },
  updateTime: { type: DATE },
  systemNum: { type: STRING(50) }
}
```

**Evidence**:
- `blocked_beds` is a SEPARATE table from `beds`
- No FK constraint between `cases.bed_id` and `blocked_beds.bed_id`
- Only 3 blocked beds in qa_naharia

**Can Answer**:
- Blocking is tracking only, NOT a database constraint
- Assignment is NOT prevented at DB level

**UNKNOWN**:
- Whether UI enforces blocking before assignment
- Whether blocking check happens at assignment time
- Why refresh shows blocked again (likely UI reads blocked_beds separately)

---

## 3. UNEXPECTED WARD VISIBILITY

**Question**: Patient appears in ward screen without matching ward/room/bed assignment.

### Assessment: CAN ANSWER

**What We Know (Section 1 - Similar Name, Domain Glossary - Satellite Patient)**:

**Paths a patient can appear in a ward**:
1. `cases.nursing_ward` = ward display name
2. `cases.chameleon_ward_id` = medical responsibility ward
3. `cases.chameleon_satellite_ward_id` = physical location ward

**Evidence (Section 1)**:
```sql
-- Similar name detection considers ALL these paths:
(c1.chameleon_ward_id = c2.chameleon_ward_id ...)
OR (c1.chameleon_satellite_ward_id = c2.chameleon_ward_id ...)
OR (c1.chameleon_ward_id = c2.chameleon_satellite_ward_id ...)
OR (c1.chameleon_satellite_ward_id = c2.chameleon_satellite_ward_id ...)
```

**Can Answer**:
- Patient can appear via satellite ward assignment (physical location different from administrative)
- THREE ward ID fields can cause patient to appear in different wards
- `chameleon_satellite_ward_id` specifically handles "patient physically here but belongs elsewhere"

**UNKNOWN**:
- Complete list of screen-to-ward-field mappings
- Whether some screens show all 3 ward types

---

## 4. DISCHARGE THAT DOES NOT COMPLETE

**Question**: Medically and administratively discharged patient still appears in active dashboards.

### Assessment: CAN ANSWER (Updated 2025-12-14)

**What We Know (Section 2 - Discharge Workflow + Section 25 - Case Activity)**:

```sql
CASE
  WHEN BOOL_OR(d.document_discharge_code = 2) THEN 'nursing'
  WHEN BOOL_OR(d.document_discharge_code = 1) THEN 'medical'
  ELSE 'none'
END AS discharge_stage
```

**Case Activity Filter (hospitalization.service.ts)**:
```typescript
const filteredCases = allCases.filter(
  (c) =>
    c.isActive &&                    // MUST be true
    Boolean(c.admissionDate) &&      // MUST exist
    c.nursingWard &&                 // MUST exist
    hospitalizationWardIds.includes(c.nursingWard.trim()),
);
```

**Can Answer**:
- `isActive` field on `cases` table controls dashboard visibility
- `isActive` comes from Chameleon (external system), NOT computed locally
- Discharge stage alone does NOT remove patient from dashboards
- Patient disappears ONLY when Chameleon sets `isActive = false`
- Four conditions must ALL be true for dashboard visibility:
  1. `isActive = true`
  2. `admissionDate` exists
  3. `nursingWard` exists
  4. `nursingWard` is in hospitalization ward list

**Why Discharged Patient May Still Appear**:
- Chameleon hasn't yet set `isActive = false`
- There's a delay between discharge documents and isActive update
- isActive is controlled externally, not by coview

**UNKNOWN**:
- Exact trigger/timing for Chameleon to set isActive = false
- Whether discharge_stage = 'nursing' should trigger isActive change

---

## 5. SIMILAR NAME SAFETY FLAGS

**Question**: Why is has_similar_name true for patients with different IDs, ages, admission dates?

### Assessment: CAN ANSWER

**What We Know (Section 1 - Similar Name Detection)**:

**Design is INTENTIONAL for patient safety**:
```sql
-- Name matching is BROAD for safety (4 comparisons):
LOWER(TRIM(p1.first_name)) = LOWER(TRIM(p2.first_name)) OR
LOWER(TRIM(p1.last_name)) = LOWER(TRIM(p2.last_name)) OR
LOWER(TRIM(p1.first_name)) = LOWER(TRIM(p2.last_name)) OR  -- Cross-check!
LOWER(TRIM(p1.last_name)) = LOWER(TRIM(p2.first_name))     -- Cross-check!
```

**Can Answer**:
- This is **INTENTIONAL over-detection for safety**
- Cross-checking first_name ↔ last_name catches cultural naming variations
- Only requires SAME WARD (any of 4 ward conditions) + ANY name match
- ID numbers are explicitly EXCLUDED from match (`id_number <> id_number`)
- Age and admission date are NOT part of the algorithm

**Why This Design**:
- Healthcare safety: Better to flag false positives than miss a real name collision
- Prevents medication/treatment errors between similarly-named patients
- Hebrew names can have reversed first/last name conventions

---

## 6. VANISHING NURSING STATUS

**Question**: Nursing status existed yesterday but is gone today.

### Assessment: CAN ANSWER

**What We Know (Section 12 - Copy Table Sync, Section 23 - Nursing Status Validation)**:

**Copy Table Sync Pattern**:
```typescript
// TRUNCATE → BULK INSERT → SWAP
await truncateTable(sequelize, 'patients', 'nursing_status_copy');
await bulkInsert('patients.nursing_status_copy', NursingStatusCopy, insertData);
await swapTables(sequelize, 'patients', 'nursing_status');
```

**Can Answer**:
- Nursing status is **FULL REPLACEMENT** from Chameleon each sync
- If Chameleon stops sending a status, it **DISAPPEARS** after next sync
- This is NOT deletion - it's simply not included in the next batch
- Historical truth resides in **Chameleon** (external system), NOT coview

**UNKNOWN**:
- Sync frequency from Chameleon
- Whether coview has any historical logging for nursing_status changes

---

## 7. CONFIGURATION CHANGE IMPACT

**Question**: Parameter change causes dozens of patients to change status. Is this retroactive?

### Assessment: PARTIAL

**What We Know (Section 17 - ER Parameters System)**:

```typescript
// Parameters loaded at startup
const paramNames = new Set([
  'RespirationCodesCham',  // Defines which condition codes = ventilation
  'GeneralERCrowd',        // Crowd thresholds
  // ...
]);
```

**Can Answer**:
- Parameters are loaded from `common.parameters` at **service startup**
- Some parameters define **which codes** trigger statuses (e.g., `RespirationCodesCham`)
- Changing `RespirationCodesCham` would change which patients show as ventilated

**UNKNOWN**:
- Whether parameters are hot-reloaded or require service restart
- Whether FULL aggregation uses live parameters or cached
- Which parameters cause immediate vs delayed impact

---

## 8. CONCURRENT ISOLATION UPDATES

**Question**: Which record wins when isolation is closed and reopened simultaneously?

### Assessment: CAN ANSWER

**What We Know (Section 5 - Infections/Isolations Deduplication)**:

```sql
-- Isolations use GREATEST of 4 dates to determine latest
ROW_NUMBER() OVER (
  PARTITION BY iso.case_id, iso.isolation_id, iso.isolation_type_id, iso.isolation_reason_id
  ORDER BY GREATEST(
    COALESCE(iso.isolation_end_date, '-infinity'::timestamp),
    COALESCE(iso.coview_end_date, '-infinity'::timestamp),
    COALESCE(iso.isolation_start_date, '-infinity'::timestamp),
    COALESCE(iso.coview_start_date, '-infinity'::timestamp)
  ) DESC
) AS rn
```

**Can Answer**:
- Deduplication key: `(case_id, isolation_id, isolation_type_id, isolation_reason_id)`
- **GREATEST of 4 timestamps** determines winner
- Priority order: end_date > coview_end_date > start_date > coview_start_date
- Record with latest timestamp in ANY of these 4 fields wins

**Why This Design**:
- Handles external system (Chameleon) and internal (coview) date discrepancies
- End dates prioritized because closing isolation is more critical than opening

---

## 9. ROLE-BASED DATA DISCREPANCY

**Question**: Doctor, nurse, admin see different data for same patient.

### Assessment: CAN ANSWER (Updated 2025-12-14)

**What We Know (Section 26 - Ward-Level Permissions)**:

**Two-Level Permission System**:
1. **Route-level**: AD groups control API endpoint access
2. **Ward-level**: `permissions_chameleon` controls data visibility

**Evidence (wards.services.ts)**:
```typescript
async getNursingWards(userAdt: string, isAdmin: any, req: ExpressRequest) {
  // Admin bypass - sees ALL wards
  if (isAdmin) return wardRes;

  // Non-admin filtered by permissions_chameleon
  const sAMAccountName = userAdt.split('@', 2)[0];
  const permissions = await PermissionsChameleon.findAll({
    where: { userName: sAMAccountName },
  });

  if (permissions?.length) {
    const allowedWardIds = new Set(permissions.map((p) => p.wardId));
    return wardRes.filter((nw) => allowedWardIds.has(nw.id));
  }
  return [];  // No permissions = no wards
}
```

**Can Answer**:
- Users see different WARDS based on `common.permissions_chameleon` table
- Table maps `userName` → `wardId`
- Admin users bypass ward filter (see all wards)
- Non-admin users see only wards where they have a record
- No record = empty ward list (no access)
- Patient data visibility is controlled by WARD access, not role-specific filtering

**Why Different Users See Different Data**:
- Doctor assigned to Ward A only sees patients in Ward A
- Nurse assigned to Wards A and B sees patients in both
- Admin sees all wards regardless of permissions_chameleon records

**UNKNOWN**:
- How permissions_chameleon records are created/managed
- Whether there are additional patient-level permissions beyond ward

---

## 10. PARTIAL SYSTEM FAILURE

**Question**: If aggregation pipeline fails for an hour, which data becomes stale?

### Assessment: PARTIAL

**What We Know (Section 7 - Aggregation Behavior)**:

| Data Type | Update Source | If Aggregator Fails |
|-----------|--------------|---------------------|
| cards_agg fields | FULL/DELTA aggregation | STALE |
| Domain copy tables | External APIs (Chameleon) | STILL UPDATING |
| Main tables | Swapped from copy tables | STILL UPDATING |

**Can Answer**:
- `cards_agg` becomes stale if aggregator fails
- Domain data (infections, isolations, etc.) continues updating via API services
- Main tables continue swapping from copy tables independently

**UNKNOWN**:
- Which screens read from cards_agg vs main tables
- Recovery mechanism after aggregator restart
- Whether FULL aggregation runs after failure to catch up

---

## 11. VENTILATION STATE CONFLICTS

**Question**: Same as #1 - ventilation appears in some screens but not others.

### Assessment: See Question 1

---

## 12. SATELLITE PATIENT LOGIC

**Question**: How does satellite patient differ operationally?

### Assessment: CAN ANSWER

**What We Know (Domain Glossary, Section 1)**:

| Field | Purpose | Impact |
|-------|---------|--------|
| `chameleon_ward_id` | Medical responsibility | Determines care team |
| `chameleon_satellite_ward_id` | Physical location | Determines WHERE patient is |
| `nursing_ward` | Display name | UI presentation |

**Operational Differences**:
1. **Similar Name Check**: Compares against BOTH wards (4 conditions)
2. **Ward Screens**: Patient may appear in satellite ward screen
3. **Staff Assignment**: Medical staff from `chameleon_ward_id`, physical care from satellite

**Can Answer**:
- Satellite patient has 2 ward assignments that differ
- Similar name detection correctly handles both locations
- Patient physically in one ward, administratively in another

**UNKNOWN**:
- Billing/reporting implications
- How staff handoff works between wards

---

## 13. NURSE RESPONSIBILITY AMBIGUITY

**Question**: Multiple nurses associated with case. Does ordering imply priority?

### Assessment: PARTIAL

**What We Know**:
- `patients.nurses` table has composite key `(case_id, nurse_id)`
- Associations show `Case.hasMany(Nurses)`

**UNKNOWN**:
- Whether `update_date` ordering implies responsibility
- If "nurse in charge" role exists in data model
- How multiple nurses are displayed/prioritized

---

## 14. INFECTION AND ISOLATION INTERACTION

**Question**: Can multiple infections/isolations be active simultaneously?

### Assessment: PARTIAL

**What We Know (Sections 5, Domain Glossary)**:

**Infections**:
- Deduplication: `DISTINCT ON (case_id, infection_name, infection_desc, infection_status, infection_start_date, update_date)`
- Multiple different infections CAN coexist (different infection_name)

**Isolations**:
- Deduplication: `PARTITION BY case_id, isolation_id, isolation_type_id, isolation_reason_id`
- Multiple different isolation types CAN coexist (different isolation_type_id)

**Can Answer**:
- YES, multiple infections with different names can be active
- YES, multiple isolations with different types can be active
- LATEST record per unique combination wins

**UNKNOWN**:
- Whether isolations affect bed/room eligibility (negative pressure requirement?)
- How UI displays multiple active infections/isolations

---

## 15. AGGREGATION AUTHORITY

**Question**: Are FULL and DELTA expected to produce identical results? Is cards_agg authoritative?

### Assessment: CAN ANSWER

**What We Know (Section 7 - Aggregation Behavior)**:

```sql
-- FULL: Computes from scratch via LEFT JOINs
-- DELTA: Reset + Update pattern with change detection

-- DELTA change detection:
WHERE ca.field IS DISTINCT FROM t.aggregated_data
```

**Can Answer**:
- FULL and DELTA SHOULD produce identical results (same SQL logic)
- DELTA is optimization, not different computation
- `cards_agg` is a **CACHE**, not authoritative source
- Main tables (`patients.cases`, `patients.infections`, etc.) are authoritative

**When They Could Differ**:
- DELTA reset logic has bugs
- Source data changed between DELTA runs
- FULL hasn't run recently

---

## SUMMARY MATRIX (Updated 2025-12-14)

| # | Question | Status | Key Evidence |
|---|----------|--------|--------------|
| 1 | Conflicting Truth (Ventilation) | **CAN ANSWER** | Section 27 - TWO different sources: nursing_status vs condition |
| 2 | Bed Blocking Paradox | PARTIAL | No DB constraint, display-only |
| 3 | Unexpected Ward Visibility | CAN ANSWER | 3 ward IDs, satellite patient |
| 4 | Discharge Not Complete | **CAN ANSWER** | Section 25 - isActive from Chameleon controls visibility |
| 5 | Similar Name Flags | CAN ANSWER | Section 1 - intentional safety design |
| 6 | Vanishing Nursing Status | CAN ANSWER | Section 12 - copy table full replacement |
| 7 | Configuration Change | PARTIAL | Section 17 - parameters loaded at startup |
| 8 | Concurrent Isolation | CAN ANSWER | Section 5 - GREATEST of 4 dates |
| 9 | Role-Based Discrepancy | **CAN ANSWER** | Section 26 - permissions_chameleon + admin bypass |
| 10 | Partial System Failure | PARTIAL | Section 7 - aggregation vs direct APIs |
| 11 | Ventilation Conflicts | **CAN ANSWER** | Same as #1 - dual source explains conflict |
| 12 | Satellite Patient | CAN ANSWER | Domain Glossary, Section 1 |
| 13 | Nurse Responsibility | PARTIAL | Table exists, priority logic unknown |
| 14 | Infection/Isolation Interaction | PARTIAL | Section 5 - multiple can coexist |
| 15 | Aggregation Authority | CAN ANSWER | Section 7 - cards_agg is cache |

---

## GAPS REQUIRING FURTHER INVESTIGATION

### High Priority (Operational Impact)

1. **What field marks a case as "inactive"?** (affects #4)
   - Need to find: `is_active` usage, discharge completion triggers

2. **Permissions filtering mechanism** (affects #9)
   - Need to find: How permissions are applied to queries

3. **Ventilation source reconciliation** (affects #1, #11)
   - Need to find: Whether both sources are queried, reconciliation logic

### Medium Priority

4. **Bed blocking enforcement**
   - Need to find: UI/API validation before bed assignment

5. **Nurse responsibility model**
   - Need to find: Whether "primary nurse" concept exists

6. **Parameter hot-reload behavior**
   - Need to find: Whether parameters require service restart

### Low Priority (Edge Cases)

7. **Historical nursing status logging**
8. **Isolation room eligibility rules**
9. **Multiple infection display logic**

---

*END OF CRITICAL QUESTIONS ASSESSMENT*
