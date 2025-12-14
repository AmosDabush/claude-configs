# Domain Notes

> Business and domain knowledge discovered through conversation.

---

## Business Domain

**Fact**: The `db-connector-cloud` package serves a **hospital management system** called "coview-cloud".

---

## Domain Areas (from model analysis)

### Patient & Case Management

| Model | Purpose |
|-------|---------|
| Case | Central patient case entity (admission episode) |
| Patient | Patient demographic and identification |
| NewCase | New case intake records |
| PatientCondition | Patient medical conditions |
| CaseCopy, PatientCopy | Historical/backup tables |

### Ward & Bed Management

| Model | Purpose |
|-------|---------|
| Ward | Hospital ward/department |
| WardCategory | Ward categorization |
| Beds | Bed inventory and assignments |
| BlockedBeds | Temporarily unavailable beds |
| Rooms | Room configurations |
| RoomType | Room type definitions |
| Locations | Physical location tracking |

### Staff & Nursing

| Model | Purpose |
|-------|---------|
| Nurses | Nursing staff assignments |
| ActiveEmployees | Current active staff |
| PresenceEmployees | Staff presence tracking |
| NursingSupportStaff | Support staff records |
| Shifts | Shift schedules |

### Medical Events & Status

| Model | Purpose |
|-------|---------|
| NursingEvent | Nursing event logs |
| NursingStatus | Patient nursing status |
| NursingStatusClass | Status classifications |
| NursingStatusType | Status type taxonomy |
| Infections | Infection tracking |
| InfectionsAgg | Aggregated infection data |
| Isolations | Patient isolation records |
| Indications | Medical indications |

### Surgery

| Model | Purpose |
|-------|---------|
| Surgery | Surgery procedures |
| SurgeryWaiting | Surgery waiting list |
| PatientsInSurgery | Current surgery patients |

### Transport & Ambulance

| Model | Purpose |
|-------|---------|
| Transports | Patient transport records |
| AmbulanceDrives | Ambulance drive logs |
| AmbulancePatients | Ambulance patient tracking |
| AmbulanceCodes | Ambulance coding system |

---

## Vocabulary

| Term | Definition | Source |
|------|------------|--------|
| Case | A patient's admission episode; central entity | CLAUDE.md |
| Ward | Hospital department/unit with rooms and beds | Model analysis |
| Copy tables | Historical/backup variants (e.g., CaseCopy) | CLAUDE.md |
| Domain bundle | Pre-configured model collection for API use | CLAUDE.md |

---

## API Domains (22 identified)

From `src/domains/`:

```
casesApi, wardsApi, employeesApi, ambulanceDrivesApi, labsApi,
newCaseApi, surgeryApi, surgeryApiCloud, caseIsolationApi,
patientConditionApi, infectionsApi, nursingStatusApi, consultationsApi,
dischargeApi, locationsApi, transportApi, resultDocsApi, doctorDecisionApi,
monitorApi, patientsCardsAggregatorApi, indicationsApi, controlPanelDashboard
```

---

## Open Domain Questions

| # | Question | Hypothesis | Status |
|---|----------|------------|--------|
| DQ1 | Can one patient have multiple cases? | Yes - case = admission episode | Unconfirmed |
| DQ2 | What triggers Copy table population? | ETL/audit/backup process | Unconfirmed |
| DQ3 | How do isolations relate to infections? | Infections trigger isolation | Unconfirmed |

---

## Last Updated

2025-12-14
