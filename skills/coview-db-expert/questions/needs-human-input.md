# Questions Requiring Human Input / שאלות הדורשות מענה אנושי

> **Purpose / מטרה:** Questions that cannot be answered from code, database, or documentation alone.
> These require input from Product, DevOps, or senior developers.
>
> **Generated:** 2025-12-21
> **Total Questions:** ~170

---

## How to Use This File / איך להשתמש בקובץ

When the skill encounters a question it cannot answer, check if it's listed here.
If found, the answer requires asking a human - the skill cannot discover it independently.

כאשר הסקיל נתקל בשאלה שהוא לא יכול לענות עליה, בדוק אם היא מופיעה כאן.
אם כן, התשובה דורשת לשאול בן אדם - הסקיל לא יכול לגלות אותה בעצמו.

---

## Category 1: Performance & SLAs / ביצועים ו-SLAs

### English

1. What is the expected latency for full aggregation?
2. What is the expected latency for delta updates?
3. What is the acceptable aggregation latency threshold before alerting?
4. What is the expected query performance benchmark for cards_agg queries?
5. What is the target response time for API endpoints?
6. What is the maximum acceptable database query time?
7. What is the expected throughput (requests/second) for each service?
8. What are the bottleneck thresholds that require scaling?
9. What is the acceptable sync lag between Chameleon and CoView?
10. How long should a full aggregation run take before it's considered stuck?

### עברית

1. מה הלייטנסי הצפוי לאגרגציה מלאה?
2. מה הלייטנסי הצפוי לעדכוני דלתא?
3. מה סף הלייטנסי המקובל לפני שמתריעים?
4. מה יעד הביצועים לשאילתות מ-cards_agg?
5. מה זמן התגובה היעד לאנדפוינטים של ה-API?
6. מה הזמן המקסימלי המקובל לשאילתת דאטאבייס?
7. מה ה-throughput הצפוי (בקשות/שנייה) לכל שירות?
8. מה הסף שבו צריך לעשות scaling?
9. מה ה-sync lag המקובל בין כמיליון ל-CoView?
10. כמה זמן אגרגציה מלאה יכולה לרוץ לפני שמחשיבים אותה כתקועה?

---

## Category 2: Monitoring & Alerting / מוניטורינג והתראות

### English

11. What metrics are most important for operations?
12. What alerts are configured for the system?
13. When are alerts triggered?
14. Who receives alerts?
15. What is the alert escalation policy?
16. How are alerts acknowledged?
17. What dashboard exists for monitoring?
18. What logs are critical to monitor?
19. How is distributed tracing implemented?
20. What correlation IDs are used across services?
21. How is aggregation accuracy monitored?
22. How are data quality issues detected and reported?
23. What is considered a "healthy" system state?

### עברית

11. אילו מטריקות הכי חשובות לתפעול?
12. אילו התראות מוגדרות במערכת?
13. מתי מופעלות התראות?
14. מי מקבל התראות?
15. מה מדיניות האסקלציה להתראות?
16. איך מאשרים קבלת התראה?
17. איזה דשבורד קיים למוניטורינג?
18. אילו לוגים קריטיים לניטור?
19. איך מיושם distributed tracing?
20. אילו correlation IDs משמשים בין השירותים?
21. איך מנטרים את דיוק האגרגציה?
22. איך מזהים ומדווחים על בעיות איכות נתונים?
23. מה נחשב למצב "בריא" של המערכת?

---

## Category 3: Disaster Recovery & Backup / התאוששות מאסון וגיבויים

### English

24. What is the Recovery Time Objective (RTO)?
25. What is the Recovery Point Objective (RPO)?
26. How often are database backups performed?
27. Where are backups stored?
28. How long are backups retained?
29. Has disaster recovery been tested?
30. What is the recovery procedure?
31. What is the rollback procedure for failed deployments?
32. What operations require planned downtime?
33. How is downtime communicated to users?
34. What is the data loss tolerance?

### עברית

24. מה ה-Recovery Time Objective (RTO)?
25. מה ה-Recovery Point Objective (RPO)?
26. באיזו תדירות מתבצעים גיבויים?
27. איפה הגיבויים נשמרים?
28. כמה זמן שומרים גיבויים?
29. האם התאוששות מאסון נבדקה?
30. מה הליך ההתאוששות?
31. מה הליך ה-rollback לדיפלויים שנכשלו?
32. אילו פעולות דורשות downtime מתוכנן?
33. איך מתקשרים downtime למשתמשים?
34. מה הסבילות לאובדן נתונים?

---

## Category 4: Operational Procedures / נהלי תפעול

### English

35. What runbooks exist for common issues?
36. Where are runbooks stored?
37. What is the incident response process?
38. Who is on-call?
39. What is the escalation path?
40. How are incidents documented?
41. What is the change approval process?
42. How are changes tested before production?
43. What is the deployment frequency?
44. Are blue-green deployments used?
45. Can schema and code be deployed independently?

### עברית

35. אילו runbooks קיימים לתקלות נפוצות?
36. איפה נשמרים ה-runbooks?
37. מה תהליך התגובה לאירועים?
38. מי ב-on-call?
39. מה נתיב האסקלציה?
40. איך מתעדים אירועים?
41. מה תהליך אישור השינויים?
42. איך בודקים שינויים לפני פרודקשן?
43. מה תדירות הדיפלויים?
44. האם משתמשים ב-blue-green deployments?
45. האם אפשר לדפלי סכמה וקוד בנפרד?

---

## Category 5: Business Rules & Logic / כללים עסקיים ולוגיקה

### English

46. Which system is source of truth for isolation dates - Chameleon or CoView?
47. Who can waive isolation requirements?
48. What conditions require mandatory isolation?
49. Can a patient be assigned to a blocked bed under any circumstances?
50. What is the threshold for the 20% case update validation - why 20%?
51. How many retries are allowed for failed case updates?
52. What happens after maximum retries are exceeded?
53. Can a case be discharged without all required documents?
54. Can discharge be forced? By whom?
55. What determines initial ward assignment for new cases?
56. What determines initial room/bed assignment?
57. What are the complete rules for similar name matching across satellite wards?
58. When should a consultation be marked as "delayed"?
59. What urgency levels exist beyond "דחוף" and "רגיל"?
60. What is the complete list of result_status values from Chameleon?
61. What does each nursing_status_type number mean in business terms?
62. Is the dual-source respirator conflict (Type 1 vs Type 2) a bug or intentional?
63. What priority codes exist for surgery waiting?
64. What determines surgery priority assignment?
65. Can a surgery be cancelled? What happens to the data?
66. Can a surgery be postponed? How is this recorded?

### עברית

46. איזו מערכת היא מקור האמת לתאריכי בידוד - כמיליון או CoView?
47. מי יכול לבטל דרישות בידוד?
48. אילו מצבים דורשים בידוד חובה?
49. האם אפשר לשבץ מטופל למיטה חסומה בנסיבות מסוימות?
50. מה הסיבה לסף 20% בוולידציה של עדכון מקרים?
51. כמה נסיונות מותרים לעדכון מקרים שנכשל?
52. מה קורה אחרי שמגיעים למקסימום נסיונות?
53. האם אפשר לשחרר מקרה בלי כל המסמכים הנדרשים?
54. האם אפשר לכפות שחרור? על ידי מי?
55. מה קובע שיבוץ מחלקה ראשוני למקרים חדשים?
56. מה קובע שיבוץ חדר/מיטה ראשוני?
57. מה הכללים המלאים להתאמת שמות דומים בין מחלקות לוויין?
58. מתי ייעוץ צריך להיות מסומן כ"באיחור"?
59. אילו רמות דחיפות קיימות מעבר ל"דחוף" ו"רגיל"?
60. מה הרשימה המלאה של ערכי result_status מכמיליון?
61. מה המשמעות העסקית של כל מספר nursing_status_type?
62. האם הקונפליקט במקורות נתוני הנשמה (Type 1 vs Type 2) הוא באג או מכוון?
63. אילו קודי עדיפות קיימים לרשימת המתנה לניתוח?
64. מה קובע את עדיפות הניתוח?
65. האם אפשר לבטל ניתוח? מה קורה לנתונים?
66. האם אפשר לדחות ניתוח? איך זה נרשם?

---

## Category 6: External System Integration / אינטגרציה עם מערכות חיצוניות

### English

67. What is the expected Chameleon sync frequency?
68. What triggers a Chameleon sync (webhook, polling, manual)?
69. What happens if Chameleon sync fails?
70. What is the retry interval for failed syncs?
71. What is the maximum retry duration before giving up?
72. Can CoView function without Chameleon connection?
73. What Chameleon tables are read-only vs read-write?
74. How are Chameleon write failures handled?
75. What is the data flow from Chameleon to CoView in detail?
76. What data transformations occur during sync?
77. How is sync conflict resolved when data differs?
78. What external systems besides Chameleon integrate with CoView?
79. What is the monitor interface data source?
80. How is real-time monitor data collected and stored?

### עברית

67. מה תדירות הסנכרון הצפויה מכמיליון?
68. מה מפעיל סנכרון כמיליון (webhook, polling, ידני)?
69. מה קורה אם סנכרון כמיליון נכשל?
70. מה מרווח ה-retry לסנכרונים שנכשלו?
71. מה משך ה-retry המקסימלי לפני שמוותרים?
72. האם CoView יכול לתפקד בלי חיבור לכמיליון?
73. אילו טבלאות כמיליון הן read-only לעומת read-write?
74. איך מטפלים בכשלון כתיבה לכמיליון?
75. מה זרימת הנתונים מכמיליון ל-CoView בפירוט?
76. אילו טרנספורמציות קורות במהלך הסנכרון?
77. איך נפתר קונפליקט סנכרון כשהנתונים שונים?
78. אילו מערכות חיצוניות מלבד כמיליון מתממשקות עם CoView?
79. מה מקור הנתונים של ממשק המוניטורים?
80. איך נאספים ונשמרים נתוני מוניטור בזמן אמת?

---

## Category 7: Concurrency & Data Consistency / מקביליות ועקביות נתונים

### English

81. What happens if both a FULL trigger and DELTA trigger arrive simultaneously?
82. Can delta updates run concurrently?
83. Can full and delta updates run concurrently?
84. What happens if a full aggregation starts while a delta is running?
85. What happens if multiple delta updates for different topics arrive simultaneously?
86. How is concurrency controlled in the aggregator?
87. What locks are acquired during table swaps?
88. What locks are acquired during bulk inserts?
89. Can concurrent updates cause deadlocks?
90. How are deadlocks detected and resolved?
91. What transaction isolation level is used?
92. Can readers see partial swap state during table rename?
93. What happens to active transactions during swap?

### עברית

81. מה קורה אם טריגר FULL וטריגר DELTA מגיעים בו זמנית?
82. האם עדכוני דלתא יכולים לרוץ במקביל?
83. האם עדכונים מלאים ודלתא יכולים לרוץ במקביל?
84. מה קורה אם אגרגציה מלאה מתחילה בזמן שדלתא רץ?
85. מה קורה אם מגיעים עדכוני דלתא מרובים לטופיקים שונים בו זמנית?
86. איך מנוהלת מקביליות באגרגטור?
87. אילו נעילות נלקחות במהלך החלפת טבלאות?
88. אילו נעילות נלקחות במהלך הכנסות בכמות?
89. האם עדכונים מקבילים יכולים לגרום ל-deadlocks?
90. איך מזהים ופותרים deadlocks?
91. באיזו רמת transaction isolation משתמשים?
92. האם קוראים יכולים לראות מצב חלקי במהלך החלפת טבלה?
93. מה קורה לטרנזקציות פעילות במהלך החלפה?

---

## Category 8: Data Retention & Compliance / שמירת נתונים ותאימות

### English

94. What is the data retention policy?
95. How long is historical data maintained?
96. What tables have history tracking?
97. Is history ever purged? When?
98. What audit trails exist?
99. What operations are audited?
100. How long are audit trails retained?
101. What personal data is stored?
102. How is personal data protected?
103. How is data anonymized for testing?
104. What audit requirements exist for healthcare compliance?

### עברית

94. מה מדיניות שמירת הנתונים?
95. כמה זמן שומרים נתונים היסטוריים?
96. אילו טבלאות עוקבות אחרי היסטוריה?
97. האם היסטוריה נמחקת אי פעם? מתי?
98. אילו audit trails קיימים?
99. אילו פעולות עוברות audit?
100. כמה זמן שומרים audit trails?
101. אילו נתונים אישיים נשמרים?
102. איך מוגנים נתונים אישיים?
103. איך מאנונימים נתונים לבדיקות?
104. אילו דרישות audit קיימות לתאימות בריאות?

---

## Category 9: Rate Limiting & API Management / Rate Limiting וניהול API

### English

105. Is rate limiting applied to APIs?
106. What are the rate limits per endpoint?
107. How are rate limits enforced?
108. What happens when rate limits are exceeded?
109. How are APIs versioned?
110. Can multiple API versions coexist?
111. What is the API deprecation policy?
112. What is the deprecation timeline for old versions?
113. How are clients migrated to new API versions?

### עברית

105. האם מוחל rate limiting על APIs?
106. מה ה-rate limits לכל endpoint?
107. איך נאכף rate limiting?
108. מה קורה כשחורגים מ-rate limits?
109. איך מנוהל versioning של APIs?
110. האם גרסאות API מרובות יכולות להתקיים במקביל?
111. מה מדיניות ה-deprecation של API?
112. מה לוח הזמנים ל-deprecation של גרסאות ישנות?
113. איך מעבירים לקוחות לגרסאות API חדשות?

---

## Category 10: UI & User Experience / ממשק משתמש וחוויית משתמש

### English

114. How does the UI handle NULL values in displays?
115. How does the UI handle empty arrays vs NULL?
116. What is the expected UI update latency after data changes?
117. Does the UI update in real-time? How?
118. How are conflicts resolved in the UI?
119. What fields are shown to users on patient cards?
120. What information is hidden from certain user roles?
121. How are error messages displayed to users?
122. What validation errors are shown vs silently handled?

### עברית

114. איך ה-UI מטפל בערכי NULL בתצוגה?
115. איך ה-UI מטפל במערכים ריקים לעומת NULL?
116. מה הלייטנסי הצפוי לעדכון UI אחרי שינוי נתונים?
117. האם ה-UI מתעדכן בזמן אמת? איך?
118. איך נפתרים קונפליקטים ב-UI?
119. אילו שדות מוצגים למשתמשים בכרטיסי מטופל?
120. איזה מידע מוסתר מתפקידים מסוימים?
121. איך מוצגות הודעות שגיאה למשתמשים?
122. אילו שגיאות ולידציה מוצגות לעומת מטופלות בשקט?

---

## Category 11: Testing & Quality / בדיקות ואיכות

### English

123. What testing strategy is used (unit, integration, e2e)?
124. What is the target test coverage percentage?
125. Are there automated regression tests?
126. How often are validation queries run?
127. What happens if validation fails in production?
128. How is test data generated?
129. How is test data kept realistic?
130. What scenarios are covered by tests?
131. What failure scenarios are tested?
132. What performance tests exist?

### עברית

123. באיזו אסטרטגיית בדיקות משתמשים (unit, integration, e2e)?
124. מה יעד אחוז כיסוי הבדיקות?
125. האם יש בדיקות רגרסיה אוטומטיות?
126. באיזו תדירות רצות שאילתות ולידציה?
127. מה קורה אם ולידציה נכשלת בפרודקשן?
128. איך מייצרים נתוני בדיקה?
129. איך שומרים על ריאליסטיות של נתוני בדיקה?
130. אילו תרחישים מכוסים בבדיקות?
131. אילו תרחישי כשל נבדקים?
132. אילו בדיקות ביצועים קיימות?

---

## Category 12: Feature Flags & Configuration / Feature Flags וקונפיגורציה

### English

133. What features are behind feature flags?
134. How are feature flags configured per hospital?
135. Can features be toggled at runtime without deployment?
136. What is the feature rollout strategy?
137. What environment variables are required for each service?
138. What are the default values for optional environment variables?
139. How are configuration changes applied - restart required?
140. Are configurations hot-reloadable?
141. What parameters in common.parameters are hospital-specific?

### עברית

133. אילו פיצ'רים מאחורי feature flags?
134. איך מוגדרים feature flags לכל בית חולים?
135. האם אפשר להפעיל/לכבות פיצ'רים בזמן ריצה בלי דיפלוי?
136. מה אסטרטגיית ה-rollout של פיצ'רים?
137. אילו משתני סביבה נדרשים לכל שירות?
138. מה ערכי ברירת המחדל למשתני סביבה אופציונליים?
139. איך מוחלים שינויי קונפיגורציה - נדרש restart?
140. האם קונפיגורציות hot-reloadable?
141. אילו פרמטרים ב-common.parameters הם ספציפיים לבית חולים?

---

## Category 13: Database Administration / ניהול דאטאבייס

### English

142. How often are indexes rebuilt?
143. What triggers index rebuilding?
144. How is index bloat detected and remediated?
145. Are tables partitioned? Which ones?
146. How are old partitions managed?
147. What is the database replication topology?
148. How is failover handled?
149. What is the RTO for database failover?
150. How often is VACUUM run?
151. How often is ANALYZE run?
152. What is the connection pool size configuration?
153. What happens when the pool is exhausted?

### עברית

142. באיזו תדירות בונים מחדש אינדקסים?
143. מה מפעיל בנייה מחדש של אינדקסים?
144. איך מזהים ומטפלים ב-index bloat?
145. האם טבלאות מחולקות (partitioned)? אילו?
146. איך מנהלים partitions ישנים?
147. מה טופולוגיית הרפליקציה של הדאטאבייס?
148. איך מטפלים ב-failover?
149. מה ה-RTO ל-database failover?
150. באיזו תדירות רץ VACUUM?
151. באיזו תדירות רץ ANALYZE?
152. מה גודל ה-connection pool?
153. מה קורה כשה-pool מתרוקן?

---

## Category 14: Staleness & Data Freshness / עדכניות נתונים

### English

154. What does "staleness" mean in the context of patient cards?
155. What is the staleness threshold (time-based)?
156. How is staleness detected?
157. What triggers a staleness check?
158. How does the system handle stale data?
159. Is there automatic refresh of stale data?
160. What notification is given for stale data?

### עברית

154. מה המשמעות של "staleness" בהקשר של כרטיסי מטופל?
155. מה סף ה-staleness (מבוסס זמן)?
156. איך מזהים staleness?
157. מה מפעיל בדיקת staleness?
158. איך המערכת מטפלת בנתונים stale?
159. האם יש רענון אוטומטי לנתונים stale?
160. איזו התראה ניתנת על נתונים stale?

---

## Category 15: Documentation & Knowledge / תיעוד וידע

### English

161. Where is system architecture documented?
162. Where are API contracts documented?
163. How is documentation kept up-to-date?
164. What is the onboarding process for new team members?
165. What resources are available for learning the system?
166. How is tribal knowledge captured?
167. What common mistakes should new developers avoid?
168. What are the known technical debt items?
169. What is the refactoring priority?

### עברית

161. איפה מתועדת ארכיטקטורת המערכת?
162. איפה מתועדים חוזי ה-API?
163. איך שומרים על עדכניות התיעוד?
164. מה תהליך ה-onboarding לחברי צוות חדשים?
165. אילו משאבים זמינים ללמידת המערכת?
166. איך נשמר tribal knowledge?
167. אילו טעויות נפוצות כדאי למתכנתים חדשים להימנע מהן?
168. מה פריטי ה-technical debt הידועים?
169. מה סדר העדיפויות ל-refactoring?

---

## Summary / סיכום

| Category | Count | קטגוריה |
|----------|-------|---------|
| Performance & SLAs | 10 | ביצועים ו-SLAs |
| Monitoring & Alerting | 13 | מוניטורינג והתראות |
| Disaster Recovery | 11 | התאוששות מאסון |
| Operational Procedures | 11 | נהלי תפעול |
| Business Rules | 21 | כללים עסקיים |
| External Integration | 14 | אינטגרציה חיצונית |
| Concurrency | 13 | מקביליות |
| Data Retention | 11 | שמירת נתונים |
| Rate Limiting & API | 9 | Rate Limiting ו-API |
| UI & UX | 9 | ממשק משתמש |
| Testing | 10 | בדיקות |
| Feature Flags | 9 | Feature Flags |
| Database Admin | 12 | ניהול DB |
| Staleness | 7 | עדכניות נתונים |
| Documentation | 9 | תיעוד |
| **TOTAL** | **~169** | **סה"כ** |

---

## Status Tracking / מעקב סטטוס

When questions are answered, update this section:

| Q# | Status | Answered By | Date | Answer Location |
|----|--------|-------------|------|-----------------|
| | | | | |

---

*Last Updated: 2025-12-21*
