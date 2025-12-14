# Operating Mode

> Defines the strict operating constraints for this skill discovery process.

---

## Mode

**STRICT DOMAIN SKILL DISCOVERY MODE**

This work is for building a **REUSABLE DOMAIN SKILL**, not for answering one-time questions.

---

## Purpose

| Allowed | Forbidden |
|---------|-----------|
| DISCOVER | DECIDE domain laws |
| OBSERVE | Execute code by default |
| PROPOSE | Assume domain meaning |
| ASK FOR APPROVAL | Proceed without approval |

---

## Source Hierarchy

### Primary Sources (Code)

| Priority | Location | Contains |
|----------|----------|----------|
| 1 | `packages/db-connector-cloud` | DB models, ORM associations |
| 2 | `coview-backend-services` | Query builders, aggregations, dashboard logic |
| 3 | `apis/patients-cards-aggregator` | Explicit SQL aggregations (HIGH-VALUE) |

### Auxiliary Source (Structural Only)

| File | Purpose | Constraints |
|------|---------|-------------|
| `/Users/amosdabush/db_context_env/output/db_context_ai.yml` | Structural map | NOT domain truth, may be outdated |

**Conflict Rule**: If `db_context_ai.yml` conflicts with live code → prefer code, mark db_context as OUTDATED.

---

## Database Tools

| Tool | Purpose | Constraints |
|------|---------|-------------|
| `/db` | Schema exploration, structural verification | OBSERVATIONAL ONLY |
| `/db-agent` | Natural language exploration, complex queries | OBSERVATIONAL ONLY |

**Default Database**: `qa_naharia`

**Secondary Databases** (conditional use only):
- `coview` (dev) - only if qa_naharia insufficient
- `lior_test2` (test) - only if qa_naharia insufficient

---

## Knowledge Classification

### STRUCTURAL FACTS (Auto-Allowed)

- Tables, columns, data types
- Model definitions
- ORM associations
- Foreign keys and constraints
- Builder inputs and parameters
- Control flow in code (if/switch/case)

### DOMAIN KNOWLEDGE (Requires Approval)

- Business meaning
- Medical legality
- Authority / source of truth
- Workflow requirements
- Invariants ("must", "never", "always")
- Cross-domain applicability

**Rule**: If unsure → treat as DOMAIN and BLOCK.

---

## Domain Isolation

- Approved rules apply ONLY within their declared domain scope
- Rules approved in one domain MUST NOT be reused in another without approval
- Structural similarity does NOT imply shared rules

---

## Safety Rules

1. Approved domain knowledge → ALLOWED
2. Unapproved domain knowledge → FORBIDDEN
3. Missing/unclear domain knowledge → STOP + ASK
4. Never infer or assume domain meaning
5. Structural facts do NOT require approval
6. Domain meaning/authority/legality/invariants ALWAYS require approval

---

## Output Formats

### Candidate Domain Rule

```
CANDIDATE DOMAIN RULE:
- Description:

EVIDENCE:
- Source files / builders / models / SQL:
- Repetition or consistency observed:

DOMAIN SCOPE:
- (Nursing / Surgery / Permissions / Screens / Unknown)

STATUS:
- UNCONFIRMED
```

### Approval Request

```
UNAPPROVED DOMAIN DEPENDENCY DETECTED

Context:
- Requested action:
- Domain involved:

Observed but UNCONFIRMED assumptions:
1. ...

Questions for approval:
- Is this rule correct?
- Is it always valid?
- Is it authoritative or contextual?
- Does it apply only to this domain?

Do NOT proceed until approval is explicitly given.
```

---

## Last Updated

2025-12-14
