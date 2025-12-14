# Open Questions

> Unresolved items requiring clarification.

---

## Critical Questions (Blocking Skill Definition)

### Q1: What is the primary purpose of `coview-db-expert`?

**Status**: ❓ Unanswered

Possible interpretations:
- A. Query helper for database operations
- B. Schema documentation/exploration tool
- C. Data generation/seeding assistant
- D. Model relationship navigator
- E. Domain knowledge expert
- F. All of the above
- G. Something else

### Q2: What database scope should it cover?

**Status**: ❓ Unanswered

Options:
- PostgreSQL only
- PostgreSQL + MongoDB
- All three (PostgreSQL + MongoDB + Redis)

### Q3: Read-only or read-write capabilities?

**Status**: ❓ Unanswered

Options:
- Read/query only
- Read + write/modify
- Read + write + generate migrations

### Q4: Relationship to existing commands?

**Status**: ❓ Unanswered

Existing commands in user's environment:
- `/db` - Switch database, run queries interactively
- `/db-agent` - Natural language database queries

Question: Should `coview-db-expert`:
- Replace these?
- Extend these?
- Complement these?
- Be something entirely different?

---

## Domain Questions

### DQ1: Case-Patient Relationship

**Question**: Can one patient have multiple cases?

**Hypothesis**: Yes - a case represents an admission episode.

**Status**: ⏳ Unconfirmed

### DQ2: Copy Table Purpose

**Question**: What triggers Copy tables to be populated?

**Hypothesis**: ETL processes, audit trails, or backup mechanisms.

**Status**: ⏳ Unconfirmed

### DQ3: Isolation-Infection Relationship

**Question**: How do isolations relate to infections?

**Hypothesis**: Infections may trigger isolation requirements.

**Status**: ⏳ Unconfirmed

---

## Technical Questions

### TQ1: PostgreSQL Schemas

**Question**: What schemas exist besides `patients`?

**Status**: 🔍 Needs investigation

### TQ2: Foreign Key Cascade Rules

**Question**: What are the ON DELETE/ON UPDATE rules?

**Status**: 🔍 Needs investigation

### TQ3: Copy Table Sync

**Question**: How are Copy tables synchronized with main tables?

**Status**: 🔍 Needs investigation

### TQ4: Indexes

**Question**: What indexes exist on the tables?

**Status**: 🔍 Needs investigation

---

## Resolution Log

| Question | Resolution | Date | Source |
|----------|------------|------|--------|
| *None resolved yet* | | | |

---

## Status Legend

- ❓ Unanswered - requires user input
- ⏳ Unconfirmed - hypothesis exists, needs validation
- 🔍 Needs investigation - can be researched
- ✅ Resolved - answer documented in Resolution Log

---

## Last Updated

2025-12-14
