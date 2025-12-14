# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Skills (Domain Knowledge)

### coview-db-expert
**Location:** `~/.claude/skills/coview-db-expert/SKILL.md`

Database expert for coview-cloud hospital management system. Knows 138 tables, 29 backend services, 2830 Q&A about operational behavior, copy table patterns, and domain terminology.

**IMPORTANT: Skill Invocation Rule**
When user asks about CoView database topics, you MUST:
1. Invoke `Skill(coview-db-expert)` FIRST
2. Use the Quick Reference in SKILL.md to answer
3. Only read reference files if Quick Reference doesn't cover it

**DO NOT** search skill files directly with Grep/Read without invoking the skill first.

**Activate when user asks about:**
- CoView database tables, schemas, columns, parameters
- Backend services (what they do, what tables they update, validation)
- Operational behavior (similar names, discharge, ventilation, aggregation)
- Domain terms (satellite patient, ARAN, copy tables, Chameleon, NO_CASE)
- Model associations, data flow, Redis topics

**Self-Learning:** After searching reference files for an answer, Claude should add key insights back to SKILL.md Quick Reference or Learned Knowledge section. This makes the skill smarter over time.

**Discovery Mode:** If answer not found in skill files, Claude will ASK if you want to explore the database/codebase. If confirmed, Claude discovers the answer and adds it to the skill.

---

## Quick Commands

| Command | Description |
|---------|-------------|
| `/db` | Switch database, run queries interactively |
| `/db-agent` | Natural language database queries and operations |
| `/claude-git-sync` | Sync ~/.claude configs to git repo |

## Available Databases

| Name | Description | DB Name |
|------|-------------|---------|
| dev | Development | coview |
| lior_test | Lior's test DB | lior_test |
| lior_test2 | Lior's test DB 2 | lior_test2 |
| qa_naharia | QA/Naharia | coview |

## Database Query Examples

```bash
# Query with specific database
node ~/.claude/cmd_db/db-query.js --db dev "SELECT * FROM patients.patients LIMIT 5"

# Schema exploration
node ~/.claude/cmd_db/db-query.js --db dev --tables
node ~/.claude/cmd_db/db-query.js --db dev --schemas
node ~/.claude/cmd_db/db-query.js --db dev --describe patients.cases

# Query history
node ~/.claude/cmd_db/db-query.js --history
node ~/.claude/cmd_db/db-query.js --run 1
node ~/.claude/cmd_db/db-query.js --clear-history
```

## Database Access

For database queries and configuration, see `~/.claude/db-config.md` which contains:
- Database credentials (dev, qa, lior_test2)
- Script paths for db-connector-cloud
- Env file locations

Use the `/db` command to switch databases and see query instructions.

---

# Database Schema Documentation for AI Context

## Goal
Create a complete reference document that enables an AI to understand the database structure and generate valid data operations.

Example target capability: "Add 3 patients to department 2 with infections requiring isolation, ages 20-40" → AI knows exactly what to create and in what order.

## Required Documentation

### 1. All Tables - Quick Reference
For each table provide:
- Table name and purpose (one sentence)
- Primary key
- Required fields (NOT NULL)
- Foreign keys and what they reference
- Valid values for enums/constrained fields
- Unique constraints

Format:
```
**patients**
Purpose: Hospital patients
PK: id (serial)
Required: first_name, last_name, department_id, admission_date
FKs: department_id→departments.id, room_id→rooms.id
Enums: status (admitted|discharged|transferred), admission_type (emergency|elective)
Unique: medical_record_number
```

### 2. Dependency Chains
For each table, list what MUST exist before creating a record:
```
To create PATIENT:
1. Department must exist (for department_id)
2. Room must exist in that department (for room_id, optional)
3. Bed must exist in that room (for bed_id, optional)
Rule: room.department_id MUST equal patient.department_id
```

### 3. Relationships Map
List all foreign keys with their cascade rules and business meaning:
```
patients.department_id → departments.id (ON DELETE RESTRICT)
Meaning: Patient must belong to a department, can't delete department with patients

beds.room_id → rooms.id (ON DELETE CASCADE)
Meaning: Beds belong to rooms, deleting room deletes its beds
```

### 4. Field Value Specs
For fields AI needs to populate, provide examples and constraints:
```
patients.age: integer, 0-120, required
patients.infection_flag: boolean, default false
patients.admission_type: enum ('emergency', 'elective', 'transfer')
rooms.isolation_capable: boolean, required for infection cases
```

### 5. Common Operation Templates
Provide 2-3 complete examples of multi-step operations:
```
OPERATION: Add patient with infection to department

1. Validate department exists:
   SELECT id FROM departments WHERE id = ?

2. Find isolation room:
   SELECT id FROM rooms
   WHERE department_id = ? AND isolation_capable = true AND status = 'available'

3. Insert patient:
   INSERT INTO patients (name, age, department_id, infection_flag, room_id)
   VALUES (?, ?, ?, true, ?)

4. Update room status:
   UPDATE rooms SET occupied_beds = occupied_beds + 1 WHERE id = ?
```

### 6. Business Rules
List critical constraints and logic:
```
- Patients with infections MUST be in isolation_capable rooms
- room.department_id must match patient.department_id
- bed.room_id must match patient.room_id
- Can't delete department with active patients (RESTRICT)
- Room capacity: occupied_beds cannot exceed total_beds
```

### 7. Reference Data
List lookup tables and their valid values:
```
departments: [(1, 'Emergency'), (2, 'ICU'), (3, 'Cardiology'), ...]
bed_types: [(1, 'Standard'), (2, 'ICU'), (3, 'Isolation'), ...]
```

### 8. Visual Schema (Mermaid)
Create ER diagram showing all relationships

## Analysis Method

Run these queries to extract the information:
```sql
-- Tables and columns
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Foreign keys with cascade rules
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name)
JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
JOIN information_schema.referential_constraints rc USING (constraint_name)
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Unique and check constraints
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE constraint_type IN ('UNIQUE', 'CHECK');
```

## Output Structure

Simple, scannable markdown:
```markdown
# Database Schema Reference

## Tables
[Quick reference for each table]

## Relationships
[All FKs with business meaning]

## Dependencies
[What must exist before creating each entity]

## Field Specifications
[Value constraints and examples]

## Common Operations
[Step-by-step templates]

## Business Rules
[Critical constraints]

## Reference Data
[Lookup table values]

## Schema Diagram
[Mermaid ER diagram]
```

## Success Criteria
AI can parse "add 3 patients to dept 2 with infections, ages 20-40" and:
- Know to check department 2 exists
- Find isolation rooms in that department
- Generate realistic patient data (names, exact ages 20-40)
- Set infection_flag=true, requires_isolation=true
- Assign appropriate rooms and beds
- Execute in correct dependency order
- Handle "not enough rooms" scenario

Keep it concise but complete. Focus on what AI needs to generate valid operations.
