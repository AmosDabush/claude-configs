# Sequelize Associations Reference

> Source: `src/models/associations.ts` (609 lines)
> Generated: 2025-12-14
> Evidence Level: STRUCTURAL FACT

---

## CORE ENTITY: CASE

The **Case** entity is the central hub with the most associations.

### Case → Ward Associations (THREE different relationships)

| Association | Foreign Key | Target Key | Alias | Business Meaning |
|-------------|-------------|------------|-------|------------------|
| `Case.belongsTo(Ward)` | `nursing_ward` | `wardId` | `wardFromCase` | Legacy: nursing ward display name |
| `Case.belongsTo(Ward)` | `chameleonWardId` | `wardId` | `Ward` | Main: medical responsibility |
| `Case.belongsTo(Ward)` | `chameleonSatelliteWardId` | `wardId` | `satteliteWard` | Physical: satellite location |

**Evidence** (associations.ts lines 85-108):
```typescript
Case.belongsTo(Ward, { as: 'wardFromCase', foreignKey: 'nursing_ward' });
Case.belongsTo(Ward, { as: 'Ward', foreignKey: 'chameleonWardId', targetKey: 'wardId' });
Case.belongsTo(Ward, { as: 'satteliteWard', foreignKey: 'chameleonSatelliteWardId', targetKey: 'wardId' });
```

### Case → Location Associations

| Association | Foreign Key | Target Key | Alias | Notes |
|-------------|-------------|------------|-------|-------|
| `Case.belongsTo(Beds)` | `bedId` | `bedId` | `Bed` | |
| `Case.belongsTo(Beds)` | `bedId` | N/A | `BedFromCase` | Duplicate alias |
| `Case.belongsTo(Rooms)` | `roomId` | `roomId` | `RoomFromCase` | **constraints: false** |

**Evidence** (associations.ts lines 111-159):
```typescript
Case.belongsTo(Beds, { as: 'Bed', foreignKey: 'bedId', targetKey: 'bedId' });
Case.belongsTo(Rooms, {
  as: 'RoomFromCase',
  foreignKey: 'roomId',
  targetKey: 'roomId',
  constraints: false  // ← DISABLED
});
```

### Case → Patient Association

| Association | Foreign Key | Target Key | Alias |
|-------------|-------------|------------|-------|
| `Case.belongsTo(Patient)` | `patientId` | `patientId` | `patient` |
| `Case.belongsTo(Patient)` | `patientId` | `patientId` | `PatientFromCase` |
| `Patient.hasMany(Case)` | `patientId` | `patientId` | `cases` |

### Case → Clinical Data Associations

| Association | FK | Alias | Description |
|-------------|-------|-------|-------------|
| `Case.hasMany(Infections)` | `caseId` | `infectionsFromCase` | Patient infections |
| `Case.hasMany(Isolations)` | `caseId` | `isolationsFromCase` | Isolation records |
| `Case.hasOne(NursingStatus)` | `caseId` | `nursingStatusFromCase` | Single nursing status |
| `Case.hasMany(Consultation)` | `caseId` | `consultationsFromCase` | Consultation requests |
| `Case.hasMany(DocumentDischarge)` | `caseId` | `documentDischargeFromCase` | Discharge documents |
| `Case.hasMany(PatientCondition)` | `caseId` | `patientConditionFromCase` | Patient condition |
| `Case.hasMany(ErRelease)` | `caseId` | `erReleasesFromCase` | ER release records |
| `Case.hasMany(Monitored)` | `case_id` | `monitoredFromCase` | Monitoring records |
| `Case.hasMany(Indications)` | `caseId` | N/A | Clinical indications |

### Case → Staff/Transport Associations

| Association | FK | Alias |
|-------------|-------|-------|
| `Case.hasMany(Nurses)` | `case_id` | `NursesFromCase` |
| `Case.hasMany(Transports)` | `case_id` | `TransportsFromCase` |
| `Case.hasMany(NursingEvent)` | `caseId` | `nursingEvents` |

### Case → Surgery Associations

| Association | FK | Alias |
|-------------|-------|-------|
| `PatientsInSurgery.belongsTo(Case)` | `caseId` | `case` |
| `SurgeryWaiting.belongsTo(Case)` | `caseId` | `case` |
| `Surgery.belongsTo(Case)` | `caseId` | N/A |

---

## WARD HIERARCHY

### Ward → Ward Category

```typescript
Ward.belongsTo(WardCategory, {
  foreignKey: "wardCategory",
  targetKey: "categoryId",
  as: "wardCategoryInfo"
});
```

### Ward → Rooms

```typescript
Ward.hasMany(Rooms, {
  as: 'rooms',
  foreignKey: 'wardId',
});

Rooms.belongsTo(Ward, {
  as: 'wardFromRoom',
  foreignKey: 'wardId',
});
```

### Ward → Higher Wards (Hierarchy)

```typescript
Ward.hasOne(HigherWards, {
  foreignKey: "chameleonWardId",
  sourceKey: "wardId",
  as: "higherWardsByChameleonWardId",
});

HigherWards.belongsTo(Ward, {
  foreignKey: "wardId",
  targetKey: "wardId",
  as: "ward"
});

// Self-referential hierarchy
HigherWards.hasOne(HigherWards, {
  sourceKey: 'higherWardCode',
  foreignKey: 'wardId',
  as: 'selfHigherWard',
});
```

### Ward → Cases (Inverse)

```typescript
Ward.hasMany(Case, { as: 'casesFromWard', foreignKey: 'nursing_ward' });
Ward.hasMany(Case, { as: 'casesByChameleonWard', foreignKey: 'chameleonWardId' });
Ward.hasMany(Case, { as: 'casesBySatelliteWard', foreignKey: 'chameleonSatelliteWardId' });
```

---

## LOCATION HIERARCHY

### Beds ↔ Locations ↔ Rooms

```typescript
Locations.belongsTo(Ward, {
  as: "locationFromWard",
  foreignKey: "nursingWard",
  targetKey: "wardId",
});

Locations.belongsTo(Rooms, {
  as: "RoomFromlocation",
  foreignKey: "roomId",
});

Locations.belongsTo(Beds, {
  as: "BedFromLocation",
  foreignKey: "bedId",
});

Rooms.hasMany(Locations, {
  as: "locationFromRoom",
  foreignKey: "roomId",
});
```

### Beds → Blocked Beds

```typescript
Beds.hasOne(BlockedBeds, {
  as: "BlockedBedFromBed",
  foreignKey: "bedId",
});

Locations.hasOne(BlockedBeds, {
  as: "blockedBedsFromLocation",
  foreignKey: "bedId",
  sourceKey: "bedId",
});

BlockedBeds.belongsTo(Case, {
  foreignKey: "bedId",
  targetKey: "bedId",
  as: "caseFromBlockedBed",
});
```

---

## SURGERY WORKFLOW

### Surgery Waiting → Case → Patients In Surgery

```typescript
SurgeryWaiting.belongsTo(Case, {
  foreignKey: "caseId",
  targetKey: "caseId",
  as: "case"
});

PatientsInSurgery.belongsTo(Case, {
  foreignKey: "caseId",
  targetKey: "caseId",
  as: "case"
});

PatientsInSurgery.belongsTo(Rooms, {
  foreignKey: "room_id",
  targetKey: "roomId",
  as: "room"
});

Rooms.hasMany(PatientsInSurgery, {
  foreignKey: "room_id",
  sourceKey: "roomId",
  as: "surgeryPatients"
});
```

---

## NURSING STATUS CHAIN

```typescript
// Case → NursingStatus
Case.hasOne(NursingStatus, {
  as: "nursingStatusFromCase",
  foreignKey: "caseId",
});

// NursingStatus → NursingStatusClass
NursingStatus.belongsTo(NursingStatusClass, {
  foreignKey: 'nurs_status_id',
  targetKey: 'nursStatusId',
  as: 'nursStatusclass',
});

NursingStatus.belongsTo(NursingStatusClass, {
  as: "nursingStatusFromClass",
  foreignKey: "nursStatusId",
  targetKey: "nursStatusId"
});

// NursingStatusClass → NursingStatusType
NursingStatusClass.belongsTo(NursingStatusType, {
  foreignKey: "nursStatusType",
  targetKey: "nursStatusId",
  as: "nursStatusClassFromNursingStatusType",
});
```

---

## STAFF/EMPLOYEE ASSOCIATIONS

```typescript
ActiveEmployees.hasOne(PresenceEmployees, {
  foreignKey: "employee_id",
  sourceKey: "employeeId",
  as: "presence"
});

ActiveEmployees.hasMany(PresenceEmployees, {
  foreignKey: "employee_id",
  as: "PresenceEmployees",
});

PresenceEmployees.belongsTo(ActiveEmployees, {
  foreignKey: "employee_id",
  targetKey: "employeeId",
  as: "activeEmployee"
});
```

---

## PATIENT ↔ NURSING EVENTS

```typescript
Patient.hasMany(NursingEvent, {
  as: 'nursingEvents',
  foreignKey: 'patientId',
  sourceKey: 'patientId'
});

Patient.hasMany(NursingEvent, {
  as: 'patientNursingEvents',
  foreignKey: 'patientId',
  sourceKey: 'patientId'
});

NursingEvent.belongsTo(Patient, {
  as: 'patient',
  foreignKey: 'patientId',
  targetKey: 'patientId'
});

NursingEvent.belongsTo(Patient, {
  as: 'eventPatient',
  foreignKey: 'patientId',
  targetKey: 'patientId'
});
```

---

## PERMISSIONS SYSTEM

### Module → Screens → Features → Permissions

```typescript
Modules.hasMany(Screens, { foreignKey: "module_id" });
Modules.hasMany(ModulePermissions, { foreignKey: "module_id" });

Screens.belongsTo(Modules, { foreignKey: "module_id" });
Screens.hasMany(ScreenPermissions, { foreignKey: "screen_id" });
Screens.hasMany(Features, { foreignKey: "screen_id" });

Features.belongsTo(Screens, { foreignKey: "screen_id" });
Features.hasMany(FeaturePermissions, { foreignKey: "feature_id" });

ModulePermissions.belongsTo(PermissionGroup, { foreignKey: "group_id" });
ModulePermissions.belongsTo(Permission, { foreignKey: "permission_id" });

ScreenPermissions.belongsTo(PermissionGroup, { foreignKey: "group_id" });
ScreenPermissions.belongsTo(Permission, { foreignKey: "permission_id" });
ScreenPermissions.belongsTo(Screens, { foreignKey: "screen_id" });

FeaturePermissions.belongsTo(Features, { foreignKey: "feature_id" });
FeaturePermissions.belongsTo(PermissionGroup, { foreignKey: "group_id" });
FeaturePermissions.belongsTo(Permission, { foreignKey: "permission_id" });

RoutesPermissions.belongsTo(RouteModel, { foreignKey: "route_id", as: "Route" });
RoutesPermissions.belongsTo(PermissionGroup, { foreignKey: "group_id", as: "PermissionGroup" });
```

---

## INTERFACE/UPDATE SYSTEM

```typescript
InterFaceFrequency.hasMany(ScreenInterFaceMapping, {
  foreignKey: "interfaceId",
  as: 'ScreenInterfaceMappingFromInterfaceFrequency'
});

InterFaceFrequency.hasMany(InterfaceUpdates, {
  foreignKey: "interfaceName",
  as: 'InterfaceUpdatesFromInterfaceFrequency'
});
```

---

## PARAMETERS ↔ URLS

```typescript
Parameters.hasMany(Urls, {
  foreignKey: "paramId",
  sourceKey: "paramId",
});

Urls.belongsTo(Parameters, {
  foreignKey: "paramId",
  targetKey: "paramId",
});
```

---

## AMBULANCE SYSTEM

```typescript
AmbulancePatients.belongsTo(AmbulanceDrives, {
  foreignKey: "amb_comp_id",
  targetKey: "AmbCompID",
});

AmbulancePatients.belongsTo(AmbulanceDrives, {
  foreignKey: "drive_id",
  targetKey: "DriveId",
});

AmbulanceDrives.hasMany(AmbulancePatients, {
  foreignKey: "amb_comp_id",
  sourceKey: "AmbCompID",
});

AmbulanceDrives.hasMany(AmbulanceDrives, {
  foreignKey: "drive_id",
  sourceKey: "DriveId",
});
```

---

## CODE QUALITY OBSERVATIONS

### Developer Confusion Comments (Verbatim)
- Line 309: `/// lior wtf???`
- Line 364: `/////tomer wtf???`

### Duplicate Associations
Lines 236-240:
```typescript
Modules.hasMany(Screens, { foreignKey: "module_id" });
Modules.hasMany(ModulePermissions, { foreignKey: "module_id" });

Modules.hasMany(Screens, { foreignKey: "module_id" });  // DUPLICATE
Modules.hasMany(ModulePermissions, { foreignKey: "module_id" });  // DUPLICATE
```

### Multiple Aliases for Same Relationship
- `Patient → NursingEvent`: Two aliases (`nursingEvents`, `patientNursingEvents`)
- `Case → Patient`: Two aliases (`patient`, `PatientFromCase`)
- `Case → Beds`: Two aliases (`Bed`, `BedFromCase`)

### Disabled Constraints
```typescript
Case.belongsTo(Rooms, {
  ...
  constraints: false  // ← EXPLICITLY DISABLED
});
```

---

## ASSOCIATION COUNT SUMMARY

| Entity | belongsTo | hasMany | hasOne | Total |
|--------|-----------|---------|--------|-------|
| Case | 8 | 14 | 1 | 23 |
| Ward | 1 | 4 | 1 | 6 |
| Patient | 0 | 2 | 0 | 2 |
| NursingStatus | 2 | 0 | 0 | 2 |
| Locations | 3 | 0 | 1 | 4 |
| (others) | ... | ... | ... | ... |

**Total: 80+ associations**

---

*END OF ASSOCIATIONS REFERENCE*
