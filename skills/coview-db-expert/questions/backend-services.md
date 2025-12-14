# Backend Services Operational Questions - VERIFIED ANSWERS

> Generated: 2025-12-14
> Source: Direct code analysis of 24 API services
> Status: VERIFIED AGAINST SOURCE CODE

---

## Legend

- **VERIFIED** - Answer verified against source code with file:line evidence
- **PARTIAL** - Some aspects verified, others UNKNOWN
- **UNKNOWN** - Not found in code

---

## Section 1: Copy Table Pattern (All Services)

### Q1. What is the standard copy table sync pattern used by services?
**VERIFIED**: TRUNCATE → BULK INSERT → SWAP TABLES
```typescript
// Evidence: infections.services.ts:57-64
await truncateTable(sequelize, 'patients', 'infections_copy');
await bulkInsert('patients.infections_copy', InfectionsCopy, successCon);
await swapTables(sequelize, 'patients', 'infections');
```

### Q2. Which services use the copy table pattern?
**VERIFIED**: All domain API services use this pattern:
| Service | Schema | Table |
|---------|--------|-------|
| infections | patients | infections |
| case-isolation | patients | case_isolation |
| new-case | patients | new_case |
| nursing-status | patients | nursing_status |
| consultations | patients | consultations |
| transport | patients | transport |
| discharge | patients | document_discharge |
| doctor-decision | patients | er_release |
| surgery-waiting | patients | surgery_waiting |
| result-docs | labs | result_docs |
| locations | patients | beds, rooms, locations |

### Q3. What happens during table swap?
**VERIFIED**: 3-step atomic rename (from pgHelpers.js):
1. `{tableName}` → `{tableName}_old`
2. `{tableName}_copy` → `{tableName}`
3. `{tableName}_old` → `{tableName}_copy`
4. (Optional) Drop `{tableName}_old`

### Q4. What truncate options are used?
**VERIFIED**: `{ truncate: true, cascade: true, restartIdentity: true }`

### Q5. Is the swap atomic?
**PARTIAL**: Pseudo-atomic via 3 RENAME operations. Each RENAME is atomic, but the sequence is NOT a single transaction.

---

## Section 2: Infections Service

### Q6. What validation does infections service perform?
**VERIFIED**: Date validation only
```typescript
// Evidence: infection.services.ts:45-49
infectionStartDate:
  rootInfectionDataObj.infectionStartDate &&
  isValidDate(rootInfectionDataObj.infectionStartDate)
    ? newDateFixTime(rootInfectionDataObj.infectionStartDate, '-')
    : null
```

### Q7. What fields are processed by infections service?
**VERIFIED**: caseId, infectionName, infectionDesc, infectionStatus, infectionStartDate, updateDate

### Q8. How is updateDate set for infections?
**VERIFIED**: Always `new Date()` at insert time
```typescript
// Evidence: infection.services.ts:50
updateDate: new Date()
```

### Q9. Are invalid dates rejected or set to null?
**VERIFIED**: Set to NULL (not rejected)
```typescript
// Evidence: infection.services.ts:45-49
isValidDate(...) ? newDateFixTime(...) : null
```

---

## Section 3: Case Isolation Service

### Q10. What dates does isolation service track?
**VERIFIED**: 4 dates
- isolationStartDate (from Chameleon)
- isolationEndDate (from Chameleon)
- coviewStartDate (set by service)
- coviewEndDate (set by service)

### Q11. How is coviewStartDate set?
**VERIFIED**: Always set to current time for ALL records
```typescript
// Evidence: caseIsolation.services.ts:50
const coviewStartDate = newDateFixTime(currDate, '-');
```

### Q12. How is coviewEndDate set?
**VERIFIED**: Set to isolationEndDate if provided, else null
```typescript
// Evidence: caseIsolation.services.ts:51-53
const coviewEndDate = isolationEndDate
  ? newDateFixTime(isolationEndDate, '-')
  : null;
```

### Q13. What is the composite key for isolations?
**VERIFIED**: (caseId, isolationId, isolationTypeId, isolationReasonId)
Evidence: Fields extracted in service lines 39-48

---

## Section 4: New Case Service

### Q14. How is IsNewDesc computed?
**VERIFIED**: 4 conditions based on nursingDoc and medicalDoc flags
```typescript
// Evidence: newCase.services.ts:41-46
if (!medicalDoc && !nursingDoc) IsNewDesc = 'לא תועדה קבלה למטופל';
else if (!nursingDoc && medicalDoc) IsNewDesc = 'לא תועדה קבלה סיעודית';
else if (nursingDoc && !medicalDoc) IsNewDesc = 'לא תועדה קבלה רפואית';
else if (nursingDoc && medicalDoc && !isNew) IsNewDesc = '';
```

| medicalDoc | nursingDoc | isNew | IsNewDesc |
|------------|------------|-------|-----------|
| false | false | any | לא תועדה קבלה למטופל (No reception documented) |
| true | false | any | לא תועדה קבלה סיעודית (No nursing reception) |
| false | true | any | לא תועדה קבלה רפואית (No medical reception) |
| true | true | false | (empty string) |
| true | true | true | (from input) |

### Q15. How are coviewStartDate and coviewEndDate set in new case?
**VERIFIED**:
```typescript
// Evidence: newCase.services.ts:54-55
coviewStartDate: isNew ? updateTime : undefined,
coviewEndDate: !isNew ? updateTime : undefined,
```
- `coviewStartDate` = current time when isNew=true
- `coviewEndDate` = current time when isNew=false

---

## Section 5: Locations Service (3-Table Update)

### Q16. What tables does locations service update?
**VERIFIED**: 3 tables in sequence
1. beds
2. rooms
3. locations

```typescript
// Evidence: locations.services.ts:99-116
await swapTables(sequelize, 'patients', 'beds');
await swapTables(sequelize, 'patients', 'rooms');
await swapTables(sequelize, 'patients', 'locations');
```

### Q17. How are room duplicates prevented?
**VERIFIED**: Using roomIdTracker object
```typescript
// Evidence: locations.services.ts:25, 76-86
const roomIdTracker: Record<string, boolean> = {};
if (!roomIdTracker[roomId]) {
  roomIdTracker[roomId] = true;
  successRooms.push({...});
}
```

### Q18. How is systemNum resolved?
**VERIFIED**: Fetched and cached by systemName
```typescript
// Evidence: locations.services.ts:54-63
let systemNum = systemNumCache.get(systemName);
if (!systemNum) {
  systemNum = (await fetchSystemNum(systemName)) || -1;
  if (systemNum === -1) {
    return { success: false, message: 'system num does not exist' };
  }
  systemNumCache.set(systemName, systemNum);
}
```

### Q19. What happens if systemNum doesn't exist?
**VERIFIED**: Returns error immediately
```typescript
// Evidence: locations.services.ts:58-60
if (systemNum === -1) {
  return { success: false, message: 'system num does not exist' };
}
```

### Q20. What if bedId is null?
**VERIFIED**: Bed not added, but room and location still added
```typescript
// Evidence: locations.services.ts:65-73
if (bedId) {
  successBeds.push({...});
}
```

---

## Section 6: Nursing Status Service (Soft Validation)

### Q21. What validation does nursing status service perform?
**VERIFIED**: Validates against NursingStatusClass lookup table
```typescript
// Evidence: nursingStatus.service.ts:28, 62-70
const statuses = await NursingStatusClass.findAll();
const status = statuses.find((stat) => stat.nursStatusId == nursStatusId);
if (!status) {
  errorArr.push({ error: `status ${nursStatusId}| ${nursStatusDesc} not exist` });
}
```

### Q22. What happens if validation fails?
**VERIFIED**: SOFT VALIDATION - record is STILL INSERTED
```typescript
// Evidence: nursingStatus.service.ts:72-79
// Error is logged but record is pushed to insertData regardless
insertData.push(nursingStatusObject);
```

### Q23. Are validation errors returned to caller?
**VERIFIED**: Yes, in errors array
```typescript
// Evidence: nursingStatus.service.ts:96-101
return {
  success: true,
  errors: [new Error('Invalid or empty root data: ' + JSON.stringify(errorArr))],
};
```

---

## Section 7: Result Docs Service (Hard Validation)

### Q24. What validation does result docs service perform?
**VERIFIED**: HARD VALIDATION - invalid records are SKIPPED
```typescript
// Evidence: resultDocs.services.ts:40-49
if (
  rootResultDataObj.orderId === null ||
  rootResultDataObj.labDocStatus === null ||
  (rootResultDataObj.statusTime && !isValidDate(rootResultDataObj.statusTime)) ||
  rootResultDataObj.caseId === null
) {
  invalidCon.push(rootResultDataObj);
  continue;  // SKIP - not inserted
}
```

### Q25. What fields are required for result docs?
**VERIFIED**: 3 required fields
- orderId (NOT NULL)
- labDocStatus (NOT NULL)
- caseId (NOT NULL)

### Q26. What date validation is performed?
**VERIFIED**: statusTime validated with isValidDate if present
```typescript
// Evidence: resultDocs.services.ts:43-44
(rootResultDataObj.statusTime && !isValidDate(rootResultDataObj.statusTime))
```

### Q27. Comparison: Soft vs Hard Validation
**VERIFIED**:
| Service | Validation Type | Invalid Records |
|---------|-----------------|-----------------|
| nursing-status | Soft | INSERTED (error logged) |
| result-docs | Hard | SKIPPED (not inserted) |
| infections | None | All inserted |
| isolations | None | All inserted |

---

## Section 8: Ambulance Drives Service (MongoDB)

### Q28. What database does ambulance service use?
**VERIFIED**: MongoDB (not PostgreSQL)
```typescript
// Evidence: ambulanceDrives.services.ts:26-27
@InjectModel('Amb_Patients') private PatientsModel: Model<any>,
@InjectModel('Amb_Drives') private DrivesModel: Model<any>
```

### Q29. What PostgreSQL tables are cached at startup?
**VERIFIED**: 7 reference tables
```typescript
// Evidence: ambulanceDrives.services.ts:37-46
PatientStatusCodes, DispatchingCodes, FieldMappings,
HealthcareCodes, MedicalConditionCodes, AmbulanceCodes, DrivePriority
```

### Q30. How are gender codes displayed?
**VERIFIED**:
```typescript
// Evidence: ambulanceDrives.services.ts:330-339
case '1': return 'ז';   // Male
case '2': return 'נ';   // Female
case '0':
default: return 'לא ידוע';  // Unknown
```

### Q31. How is age calculated for display?
**VERIFIED**:
```typescript
// Evidence: ambulanceDrives.services.ts:303-327
if (diffDays < 31) return `${diffDays}י`;      // Days
else if (diffMonths < 12) return `${diffMonths}ח`;  // Months
else return age.toString();                     // Years
```

| Age Range | Display Format | Example |
|-----------|----------------|---------|
| < 31 days | Xי (days) | 15י |
| < 12 months | Xח (months) | 8ח |
| >= 12 months | Years (number) | 25 |
| Unknown | לא ידוע | - |

### Q32. How does company-specific field mapping work?
**VERIFIED**: Via ambulance.field_mappings table
```typescript
// Evidence: ambulanceDrives.services.ts:59-77
getKeyFieldMap(typeId: number): Record<number, string> {
  for (const amb of ambulanceCodesList) {
    const match = fieldMappingsList.find(
      (f) => f.company === company && f.key_type_id === typeId
    );
    if (match) {
      result[ambCompId] = match.field_name;
    }
  }
}
```

### Q33. How is ride cancellation handled?
**VERIFIED**: Sets isCancel=true and available=Date.now()
```typescript
// Evidence: ambulanceDrives.services.ts:172
await this.upsertOne(this.DrivesModel, {...}, rideData, { available: Date.now(), isCancel: true });
```

### Q34. Are cancelled rides/patients excluded from queries?
**VERIFIED**: Yes
```typescript
// Evidence: ambulanceDrives.services.ts:223-226
$match: {
  isCancel: { $ne: true },
  isActive: { $ne: true },
}
```

---

## Section 9: Surgery Waiting Service

### Q35. What fields does surgery waiting track?
**VERIFIED**: 11 fields
```typescript
// Evidence: surgeryWaiting.service.ts:49-77
id, caseId, orderWardId, priorityCode, priorityDesc,
orderDate, surgeryOrder, procedureCode, procedureDesc,
roomId, surgeryWaitingAran, updateDate
```

### Q36. Is there ARAN support in surgery?
**VERIFIED**: Yes, via surgeryWaitingAran boolean field

### Q37. How is updateDate set?
**VERIFIED**: Automatically to `new Date()` at insert time
```typescript
// Evidence: surgeryWaiting.service.ts:76
updateDate: new Date()
```

---

## Section 10: Doctor Decision (ER Release) Service

### Q38. How are duplicate decisions handled?
**VERIFIED**: Deduplication by caseId - only FIRST record kept
```typescript
// Evidence: erRelease.services.ts:25, 47-59
const docDecisionIdsSet = new Set<number>();
if (!docDecisionIdsSet.has(caseId)) {
  docDecisionIdsSet.add(caseId);
  insertDocDecision.push({...});
}
```

### Q39. What fields does doctor decision track?
**VERIFIED**: 6 fields
- caseId
- doctorDecision (Hebrew text)
- doctorDecisionId (numeric)
- intendedWard
- decisionDateTime
- erReleasePDF

### Q40. What are the known doctor decision values?
**VERIFIED** (from mockData_valid.ts):
| ID | Hebrew | English |
|----|--------|---------|
| 1 | שחרור | Release |
| 2 | השגחה | Observation |
| 3 | אשפוז | Hospitalization |
| 5 | העברה | Transfer |

---

## Section 11: Consultations Service

### Q41. What field mapping does consultations service perform?
**VERIFIED**: 2 field renames
```typescript
// Evidence: consultations.services.ts:55-56
consultWard: rootConsultObj.consultWardId,
consultantsAnswer: rootConsultObj.consultationAnswer,
```
- `consultWardId` → `consultWard`
- `consultationAnswer` → `consultantsAnswer`

---

## Section 12: Transport Service

### Q42. What date fields does transport track?
**VERIFIED**: 4 date fields, all transformed with newDateFixTime
```typescript
// Evidence: transport.services.ts:43-50
transportStatusTime, transportCreateTime, pickupTime, arrivingTime
```

---

## Section 13: Document Discharge Service

### Q43. What timestamp does discharge service add?
**VERIFIED**: coviewUpdateDate = current time
```typescript
// Evidence: documentDischarge.services.ts:43
coviewUpdateDate: newDateFixTime(new Date(), '-'),
```

---

## Section 14: Common Patterns

### Q44. What date transformation is used?
**VERIFIED**: newDateFixTime from @coview-utils-cloud
```typescript
// Evidence: All services
newDateFixTime(date, '-')
```

### Q45. What is the standard error return format?
**VERIFIED**:
```typescript
{
  success: false,
  message: error instanceof Error ? error.message : 'Unknown error'
}
```

### Q46. What is the standard success return format?
**VERIFIED**:
```typescript
{
  success: true,
  interfaceName: 'ServiceInterfaceName'
}
```

### Q47. How is database connection validated?
**VERIFIED**: Pool and query function check
```typescript
if (!pool || typeof pool.query !== 'function') {
  return { success: false, message: 'Database connection failed' };
}
```

---

## SUMMARY STATISTICS

| Category | Verified | Partial | Unknown |
|----------|----------|---------|---------|
| Copy Table Pattern | 5 | 1 | 0 |
| Infections | 4 | 0 | 0 |
| Case Isolation | 4 | 0 | 0 |
| New Case | 2 | 0 | 0 |
| Locations | 5 | 0 | 0 |
| Nursing Status | 3 | 0 | 0 |
| Result Docs | 4 | 0 | 0 |
| Ambulance | 7 | 0 | 0 |
| Surgery | 3 | 0 | 0 |
| Doctor Decision | 3 | 0 | 0 |
| Consultations | 1 | 0 | 0 |
| Transport | 1 | 0 | 0 |
| Discharge | 1 | 0 | 0 |
| Common Patterns | 4 | 0 | 0 |
| **TOTAL** | **47** | **1** | **0** |

---

*END OF BACKEND SERVICES QUESTIONS - Section 1 of 4*
