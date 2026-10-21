# Audit of the preference filter (gpt-6-luna, prompt v1) by Claude

2026-10-21. A fresh Claude sub-agent judged a fixed sample of 90 instructor corrections blind (`audit-claude-verdicts.json`, items mapped to verdict keys in `audit-sample.json`), then compared with gpt-6-luna's verdicts from `npm run errors:verify` (prompt v1). An item is "error" when every change is a clear error, "acceptable" when every change is acceptable, "drop" otherwise.

| Concept | Items | Agreement | gpt "acceptable" the auditor calls error |
| --- | --- | --- | --- |
| pret_imp | 55 | 32/55 (58%) | **21/40** (at least 15 even if every borderline call goes to gpt) |
| por_para | 35 | 25/35 (71%) | 6/20 |

gpt's "error" verdicts are reliable: 15/15 pret_imp and 13/15 por_para agree.

**Pattern.** gpt accepts the learner's form whenever *some* reading allows it, often admitting in its own reason that the instructor's form "fits better". 19 of the 21 pret_imp misses are a preterite where the imperfect is needed: background states and reasons (*porque tuve miedo*, *tuve hambre*, *no supe la diferencia*), description or identity with *ser* (*la pistola fue un juguete*, *descubrieron que ella fue la princesa*, *su vuelo fue muy temprano*), and habitual actions inside an explicit habitual frame (*cuando éramos niñas siempre hicimos*, *salíamos… jugábamos… y fuimos*). The other two are an imperfect for a single foregrounded event (*cuando yo llegaba a mi casa*, *empezábamos nuestra caminata*). On por_para, gpt invents a causal *por* reading where purpose or a recipient is obvious (*no estudio por las clases*, *estudio por la clase*, *delgada por el verano*).

**Recommendation.** Do not trust prompt v1's "acceptable" verdicts for pret_imp; keep its "error" verdicts. Tighten the prompt with these patterns (or keep only corrections both judges agree on), and re-validate against this sample.

**Auditor's own uncertainty.** Medium confidence on pret_imp items 13, 20, 22, 25, 27, 33 and por_para 67, 80; the auditor was more lenient than the instructors on items 14, 23, 26 and 36.
