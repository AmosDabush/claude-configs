# Context

> Conversation-derived context for the `coview-db-expert` skill.

---

## Origin

**Date**: 2025-12-14

This documentation effort began when:
1. A `/init` command was executed to analyze the `db-connector-cloud` codebase
2. A request was made to create a documentation sub-agent for a future skill
3. The skill was named `coview-db-expert` (working name)

---

## The Codebase Context

### Package Identity

| Field | Value |
|-------|-------|
| Name | `@db-connector-cloud/db-connector-cloud` |
| Location | `/Users/amosdabush/git/cloud2/packages/db-connector-cloud` |
| Purpose | Shared database connector library for coview-cloud ecosystem |
| Version | 1.0.46 |

### What It Provides

**Fact** (from package analysis):
- PostgreSQL/Sequelize models (~100+ models)
- MongoDB schemas (Patients, Drives with 30-day TTL)
- Redis client management (pub/sub/cache/stream/data)
- Domain bundles for API-specific model subsets

---

## Existing Tooling

**Fact** (from user's CLAUDE.md):

The user already has database commands:
- `/db` - Switch database, run queries interactively
- `/db-agent` - Natural language database queries and operations

Available databases:
- `dev` - Development (coview)
- `lior_test` - Lior's test DB
- `lior_test2` - Lior's test DB 2
- `qa_naharia` - QA/Naharia (coview)

---

## Why Create a New Skill?

**Status**: Not yet explicitly stated

**Hypothesis**: The new skill may provide deeper database expertise specific to the coview schema, beyond generic query capabilities.

---

## Source Hierarchy (Priority Order)

| Priority | Location | Contains | Status |
|----------|----------|----------|--------|
| 1 | `packages/db-connector-cloud` | DB models, ORM associations | PRIMARY |
| 2 | `coview-backend-services` | Query builders, aggregations | PRIMARY |
| 3 | `apis/patients-cards-aggregator` | Explicit SQL (HIGH-VALUE) | PRIMARY |
| 4 | `/Users/amosdabush/db_context_env/output/db_context_ai.yml` | Structural map | AUXILIARY (may be outdated) |

---

## Database Tools

| Tool | Purpose | Database | Mode |
|------|---------|----------|------|
| `/db` | Schema exploration | qa_naharia (default) | OBSERVATIONAL |
| `/db-agent` | Natural language queries | qa_naharia (default) | OBSERVATIONAL |

---

## Conversation Log

### Entry 1 - 2025-12-14

**User Action**: `/init` command
**Result**: CLAUDE.md file analyzed and updated with current architecture

**Key Discoveries**:
- Domain bundles pattern exists (22 domains)
- `initAllModels()` function for explicit initialization
- Case is the central entity in the data model

### Entry 2 - 2025-12-14

**User Action**: Request documentation sub-agent in `src/README/`
**Result**: 6 documentation files created

### Entry 3 - 2025-12-14

**User Action**: Request dedicated sub-agent in `skills/coview-db-expert/`
**Result**: Documentation moved to dedicated skill folder (this file)

### Entry 4 - 2025-12-14

**User Action**: Activate STRICT DOMAIN SKILL DISCOVERY MODE
**Result**:
- Operating constraints established
- Source hierarchy defined
- Knowledge classification rules set (structural vs domain)
- Database tool usage rules defined
- Approval workflow for domain knowledge established

**Key Constraint**: This is a LARGE, COMPLEX MEDICAL SYSTEM with sensitive business, medical, and operational rules. Domain knowledge requires explicit approval.

---

## Last Updated

2025-12-14 - Entry 4
