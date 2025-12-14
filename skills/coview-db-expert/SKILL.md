---
name: "coview-db-expert"
description: "Database expert for coview-cloud hospital management system. Knows 138 tables, 29 backend services, 2830 Q&A about operational behavior, copy table patterns, and domain terminology."
---

# CoView Database Expert

## IMPORTANT: Skill Invocation & Learning Rules

**ALWAYS invoke this skill FIRST** when the user asks about CoView database topics. Do NOT search skill files directly without invoking the skill.

**Correct behavior:**
1. User asks CoView question → Invoke `Skill(coview-db-expert)`
2. Read this SKILL.md → Check Quick Reference first
3. If Quick Reference answers it → respond directly
4. If not → search reference files or query database
5. **MANDATORY: After answering, UPDATE this SKILL.md with learned knowledge** (see Self-Learning Protocol below)

**Incorrect behavior:**
- Searching `~/.claude/skills/coview-db-expert/` files directly
- Using Grep/Read on skill files without invoking skill first
- **Finding new information but NOT updating the skill**

---

## When to Use This Skill

Activate when user asks about:
- CoView database tables, schemas, columns, or relationships
- Backend services (what they do, what tables they update, validation)
- Operational behavior (similar names, discharge, ventilation, aggregation)
- Domain terms (satellite patient, ARAN, copy tables, Chameleon, NO_CASE)
- Model associations, foreign keys, data flow
- Parameters, configuration, feature flags

---

## Quick Reference (Level 1 - Answer 70% of questions here)

### Database Overview

| Schema | Tables | Key Tables |
|--------|--------|------------|
| patients | 56 | cases, patients, beds, rooms, infections, nursing_status, condition |
| common | 52 | wards, parameters, permissions_chameleon, source_system |
| labs | 6 | patients_lab_exam_details, result_docs |
| nursing | 8 | event, event_type, nurses, shifts |
| staff | 4 | active_employees, presence_employees |
| ambulance | 7 | Reference tables for ambulance codes |
| logistics | 1 | operational_continuity |
| public | 4 | System/migration tables |

**Total: 138 tables across 8 schemas**

### Key Tables Detail

| Table | Schema | Purpose | Primary Key |
|-------|--------|---------|-------------|
| cases | patients | Hospitalization episodes | case_id (VARCHAR) |
| patients | patients | Patient master data | patient_id (VARCHAR) |
| beds | patients | Physical beds | bed_id |
| rooms | patients | Physical rooms | room_id |
| wards | common | Hospital wards/departments | ward_id |
| infections | patients | Patient infection records | (case_id, infection_name) |
| case_isolation | patients | Isolation orders | (case_id, isolation_id) |
| nursing_status | patients | Nursing status flags | (case_id, nurs_status_id) |
| condition | patients | Patient condition/ventilation | case_id |
| cards_agg | patients | Pre-aggregated patient cards | (bed_id, room_id) |
| parameters | common | System configuration | param_id |

### Copy Table Pattern (All 29 Services)

```
TRUNCATE {table}_copy
    ↓
BULK INSERT into {table}_copy
    ↓
SWAP TABLES (3-step atomic rename):
  1. {table} → {table}_old
  2. {table}_copy → {table}
  3. {table}_old → {table}_copy
  4. DROP {table}_old
```
This is **FULL REPLACEMENT** - no incremental updates. All services use this pattern.

### Domain Terms (Complete)

| Term | Hebrew | Meaning |
|------|--------|---------|
| Chameleon | כמיליון | External HIS (Hospital Information System) - source of truth |
| Satellite Patient | מטופל לווין | Patient physically in different ward than administrative assignment |
| ARAN | אר"ן | Mass Casualty Event (אירוע רב נפגעים) |
| NO_CASE | - | Synthetic case_id for empty beds (~90% of cards_agg rows) |
| NO_BED | - | Synthetic bed_id for rooms without physical beds: `'NO_BED_' + room_id` |
| Copy Table | - | `{table}_copy` variant for atomic updates |
| cards_agg | - | Pre-aggregated patient card data with JSONB columns |
| nursing_ward | - | Display name for ward |
| chameleon_ward_id | - | Medical responsibility ward |
| chameleon_satellite_ward_id | - | Physical location ward (if different) |

### Parameters Table (common.parameters)

| param_name | param_group | Usage |
|------------|-------------|-------|
| RespirationCodesCham | תפוסה מחלקתית | Codes identifying ventilated patients |
| (various) | (various) | Feature flags, thresholds, display settings |

**How parameters work:**
- Query: `SELECT param_value FROM common.parameters WHERE param_name = 'X' AND param_group = 'Y'`
- RespirationCodesCham parsed: "(1,2)" → strip parens/spaces → split by comma → [1, 2]
- Used by aggregator to match `patients.condition.patient_condition_code`

### Nursing Status Types

| Type | Hebrew | Purpose | Used By |
|------|--------|---------|---------|
| 1 | מונשם | Ventilated (invasive) | Dashboard |
| 2 | מונשם לא פולשני | Ventilated (non-invasive) | Aggregator `respirators` field |
| 3 | מועד לנפילה | Fall risk | Aggregator `fall_risk` field |
| 4 | מצב סיעודי | Nursing disability | (Unknown usage) |

### Doctor Decision Values (er_release)

| ID | Hebrew | English |
|----|--------|---------|
| 1 | שחרור | Release/Discharge |
| 2 | השגחה | Observation |
| 3 | אשפוז | Hospitalization |
| 5 | העברה | Transfer |

### Discharge Stages

| Stage | Code | Meaning |
|-------|------|---------|
| none | - | No discharge documents |
| medical | 1 | Medical discharge documented |
| nursing | 2 | Nursing discharge documented (final) |

**Priority:** Code 2 > Code 1 > none

### Lab Result Classifications

| abnormal Value | Classification | Meaning |
|----------------|----------------|---------|
| HH | Panic | Critical High |
| LL | Panic | Critical Low |
| H | Abnormal | Above normal |
| L | Abnormal | Below normal |
| X | Invalid | Invalid result |
| INVALID | Invalid | Explicit invalid |
| NULL | Normal | Normal or not assessed |

### Consultation Status

| Status | Hebrew | Active? |
|--------|--------|---------|
| הוזמן | Ordered | YES |
| בוצע | Completed | NO |

### Transport Status Codes

| Code | Hebrew | Meaning |
|------|--------|---------|
| 20 | הוזמן | Ordered |
| 21 | הגעה ליעד | Arrived at destination |
| 22 | שובץ משנע | Transporter assigned |

### Isolation Types

| Type ID | Hebrew | English |
|---------|--------|---------|
| 1 | מגע | Contact |
| 3 | טיפתי | Droplet |
| 108 | הגנתי | Protective |
| 119 | אוויר | Airborne |

### Validation Patterns

| Service | Type | Behavior |
|---------|------|----------|
| nursing-status | Soft | Insert anyway, log error |
| result-docs | Hard | Skip invalid records |
| cases | Size (20%) | Reject if >20% size difference |
| Most others | None | Insert all records |

### Services and Tables Quick Map

| Service | Schema.Table | Notes |
|---------|--------------|-------|
| infections | patients.infections | Date validation only |
| case-isolation | patients.case_isolation | 4 dates (isolation + coview) |
| new-case | patients.new_case | IsNewDesc computed from docs |
| locations | patients.beds, rooms, locations | 3 tables, room dedup |
| nursing-status | patients.nursing_status | Soft validation |
| consultations | patients.consultations | Field renames |
| transport | patients.transport | 4 date fields |
| discharge | patients.document_discharge | coviewUpdateDate added |
| doctor-decision | patients.er_release | Dedup by caseId |
| labs | labs.patients_lab_exam_details | processLabsRoot helper |
| result-docs | labs.result_docs | Hard validation |
| indications | patients.indications | 4 date fields |
| condition | patients.condition | coviewUpdateDate added |
| monitors | patients.monitored | connectTime tracking |
| surgery-waiting | patients.surgery_waiting | ARAN support |
| patient-in-surgery | patients.patients_in_surgery | entryRoomSurgery |
| cases | patients.patients + cases | 20% size validation |
| wards | common.wards | categoryExistOrCreate |
| active-employees | staff.active_employees | Absence tracking |
| presence-employees | staff.presence_employees | employeeId only |
| ambulance | MongoDB: amb_patients, amb_drives | NOT PostgreSQL |

### Common Operational Answers

| Question | Answer |
|----------|--------|
| Similar name detection | 4 ward conditions × 4 name comparisons (case-insensitive, LOWER(TRIM())) |
| Discharge stages | none → medical (code 1) → nursing (code 2) |
| Ventilation source | `patients.condition` + RespirationCodesCham from `common.parameters` |
| Fall risk | `nursing_status` where `nurs_status_type = 3` |
| Panic lab results | `abnormal IN ('HH', 'LL')` |
| Invalid lab results | `abnormal IN ('X', 'INVALID')` |
| Active case filter | isActive=true + admissionDate + nursingWard + ward in list |
| Parameters table | `common.parameters` (param_name, param_value, param_group) |
| Empty beds in cards_agg | ~90% have case_id = 'NO_CASE' |
| Three ward IDs | nursing_ward (display), chameleon_ward_id (medical), chameleon_satellite_ward_id (physical) |
| FULL vs DELTA aggregation | Cases/Locations/Wards trigger FULL; 21 other topics trigger DELTA |
| IS DISTINCT FROM | NULL-safe comparison used in delta queries |
| MongoDB usage | Only ambulance service (amb_patients, amb_drives) |

### Aggregation Triggers

| Trigger Type | Topics |
|--------------|--------|
| FULL | Cases_API, Locations_API, Wards_API |
| DELTA | Infection_API, Isolation_API, Nurses_API, NursingStatus_API, Consultation_API, Labs_API, DocumentDischarge_API, Monitored_API, Transport_API, ErRelease_API, SurgeryWaiting_API, PatientInSurgery_API, Indication_API, ResultDocs_API, Condition_API, newCase_API, BlockedBeds_API, NursingEvent_API, PresenceEmployees_API, ActiveEmployees_API, AmbulanceDrives_API |

---

## Reference Files Guide

### For Detailed Answers (Level 2)

| Question Type | File to Read |
|---------------|--------------|
| "How does X behavior work?" | `references/operational-behavior.md` |
| "What tables exist in schema X?" | `references/tables-reference.md` |
| "What is term X?" (detailed) | `references/domain-glossary.md` |
| "How are models associated?" | `references/associations-reference.md` |
| "What columns in table X?" | `references/schema-reference.md` |
| "How do screens work?" | `references/screen-configuration.md` |
| "Surgery workflow?" | `references/surgery-workflow.md` |

### For Service-Specific Questions (Level 3)

| Question Type | File to Search |
|---------------|----------------|
| "What validation does X service do?" | `questions/comprehensive.md` |
| "How does X service handle Y?" | `questions/comprehensive.md` |
| "Aggregator delta query for X?" | `questions/aggregator.md` |

### File Loading Priority

1. **Level 1** (this file): Quick reference - answers 70% of questions
2. **Level 2** (references/): Detailed documentation - answers 20% of questions
3. **Level 3** (questions/): Comprehensive Q&A - edge cases and specifics
4. **Level 4** (research/): Investigation notes - rarely needed
5. **Level 5** (DISCOVERY): Explore database/codebase with user permission - for undocumented topics
6. **Never load** (internal/): Process docs - only for debugging skill

---

## Instructions for Claude

### Simple Questions → Answer from Quick Reference above
- "What schema has lab tables?" → labs schema (6 tables)
- "What is the copy table pattern?" → TRUNCATE → INSERT → SWAP
- "What defines a panic result?" → abnormal IN ('HH', 'LL')
- "What is a satellite patient?" → Patient physically in different ward than admin assignment
- "What are the discharge stages?" → none → medical → nursing
- "What is NO_CASE?" → Synthetic case_id for empty beds
- "What validation does nursing-status use?" → Soft (insert anyway, log error)
- "Where are parameters stored?" → common.parameters table

### Detailed Questions → Read reference file
- "Explain similar name detection in detail" → Read `references/operational-behavior.md`
- "List all 56 tables in patients schema" → Read `references/tables-reference.md`
- "Show me Case model associations" → Read `references/associations-reference.md`

### Service-Specific Questions → Search questions file
- "What exact validation does result-docs do?" → Search `questions/comprehensive.md`
- "How does aggregator delta query work?" → Search `questions/aggregator.md`

---

## Self-Learning Protocol

**MANDATORY:** After answering a question by searching reference files OR querying the database, you MUST update this SKILL.md file so the skill learns. This is NOT optional.

### When to Update (ALWAYS if any of these apply)
- You searched a reference file to find an answer
- You queried the database to find an answer
- The answer was NOT already in Quick Reference above
- The information could help answer future questions

### How to Update
1. Identify the appropriate Quick Reference section (Domain Terms, Common Operational Answers, Services Quick Map, etc.)
2. Add a concise entry (1 line for tables, 2-3 lines for explanations)
3. Include source file in parentheses for traceability
4. If no section fits, add to "Learned Knowledge" section below
5. **ADD to Changelog section:** `| YYYY-MM-DD | What was learned | Source | Claude |`
6. **ANNOUNCE to the user:** After updating, tell the user:
   ```
   📚 Skill Updated: I've added "[brief description]" to the skill for future queries.
   ```

### Format Examples

**For Common Operational Answers table:**
```
| New question pattern | Concise answer (from `references/file.md`) |
```

**For Domain Terms table:**
```
| NewTerm | עברית | Definition (from `references/file.md`) |
```

**For Learned Knowledge section:**
```
| 2024-12-14 | Question asked | Answer found | `references/source.md` |
```

### Do NOT Update If:
- The answer is already in Quick Reference
- The question is too specific/edge-case (one-time query)
- You're unsure of the accuracy
- The answer requires reading multiple files to understand

---

## Discovery Mode (Level 5)

If the answer is NOT found in Quick Reference, reference files, or Q&A files, you MAY explore the actual codebase **with user permission**.

### Before Discovery - ASK USER FIRST

If answer not found in skill files, ask:
```
🔍 I couldn't find this in the skill documentation.
Would you like me to explore the database/codebase to find the answer?
This will query the actual system and add the findings to the skill.
```

**Only proceed with Discovery Mode if user confirms.**

### When to Use Discovery Mode (after user confirmation)
- Table/column questions → Query database: `node ~/.claude/cmd_db/db-query.js --db dev --describe [table]`
- Service behavior → Search `/apis/*/src/services/`
- API endpoints → Search `/apis/*/src/`
- Package utilities → Search `/packages/*/src/`
- Schema history → Search `sql-version-control/migrations/`

### Discovery Process
1. **ASK user for confirmation first** (mandatory)
2. Identify what type of information is needed
3. Use appropriate tool:
   - Database: `node ~/.claude/cmd_db/db-query.js --db dev --describe [table]` or `SELECT` queries
   - Code: `Grep` or `Glob` on relevant directories
4. Extract the key insight
5. Answer the user
6. **ADD to Learned Knowledge section**
7. **ANNOUNCE:** `📚 Skill Updated: Discovered [X] from [database/code]`

### Codebase Paths

| Area | Path |
|------|------|
| APIs | `/Users/amosdabush/git/cloud2/apis/` |
| Packages | `/Users/amosdabush/git/cloud2/packages/` |
| Migrations | `/Users/amosdabush/git/cloud2/coview-common/sql-version-control/migrations/` |
| db-connector | `/Users/amosdabush/git/cloud2/packages/db-connector-cloud/` |

### Do NOT Discover If:
- Answer is already in skill files (use those first!)
- Question is about external systems (Chameleon internals)
- Would require extensive code reading (suggest user explore manually)
- User declines the confirmation prompt

---

## Learned Knowledge (Auto-Updated)

This section grows as Claude discovers new information from reference files. Add entries here when the answer doesn't fit existing Quick Reference sections.

### Recently Learned Q&A

| Date | Question | Answer | Source |
|------|----------|--------|--------|
| 2024-12-14 | Event types in nursing schema | `nursing.event_type` hierarchical: קטגוריה → סוג אירוע → נושא. Two root categories: רוחבי (ward-level) and מטופל (patient-specific). Uses `level_above` for parent. | DB query |
| 2024-12-14 | permissions_chameleon & user_chameleon purpose | Ward-level access control synced from Chameleon. `permissions_chameleon`: user→ward mapping. `user_chameleon`: user profile (fullName, userDesc, sector). Used by access-control/common-service for ward filtering. | Code analysis |

### Learned Domain Terms

| Term | Meaning | Source |
|------|---------|--------|
| (entries added automatically) |

### Learned Service Behaviors

| Service | Behavior | Source |
|---------|----------|--------|
| (entries added automatically) |

---

## Changelog

Track what was learned and when. Claude adds entries here after learning.

| Date | What was learned | Source | Added by |
|------|------------------|--------|----------|
| 2024-12-14 | Event types hierarchy in nursing schema | DB query | Claude |
| 2024-12-14 | permissions_chameleon & user_chameleon purpose | Code analysis | Claude |
| 2024-12-14 | Initial skill structure created | Manual | User |

---

## Statistics

- **2830** total questions documented
- **29** backend services analyzed
- **138** tables across 8 schemas
- **80+** Sequelize associations mapped
- **27** operational behaviors documented
- **24** Redis pub/sub topics
