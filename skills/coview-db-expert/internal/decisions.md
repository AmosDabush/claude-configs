# Decisions

> Decisions made and their rationale as the skill design emerges.

---

## Decision Log

### D001 - Create Documentation Sub-Agent

| Field | Value |
|-------|-------|
| Date | 2025-12-14 |
| Decision | Create a documentation sub-agent to observe and extract from conversation |
| Rationale | Skill scope should emerge from documentation, not be predefined |
| Status | Implemented |

### D002 - Initial Documentation Location

| Field | Value |
|-------|-------|
| Date | 2025-12-14 |
| Decision | Store documentation in `src/README/` |
| Rationale | Initial request |
| Status | Superseded by D003 |

### D003 - Dedicated Skill Folder

| Field | Value |
|-------|-------|
| Date | 2025-12-14 |
| Decision | Move documentation to `skills/coview-db-expert/` |
| Rationale | Dedicated folder for skill's authoritative memory |
| Status | Implemented |

### D004 - Documentation File Structure

| Field | Value |
|-------|-------|
| Date | 2025-12-14 |
| Decision | Use semantic file names (context.md, goals.md, etc.) |
| Rationale | Clearer navigation than numbered files |
| Status | Implemented |

### D005 - Activate STRICT DOMAIN SKILL DISCOVERY MODE

| Field | Value |
|-------|-------|
| Date | 2025-12-14 |
| Decision | Operate under strict domain discovery constraints |
| Rationale | Building reusable domain skill for complex medical system |
| Key Rules | Structural = auto-allowed; Domain = requires approval |
| Status | Active |

### D006 - Complete Full Domain Research

| Field | Value |
|-------|-------|
| Date | 2025-12-14 |
| Decision | Complete comprehensive research across all sources |
| Sources Analyzed | db-connector-cloud, db_context_ai.yml, patients-cards-aggregator, coview-backend-services, qa_naharia |
| Output | research-results.md |
| Candidate Rules | 10 identified (UNCONFIRMED) |
| Ambiguities | 5 noted |
| Status | Complete |

---

## Constraints (Explicitly Stated)

| # | Constraint | Source | Date |
|---|------------|--------|------|
| C1 | Sub-agent does not implement code | User request | 2025-12-14 |
| C2 | Sub-agent does not design architecture | User request | 2025-12-14 |
| C3 | Sub-agent does not assume future requirements | User request | 2025-12-14 |
| C4 | Only document what is explicitly stated | User request | 2025-12-14 |
| C5 | Distinguish facts/assumptions/hypotheses | User request | 2025-12-14 |
| C6 | Never invent missing information | User request | 2025-12-14 |
| C7 | Never retroactively "complete" undiscussed ideas | User request | 2025-12-14 |
| C8 | STRUCTURAL facts auto-allowed | Domain mode | 2025-12-14 |
| C9 | DOMAIN knowledge requires approval | Domain mode | 2025-12-14 |
| C10 | If unsure → treat as DOMAIN and BLOCK | Domain mode | 2025-12-14 |
| C11 | Domain rules apply ONLY within declared scope | Domain mode | 2025-12-14 |
| C12 | db_context_ai.yml is structural only, NOT domain truth | Domain mode | 2025-12-14 |
| C13 | /db and /db-agent are OBSERVATIONAL ONLY | Domain mode | 2025-12-14 |
| C14 | Default database is qa_naharia | Domain mode | 2025-12-14 |

---

## Rejected Approaches

| # | Approach | Why Rejected | Date |
|---|----------|--------------|------|
| R1 | `src/README/` location | Superseded by dedicated skill folder | 2025-12-14 |
| R2 | Numbered files (00-, 01-, etc.) | Semantic names preferred | 2025-12-14 |

---

## Pending Decisions

| # | Topic | Options | Blocking? |
|---|-------|---------|-----------|
| P1 | Skill's primary function | TBD | Yes |
| P2 | Database scope | PostgreSQL only? All three? | Yes |
| P3 | Read-only vs read-write | TBD | Yes |
| P4 | Relationship to `/db` and `/db-agent` | Replace? Extend? Complement? | Yes |

---

## Last Updated

2025-12-14
