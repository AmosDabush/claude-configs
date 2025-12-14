# Complete Tables Reference

> Source: qa_naharia database
> Generated: 2025-12-14
> Total Tables: 138

---

## SCHEMA: patients (56 tables)

### Core Patient/Case Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `patients` | Patient demographics | patient_id | id_number, first_name, last_name, birth_date |
| `patients_copy` | Copy table for patients | patient_id | (same as patients) |
| `cases` | Hospitalization episodes | case_id | patient_id, nursing_ward, bed_id, room_id, is_active |
| `cases_copy` | Copy table for cases | case_id | (same as cases) |
| `new_case` | New case tracking | case_id | is_new, nursing_doc, medical_doc |
| `new_case_copy` | Copy table | case_id | (same) |
| `new_case_old` | Archive | case_id | Legacy data |

### Location Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `beds` | Hospital beds | bed_id | ward_id, bed_desc |
| `beds_copy` | Copy table | bed_id | (same) |
| `rooms` | Hospital rooms | room_id | ward_id, room_desc, order_by |
| `rooms_copy` | Copy table | room_id | (same) |
| `locations` | Bed/room mapping | location_id | bed_id, room_id, nursing_ward |
| `locations_copy` | Copy table | location_id | (same) |
| `blocked_beds` | Blocked beds | bed_id | comment_block_bed, update_time |

### Clinical Data Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `infections` | Patient infections | composite | case_id, infection_name, infection_status |
| `infections_copy` | Copy table | composite | (same) |
| `case_isolation` | Isolation records | composite | case_id, isolation_type_id, isolation_type_desc |
| `case_isolation_copy` | Copy table | composite | (same) |
| `nursing_status` | Nursing status | case_id | nurs_status_id, status_update_date |
| `nursing_status_copy` | Copy table | case_id | (same) |
| `nursing_status_class` | Status classification | id | nurs_status_id, nurs_status_type |
| `nursing_status_type` | Status types | nurs_status_id | nurs_status_desc |
| `condition` | Patient condition | case_id | condition_code, condition_desc |
| `condition_copy` | Copy table | case_id | (same) |
| `pain_measurments` | Pain measurements | id | case_id, pain_score |
| `pain_measurments_copy` | Copy table | id | (same) |

### Surgery Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `surgery` | Completed surgeries | case_id | procedure_code, room_id, start_time |
| `surgery_copy` | Copy table | case_id | (same) |
| `surgery_waiting` | Waiting for surgery | id | case_id, priority_code, procedure_desc |
| `surgery_waiting_copy` | Copy table | id | (same) |
| `patients_in_surgery` | Currently in surgery | case_id | ward_id, entry_room_surgery |
| `patients_in_surgery_copy` | Copy table | case_id | (same) |

### Consultation/Discharge Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `consultations` | Consultation requests | request_id | case_id, consult_ward, consult_status |
| `consultations_copy` | Copy table | request_id | (same) |
| `document_discharge` | Discharge documents | id | case_id, document_discharge_code |
| `document_discharge_copy` | Copy table | id | (same) |
| `er_release` | ER release | case_id | release_status |
| `er_release_copy` | Copy table | case_id | (same) |

### Staff Assignment Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `nurses` | Nurse assignments | composite | case_id, nurse_id |
| `nurses_copy` | Copy table | composite | (same) |
| `nurse_exam` | Nurse examinations | id | case_id, exam_type |
| `nurse_exam_copy` | Copy table | id | (same) |

### Transport Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `transport` | Patient transport | composite | case_id, transport_id, transport_status_code |
| `transport_copy` | Copy table | composite | (same) |

### Other Patient Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `cards_agg` | Pre-aggregated patient cards | id | case_id, bed_id, JSONB columns |
| `cards_agg_changes_log` | Change log | id | Audit trail |
| `indications` | Clinical indications | id | case_id, indication_type |
| `indications_copy` | Copy table | id | (same) |
| `indication_icon` | Indication icons | id | icon_code |
| `monitored` | Monitored patients | id | case_id |
| `monitored_copy` | Copy table | id | (same) |
| `triage_data` | ER triage data | id | case_id, triage_score |
| `triage_data_copy` | Copy table | id | (same) |
| `doc_exam_copy` | Doctor examinations | id | case_id |
| `doc_exam_old` | Archive | id | Legacy |
| `patients_comments` | Patient comments | id | case_id, comment |

### Ambulance Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `ambulance_drives` | Ambulance drives | DriveId | AmbCompID, drive_status |
| `ambulance_patients` | Ambulance patients | id | drive_id, patient_id |

---

## SCHEMA: common (52 tables)

### Ward/Location Reference

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `wards` | Hospital wards | ward_id | ward_desc, is_icu, is_aran, ward_category |
| `wards_copy` | Copy table | ward_id | (same) |
| `ward_category` | Ward categories | category_id | category_desc, category_long_desc |
| `higher_wards` | Ward hierarchy | id | ward_id, higher_ward_code |
| `higher_wards_copy` | Copy table | id | (same) |
| `malrad_wards` | ER wards | id | ward_id |
| `malrad_wards_copy` | Copy table | id | (same) |
| `number_of_beds_in_ward` | Bed counts | ward_id | bed_count |
| `room_type` | Room types | id | type_desc |
| `room_type_details` | Room type details | id | room_type_id |

### Configuration Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `screen_settings` | Screen configuration | screen_id | screen_label, feature_order |
| `column_settings` | Column definitions | column_id | column_name, heb_name |
| `parameters` | System parameters | param_id | param_name, param_value |
| `param_type_value` | Parameter types | id | type_name |
| `source_system` | Source systems | id | system_name |
| `field_mappings` | Field mappings | id | source_field, target_field |

### Permissions Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `permissions` | Permission definitions | permission_id | permission_name |
| `permission_groups` | Permission groups | group_id | group_name |
| `modules` | System modules | module_id | module_name |
| `screens` | UI screens | screen_id | module_id, screen_name |
| `features` | Screen features | feature_id | screen_id, feature_name |
| `module_permissions` | Module-level permissions | id | module_id, group_id |
| `screen_permissions` | Screen-level permissions | id | screen_id, group_id |
| `feature_permissions` | Feature-level permissions | id | feature_id, group_id |
| `routes` | API routes | route_id | route_path |
| `routes_permissions` | Route permissions | id | route_id, group_id |
| `permissions_chameleon` | Chameleon permissions | id | chameleon_id |
| `permissions_chameleon_copy` | Copy table | id | (same) |
| `user_chameleon` | User-Chameleon mapping | id | user_id |
| `user_chameleon_copy` | Copy table | id | (same) |
| `login_user` | Login users | id | username |
| `groups_features` | Group-feature mapping | id | group_id, feature_id |
| `features_toggle_1` | Feature toggles | id | feature_name, enabled |

### Interface/Integration Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `interfaces_updates` | Interface update tracking | id | interface_name, last_update |
| `interface_frequency` | Update frequency | id | interface_name, frequency |
| `screen_interface_mapping` | Screen-interface mapping | id | screen_id, interface_id |

### Infection Aggregation

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `infections_agg` | Infection aggregation | id | infection_name, count |
| `infections_agg_copy` | Copy table | id | (same) |

### Other Common Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `log_table` | System logs | id | log_type, log_message |
| `action_history` | Action audit | id | action_type, timestamp |
| `user_app_usage` | Usage tracking | id | user_id, screen_id |
| `measurements` | Measurement definitions | id | measurement_name |
| `measurements_groups` | Measurement groups | id | group_name |
| `measurements_units` | Measurement units | id | unit_name |
| `ambulance_companies` | Ambulance companies | id | company_name |

---

## SCHEMA: labs (6 tables)

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `patients_lab_exam_details` | Lab results | id | case_id, exam_code, result, abnormal |
| `patients_lab_exam_details_copy` | Copy table | id | (same) |
| `blood_products` | Blood products | id | case_id, product_type |
| `blood_products_copy` | Copy table | id | (same) |
| `result_docs` | Result documents | id | case_id, doc_type |
| `result_docs_copy` | Copy table | id | (same) |

---

## SCHEMA: nursing (8 tables)

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `event` | Nursing events | id | case_id, event_type |
| `event_type` | Event types | id | type_desc |
| `shifts` | Nursing shifts | id | ward_id, shift_type |
| `ward_notes` | Ward notes | id | ward_id, note |
| `wards_order` | Ward ordering | id | ward_id, display_num |
| `display_name` | Display names | display_num | display_text |
| `mailed_events` | Email notifications | id | event_id, email_sent |
| `send_email` | Email queue | id | recipient, subject |

---

## SCHEMA: staff (4 tables)

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `active_employees` | Active staff | employee_id | name, role, ward_id |
| `active_employees_copy` | Copy table | employee_id | (same) |
| `presence_employees` | Staff presence | id | employee_id, check_in |
| `presence_employees_copy` | Copy table | id | (same) |

---

## SCHEMA: ambulance (7 tables)

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `ambulance_codes` | Ambulance codes | id | code, description |
| `dispatching_codes` | Dispatch codes | id | code, description |
| `drive_priority` | Drive priorities | id | priority_code |
| `field_mappings` | Field mappings | id | source, target |
| `healthcare_insurance_codes` | Insurance codes | id | code |
| `medical_condition_codes` | Medical codes | id | code |
| `patient_status_codes` | Status codes | id | code |

---

## SCHEMA: logistics (1 table)

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `operational_continuity` | Ops continuity | id | ward_id, status |

---

## SCHEMA: public (4 tables)

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|------------|
| `SequelizeMeta` | Migrations | name | Migration tracking |
| `cards_agg_diff` | Cards diff | id | Comparison data |
| `example_table` | Example | id | Test data |
| `tmp_src` | Temporary | id | Scratch data |

---

## COPY TABLE PATTERN

### Tables with _copy suffix: 40+

The following main tables have corresponding _copy tables:
- patients, cases, beds, rooms, locations
- infections, case_isolation, nursing_status
- surgery, surgery_waiting, patients_in_surgery
- consultations, document_discharge, er_release
- nurses, nurse_exam, transport
- indications, monitored, triage_data
- blood_products, result_docs
- active_employees, presence_employees
- higher_wards, malrad_wards, wards
- permissions_chameleon, user_chameleon
- infections_agg

### Evidence (qa_naharia)
- Main and copy tables have **identical counts**
- Sync mechanism is **UNKNOWN**

---

## TABLE COUNTS BY SCHEMA

| Schema | Tables | Copy Tables | Main Tables |
|--------|--------|-------------|-------------|
| patients | 56 | ~25 | ~31 |
| common | 52 | ~8 | ~44 |
| labs | 6 | 3 | 3 |
| nursing | 8 | 0 | 8 |
| staff | 4 | 2 | 2 |
| ambulance | 7 | 0 | 7 |
| logistics | 1 | 0 | 1 |
| public | 4 | 0 | 4 |
| **Total** | **138** | **~38** | **~100** |

---

*END OF TABLES REFERENCE*
