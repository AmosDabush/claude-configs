# Operational Questions Bank

> Generated: 2025-12-14
> Total Questions: 1283

---

## Section: Patient Card Aggregation (patients-cards-aggregator)

### Full vs Delta Aggregation Logic

1. What determines whether a full aggregation or delta update runs?
2. When Cases_API publishes a message, does it trigger FULL or DELTA aggregation?
3. When Infection_API publishes a message, does it trigger FULL or DELTA aggregation?
4. What happens if both a FULL trigger and DELTA trigger arrive simultaneously?
5. Which Redis topics trigger full aggregation?
6. Which Redis topics trigger delta updates?
7. How does the aggregator decide which delta query to run for a given topic?
8. What happens if a delta query returns zero affected rows?
9. What is published to Redis after a successful delta update?
10. What is published to Redis after a successful full aggregation?
11. How many cases are reported in the Redis publish payload?
12. What information is included in the published payload besides case count?
13. Why does the full aggregation check for `affected_total`, `inserted_count`, and `updated_count`?
14. What happens if the full aggregation query returns undefined summary?
15. When would `inserted_count` be greater than zero but `updated_count` be zero?
16. What determines the value of `affected_total` in the aggregation summary?

### Similar Name Detection

17. How does similar name detection determine if two patients have similar names?
18. Does similar name matching consider first name only, last name only, or both?
19. Can a patient trigger similar name detection by matching their first name with another patient's last name?
20. What role does `chameleon_ward_id` play in similar name detection?
21. What role does `chameleon_satellite_ward_id` play in similar name detection?
22. If two patients are in the same ward but have different satellite wards, can they still match as similar names?
23. If patient A is in ward 5 with no satellite, and patient B is in satellite 10, will they be compared for similar names?
24. How does the system handle cases where both patients have the same satellite ward?
25. Why does similar name detection use `LOWER(TRIM(...))` on name fields?
26. What happens if a patient has a NULL first name or last name in similar name detection?
27. Does similar name detection compare patients across different departments?
28. How is `has_similar_name` computed - as a boolean or a count?
29. If multiple patients match a similar name, does the flag simply become TRUE, or is a count tracked?
30. Why does similar name matching explicitly check `p1.id_number <> p2.id_number`?
31. What happens if two records have the same ID number but different names?

### Discharge Logic

32. What determines the value of `discharge_stage` in the discharge aggregation?
33. When does `discharge_stage` become 'nursing'?
34. When does `discharge_stage` become 'medical'?
35. When does `discharge_stage` become 'none'?
36. If both `document_discharge_code = 1` and `document_discharge_code = 2` exist, which wins?
37. What is the difference between `document_discharge` and `new_case` tables in discharge logic?
38. What does `no_nursing_doc` represent?
39. What does `no_medical_doc` represent?
40. How is `no_nursing_doc` computed from the `new_case` table?
41. How is `no_medical_doc` computed from the `new_case` table?
42. What is the default value of `no_nursing_doc` if no matching `new_case` record exists?
43. What is the default value of `no_medical_doc` if no matching `new_case` record exists?
44. Why are discharge documents ordered by `document_discharge_date DESC NULLS LAST`?
45. What information is included in each discharge document object in the `discharge_docs` array?
46. Can a case have multiple discharge documents?
47. How are multiple discharge documents prioritized?
48. What happens if a case has a discharge document but no corresponding `new_case` record?
49. What happens if a case has a `new_case` record but no discharge documents?

### Discharge Delta Updates

50. What triggers a discharge delta update to "reset" a case?
51. What triggers a discharge delta update to "update" a case?
52. When is a case's discharge information reset to 'none'?
53. What does it mean when a delta query returns 'reset' vs 'update' as change_type?
54. How does the delta query determine if a case's discharge information has changed?
55. What is the purpose of the `IS DISTINCT FROM` operator in delta queries?
56. Why does the delta query use a temp table `tmp_grouped_discharge`?
57. What happens to the temp table after the transaction completes?
58. What does `ON COMMIT DROP` mean in the context of temp tables?
59. Why is an index created on `tmp_grouped_discharge(case_id)`?
60. What is the performance benefit of creating an index on the temp table?

### Nursing Status Aggregation

61. What nursing status types exist in the system?
62. What does `nurs_status_type = 2` represent?
63. What does `nurs_status_type = 3` represent?
64. How are fall risks identified in the nursing status aggregation?
65. How are respirators identified in the nursing status aggregation?
66. What is the difference between the `respirators` field from nursing_status vs the `respirators` field from condition table?
67. Can a case have both respirator entries from nursing_status AND from the condition table?
68. Which source of respirator data takes precedence?
69. How are nursing statuses ordered in the aggregation?
70. Why is `update_date DESC` used in nursing status ordering?
71. What happens if a case has multiple nursing statuses with the same type?
72. How does the system handle NULL nursing status descriptions?
73. What is the default value for `fall_risk` if no type-3 statuses exist?
74. What is the default value for `nursing` if no nursing_status records exist?

### Respiration Detection

75. What parameter determines which condition codes are considered respirators?
76. Where is the `RespirationCodesCham` parameter stored?
77. What param_group is used to look up respiration codes?
78. How is the raw parameter value parsed into individual codes?
79. What happens if the parameter value contains spaces or parentheses?
80. How are multiple respiration codes separated in the parameter?
81. What happens if a condition code is NULL?
82. Why does the query filter `WHERE patient_condition_code IS NOT NULL`?
83. How are respiration conditions ordered in the result?
84. What date format is used for respiration dates in the aggregation?
85. What is the difference between `date` and `raw_date` in respiration objects?
86. What does the 'source' field in respiration objects indicate?
87. Can there be respiration entries from sources other than 'condition'?

### Isolation and Infection Tracking

88. How is the "latest" isolation determined when multiple isolations exist for the same case?
89. What dates are considered when determining the latest isolation?
90. If `isolation_end_date` and `coview_end_date` both exist, which is prioritized?
91. If all isolation dates are NULL, how is the "latest" determined?
92. What is the difference between `isolation_start_date` and `coview_start_date`?
93. What is the difference between `isolation_end_date` and `coview_end_date`?
94. Why might Chameleon dates differ from CoView dates?
95. Which system is the source of truth for isolation dates - Chameleon or CoView?
96. How are isolations ordered in the aggregation result?
97. Can a case have multiple active isolations simultaneously?
98. How is `isolation_type_id` different from `isolation_reason_id`?
99. What happens if an isolation has a type but no reason?
100. What happens if an isolation has a reason but no type?

### Infection Tracking

101. How is the "latest" infection determined for a case?
102. What determines uniqueness for infections - is it by infection_name only?
103. Can a case have the same infection_name twice with different statuses?
104. How does `DISTINCT ON (i.case_id, i.infection_name)` work?
105. If an infection has multiple rows with the same name, which one is kept?
106. What does `infection_status` represent?
107. What are the possible values for `infection_status`?
108. How are infections ordered within a case?
109. Why is `update_date DESC` used when selecting distinct infections?
110. What is the default value for infections if a case has no infection records?

### Lab Results Processing

111. What constitutes a "panic" lab result?
112. What constitutes an "invalid" lab result?
113. How are lab results with `abnormal = 'HH'` classified?
114. How are lab results with `abnormal = 'LL'` classified?
115. How are lab results with `abnormal = 'X'` classified?
116. How are lab results with `abnormal = 'INVALID'` classified?
117. Can a single lab result appear in multiple categories (lab_results, panic_result, invalid_result)?
118. How are lab results ordered in the aggregation?
119. Why is `result_time DESC NULLS LAST` used for ordering lab results?
120. What information is included in the full `lab_results` array vs the `panic_result` array?
121. What is `result_doc_time` and how does it differ from `result_time`?
122. What is the `performing_lab` field?
123. What does `result_status` indicate?

### Consultation Tracking

124. What information is tracked for each consultation?
125. What does `consult_status` represent?
126. What does `urgency` indicate in a consultation?
127. What is the difference between `requester_name`, `requester_name_desc`, and `requester_name_ad`?
128. What is the difference between `counselors_name`, `counselors_desc`, and `counselors_name_ad`?
129. What does `is_delayed` indicate?
130. How is a consultation determined to be delayed?
131. What is `planned_visit_date` and how does it relate to delay status?
132. What is the relationship between `status_date` and `is_delayed`?
133. How are consultations ordered in the aggregation?
134. Can a case have multiple active consultations?
135. What is `consult_inviting_ward_id`?
136. What is `consult_ward` and how does it differ from `consult_inviting_ward_id`?
137. What is stored in `defining_problem` vs `consultation_question`?
138. What is stored in `consultants_answer`?
139. What is `follow_up` in the consultation context?

### Nurse Assignment

140. How are nurses assigned to cases tracked?
141. Can a case have multiple nurses assigned?
142. How are multiple nurses ordered in the aggregation?
143. What is `nursing_ward` and how does it relate to the case's ward?
144. Can a nurse be assigned to a case in a different ward?
145. What is `nurse_room_number` and why is it tracked?
146. What does `update_date` represent in the nurse context?
147. How is the most recent nurse assignment determined?
148. What is the difference between `nurse_first_name` and `nurse_sur_name`?
149. What is `nurse_user_name` used for?
150. Can a case have zero assigned nurses?

### Events Tracking

151. What constitutes an "event" in the system?
152. How is `has_events` determined?
153. What table stores events?
154. What schema contains the event table?
155. Why is `WHERE e.case_id IS NOT NULL` used in the events query?
156. What happens if a case has no events?
157. Is the number of events tracked, or just a boolean flag?
158. What additional event information is NOT included in the aggregation?

### Blocked Beds

159. What does it mean for a bed to be "blocked"?
160. How are blocked beds tracked?
161. Can a bed have multiple blocking records?
162. What information is stored for each blocked bed entry?
163. What is `comment_block_bed`?
164. What is `system_num` in the blocked bed context?
165. How are multiple blocked bed entries ordered?
166. Why is `update_time DESC` used for ordering blocked bed entries?
167. What happens if a bed is currently in use but also has a blocking record?
168. Can a patient be assigned to a blocked bed?

### Bed and Case Relationships

169. What happens when a bed exists but no case is assigned to it?
170. What happens when a case exists but no bed is assigned?
171. How is `bed_id` constructed when a case has no bed?
172. What does a `bed_id` starting with 'NO_BED_' indicate?
173. What room_id is used for the synthetic 'NO_BED_' bed_id?
174. How does the system handle cases where both case.bed_id and location.bed_id exist but differ?
175. Which takes precedence: case.bed_id or location.bed_id?
176. What is the relationship between beds, locations, and cases tables?

### Room Validation

177. What conditions must be met for a room to be considered valid?
178. Why does room validation check both patients.rooms and patients.locations?
179. What happens if a room exists in the rooms table but not in locations?
180. What happens if a room exists in locations but not in rooms?
181. Why would a room fail validation even if it has a non-NULL room_id?
182. What values are returned for room_id, room_desc, and order_by when validation fails?
183. How does failed room validation affect bed assignments?

### Empty Rooms Logic

184. What constitutes an "empty room"?
185. Why are empty rooms included in the aggregation?
186. What is the case_id for an empty room?
187. What is the bed_id for an empty room?
188. What patient information is included for empty rooms?
189. How is an empty room identified - what two conditions must be true?
190. Can a room be considered empty if it has cases but no beds?
191. Can a room be considered empty if it has beds but no cases?
192. What is the purpose of including empty rooms in the aggregation?

### Ward Hierarchy

193. What is the difference between `chameleon_ward_id` and `chameleon_satellite_ward_id`?
194. Can a case have a satellite ward without a main ward?
195. Can a case have a main ward without a satellite ward?
196. What does it mean when `chameleon_satellite_ward_id` is NULL?
197. How does ward hierarchy affect similar name detection?
198. Which ward description is displayed - main or satellite?
199. What determines which ward description (`ward_desc`) is shown: `w_sat`, `w_main`, or `w_room`?
200. What is the precedence order for ward description selection?
201. Why might `w_room.ward_desc` be different from `w_main.ward_desc`?

### FULL OUTER JOIN Logic

202. Why is a FULL OUTER JOIN used between cases and beds?
203. What scenarios does the FULL OUTER JOIN capture?
204. Can there be beds without cases in the result?
205. Can there be cases without beds in the result?
206. What happens when both case and bed are NULL after the FULL OUTER JOIN?
207. How is the final WHERE clause `(c.case_id IS NOT NULL OR b.bed_id IS NOT NULL)` evaluated?
208. Why is this WHERE condition needed after a FULL OUTER JOIN?

### Delta Update Mechanism

209. What is the purpose of "reset" updates in delta queries?
210. What is the purpose of "update" updates in delta queries?
211. Why are both reset and update combined in a single UNION ALL?
212. What happens to cases that are neither reset nor updated?
213. How does the system detect that a case needs updating?
214. What does `ca.nurses IS DISTINCT FROM t.nurses` check?
215. Why not just use `ca.nurses <> t.nurses`?
216. How does IS DISTINCT FROM handle NULL values differently than <>?
217. What happens if the source table is empty during a delta update?

### Staleness Queries

218. What does "staleness" mean in the context of patient cards?
219. How is staleness detected?
220. What triggers a staleness check?
221. Is there a staleness threshold (time-based)?
222. How does the system handle stale data?

### Upsert Queries

223. What operations are performed in upsert queries?
224. How does the system decide between INSERT and UPDATE?
225. What conflict resolution strategy is used for upserts?
226. What unique constraints determine conflicts?

### SubAndPartials Queries

227. What are "subqueries" in the context of patient cards?
228. What are "partial" updates?
229. How do subqueries differ from full aggregations?
230. When are subqueries used vs full queries?
231. What is the performance benefit of using subqueries?

### Redis Message Handling

232. What Redis topics does the aggregator subscribe to?
233. What happens when an unknown topic message arrives?
234. How is message parsing handled?
235. What happens if a message is not valid JSON?
236. What information is extracted from incoming messages?
237. Is wardId used in message processing?
238. Why was wardId removed from message handling?

### Aggregation Timing and Triggers

239. What causes a full aggregation to run?
240. What causes a delta update to run?
241. Can delta updates run concurrently?
242. Can full and delta updates run concurrently?
243. What happens if a full aggregation starts while a delta is running?
244. What happens if multiple delta updates for different topics arrive simultaneously?
245. How is concurrency controlled?
246. Are delta updates transactional?
247. What is the transaction boundary for a delta update?

### Performance and Optimization

248. Why are temp tables used instead of subqueries for delta updates?
249. Why are indexes created on temp tables?
250. What is the performance impact of creating indexes on temp tables?
251. How large can the `cards_agg` table grow?
252. What is the expected latency for a delta update?
253. What is the expected latency for a full aggregation?
254. How many rows are typically affected in a delta update?
255. How many rows are typically affected in a full aggregation?

---

## Section: Discharge Management (discharge API)

### Document Discharge Processing

256. What is the purpose of the document_discharge table?
257. What types of discharge documents exist?
258. What is `document_discharge_code`?
259. What does `document_discharge_code = 1` represent?
260. What does `document_discharge_code = 2` represent?
261. What is `document_discharge_type`?
262. What is `records_name` in discharge documents?
263. What is `records_type` in discharge documents?
264. What is the difference between `document_discharge_date` and `coview_update_date`?

### Discharge Table Swapping

265. Why does the discharge service use a copy table pattern?
266. What is the purpose of `document_discharge_copy`?
267. What happens during a table swap operation?
268. How is atomicity ensured during table swaps?
269. What happens to in-flight queries during a table swap?
270. Can data be lost during a table swap?
271. What is the order of operations: truncate, insert, swap?
272. Why is truncate performed before insert?
273. What happens if the swap operation fails?
274. Is there a rollback mechanism for failed swaps?

### Date Transformation in Discharge

275. What is `newDateFixTime` function used for?
276. Why do discharge dates need time fixing?
277. What timezone is used for discharge date transformations?
278. What happens if `document_discharge_date` is NULL?
279. How does the system handle missing discharge dates?

---

## Section: Surgery Workflow (surgery API)

### Patients in Surgery

280. What table tracks patients currently in surgery?
281. What information is tracked for a patient in surgery?
282. What is `entry_room_surgery`?
283. What is `procedure_code` vs `procedure_desc`?
284. How is `update_date` set for surgery records?
285. When is a patient added to `patients_in_surgery`?
286. When is a patient removed from `patients_in_surgery`?
287. Can a patient be in surgery in multiple rooms?

### Surgery Waiting List

288. What table tracks patients waiting for surgery?
289. What is `surgery_waiting` table used for?
290. What information is tracked for waiting patients?
291. What is `priority_code` vs `priority_desc`?
292. What priority codes exist?
293. How is surgery priority determined?
294. What is `order_date` in surgery context?
295. What is `surgery_order` field?
296. What is `surgery_waiting_aran`?
297. What is `order_ward_id`?
298. How are waiting patients ordered?

### Surgery State Transitions

299. What are the possible states for a surgery patient?
300. When does a patient move from waiting to in-surgery?
301. When does a patient move from in-surgery to completed?
302. Is there a post-surgery state tracked?
303. How is surgery completion recorded?
304. What happens if a surgery is cancelled?
305. What happens if a surgery is postponed?

### Surgery Copy Table Pattern

306. Why does the surgery service use copy tables?
307. What is `patients_in_surgery_copy` used for?
308. What is `surgery_waiting_copy` used for?
309. How often are surgery tables swapped?
310. What triggers a surgery table update?
311. Can surgery data be updated incrementally?
312. Why is full replacement used instead of delta updates?

---

## Section: Case Management (coview-cases-cloud)

### Case and Patient Separation

313. Why are cases and patients stored in separate tables?
314. What is the relationship between a patient and a case?
315. Can a patient have multiple cases?
316. Can a patient have multiple active cases simultaneously?
317. What uniquely identifies a case?
318. What uniquely identifies a patient?
319. How is `case_id` generated?
320. How is `patient_id` generated?

### Case Update Validation

321. What is the purpose of `validateUpdateSize` function?
322. What does the 20% difference threshold check?
323. Why would a case update be rejected due to size validation?
324. What is the "tries count" in validation context?
325. How many retries are allowed for failed updates?
326. What happens after maximum retries are exceeded?
327. What is stored in `lastUpdateDataSize`?

### Case Data Processing

328. What does `processRootData` function do?
329. How are incoming records split into patients and cases?
330. What fields belong to the patient vs the case?
331. How are NULL fields handled during processing?
332. What transformations are applied during processing?

### Case Copy Table Workflow

333. Why are both `patients_copy` and `cases_copy` truncated?
334. Why is patient data inserted before case data?
335. Can cases be inserted if patient inserts fail?
336. What is the dependency between patients and cases tables?
337. What foreign keys link cases to patients?
338. How is referential integrity maintained during table swaps?

### Case Table Swapping

339. What is the order of table swaps for cases?
340. Are patients swapped before or after cases?
341. Why does the order matter?
342. What happens if the patients swap succeeds but cases swap fails?
343. Is there transaction protection across both swaps?

### Case State and Lifecycle

344. What is `admission_date` and when is it set?
345. What is `revisit` flag?
346. How is a revisit case different from a new case?
347. What is `days_in_ward`?
348. How is `days_in_ward` calculated?
349. Is `days_in_ward` updated continuously or at specific events?
350. What happens when a case is transferred between wards?

---

## Section: Nursing Status (nursing-status API)

### Nursing Status Types

351. What is the `nursing_status` table?
352. What is the `nursing_status_class` table?
353. What is the relationship between these two tables?
354. How many nursing status types exist?
355. What does each nursing status type represent?
356. Can a case have multiple nursing statuses?
357. Can a case have multiple statuses of the same type?

### Nursing Status Updates

358. How are nursing statuses updated?
359. Are nursing status updates full or incremental?
360. What triggers a nursing status update?
361. How is the most recent nursing status determined?
362. Can nursing statuses be removed?
363. How is nursing status removal handled?

---

## Section: Locations and Wards (locations API, coview-wards-cloud)

### Location Hierarchy

364. What is the hierarchy: hospital → ward → room → bed?
365. Can a bed exist without a room?
366. Can a room exist without a ward?
367. Can a ward exist without a hospital?
368. What is stored in the `locations` table?
369. What is stored in the `rooms` table?
370. What is stored in the `beds` table?
371. What is stored in the `wards` table?

### Ward Management

372. What is a "ward" in CoView?
373. What is a "satellite ward"?
374. How do satellite wards differ from main wards?
375. Can a bed belong to multiple wards?
376. Can a room belong to multiple wards?
377. What is `ward_id` format?
378. What is `ward_desc`?
379. How are wards ordered in displays?

### Room Management

380. What is `room_id` format?
381. What is `room_desc`?
382. What is `order_by` field in rooms?
383. How does `order_by` affect room display?
384. Can rooms have the same `order_by` value?
385. What happens if `order_by` is NULL or empty?
386. Can a room change wards?

### Bed Management

387. What is `bed_id` format?
388. What is `bed_desc`?
389. Can a bed move between rooms?
390. How is bed availability tracked?
391. What is bed capacity per room?
392. Is there a maximum beds per room?
393. How are bed positions determined?

### Location Copy Table Pattern

394. Does the locations API use copy tables?
395. How often are location tables updated?
396. What triggers a location update?
397. Can locations be updated incrementally?
398. What happens if a room is deleted while a patient is assigned to it?
399. What happens if a bed is deleted while occupied?

---

## Section: Infections (infections API)

### Infection Tracking

400. What is tracked in the `infections` table?
401. What is `infection_name`?
402. What is `infection_desc`?
403. What is `infection_status`?
404. What are the possible infection statuses?
405. What is `infection_start_date`?
406. How is infection resolution tracked?
407. Is there an `infection_end_date`?
408. Can an infection reoccur?

### Infection Updates

409. How are infection updates published?
410. What triggers an infection delta update?
411. How is the latest infection determined when there are duplicates?
412. Can a case have the same infection name with different statuses?
413. What happens when an infection is resolved?
414. How does infection status change over time?

---

## Section: Case Isolation (case-isolation API)

### Isolation Types and Reasons

415. What is `isolation_type_id`?
416. What is `isolation_reason_id`?
417. How many isolation types exist?
418. How many isolation reasons exist?
419. Can an isolation have multiple reasons?
420. Can an isolation have multiple types?
421. What is the relationship between isolation type and reason?

### Isolation Lifecycle

422. What is `isolation_start_date`?
423. What is `isolation_end_date`?
424. What is `coview_start_date`?
425. What is `coview_end_date`?
426. Why are there both Chameleon and CoView dates?
427. Which date source is authoritative?
428. Can an isolation have a start date but no end date?
429. What does a NULL end date indicate?
430. How is an active isolation identified?
431. How is a completed isolation identified?

### Isolation Updates

432. What triggers an isolation update?
433. Are isolation updates full or delta?
434. How are isolation changes tracked?
435. Can an isolation be cancelled?
436. Can an isolation be extended?
437. How is isolation extension recorded?

---

## Section: Consultations (consultations API)

### Consultation Workflow

438. What is a consultation in CoView?
439. What is `request_id`?
440. What is `request_date`?
441. What is `requester_name`?
442. What is `consult_ward`?
443. What is the difference between requesting ward and consulting ward?
444. What is `urgency` in consultation context?
445. What urgency levels exist?

### Consultation Status

446. What is `consult_status`?
447. What consultation statuses exist?
448. What is the consultation lifecycle?
449. When is a consultation created?
450. When is a consultation accepted?
451. When is a consultation completed?
452. When is a consultation cancelled?
453. What is `status_date`?
454. How is `status_date` different from `request_date`?

### Consultation Scheduling

455. What is `planned_visit_date`?
456. How is `is_delayed` determined?
457. What makes a consultation delayed?
458. Is delay calculated automatically or set manually?
459. What happens when a delayed consultation is completed?
460. Can a consultation be rescheduled?

### Consultation Content

461. What is `defining_problem`?
462. What is `consultation_question`?
463. What is `consultants_answer`?
464. What is `follow_up`?
465. Who can provide a consultant's answer?
466. When is the consultant's answer recorded?
467. Can a consultation have multiple answers?
468. What is `counselors_name` vs `counselors_desc` vs `counselors_name_ad`?

---

## Section: Laboratory Results (coview-labs)

### Lab Sample Processing

469. What is `sample_num`?
470. How is a lab sample uniquely identified?
471. Can a sample have multiple tests?
472. What is `collection_time`?
473. What is `result_time`?
474. What is the expected time between collection and result?
475. What causes delays between collection and result?

### Lab Tests and Results

476. What is `test_code`?
477. What is `test_desc`?
478. How many test types exist?
479. What is stored in the `result` field?
480. What data types can `result` contain?
481. What is `unit` in lab context?
482. How are units determined for each test?

### Abnormal Results

483. What is the `abnormal` field?
484. What values can `abnormal` contain?
485. What does 'HH' mean?
486. What does 'LL' mean?
487. What does 'H' mean?
488. What does 'L' mean?
489. What does 'X' mean?
490. What does 'INVALID' mean?
491. What does NULL abnormal mean?
492. How is panic level determined?

### Lab Result Status

493. What is `result_status`?
494. What result statuses exist?
495. What is a preliminary result?
496. What is a final result?
497. What is a corrected result?
498. Can a result change after being finalized?
499. How are result corrections tracked?

### Lab Documentation

500. What is `result_doc_time`?
501. How is `result_doc_time` different from `result_time`?
502. What is `performing_lab`?
503. Can a test be performed by multiple labs?
504. How is the performing lab determined?

---

## Section: Indications (indications API)

### Indication Types

505. What is an "indication" in CoView?
506. What types of indications exist?
507. How are indications categorized?
508. Can a case have multiple indications?
509. How are indications prioritized?

### Indication Lifecycle

510. When is an indication created?
511. When is an indication resolved?
512. How is indication resolution tracked?
513. Can an indication be cancelled?
514. How are indication changes recorded?

---

## Section: Monitor Interface (monitor-interface-api)

### Monitor Data

515. What is monitored in the monitor interface?
516. What equipment is tracked?
517. How is monitor data collected?
518. How often is monitor data updated?
519. What vital signs are tracked?

### Monitor Integration

520. How does monitor data integrate with patient cards?
521. Is monitor data stored in the main database?
522. How is real-time monitor data handled?
523. What happens if monitor connection is lost?

---

## Section: Transport (transport API)

### Patient Transport

524. What is tracked in the transport system?
525. What transport types exist?
526. How is transport requested?
527. How is transport scheduled?
528. What is the transport workflow?

### Transport Status

529. What transport statuses exist?
530. When is transport marked as completed?
531. How is transport delay tracked?
532. What happens if transport is cancelled?

---

## Section: Ambulance Drives (ambulance-drives API)

### Ambulance Drive Tracking

533. What is an "ambulance drive"?
534. How is a drive different from internal transport?
535. What information is tracked for each drive?
536. What is drive origin and destination?
537. How are drive times tracked?

### Drive Status

538. What drive statuses exist?
539. When is a drive created?
540. When is a drive dispatched?
541. When is a drive in-progress?
542. When is a drive completed?
543. Can a drive be cancelled?

---

## Section: New Case (new-case API)

### New Case Creation

544. What triggers new case creation?
545. What information is required for a new case?
546. How is a new case different from a revisit?
547. What is the `new_case` table used for?
548. What is `nursing_doc` in new_case?
549. What is `medical_doc` in new_case?
550. How do these flags affect discharge workflow?

### Case Initialization

551. What default values are set for new cases?
552. How is initial ward assignment determined?
553. How is initial room assignment determined?
554. How is initial bed assignment determined?
555. Can a case be created without a bed?
556. Can a case be created without a room?
557. Can a case be created without a ward?

---

## Section: Doctor Decision (doctor-decision API)

### Decision Tracking

558. What is tracked in the doctor decision system?
559. What types of decisions exist?
560. How are decisions recorded?
561. Who can record decisions?
562. When are decisions recorded?

### Decision Workflow

563. What is the decision lifecycle?
564. Can decisions be revised?
565. How are decision revisions tracked?
566. What information is included in a decision record?

---

## Section: Result Docs (result-docs API)

### Document Types

567. What document types are tracked?
568. What is the difference between result docs and discharge docs?
569. How are result documents stored?
570. What is the format of result documents?

### Document Lifecycle

571. When are result documents created?
572. When are result documents finalized?
573. Can result documents be edited?
574. How are document revisions tracked?

---

## Section: Employees (employees API)

### Active Employees

575. What defines an "active" employee?
576. How is employee status tracked?
577. What employee information is stored?
578. How is employee role determined?
579. What roles exist in the system?

### Employee Presence

580. What is tracked in employee presence?
581. How is presence different from active status?
582. How is clock-in/clock-out tracked?
583. What is shift management?
584. How are shifts defined?
585. Can an employee work multiple shifts?

---

## Section: Patient Condition (coview-patient-condition)

### Condition Tracking

586. What conditions are tracked?
587. How is patient condition assessed?
588. What is `patient_condition_code`?
589. What is `patient_condition_desc`?
590. How often is condition updated?
591. Who updates patient condition?

### Condition History

592. How is condition history maintained?
593. Can condition degrade?
594. How is condition improvement tracked?
595. What triggers a condition update?

---

## Section: Copy Tables and Chameleon Sync

### Copy Table Pattern

596. Why is the copy table pattern used throughout the system?
597. What are the benefits of copy tables over direct updates?
598. What are the downsides of copy tables?
599. How is atomicity achieved with copy tables?
600. What happens to the old table after a swap?
601. Are old tables kept for rollback?
602. How long are old tables retained?

### Table Swapping Mechanism

603. What database operation is used for table swapping?
604. Are table swaps atomic?
605. What happens to table indexes during a swap?
606. What happens to foreign keys during a swap?
607. How are constraints maintained during swaps?
608. Can swaps fail mid-operation?
609. What is the rollback strategy for failed swaps?

### Chameleon Integration

610. What is Chameleon?
611. What is the relationship between CoView and Chameleon?
612. Which system is the source of truth?
613. How often does Chameleon sync occur?
614. What triggers a Chameleon sync?
615. What data comes from Chameleon?
616. What data is CoView-only?
617. How are conflicts between Chameleon and CoView resolved?
618. What happens if Chameleon data is stale?
619. What happens if Chameleon sync fails?

### Data Synchronization

620. What is the full synchronization workflow?
621. How are incremental updates handled?
622. What is the difference between full and delta sync?
623. When is full sync triggered?
624. When is delta sync triggered?
625. Can full and delta syncs run concurrently?

---

## Section: Redis Pub/Sub Architecture

### Topic Organization

626. What Redis topics exist in the system?
627. What naming convention is used for topics?
628. How are topics organized by domain?
629. What is the format of topic names?
630. Are topics case-sensitive?

### Publisher Behavior

631. What services publish to Redis?
632. When does a service publish a message?
633. What information is included in published messages?
634. Is message ordering guaranteed?
635. What happens if publish fails?
636. Are publishes retried?
637. How are publish failures handled?

### Subscriber Behavior

638. What services subscribe to Redis?
639. How are subscriptions established?
640. Can a service subscribe to multiple topics?
641. How are messages routed to handlers?
642. What happens if message handling fails?
643. Are messages retried?
644. How is message processing failure handled?

### Message Format

645. What is the message format (JSON, binary, etc.)?
646. What fields are required in messages?
647. What fields are optional?
648. How is message versioning handled?
649. What happens if a message has unknown fields?
650. What happens if a message is missing required fields?

---

## Section: Data Aggregation Strategy

### Full vs Delta Philosophy

651. Why have both full and delta aggregation?
652. What are the performance implications of full aggregation?
653. What are the performance implications of delta aggregation?
654. When is full aggregation preferred?
655. When is delta aggregation preferred?
656. Can delta aggregation drift from reality?
657. How is drift corrected?
658. How often should full aggregation run?

### Aggregation Triggers

659. What events trigger full aggregation?
660. What events trigger delta aggregation?
661. Can aggregation be triggered manually?
662. Can aggregation be scheduled?
663. What is the aggregation schedule?
664. How is aggregation scheduled (cron, interval, event-driven)?

### Aggregation Performance

665. How long does full aggregation take?
666. How long does delta aggregation take?
667. What is the bottleneck in full aggregation?
668. What is the bottleneck in delta aggregation?
669. How is aggregation performance monitored?
670. What metrics are tracked?
671. What is considered acceptable aggregation latency?

### Aggregation Accuracy

672. How is aggregation accuracy verified?
673. What happens if aggregated data is incorrect?
674. How are aggregation errors detected?
675. How are aggregation errors corrected?
676. Is there a verification mechanism?

---

## Section: Database Schema and Structure

### Schema Organization

677. What database schemas exist?
678. What is the `patients` schema used for?
679. What is the `nursing` schema used for?
680. What is the `labs` schema used for?
681. What is the `common` schema used for?
682. Are schemas used for access control?
683. Are schemas used for organizational purposes?

### Naming Conventions

684. What naming convention is used for tables?
685. What naming convention is used for columns?
686. Are snake_case or camelCase used?
687. How are foreign keys named?
688. How are indexes named?
689. How are constraints named?

### Primary Keys

690. How are primary keys generated?
691. Are UUIDs or sequential integers used?
692. What is the format of case_id?
693. What is the format of patient_id?
694. Are primary keys ever reused?
695. Can primary keys be changed?

### Foreign Keys

696. What foreign key constraints exist?
697. What cascade rules are used (CASCADE, RESTRICT, SET NULL)?
698. Can a foreign key be NULL?
699. What happens when a referenced record is deleted?
700. What happens when a referenced record is updated?

### Indexes

701. What indexes exist on the cases table?
702. What indexes exist on the patients table?
703. What indexes exist on cards_agg table?
704. Are indexes created on foreign keys?
705. Are indexes created on date fields?
706. How is index performance monitored?
707. How often are indexes rebuilt?

---

## Section: Data Validation and Integrity

### Input Validation

708. What validation is performed on incoming data?
709. How are invalid records handled?
710. Are invalid records rejected or logged?
711. What happens if a required field is missing?
712. What happens if a field has an invalid format?
713. What happens if a foreign key reference is invalid?

### Data Quality

714. How is data quality monitored?
715. What data quality metrics exist?
716. How are data quality issues detected?
717. How are data quality issues resolved?
718. Who is notified of data quality issues?

### Referential Integrity

719. How is referential integrity maintained?
720. What happens if a parent record is deleted?
721. What happens if a child record references a non-existent parent?
722. Are orphaned records allowed?
723. How are orphaned records cleaned up?

---

## Section: Error Handling and Recovery

### Error Detection

724. How are errors detected?
725. What constitutes an error vs a warning?
726. How are errors logged?
727. What information is included in error logs?
728. Where are error logs stored?

### Error Recovery

729. What recovery mechanisms exist?
730. Are failed operations retried?
731. What is the retry policy?
732. What is the maximum retry count?
733. What is the retry backoff strategy?
734. What happens after max retries are exceeded?

### Rollback Mechanisms

735. Can database operations be rolled back?
736. What is the transaction boundary for operations?
737. How are long-running transactions managed?
738. What happens if a transaction times out?
739. Can a partial swap be rolled back?

---

## Section: Monitoring and Observability

### Logging

740. What logging framework is used?
741. What log levels exist?
742. How verbose is logging in production?
743. How are logs aggregated?
744. How are logs searched?
745. How long are logs retained?

### Metrics

746. What metrics are collected?
747. How are metrics exposed (Prometheus, CloudWatch, etc.)?
748. What metrics are most important for operations?
749. How often are metrics collected?
750. How are metric anomalies detected?

### Tracing

751. Is distributed tracing used?
752. What tracing framework is used?
753. How are requests traced across services?
754. How is trace correlation maintained?
755. How are traces visualized?

### Alerting

756. What alerts are configured?
757. When are alerts triggered?
758. Who receives alerts?
759. What is the alert escalation policy?
760. How are alerts acknowledged?

---

## Section: Performance and Scalability

### Query Performance

761. What are the slowest queries in the system?
762. How is query performance monitored?
763. What query optimization techniques are used?
764. Are queries cached?
765. What caching strategy is used?

### Database Load

766. What is the typical database load?
767. What is the peak database load?
768. How is database load distributed?
769. Are read and write loads balanced?
770. What is the read/write ratio?

### Scaling Strategy

771. How does the system scale horizontally?
772. How does the system scale vertically?
773. What are the scaling bottlenecks?
774. How is database replication used?
775. Are read replicas used?
776. How is replication lag handled?

### Connection Pooling

777. How is database connection pooling configured?
778. What is the connection pool size?
779. What happens when the pool is exhausted?
780. How long do connections remain open?
781. How are idle connections handled?

---

## Section: Security and Access Control

### Authentication

782. How is service-to-database authentication handled?
783. Are database credentials rotated?
784. Where are database credentials stored?
785. How are credentials accessed at runtime?

### Authorization

786. What database roles exist?
787. What permissions does each role have?
788. Can a service access all tables?
789. Are there read-only roles?
790. Are there service-specific roles?

### Data Encryption

791. Is data encrypted at rest?
792. Is data encrypted in transit?
793. What encryption algorithms are used?
794. How are encryption keys managed?
795. Are keys rotated?

---

## Section: Temporal Data and History

### Historical Records

796. How is historical data maintained?
797. What tables have history tracking?
798. How is a historical record different from current?
799. How far back does history go?
800. Is history ever purged?

### Audit Trails

801. What audit trails exist?
802. What operations are audited?
803. What information is captured in audit trails?
804. Who can access audit trails?
805. How long are audit trails retained?

### Timestamps

806. What timestamp fields exist on tables?
807. Is there a created_at field?
808. Is there an updated_at field?
809. What timezone are timestamps stored in?
810. How are timestamps displayed to users?

---

## Section: Business Logic and Rules

### Ward Assignment Rules

811. How is ward assignment determined for new cases?
812. Can a case be in multiple wards?
813. How are ward transfers handled?
814. What triggers a ward transfer?
815. Are ward transfers logged?

### Bed Assignment Rules

816. How is bed assignment determined?
817. Can a case exist without a bed?
818. What happens when a bed is full?
819. How is bed availability tracked?
820. Can a bed be overbooked?

### Isolation Rules

821. What conditions require isolation?
822. How is isolation room availability checked?
823. What happens if no isolation room is available?
824. Can isolation be waived?
825. Who can waive isolation requirements?

### Discharge Rules

826. What conditions must be met for discharge?
827. Can a case be discharged without all documents?
828. What happens if nursing doc is missing?
829. What happens if medical doc is missing?
830. Can discharge be forced?

---

## Section: Integration Points

### External System Integration

831. What external systems integrate with CoView?
832. How is integration performed (API, file, database)?
833. How often is data synchronized with external systems?
834. What happens if an external system is unavailable?

### Chameleon Specifics

835. What Chameleon tables are read?
836. What Chameleon tables are written?
837. Are Chameleon writes transactional?
838. How are Chameleon write failures handled?
839. Can CoView function without Chameleon?

### Data Flow

840. What is the end-to-end data flow from Chameleon to CoView?
841. How many hops does data traverse?
842. What transformations occur at each hop?
843. Where is data enriched?
844. Where is data filtered?

---

## Section: Configuration and Parameters

### System Parameters

845. What is the `parameters` table used for?
846. How are parameters organized (by group, by name)?
847. How are parameters retrieved at runtime?
848. Are parameters cached?
849. How are parameter changes applied?

### Parameter Examples

850. What is `RespirationCodesCham` parameter?
851. What other critical parameters exist?
852. What happens if a parameter is missing?
853. What happens if a parameter is malformed?
854. Who can modify parameters?

### Feature Flags

855. Are feature flags used?
856. How are feature flags implemented?
857. Can features be toggled at runtime?
858. What features are behind flags?

---

## Section: Testing and Validation

### Test Coverage

859. What testing strategy is used?
860. Are there unit tests?
861. Are there integration tests?
862. Are there end-to-end tests?
863. What is the test coverage percentage?

### Validation Queries

864. What validation queries exist?
865. How is data consistency verified?
866. How often are validation queries run?
867. What happens if validation fails?

---

## Section: Deployment and Operations

### Deployment Process

868. How are schema changes deployed?
869. How are code changes deployed?
870. Can schema and code be deployed independently?
871. What is the deployment frequency?
872. Are blue-green deployments used?

### Maintenance Windows

873. Are maintenance windows required?
874. How often do maintenance windows occur?
875. What operations require downtime?
876. How is downtime communicated?

### Backup and Recovery

877. How often are database backups performed?
878. Where are backups stored?
879. How long are backups retained?
880. What is the recovery time objective (RTO)?
881. What is the recovery point objective (RPO)?
882. Has disaster recovery been tested?

---

## Section: Specific Behavioral Edge Cases

### NULL Handling

883. How are NULL patient names handled in similar name detection?
884. How are NULL dates handled in isolation sorting?
885. How are NULL ward IDs handled?
886. What is the default behavior for NULL fields in aggregations?
887. Are NULLs coalesced to empty arrays or kept as NULL?

### Empty Arrays vs NULL Arrays

888. What is the difference between `[]` and NULL for infections?
889. What is the default value for consultations if none exist?
890. Are empty arrays preferred over NULL, or vice versa?
891. How does the frontend handle NULL vs `[]`?

### Date Comparison Logic

892. How does `GREATEST` function work with NULL dates?
893. What happens when all dates in GREATEST are NULL?
894. How is `-infinity` used in date comparisons?
895. Why use `-infinity` instead of NULL?

### DISTINCT ON Behavior

896. How does `DISTINCT ON` determine which row to keep?
897. What happens if the ORDER BY columns are all equal?
898. Can `DISTINCT ON` produce non-deterministic results?
899. How is tie-breaking handled?

### COALESCE Cascades

900. What is the precedence order in `COALESCE(c.room_id, l.room_id)`?
901. What happens if both values in COALESCE are NULL?
902. Can COALESCE have more than two arguments?
903. What is the cost of deeply nested COALESCEs?

### IS DISTINCT FROM Logic

904. How is `IS DISTINCT FROM` different from `<>`?
905. How does `IS DISTINCT FROM` handle NULL comparisons?
906. When would `IS DISTINCT FROM` be TRUE but `<>` be NULL?
907. Why is `IS DISTINCT FROM` preferred in delta update checks?

### JSONB Aggregation

908. How does `jsonb_agg` handle NULL rows?
909. What happens if all rows are filtered out in a FILTER clause?
910. What is the difference between `jsonb_agg(...)` and `COALESCE(jsonb_agg(...), '[]')`?
911. Can `jsonb_agg` produce invalid JSON?

### Ordering and NULLS LAST/FIRST

912. What is the default NULL ordering in PostgreSQL?
913. Why use `NULLS LAST` in ordering?
914. When would `NULLS FIRST` be appropriate?
915. How do NULL values affect aggregation ordering?

---

## Section: Multi-Table Join Semantics

### LEFT JOIN Behavior

916. What rows are returned if the right table has no matches?
917. What values are returned for right table columns on no match?
918. Can multiple LEFT JOINs compound NULL results?
919. How does WHERE clause filtering interact with LEFT JOINs?

### FULL OUTER JOIN Behavior

920. Why is FULL OUTER JOIN rare in the codebase?
921. What scenarios require FULL OUTER JOIN?
922. How are NULL rows from both sides handled?
923. What is the WHERE clause purpose after a FULL OUTER JOIN?

### Join Order and Performance

924. Does join order affect query performance?
925. How is join order determined?
926. Are join reordering optimizations applied by Postgres?
927. What indexes are critical for join performance?

---

## Section: Aggregation Edge Cases

### Empty Subqueries

928. What happens if a subquery for infections returns zero rows?
929. Is the result NULL or an empty array?
930. How does the outer query handle an empty subquery result?

### Grouped Aggregations with No Groups

931. What happens if `GROUP BY case_id` produces zero groups?
932. What does `jsonb_agg` return for zero groups?
933. Can a delta update query affect zero rows?

### Conditional Aggregations

934. What is the purpose of `FILTER (WHERE ...)` in aggregations?
935. Can multiple filters be applied to the same aggregation?
936. What happens if all rows are filtered out?

---

## Section: Copy Table Transaction Boundaries

### Truncate Operations

937. Is TRUNCATE transactional?
938. Can TRUNCATE be rolled back?
939. What happens if TRUNCATE fails?
940. What happens to indexes after TRUNCATE?
941. What happens to foreign keys after TRUNCATE?

### Bulk Insert Transactions

942. Are bulk inserts wrapped in transactions?
943. What is the transaction size for bulk inserts?
944. Can bulk inserts be batched?
945. What happens if a bulk insert partially fails?

### Swap Atomicity

946. Is table swap atomic at the database level?
947. What database command is used for swapping (RENAME, ALTER)?
948. Can readers see partial swap state?
949. What happens to active transactions during swap?

---

## Section: Redis and Messaging Edge Cases

### Message Delivery

950. Is Redis pub/sub guaranteed delivery?
951. What happens if a subscriber is offline when a message is published?
952. Are messages persisted?
953. Can messages be replayed?

### Subscriber Failure

954. What happens if message handling throws an error?
955. Is the message lost?
956. Is the error logged?
957. Is the subscriber restarted?

### Topic Name Mismatches

958. What happens if a publisher uses a typo in topic name?
959. What happens if a subscriber listens to a non-existent topic?
960. Are topic names validated?

### Message Parsing

961. What happens if a message is not valid JSON?
962. What happens if a message has unexpected structure?
963. Are message schemas validated?
964. What happens if a required field is missing from a message?

---

## Section: Chameleon Sync Specific Behaviors

### Sync Conflicts

965. What happens if a record exists in CoView but not Chameleon?
966. What happens if a record exists in Chameleon but not CoView?
967. What happens if the same record differs between systems?
968. Which system wins in a conflict?

### Sync Timing

969. What is the typical sync latency?
970. What is the maximum acceptable sync latency?
971. How is sync lag detected?
972. What happens if sync lag exceeds threshold?

### Sync Failures

973. What causes sync failures?
974. How are sync failures detected?
975. Are sync failures retried automatically?
976. What is the retry interval?
977. What is the maximum retry duration?

---

## Section: Ward and Location Edge Cases

### Orphaned Records

978. Can a case exist with a ward_id that doesn't exist in wards table?
979. What happens if a room references a non-existent ward?
980. What happens if a bed references a non-existent room?
981. How are orphaned records detected?
982. How are orphaned records cleaned up?

### Circular References

983. Can ward hierarchy create circular references?
984. Can satellite wards reference each other?
985. How is circular reference prevented?

### Location Validation

986. What validation ensures room exists before assigning a bed?
987. What validation ensures ward exists before assigning a room?
988. Can validation be bypassed?

---

## Section: Temporal Data Edge Cases

### Date Boundaries

989. What happens if a date is in the future?
990. What happens if a date is far in the past (e.g., 1900)?
991. How are invalid dates handled?
992. What is the valid date range?

### Timezone Handling

993. What timezone is used for database timestamps?
994. Are timestamps converted to user timezone?
995. How are daylight saving time changes handled?
996. What happens at timezone boundaries?

### Date Overlaps

997. Can isolation periods overlap?
998. Can a case have overlapping infections?
999. Can a patient be in two wards simultaneously?
1000. How are overlaps detected?

---

## Section: Aggregation Query Performance

### Query Plans

1001. What is the typical query plan for full aggregation?
1002. What is the typical query plan for delta updates?
1003. Are query plans stable across runs?
1004. What causes query plan changes?

### Index Usage

1005. Which indexes are used in full aggregation?
1006. Which indexes are used in delta updates?
1007. Are indexes used effectively?
1008. What queries perform full table scans?

### Statistics and Vacuuming

1009. How often are table statistics updated?
1010. How often is VACUUM run?
1011. How often is ANALYZE run?
1012. What is the impact of stale statistics?

---

## Section: Access Patterns and Workload

### Read vs Write Patterns

1013. What is the ratio of reads to writes?
1014. What tables are read-heavy?
1015. What tables are write-heavy?
1016. Are there write hotspots?

### Query Patterns

1017. What are the most common queries?
1018. What are the most expensive queries?
1019. What queries are run most frequently?
1020. What queries are run during peak hours?

### Data Volume

1021. How many cases are active at any time?
1022. How many patients are in the system?
1023. How many records are in cards_agg?
1024. What is the growth rate of key tables?

---

## Section: Data Lifecycle

### Record Creation

1025. What triggers creation of a new case record?
1026. What triggers creation of a new patient record?
1027. Can records be bulk-created?
1028. What is the creation rate?

### Record Updates

1029. How often are records updated?
1030. What triggers record updates?
1031. Are updates logged?
1032. What is the update rate?

### Record Deletion

1033. Are records ever deleted?
1034. What is the deletion policy?
1035. Are deletions soft or hard?
1036. How are deleted records archived?

---

## Section: Monitoring Specific Behaviors

### Health Checks

1037. What health check endpoints exist?
1038. What do health checks verify?
1039. How often are health checks run?
1040. What is the timeout for health checks?

### Liveness vs Readiness

1041. What is the liveness check?
1042. What is the readiness check?
1043. How do they differ?
1044. What happens if liveness fails?
1045. What happens if readiness fails?

---

## Section: Concurrency and Locking

### Lock Contention

1046. What locks are acquired during table swaps?
1047. What locks are acquired during bulk inserts?
1048. Can concurrent updates cause deadlocks?
1049. How are deadlocks detected?
1050. How are deadlocks resolved?

### Isolation Levels

1051. What transaction isolation level is used?
1052. Can dirty reads occur?
1053. Can non-repeatable reads occur?
1054. Can phantom reads occur?

---

## Section: Code Organization and Architecture

### Service Responsibilities

1055. What is the responsibility of each API service?
1056. Is there overlap between services?
1057. How is domain logic distributed?
1058. Are services stateless?

### Shared Libraries

1059. What shared libraries exist?
1060. What utilities are in `@coview-utils-cloud`?
1061. What does `db-connector-cloud` export?
1062. How are shared utilities versioned?

### API Contracts

1063. What is the API contract for each service?
1064. Are API contracts versioned?
1065. How are breaking changes handled?
1066. What is the deprecation policy?

---

## Section: Model Initialization and Associations

### Model Loading

1067. When are Sequelize models initialized?
1068. What is the initialization order?
1069. How are model dependencies resolved?
1070. Can models be lazy-loaded?

### Association Setup

1071. When are model associations set up?
1072. What is `setupAssociations` function?
1073. How many times is `setupAssociations` called?
1074. What problems arise from multiple association setups?

### Singleton Pattern

1075. Is `PGConnector` a singleton?
1076. How is singleton enforcement implemented?
1077. What happens if multiple instances are created?
1078. How is singleton state shared across modules?

---

## Section: Debugging and Troubleshooting

### Common Issues

1079. What is the most common production issue?
1080. What causes aggregation failures?
1081. What causes sync failures?
1082. What causes query timeouts?

### Diagnostic Queries

1083. What diagnostic queries are useful for debugging?
1084. How can you check if data is stale?
1085. How can you verify sync status?
1086. How can you check for orphaned records?

### Log Analysis

1087. What log patterns indicate issues?
1088. What logs indicate successful operations?
1089. How can you trace a request across services?
1090. What correlation IDs are used?

---

## Section: Data Modeling Decisions

### Normalization

1091. What is the normalization level of the schema?
1092. Why are patients and cases separate tables?
1093. Why is cards_agg denormalized?
1094. What are the tradeoffs of denormalization?

### Array vs Join Table

1095. Why are infections stored as JSONB arrays instead of separate rows?
1096. Why are consultations stored as JSONB arrays?
1097. What are the query implications of JSONB arrays?
1098. When would a join table be better?

### Computed vs Stored

1099. What fields are computed at query time?
1100. What fields are pre-computed and stored?
1101. Why is `has_similar_name` computed?
1102. Why is `discharge_stage` computed?

---

## Section: Future Considerations

### Scalability Limits

1103. What is the current system capacity?
1104. What is the theoretical maximum capacity?
1105. What would break first under extreme load?
1106. What is the scaling plan?

### Technical Debt

1107. What technical debt exists?
1108. What shortcuts were taken?
1109. What should be refactored?
1110. What is the refactoring priority?

---

## Section: Cross-Cutting Concerns

### Error Codes and Messages

1111. Are error codes standardized?
1112. What error code scheme is used?
1113. How are error messages localized?
1114. Are user-facing errors different from internal errors?

### Logging Standards

1115. What logging standard is followed?
1116. Are log levels consistent across services?
1117. What structured logging format is used?
1118. How are sensitive fields redacted?

### Correlation and Context

1119. How is request context propagated?
1120. What context is included in logs?
1121. How are distributed traces correlated?
1122. What metadata is tracked per request?

---

## Section: Operational Procedures

### Runbooks

1123. What runbooks exist for common issues?
1124. How are runbooks maintained?
1125. Where are runbooks stored?
1126. How are runbooks accessed during incidents?

### Incident Response

1127. What is the incident response process?
1128. Who is on-call?
1129. What is the escalation path?
1130. How are incidents documented?

### Change Management

1131. What is the change approval process?
1132. How are changes tested before production?
1133. What is the rollback procedure?
1134. How are changes communicated?

---

## Section: Database Administration

### Index Maintenance

1135. How often are indexes rebuilt?
1136. What triggers index rebuilding?
1137. How is index bloat detected?
1138. How is index bloat remediated?

### Partition Management

1139. Are tables partitioned?
1140. What partitioning scheme is used?
1141. How are partitions created?
1142. How are old partitions dropped?

### Replication and HA

1143. Is database replication configured?
1144. What replication topology is used?
1145. How is failover handled?
1146. What is the RTO for database failover?

---

## Section: Compliance and Auditing

### Data Privacy

1147. What personal data is stored?
1148. How is personal data protected?
1149. What is the data retention policy?
1150. How is data anonymized for testing?

### Audit Requirements

1151. What audit requirements exist?
1152. How are audit trails generated?
1153. How are audit trails stored?
1154. How long are audit trails retained?

---

## Section: Integration Testing Scenarios

### Mock Data

1155. How is test data generated?
1156. What test data sets exist?
1157. How is test data kept realistic?
1158. How often is test data refreshed?

### Test Coverage Scenarios

1159. What scenarios are covered by tests?
1160. What edge cases are tested?
1161. What failure scenarios are tested?
1162. What performance tests exist?

---

## Section: Documentation and Knowledge

### System Documentation

1163. Where is system architecture documented?
1164. Where are API contracts documented?
1165. Where is database schema documented?
1166. How is documentation kept up-to-date?

### Knowledge Transfer

1167. How are new team members onboarded?
1168. What is the onboarding timeline?
1169. What resources are available for learning?
1170. How is tribal knowledge captured?

---

## Section: Specific Table Semantics

### cases Table

1171. What is the primary key of the cases table?
1172. What foreign keys exist on the cases table?
1173. What unique constraints exist on the cases table?
1174. Can a case exist without a patient?
1175. Can a patient have zero cases?

### patients Table

1176. What is the primary key of the patients table?
1177. What unique identifiers exist for patients?
1178. Can multiple patients have the same ID number?
1179. How are duplicate patients detected?
1180. How are duplicate patients merged?

### cards_agg Table

1181. What is the primary key of cards_agg?
1182. How often is cards_agg updated?
1183. Is cards_agg append-only or updated in place?
1184. Can cards_agg have missing cases?
1185. Can cards_agg have extra cases not in the cases table?

---

## Section: API Response Formats

### Success Responses

1186. What is the structure of success responses?
1187. What fields are always present?
1188. What fields are optional?
1189. How is pagination handled?

### Error Responses

1190. What is the structure of error responses?
1191. What HTTP status codes are used?
1192. How are validation errors returned?
1193. How are multiple errors aggregated?

---

## Section: Date and Time Handling

### Date Formats

1194. What date format is used in the database?
1195. What date format is used in APIs?
1196. How are date-only values represented?
1197. How are time-only values represented?

### Date Arithmetic

1198. How is `days_in_ward` calculated?
1199. How are date differences computed?
1200. What happens with negative date differences?

---

## Section: String Handling and Text

### String Normalization

1201. Are strings trimmed before storage?
1202. Are strings lowercased for comparison?
1203. How are strings compared (case-sensitive or insensitive)?
1204. How is whitespace handled?

### Text Search

1205. Is full-text search supported?
1206. What text search features are used?
1207. How are search queries parsed?
1208. How are search results ranked?

---

## Section: Enumeration and Code Tables

### Lookup Tables

1209. What lookup tables exist?
1210. How are lookup values maintained?
1211. Can lookup values change?
1212. How are lookup value changes handled?

### Hardcoded Values

1213. What values are hardcoded in code vs database?
1214. Why is `document_discharge_code = 2` hardcoded as 'nursing'?
1215. What are the risks of hardcoded values?

---

## Section: System Configuration

### Environment Variables

1216. What environment variables are required?
1217. What are the defaults for environment variables?
1218. How are environment variables validated?
1219. What happens if a required environment variable is missing?

### Configuration Files

1220. What configuration files exist?
1221. What is the configuration file format (JSON, YAML)?
1222. How are configuration changes applied?
1223. Are configuration changes hot-reloadable?

---

## Section: Disaster Recovery and Business Continuity

### Backup Strategy

1224. What is backed up?
1225. How often are backups performed?
1226. Where are backups stored?
1227. How are backups verified?

### Recovery Testing

1228. How often are recovery drills performed?
1229. What is the recovery procedure?
1230. How long does recovery take?
1231. What is the data loss tolerance?

---

## Section: User Interface Concerns

### Data Display

1232. How is aggregated data displayed in the UI?
1233. What fields are shown to users?
1234. How are NULL values displayed?
1235. How are empty arrays displayed?

### Real-time Updates

1236. Does the UI update in real-time?
1237. How are updates pushed to the UI?
1238. What is the update latency?
1239. How are conflicts resolved in the UI?

---

## Section: Advanced Query Patterns

### Window Functions

1240. What window functions are used in queries?
1241. How is ROW_NUMBER used?
1242. What partitioning is used in window functions?
1243. What ordering is used in window functions?

### Recursive Queries

1244. Are recursive CTEs used?
1245. What hierarchical queries exist?
1246. How is recursion bounded?

### Lateral Joins

1247. Are LATERAL joins used?
1248. What scenarios require LATERAL joins?
1249. What is the performance impact of LATERAL joins?

---

## Section: Data Import and Export

### Data Import

1250. How is external data imported?
1251. What import formats are supported?
1252. How is import data validated?
1253. What happens if import fails?

### Data Export

1254. How is data exported?
1255. What export formats are supported?
1256. How is exported data secured?
1257. What is the export frequency?

---

## Section: Final Edge Cases and Gotchas

### Implicit Type Conversions

1258. How are integers cast to text in queries?
1259. What happens with implicit date conversions?
1260. Can type mismatches cause errors?

### Query Hints and Optimization

1261. Are query hints used?
1262. What optimizations are manually specified?
1263. Can query plans be forced?

### Batch Processing

1264. What batch processes exist?
1265. How often do batch processes run?
1266. What is the batch size?
1267. How are batch failures handled?

### Rate Limiting

1268. Is rate limiting applied?
1269. What are the rate limits?
1270. How are rate limits enforced?
1271. What happens when rate limits are exceeded?

### Cache Invalidation

1272. What caches exist?
1273. How are caches invalidated?
1274. What is the cache TTL?
1275. Can stale cache cause issues?

### API Versioning

1276. How are APIs versioned?
1277. Can multiple API versions coexist?
1278. What is the deprecation timeline?
1279. How are clients migrated to new versions?

### Feature Toggles

1280. What features are behind toggles?
1281. How are toggles configured?
1282. Can toggles be changed at runtime?
1283. What is the toggle rollout strategy?

---

**End of Operational Questions Bank**
