# db-connector-cloud Domain-Based Approach - Complete Guide

**Last Updated:** 2025-12-04
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Why Domain-Based Approach?](#why-domain-based-approach)
3. [Key Differences: Legacy vs Domain-Based](#key-differences-legacy-vs-domain-based)
4. [How to Create a New Domain](#how-to-create-a-new-domain)
5. [How to Consume a Domain in Your Project](#how-to-consume-a-domain-in-your-project)
6. [Migration Guide](#migration-guide)
7. [File Structure](#file-structure)
8. [Best Practices](#best-practices)
9. [Available Domains Reference](#available-domains-reference)

---

## Overview

The domain-based approach is a modern way to consume db-connector-cloud that allows you to:
- **Load only the models you need** (instead of all ~120 models)
- **Get pre-configured associations** for your domain
- **Reduce bundle size** and startup time
- **Maintain backward compatibility** with existing code

### What is a Domain?

A domain is a pre-configured bundle of related models with their associations already set up. Examples:
- **controlPanelDashboard**: 28 models for departmental control dashboard
- **surgery**: Core models + surgery-specific models
- **infections**: Core models + infection tracking models

---

## Why Domain-Based Approach?

### Legacy Problem (Before)
```typescript
// Legacy approach - loads ALL ~120 models even if you only need 10
import { pgModels } from '@db-connector-cloud/db-connector-cloud';

// Your app initializes all models at startup:
// - Case, Patient, Ward, Beds, Rooms (you need these)
// - Surgery, Infections, Isolations, Nurses (you might not need these)
// - 100+ other models (definitely don't need these)
```

**Issues:**
- Slow startup time (initializing all models)
- Large memory footprint
- Unnecessary database connections
- Harder to understand what your app actually uses

### Domain Solution (After)
```typescript
// Domain approach - loads only what you need
import { controlPanelDashboardDomain } from '@db-connector-cloud/db-connector-cloud/domains';

const { models } = await controlPanelDashboardDomain.init();
// Only initializes the 28 models your dashboard needs
// Associations are pre-configured for your domain
```

**Benefits:**
- Fast startup (only initialize needed models)
- Smaller memory footprint
- Clear dependency documentation
- Tree-shakeable builds

---

## Key Differences: Legacy vs Domain-Based

### Import Comparison

| Aspect | Legacy | Domain-Based |
|--------|--------|--------------|
| **Import** | All models at once | Only domain models |
| **Models Loaded** | ~120 models | 10-30 models (domain-specific) |
| **Associations** | All associations | Only domain associations |
| **Startup Time** | Slower | Faster |
| **Bundle Size** | Larger | Smaller |
| **Import Path** | `@db-connector-cloud/db-connector-cloud` | `@db-connector-cloud/db-connector-cloud/domains` |

### Code Comparison

**Legacy Approach:**
```typescript
// Old way - imports everything
import { pgModels, PGConnector } from '@db-connector-cloud/db-connector-cloud';

// Access models from pgModels object
const { Case, Patient, Ward } = pgModels;

// Use models (associations already set up globally)
const cases = await Case.findAll({
  include: [{ model: Patient, as: 'patient' }]
});
```

**Domain-Based Approach:**
```typescript
// New way - imports only what you need
import {
  controlPanelDashboardDomain,
  type ControlPanelDashboardModels
} from '@db-connector-cloud/db-connector-cloud/domains';

// Initialize the domain
const { models } = await controlPanelDashboardDomain.init();

// Access models from domain.models
const { Case, Patient, Ward } = models;

// Use models (associations set up for this domain)
const cases = await Case.findAll({
  include: [{ model: Patient, as: 'patient' }]
});
```

### Key Insight: Don't Export pgModels from Package

**❌ WRONG - Don't do this:**
```typescript
// In your project's db.ts
import { pgModels } from '@db-connector-cloud/db-connector-cloud';
export { pgModels }; // ❌ Exports ALL models
```

**✅ CORRECT - Do this instead:**
```typescript
// In your project's db.ts
import { controlPanelDashboardDomain } from '@db-connector-cloud/db-connector-cloud/domains';

// Re-export as pgModels for backward compatibility in your project
export const pgModels = controlPanelDashboardDomain.models;
```

This way:
- Other files in your project can still `import { pgModels } from './db'`
- But only domain models are available (not all 120)
- Your project maintains a consistent interface

---

## How to Create a New Domain

Follow these steps to create a new domain in the db-connector-cloud package.

### Step 1: Create Domain Directory

```bash
cd /path/to/db-connector-cloud
mkdir -p src/domains/yourDomainName
```

### Step 2: Create Models File

**File:** `src/domains/yourDomainName/models.ts`

This file exports all models needed by your domain and their initializers:

```typescript
/**
 * Your Domain Name - Models
 * All model imports and initializers for this domain.
 */

// Core models (if needed)
export { Case, initializeModel as initCase } from "../../models/pgModels/Case";
export { Patient, initializeModel as initPatient } from "../../models/pgModels/Patient";
export { Ward, initializeModel as initWard } from "../../models/pgModels/Ward";

// Domain-specific models
export { YourModel, initializeModel as initYourModel } from "../../models/pgModels/YourModel";

// Re-import for grouped export
import { Case } from "../../models/pgModels/Case";
import { Patient } from "../../models/pgModels/Patient";
import { Ward } from "../../models/pgModels/Ward";
import { YourModel } from "../../models/pgModels/YourModel";

/**
 * Grouped models object for convenient access
 */
export const yourDomainModels = {
  Case,
  Patient,
  Ward,
  YourModel,
};

export type YourDomainModels = typeof yourDomainModels;
```

**Key Points:**
- Import both the model class AND its `initializeModel` function
- Alias `initializeModel` to a specific name (e.g., `initCase`)
- Re-import models to create the grouped object
- Export a TypeScript type for the models object

### Step 3: Create Associations File

**File:** `src/domains/yourDomainName/associations.ts`

This file sets up all Sequelize associations for your domain:

```typescript
/**
 * Your Domain Name - Associations
 * All Sequelize associations for this domain.
 */

import {
  Case,
  Patient,
  Ward,
  YourModel,
} from "./models";

let initialized = false;

export function setupYourDomainAssociations(): void {
  if (initialized) return;
  initialized = true;

  // ========================================
  // CORE ASSOCIATIONS
  // ========================================

  // Case ↔ Patient
  Case.belongsTo(Patient, {
    foreignKey: "patientId",
    targetKey: "patientId",
    as: "patient"
  });
  Patient.hasMany(Case, {
    foreignKey: "patientId",
    sourceKey: "patientId",
    as: "cases"
  });

  // Case ↔ Ward
  Case.belongsTo(Ward, {
    as: 'wardFromCase',
    foreignKey: 'nursing_ward'
  });
  Ward.hasMany(Case, {
    as: 'casesFromWard',
    foreignKey: 'nursing_ward'
  });

  // ========================================
  // DOMAIN-SPECIFIC ASSOCIATIONS
  // ========================================

  // YourModel ↔ Case
  YourModel.belongsTo(Case, {
    foreignKey: "caseId",
    as: "case"
  });
  Case.hasMany(YourModel, {
    foreignKey: "caseId",
    as: "yourModels"
  });

  console.log("✅ Your Domain associations set up.");
}

export function isAssociationsInitialized(): boolean {
  return initialized;
}
```

**Key Points:**
- Use a flag to prevent double initialization
- Group associations logically (core vs domain-specific)
- Use consistent naming conventions for aliases
- Export a check function for initialization status

### Step 4: Create Domain Index File

**File:** `src/domains/yourDomainName/index.ts`

This is the main entry point that ties everything together:

```typescript
/**
 * Your Domain Bundle
 * Contains exactly the models needed by your-project-name.
 * This domain uses lazy initialization - only these models are initialized.
 */

import PGConnector from "../../services/postGresSql";
import {
  yourDomainModels,
  // Model initializers
  initCase,
  initPatient,
  initWard,
  initYourModel,
} from "./models";
import { setupYourDomainAssociations, isAssociationsInitialized } from "./associations";

// Export models object and type
export { yourDomainModels, YourDomainModels } from "./models";

// Export associations setup
export { setupYourDomainAssociations };

// Domain result type
export interface YourDomainResult {
  models: typeof yourDomainModels;
}

/**
 * Initialize only the models needed by this domain.
 */
async function initDomainModels(): Promise<void> {
  await Promise.all([
    initCase(),
    initPatient(),
    initWard(),
    initYourModel(),
  ]);
  console.log("✅ Your Domain models initialized (X models).");
}

/**
 * Initialize your domain.
 * Connects to DB, initializes models, and sets up associations.
 */
export async function initYourDomain(): Promise<YourDomainResult> {
  await PGConnector.getPool();
  await initDomainModels();

  if (!isAssociationsInitialized()) {
    setupYourDomainAssociations();
  }

  return { models: yourDomainModels };
}

/**
 * Domain object for convenient access
 */
export const yourDomain = {
  models: yourDomainModels,
  init: initYourDomain,
  setupAssociations: setupYourDomainAssociations,
};

export default yourDomain;
```

**Key Points:**
- Import PGConnector to establish database connection
- Initialize models in parallel with `Promise.all`
- Check if associations are already initialized (prevents duplicates)
- Export both the init function and the domain object
- Provide a convenient default export

### Step 5: Register Domain in Main Index

**File:** `src/domains/index.ts`

Add your domain to the main exports:

```typescript
// Project-specific domains
export {
  yourDomain,
  yourDomainModels,
  initYourDomain,
  type YourDomainModels,
} from './yourDomainName';

// All domains map for dynamic access
export const domains = {
  yourDomain: () => import('./yourDomainName').then(m => m.yourDomain),
  // ... other domains
};
```

### Step 6: Build and Test

```bash
# Build the package
npm run build

# Test in a consumer project
npm link @db-connector-cloud/db-connector-cloud
```

### Real Example: controlPanelDashboard Domain

See the actual implementation in:
- `/Users/amosdabush/git/cloud2/db-connector-cloud/src/domains/controlPanelDashboard/models.ts`
- `/Users/amosdabush/git/cloud2/db-connector-cloud/src/domains/controlPanelDashboard/associations.ts`
- `/Users/amosdabush/git/cloud2/db-connector-cloud/src/domains/controlPanelDashboard/index.ts`

This domain includes 28 models:
- 5 core models (Case, Patient, Ward, Rooms, Beds)
- 6 case-related (Transports, Consultation, DocumentDischarge, etc.)
- 3 surgery models
- 2 infection models
- 3 nursing models
- 1 location model
- 6 config models
- 1 aggregation model
- 1 route model

---

## How to Consume a Domain in Your Project

This section shows how to use a domain in your consumer project.

### Step 1: Create a db.ts File

Create a database module in your project (typically `src/db.ts`):

**File:** `src/db.ts`

```typescript
/**
 * Database Module - Domain-based initialization
 *
 * This module initializes the controlPanelDashboard domain from db-connector-cloud.
 * It provides the same interface as the legacy pgModels export for minimal code changes.
 *
 * Usage:
 * 1. Call initDatabase() once at app startup (before any model usage)
 * 2. Import pgModels, pgAttributes, PGConnector from this module instead of db-connector-cloud
 */

import {
  controlPanelDashboardDomain,
  type ControlPanelDashboardModels
} from '@db-connector-cloud/db-connector-cloud/domains';
import {
  setSkipLegacyAssociations,
  pgAttributes
} from '@db-connector-cloud/db-connector-cloud';
import { PGConnector } from '@db-connector-cloud/db-connector-cloud/core';

// Skip legacy associations to prevent conflicts with domain associations
setSkipLegacyAssociations(true);

let initialized = false;

/**
 * Initialize the database connection and models.
 * Must be called once at application startup before any model usage.
 */
export async function initDatabase(): Promise<ControlPanelDashboardModels> {
  if (initialized) {
    console.log("⚠️ Database already initialized, skipping.");
    return controlPanelDashboardDomain.models;
  }

  console.log("🔌 Initializing Control Panel Dashboard domain...");
  const { models } = await controlPanelDashboardDomain.init();
  initialized = true;
  console.log("✅ Database initialized successfully.");

  return models;
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return initialized;
}

/**
 * Get the models object.
 * Note: initDatabase() must be called first.
 */
export function getModels(): ControlPanelDashboardModels {
  if (!initialized) {
    console.warn("⚠️ Warning: Accessing models before database initialization. Call initDatabase() first.");
  }
  return controlPanelDashboardDomain.models;
}

// Re-export models for easy access (same interface as pgModels)
// Note: These are the model classes - they will be properly initialized after initDatabase() is called
export const pgModels = controlPanelDashboardDomain.models;

// Re-export other utilities
export { pgAttributes, PGConnector };

// Export types
export type { ControlPanelDashboardModels };
```

**Key Points:**
- Call `setSkipLegacyAssociations(true)` to prevent conflicts
- Export `pgModels` as an alias to `controlPanelDashboardDomain.models`
- This maintains backward compatibility with existing code
- Re-export utilities like `pgAttributes` and `PGConnector`

### Step 2: Initialize Database at Startup

In your application's entry point (e.g., `index.ts`, `main.ts`, `app.ts`):

```typescript
import { initDatabase } from './db';

async function bootstrap() {
  // Initialize database FIRST before any model usage
  await initDatabase();

  // Now start your application
  // ... rest of your app initialization
}

bootstrap();
```

**Critical:** Call `initDatabase()` once at startup, before any code tries to use the models.

### Step 3: Import Models from Your db.ts

In your business logic files, import from YOUR `db.ts` file, not from the package:

**❌ WRONG:**
```typescript
// Don't import directly from package
import { pgModels } from '@db-connector-cloud/db-connector-cloud';
```

**✅ CORRECT:**
```typescript
// Import from your project's db.ts
import { pgModels } from './db';

const { Case, Patient, Ward } = pgModels;

// Use models as usual
const cases = await Case.findAll({
  include: [{ model: Patient, as: 'patient' }]
});
```

### Step 4: File Structure in Your Project

```
your-project/
├── src/
│   ├── db.ts                    # Database initialization module (YOU CREATE THIS)
│   ├── index.ts                 # App entry point (calls initDatabase)
│   ├── handlers/
│   │   ├── casesHandler.ts      # Imports from './db'
│   │   └── patientsHandler.ts   # Imports from './db'
│   └── services/
│       └── reportService.ts     # Imports from './db'
└── package.json
```

### Real Example: departmental-control-dashboard

See the actual implementation:
- `/Users/amosdabush/git/cloud2/departmental-control-dashboard/src/db.ts`

This project uses the controlPanelDashboard domain with:
- 28 models initialized
- Domain-specific associations pre-configured
- Clean separation between package and project concerns

---

## Migration Guide

How to migrate an existing project from legacy to domain-based approach.

### Before Migration Checklist

1. **Identify which models your project uses:**
   ```bash
   # Search for model usage in your codebase
   grep -r "pgModels\." src/
   ```

2. **Check if a domain exists for your use case:**
   - Look at available domains in the package
   - If no domain exists, create one (see "How to Create a New Domain")

3. **Plan the migration:**
   - Will you migrate all at once or gradually?
   - Do you have tests to verify nothing breaks?

### Migration Steps

#### Step 1: Create db.ts Module

Create `src/db.ts` in your project:

```typescript
import {
  yourDomain,
  type YourDomainModels
} from '@db-connector-cloud/db-connector-cloud/domains';
import {
  setSkipLegacyAssociations,
  pgAttributes
} from '@db-connector-cloud/db-connector-cloud';
import { PGConnector } from '@db-connector-cloud/db-connector-cloud/core';

setSkipLegacyAssociations(true);

let initialized = false;

export async function initDatabase(): Promise<YourDomainModels> {
  if (initialized) {
    console.log("⚠️ Database already initialized, skipping.");
    return yourDomain.models;
  }

  console.log("🔌 Initializing domain...");
  const { models } = await yourDomain.init();
  initialized = true;
  console.log("✅ Database initialized successfully.");

  return models;
}

export const pgModels = yourDomain.models;
export { pgAttributes, PGConnector };
export type { YourDomainModels };
```

#### Step 2: Update Application Entry Point

**Before:**
```typescript
// Old: No explicit initialization needed
import { pgModels } from '@db-connector-cloud/db-connector-cloud';

async function bootstrap() {
  // ... app code
}
```

**After:**
```typescript
// New: Initialize database first
import { initDatabase } from './db';

async function bootstrap() {
  // Initialize database FIRST
  await initDatabase();

  // ... app code
}
```

#### Step 3: Update Import Statements

**Option A: Update all at once (recommended for small projects)**

Replace:
```typescript
import { pgModels } from '@db-connector-cloud/db-connector-cloud';
```

With:
```typescript
import { pgModels } from './db';
```

Use your IDE's "Find and Replace" feature:
- Find: `from '@db-connector-cloud/db-connector-cloud'`
- Replace: `from './db'`
- Verify each change

**Option B: Gradual migration (recommended for large projects)**

Keep both imports temporarily:
```typescript
// Old imports still work during transition
import { pgModels as legacyPgModels } from '@db-connector-cloud/db-connector-cloud';

// New imports for migrated code
import { pgModels } from './db';
```

Migrate file by file, testing as you go.

#### Step 4: Test Thoroughly

```bash
# Run your tests
npm test

# Check for errors in logs
npm start

# Verify associations work
# Test queries with includes to ensure associations are set up correctly
```

### Common Migration Issues

#### Issue 1: Association Not Found

**Error:**
```
Error: Association 'patient' not found on model 'Case'
```

**Solution:**
Check that your domain's associations file includes this association. You may need to add it.

#### Issue 2: Model Not Initialized

**Error:**
```
Error: Model 'YourModel' is not initialized
```

**Solution:**
The model you're trying to use is not included in your domain. Either:
- Add it to your domain's models.ts file
- Use a different domain that includes this model

#### Issue 3: Circular Dependencies

**Error:**
```
Warning: Circular dependency detected
```

**Solution:**
Make sure you're importing from `./db` in your business logic, not from the package directly.

#### Issue 4: Double Association Setup

**Error:**
```
Error: Association 'patient' already defined on model 'Case'
```

**Solution:**
Make sure you called `setSkipLegacyAssociations(true)` in your db.ts file.

### Rollback Plan

If migration causes issues, you can easily rollback:

1. **Revert db.ts changes:**
   ```bash
   git checkout src/db.ts
   ```

2. **Revert import statements:**
   ```bash
   # Use git to revert specific files
   git checkout -- src/handlers/*.ts
   ```

3. **Remove initDatabase call:**
   Remove the `await initDatabase()` call from your entry point.

---

## File Structure

### In db-connector-cloud Package

```
db-connector-cloud/
├── src/
│   ├── index.ts                          # Legacy exports (backward compatible)
│   ├── core/
│   │   ├── index.ts                      # Core exports
│   │   └── connector.ts                  # PGConnector singleton
│   ├── models/
│   │   ├── index.ts                      # Direct model exports
│   │   ├── pgModels/                     # Individual model files
│   │   │   ├── Case.ts                   # Each model has initializeModel()
│   │   │   ├── Patient.ts
│   │   │   └── ... (120+ models)
│   │   └── base/
│   │       ├── initModel.ts              # Model init helper
│   │       └── modelRegistry.ts          # Lazy registry
│   ├── domains/
│   │   ├── index.ts                      # All domain exports
│   │   ├── controlPanelDashboard/
│   │   │   ├── index.ts                  # Domain entry point
│   │   │   ├── models.ts                 # Model imports + exports
│   │   │   └── associations.ts           # Association setup
│   │   ├── surgery/
│   │   │   └── ... (similar structure)
│   │   └── ... (other domains)
│   ├── associations/
│   │   ├── index.ts                      # Unified exports
│   │   ├── core.ts                       # Core associations
│   │   ├── surgery.ts                    # Surgery associations
│   │   └── ... (other association files)
│   └── services/
│       └── postGresSql.ts                # PGConnector implementation
├── package.json                          # Export paths configured
└── tsconfig.json
```

### In Consumer Project

```
your-project/
├── src/
│   ├── db.ts                             # ✅ YOU CREATE THIS
│   │                                     # - Imports domain
│   │                                     # - Exports pgModels
│   │                                     # - Provides initDatabase()
│   ├── index.ts                          # App entry point
│   │                                     # - Calls initDatabase()
│   ├── handlers/
│   │   ├── casesHandler.ts               # Imports from './db'
│   │   └── patientsHandler.ts            # Imports from './db'
│   └── services/
│       └── reportService.ts              # Imports from './db'
├── package.json
└── tsconfig.json
```

### Key Files You Need to Create

In your consumer project, you only need to create ONE file:

**`src/db.ts`** - This is your database initialization module that:
- Imports the domain from the package
- Initializes the domain
- Re-exports pgModels for your project to use
- Provides utility functions like `initDatabase()`

---

## Best Practices

### 1. Always Call initDatabase() First

```typescript
// ✅ CORRECT
async function bootstrap() {
  await initDatabase();  // Initialize FIRST
  await startServer();   // Then start app
}

// ❌ WRONG
async function bootstrap() {
  await startServer();   // Server starts before DB is ready
  await initDatabase();  // Too late - models may be used already
}
```

### 2. Import from Your db.ts, Not from Package

```typescript
// ✅ CORRECT
import { pgModels } from './db';

// ❌ WRONG
import { pgModels } from '@db-connector-cloud/db-connector-cloud';
```

### 3. Use setSkipLegacyAssociations(true)

Always include this in your db.ts:

```typescript
import { setSkipLegacyAssociations } from '@db-connector-cloud/db-connector-cloud';

setSkipLegacyAssociations(true);  // Prevents double association setup
```

### 4. One Domain Per Project

Don't mix multiple domains in one project unless necessary:

```typescript
// ✅ CORRECT - Use one domain
import { surgeryDomain } from '@db-connector-cloud/db-connector-cloud/domains';

// ❌ AVOID - Mixing domains defeats the purpose
import { surgeryDomain } from '@db-connector-cloud/db-connector-cloud/domains';
import { infectionsDomain } from '@db-connector-cloud/db-connector-cloud/domains';
```

If you need models from multiple domains, create a custom domain that includes all needed models.

### 5. Create Custom Domains for Project-Specific Needs

Don't force your project to use an existing domain if it doesn't fit. Create a custom domain:

```bash
# In db-connector-cloud package
cd src/domains
mkdir yourProjectName
# Copy structure from controlPanelDashboard
```

### 6. Document Your Domain's Models

In your domain's models.ts file, add comments:

```typescript
// Core models (5)
export { Case, initializeModel as initCase } from "../../models/pgModels/Case";
export { Patient, initializeModel as initPatient } from "../../models/pgModels/Patient";

// Surgery models (3)
export { Surgery, initializeModel as initSurgery } from "../../models/pgModels/Surgery";
```

This helps other developers understand what's included.

### 7. Test Associations After Domain Creation

After creating a new domain, test that associations work:

```typescript
// Test case
const cases = await Case.findAll({
  include: [
    { model: Patient, as: 'patient' },
    { model: Ward, as: 'wardFromCase' }
  ]
});

// Should not throw "Association not found" errors
```

### 8. Keep Domain Models Focused

A domain should include models that are logically related:

```typescript
// ✅ GOOD - Focused domain
controlPanelDashboard: {
  Case, Patient, Ward,           // Core
  Surgery, Infections, Nurses,   // Dashboard cards
  Parameters, ScreenSettings     // Configuration
}

// ❌ BAD - Kitchen sink domain
everythingDomain: {
  // All 120 models - defeats the purpose
}
```

### 9. Version Your Domain

When making breaking changes to a domain, consider versioning:

```typescript
// Option 1: Create a new version
export { controlPanelDashboardDomain } from './controlPanelDashboard';
export { controlPanelDashboardV2Domain } from './controlPanelDashboardV2';

// Option 2: Use semantic versioning in package
// Bump major version when domain structure changes
```

### 10. Centralize Database Logic in db.ts

Don't scatter database initialization across your codebase:

```typescript
// ✅ CORRECT - All in db.ts
// src/db.ts
export async function initDatabase() { ... }
export const pgModels = domain.models;
export { PGConnector };

// ❌ WRONG - Initialization in multiple places
// src/handlers/cases.ts
await controlPanelDashboardDomain.init(); // Don't do this
```

---

## Available Domains Reference

### controlPanelDashboard Domain

**Purpose:** Departmental control dashboard
**Models:** 28 models

```typescript
import { controlPanelDashboardDomain } from '@db-connector-cloud/db-connector-cloud/domains';

const { models } = await controlPanelDashboardDomain.init();
```

**Includes:**
- Core: Case, Patient, Ward, Rooms, Beds
- Case-related: Transports, Consultation, DocumentDischarge, NewCase, Indications, Monitored
- Surgery: Surgery, SurgeryWaiting, PatientsInSurgery
- Infections: Infections, Isolations
- Nursing: Nurses, NursingStatus, PatientCondition
- Locations: Locations
- Config: Parameters, ColumnSettings, ScreenSettings, InterFaceFrequency, ScreenInterFaceMapping, InterfaceUpdates
- Aggregation: CardsAgg
- Routes: RouteModel

**Associations:** All core associations + domain-specific (28 models fully connected)

### Other Available Domains

The package supports creating additional domains. See the package's DOMAINS_REFERENCE.md for a complete list.

Common patterns:
- **core**: Base models (Case, Patient, Ward, Beds, Rooms)
- **surgery**: Core + surgery models
- **infections**: Core + infection tracking
- **nursing**: Core + nursing models
- **ambulance**: Standalone ambulance models

---

## Troubleshooting

### Issue: "Cannot find module '@db-connector-cloud/db-connector-cloud/domains'"

**Solution:** Make sure the package is built and the exports field is configured in package.json:

```json
{
  "exports": {
    "./domains": "./dist/domains/index.js"
  }
}
```

### Issue: "pgModels.Case is undefined"

**Solution:** Make sure you called `initDatabase()` before accessing models:

```typescript
await initDatabase();  // Must call this first
const cases = await pgModels.Case.findAll();  // Then use models
```

### Issue: "Association already defined"

**Solution:** You're setting up associations twice. Make sure to call `setSkipLegacyAssociations(true)`:

```typescript
import { setSkipLegacyAssociations } from '@db-connector-cloud/db-connector-cloud';
setSkipLegacyAssociations(true);
```

### Issue: TypeScript errors after migration

**Solution:** Make sure you export types from your db.ts:

```typescript
export type { ControlPanelDashboardModels } from '@db-connector-cloud/db-connector-cloud/domains';
```

---

## Additional Resources

### Package Documentation Files

Located in `/Users/amosdabush/git/cloud2/db-connector-cloud/src/README/`:
- `IMPORTS_GUIDE.md` - Detailed import options
- `DOMAINS_REFERENCE.md` - Complete domain reference
- `ASSOCIATIONS_REFERENCE.md` - Association patterns
- `ARCHITECTURE_PLAN.md` - Implementation details

### Example Implementations

- **Package domain:** `/Users/amosdabush/git/cloud2/db-connector-cloud/src/domains/controlPanelDashboard/`
- **Consumer project:** `/Users/amosdabush/git/cloud2/departmental-control-dashboard/src/db.ts`

---

## Summary

The domain-based approach provides:
1. **Performance:** Load only needed models
2. **Clarity:** Explicit dependencies
3. **Maintainability:** Organized by feature domain
4. **Backward Compatibility:** Legacy code still works

**Key takeaway:** Create a `db.ts` file in your project that imports a domain and re-exports it as `pgModels`. This gives you the benefits of domain-based loading while maintaining a familiar interface.
