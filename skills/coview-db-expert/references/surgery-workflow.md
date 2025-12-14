# Surgery Workflow Reference

> Source: DDL, PGKeys, qa_naharia data
> Generated: 2025-12-14

---

## SURGERY DATA MODEL

### Three Tables

| Table | Schema | Purpose | PK |
|-------|--------|---------|-----|
| `patients.surgery_waiting` | patients | Patients waiting for surgery | id (auto) |
| `patients.patients_in_surgery` | patients | Patients currently in surgery | case_id |
| `patients.surgery` | patients | Completed surgeries | case_id |

### Workflow (Evidence-Based)

```
[surgery_waiting] → [patients_in_surgery] → [surgery]
      ↑                    ↑                   ↑
   Ordered             In Surgery         Completed
```

---

## TABLE: surgery_waiting

### Structure (from surgeryWaitingKeys.ts)

| Field | Type | PK | Required | Purpose |
|-------|------|-----|----------|---------|
| id | INTEGER | Yes | Yes | Auto-increment |
| case_id | INTEGER | No | Yes | FK to cases |
| order_ward_id | VARCHAR(250) | No | No | Ordering ward |
| priority_code | VARCHAR(30) | No | No | Priority code |
| priority_desc | VARCHAR(150) | No | No | Priority description |
| order_date | DATE | No | No | When ordered |
| surgery_order | VARCHAR(30) | No | No | Queue position |
| update_date | DATE | No | No | Last update |
| procedure_code | VARCHAR(150) | No | No | Procedure code |
| procedure_desc | VARCHAR(150) | No | No | Procedure description |
| room_id | VARCHAR(150) | No | No | Target OR |
| surgery_waiting_aran | BOOLEAN | No | No | ARAN-related |

### Priority Codes (Evidence from qa_naharia)

| priority_code | priority_desc | Count | Meaning |
|---------------|---------------|-------|---------|
| EMG | חירום | 2 | Emergency |
| URG | דחוף | 12 | Urgent |
| ROU | אלקטיב | 1 | Elective/Routine |
| (empty) | ללא עדיפות | 15 | No priority |

### Sample Data (qa_naharia)

```
case_id   | priority | procedure_desc              | room_id   | ward
11837593  | (none)   | DEBRIDEMENT OF WOUND        | פז01-08   | שיקום
11832114  | URG      | EXPLORATION OF DEBRIDMENT   | (none)    | פנג
11843925  | URG      | EXPLORATORY LAPAROTOMY      | פז01-05   | פגים
11856868  | URG      | LAP.INCIDENT APPENDECTOMY   | ת מעבר    | כירא
11855132  | ROU      | LYMPH NODE BIOPSY AXILLARY  | פז01-02   | פנה
```

### Observations
1. Multiple procedures can exist for same case (case 11832114 has 2)
2. room_id can be empty (procedure not yet assigned to OR)
3. Procedure descriptions are in English

---

## TABLE: patients_in_surgery

### Structure (from patientsInSurgeryKeys.ts)

| Field | Type | PK | Required | Purpose |
|-------|------|-----|----------|---------|
| case_id | INTEGER | Yes | Yes | FK to cases |
| ward_id | VARCHAR(250) | No | Yes | Surgery ward |
| procedure_code | VARCHAR(30) | No | No | Code |
| procedure_desc | VARCHAR(150) | No | No | Description |
| room_id | VARCHAR(255) | No | No | Operating room |
| entry_room_surgery | DATE | No | No | Time entered |
| update_date | DATE | No | No | Last update |

### Sample Data (qa_naharia)

```
case_id   | ward_id  | procedure_desc             | room_id   | entry_room_surgery
11857179  | חנ-נשים  | MASTECTOMY FOR GYNECOMASTIA | פז02-04   | 2025-11-18T07:04:39
```

### Observations
1. Only 1 patient currently in surgery in qa_naharia
2. entry_room_surgery tracks when patient entered OR
3. PK is case_id (one row per case in surgery)

---

## TABLE: surgery (Completed)

### Structure (from surgeryKeys.ts)

| Field | Type | Purpose |
|-------|------|---------|
| case_id | INTEGER | FK to cases |
| ward_id | VARCHAR | Surgery ward |
| procedure_code | VARCHAR | Procedure code |
| procedure_desc | VARCHAR | Procedure description |
| room_id | VARCHAR | Operating room |
| entry_room_surgery | DATE | Time entered |
| start_time | DATE | Surgery start |
| end_time | DATE | Surgery end |
| update_date | DATE | Last update |

---

## ASSOCIATIONS (Evidence from associations.ts)

```typescript
// Line 209-213
PatientsInSurgery.belongsTo(Case, {
  foreignKey: "caseId",
  targetKey: "caseId",
  as: "case"
});

// Line 215-219
SurgeryWaiting.belongsTo(Case, {
  foreignKey: "caseId",
  targetKey: "caseId",
  as: "case"
});

// Line 221-225
Rooms.hasMany(PatientsInSurgery, {
  foreignKey: "room_id",
  sourceKey: "roomId",
  as: "surgeryPatients"
});

// Line 227-231
PatientsInSurgery.belongsTo(Rooms, {
  foreignKey: "room_id",
  targetKey: "roomId",
  as: "room"
});

// Line 523-533
Surgery.belongsTo(Case, { foreignKey: "caseId" });
SurgeryWaiting.belongsTo(Case, { foreignKey: "caseId" });
PatientsInSurgery.belongsTo(Case, { foreignKey: "caseId" });
```

---

## HOW TO ANSWER: "What is required to assign a patient to surgery?"

### Evidence-Based Answer

**To create a surgery_waiting record**, the following is required (from DDL/Keys):

1. **Required Fields:**
   - `case_id` (INTEGER, NOT NULL) - must reference existing case

2. **Optional but Typical:**
   - `procedure_code` + `procedure_desc` - what procedure
   - `priority_code` + `priority_desc` - urgency level
   - `order_ward_id` - which ward ordered
   - `room_id` - target operating room

3. **Associations that must exist:**
   - Case record must exist in `patients.cases`
   - No FK constraint enforced at DB level

4. **ARAN Integration:**
   - `surgery_waiting_aran` flag marks ARAN-related surgeries

### What is UNKNOWN

1. Who/what moves records between tables (surgery_waiting → patients_in_surgery → surgery)
2. Validation rules for priority assignment
3. Capacity rules for operating rooms
4. Complete procedure code list
5. Integration with external systems (Chameleon, etc.)

---

## SCREEN: "ממתינים לניתוח" (Waiting for Surgery)

**screen_id**: `totalWaitingSurgery`
**feature_order**: `65,67,8,68,71,70,72,73,77,75,64`
**First sort**: column 72
**Second sort**: column 73

This screen displays patients from `surgery_waiting` joined with case data.

---

*END OF SURGERY WORKFLOW REFERENCE*
