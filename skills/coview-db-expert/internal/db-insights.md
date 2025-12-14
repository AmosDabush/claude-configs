# Database Insights

> Database structures and relationships discovered through conversation.

---

## Database Technologies

| Technology | Purpose | Packages Used |
|------------|---------|---------------|
| PostgreSQL | Primary relational database | pg, sequelize 6.37.7 |
| MongoDB | Document storage (ambulance data) | mongoose 8.15.1, mongodb 6.16.0 |
| Redis | Caching, pub/sub, streams | redis 4.7.0, ioredis 5.4.1 |

---

## PostgreSQL

### Schema: `patients`

**Fact**: Most models use the `patients` schema.

### Conventions

| Convention | Value |
|------------|-------|
| Field naming (DB) | `snake_case` |
| Field naming (Model) | `camelCase` (via `underscored: true`) |
| Primary key pattern | `{model}Id` (e.g., `caseId`) |
| Timestamps | Disabled (`timestamps: false`) |

### Model Count

**Fact**: ~100+ PostgreSQL models in `src/models/pgModels/`

---

## Entity Relationships

### Central Entity: Case

```
Case (central hub)
├── belongsTo Patient
├── belongsTo Ward (multiple associations)
├── belongsTo Beds
├── belongsTo Rooms
├── hasMany Nurses
├── hasMany Transports
├── hasMany Infections
├── hasMany Isolations
├── hasMany Indications
└── hasOne NursingStatus
```

### Ward Hierarchy

```
Ward
├── belongsTo WardCategory
├── hasMany Rooms
└── hasOne HigherWards
```

### Staff Tracking

```
ActiveEmployees
└── hasOne/hasMany PresenceEmployees

Patient
└── hasMany NursingEvent
```

### Surgery

```
PatientsInSurgery → belongsTo Case
SurgeryWaiting → belongsTo Case
Rooms → hasMany PatientsInSurgery
```

---

## MongoDB

### Schemas (Ambulance Data)

**PatientsSchema**:
```
AmbCompID: String (required)
timeToLeave: Date
expiresAt: Date (auto-set, 30-day TTL)
```

**DrivesSchema**:
```
AmbCompID: String (required)
timeToLeave: Date
expiresAt: Date (auto-set, 30-day TTL)
```

**Fact**: Both use TTL indexes for 30-day auto-expiration.

---

## Redis Client Types

| Type | Purpose |
|------|---------|
| `pub` | Publisher for pub/sub |
| `sub` | Subscriber for pub/sub |
| `cache` | General caching |
| `stream` | Redis streams |
| `data` | General data storage |

---

## Model Initialization

### Pattern

```typescript
export class Model extends ModelBaseClass {}

export async function initializeModel() {
  const { sequelize } = await PGConnector.getPool();
  Model.init({ ...modelKeys }, {
    sequelize,
    schema: "patients",
    modelName: "Model",
    tableName: "table_name",
    timestamps: false,
    underscored: true,
  });
}
```

### Approaches

| Approach | Function | Use Case |
|----------|----------|----------|
| Domain-specific | `initCasesDomain()` | Service needs subset |
| Full | `initAllModels()` | Service needs all models |

---

## Open DB Questions

| # | Question | Status |
|---|----------|--------|
| DBQ1 | What other schemas exist besides `patients`? | Needs investigation |
| DBQ2 | What are the FK cascade rules? | Needs investigation |
| DBQ3 | How are Copy tables synchronized? | Needs investigation |
| DBQ4 | What indexes exist? | Needs investigation |

---

## Last Updated

2025-12-14
