# Review of taxonomy v2 drafts (gpt-6-luna): pret/imp and por/para

Reviewer: Claude (independent review, 2026-10-21). Inputs: `draft-v2-pret_imp-gpt-6-luna.{md,json}`, `draft-v2-por_para-gpt-6-luna.{md,json}`, with `mvp_taxonomy.json` for background only.

Method: for the audit I judged every sample item with `i % 5 == 0` (40 per concept) blind, recorded my codes, and only then compared them with the drafter's `assignments`. I also read every NONE item, every ASP.04 item and every por/para assignment, and checked the samples for duplicates.

## 0. Problems that apply to both drafts

These come first because they affect every number below.

1. **The samples contain many duplicates.** Overlapping two-sentence windows produce the same instructor correction more than once. Pret/imp has 200 rows but about 175 unique errors (24 duplicate groups). Por/para has 198 rows but about 146 unique errors (49 duplicate groups, about 26% of rows). The coverage counts overstate every code. After removing duplicates: ASP.01 84, ASP.02 32, ASP.03 18, ASP.04 16, NONE 25; PRP.01 50, PRP.02 27, PRP.03 17, PRP.05 6, PRP.06 14, NONE 32. The drafter also coded duplicates inconsistently: pret/imp 10/59, 36/62, 102/139; por/para 38/58, 41/136/171, 56/185. **Any train/dev/test split must group by source error.** Otherwise the evaluator is tested on items it was trained on.
2. **Responses with several corrections get NONE.** 29 pret/imp responses and 10 por/para responses carry more than one instructor change. The drafter often gave NONE because "corrections mix" (pret/imp 14, 62, 70/94, 102, 114; por/para 153, 171). But the evaluator assigns one code per error, not per response. **Split multi-change rows into one item per change, then code each one.** Most of these items are codable (see the NONE sections).
3. **Instructor preference is handled inconsistently.** The drafter's summaries promise to abstain when both forms are acceptable. That promise is kept for some items (87, 104, 196) but broken for others (pret/imp 10, 35, 115, 160, 175; por/para 45, 83/141, 143, 154, 162, 2/4/29). Since the evaluator's first job is to decide whether the learner's choice is right, preference corrections should be labelled "acceptable / no error", not given an error code. I recommend a three-way flag on every gold item: `clear_error | preference | instructor_target_questionable`.
4. **The evaluator should output the target form, not only the code.** Several instructor targets are themselves weak. For example, pret/imp 165 should be *estaba acostado*, not *se acostaba*. In por/para, 150 and 175 should be *durante* or no preposition, 172 should be *buscar a*, and 181 should be *pedir ayuda*.

---

## 1. Preterite vs imperfect (ASP.01–ASP.04)

### 1.1 Codes

**ASP.01 Continuing state or description vs bounded event: rewrite and split.**
- The linguistics are correct for the main direction: a stative predicate (ser, estar, tener, haber, gustar, sentirse, pensar meaning 'believe', decir for the content of a text, age, time, weather) used as background calls for the imperfect.
- The code is a catch-all: 84 of about 175 unique errors (48%). It quietly contains the opposite direction as well: imperfect where the speaker evaluates or bounds a completed episode, as in 7, 12/110, 23, 24, 30, 42/105, 96, 120, 133, 171 and 192 (about 13 unique errors). That contrast is real, frequent and taught separately ("¿Qué tal el viaje? —Fue increíble"). The probe and every positive example except one test only the first direction.
- Overlap with ASP.04: the definition lists "imperfect for a clearly bounded state episode", while ASP.04 is named "state vs onset". The positive example "Me sentía [sentí] inseguro en ese momento" (item 49, *instantáneamente*) is an onset, not a description.
- Recommendation: keep ASP.01 for **one direction only** (state or description presented as background, so the imperfect is required), and create **ASP.05** for the other.
- Rewrite of ASP.01: *"Use when a stative predicate (being, location, possession, age or time, feelings, beliefs, likes, appearance, the content of a text, or a schedule in force at the reference time) describes the background of a past moment, and the learner uses the preterite. Do not use for dynamic actions in progress (ASP.02), routines (ASP.03) or the verbs in ASP.04."* Add the scheduled case from item 100 (*su clase comenzaba a las 10:30*, since the class had not started yet).
- Positive examples: keep *familia fue [era] rica*, *araña estuvo [estaba]* and *jardín fue [era] grande*. Move *me sentía [sentí]* to ASP.05. Add *una carta dije [decía] que se quedara* (140) and *cuando tuvo [tenía] cinco meses* (46).
- Probe: good as written.

**New ASP.05 State presented as a bounded episode, onset, or whole-event evaluation.**
- Covers the imperfect used where the clause sums up or evaluates a completed episode, gives a state with explicit bounds, or marks the onset of a feeling. Examples: *era [fue] muy romántico* (110), *lo que vi era [fue] una locura* (105), *lo que no vio era [fue] su mascota* (30, where the copula of a pseudo-cleft follows the preterite), *era [fue] número uno la semana que se estrenó* (120), *instantáneamente me sentía [sentí] inseguro* (49).
- Abstain when the clause can be read as describing the atmosphere (*era muy romántico* is borderline) or when only a duration phrase supports the correction (104, 133, 196: *maestra por muchos años*, *presidente 8 años*, *salía con una mujer muchos años*). Native speakers use both forms there.
- Practice: `episode_evaluation_vs_scene_description`.
- Probe: «¿Qué tal la fiesta? —___ (ser) increíble» vs «Cuando llegué, la casa ___ (estar) llena de gente».

**ASP.02 Ongoing action vs completed event: keep, with fixes.**
- The definition is sound and is the classic foreground/background contrast for dynamic verbs. Two directions share one practice, which is fine.
- One positive example is wrong: "Cuando llamaba [llamé] a mi madre, mi padre me encontró" (item 160). *Cuando llamaba…* ('while I was calling') is grammatical and plausible, so this is a preference correction. Replace it with *cuando su familia durmieron [dormía], Craig abrió la puerta* (150), which also covers the missing pret→imp direction.
- Misassigned items: 17 (*no hablé [hablaba] japonés* is ability, so ASP.01); 119 (*leía [leí] 50 libros* is a counted total, which by the drafter's own definition is ASP.03); 153 (*agarraban/tiraban* describes how a stunt generally goes, so ASP.03 or ASP.01); 73 (*tenía [tuvo] un bebé*: *tener* meaning 'give birth' belongs in ASP.04); 115 and 175 are preferences.
- Add a decision rule: if the verb is stative, use ASP.01 or ASP.05, not ASP.02. The probe is good.

**ASP.03 Past routine vs bounded occurrence or series: keep.**
- Correct and well separated, and the negative example *Fui tres veces al cine* is exactly right.
- Fix: 35/51 (*fui a nadar… cuando era pequeña* fits a single outing) should be a preference/NONE, by the code's own warning about trigger words.
- Overlap with ASP.01 on habitual descriptions (65, *La cena fue [era] pasta o algo diferente* in a routine context). Rule: if the clause describes something that recurred, use ASP.03 even when the verb is *ser*.
- The probe leans on *todos los domingos*, which is the trigger-word shortcut the draft warns against. Better as a minimal pair: «De niño, ___ (ir) a la playa con mis primos» vs «El verano pasado ___ (ir) a la playa tres veces».

**ASP.04 State meaning vs onset, result, or successful event: rewrite (narrow it and fix its examples).**
- The concept is right: some verbs change meaning in the preterite (*saber* 'find out', *conocer* 'meet', *querer* 'try', *no querer* 'refuse', *poder* 'manage', *no poder* 'fail', *tener* 'get/receive', *tener que* 'had to and did', *haber* event vs existence). But the verb list and the evidence are both off:
  - *Darse cuenta* is an achievement verb, not a state verb. "No me daba [di] cuenta" (176) is fully acceptable ('I wasn't aware'), so the positive example is a preference. Drop it.
  - *Necesitar* (130, 199) and *recordar* (101) have no distinct preterite meaning. Code them as ASP.01.
  - Most ASP.04 items are *no pude ↔ no podía* (10, 21/182, 76, 79, 102, 126). With a single occasion, *no pude* ('tried and failed') and *no podía* ('was unable') are usually both acceptable. "No pude [podía] dormir" is an incorrect positive example, since *no pude dormir* is the more idiomatic form. *Sus padres no supieron [sabían] cómo ayudar* (58) is also acceptable ('didn't manage to figure out how').
  - Missing: *tener que*. Items 154 (*tuve [tenía] que encontrarme con mi amigo en veinte minutos*, 'was supposed to') and 162 (*teníamos [tuvimos] que subir al metro*, 'had to and did') are textbook cases, currently coded ASP.01 and NONE.
- Rewrite: *"Use only for saber, conocer, querer/no querer, poder/no poder, tener/tener que and haber, when context fixes which of the two meanings is intended (e.g. the action was clearly carried out or clearly not attempted). With no poder on a single occasion, abstain unless context rules out the 'tried and failed' reading."*
- Positive examples: *quise [quería] ir a casa* (90), *tuve [tenía] que encontrarme con mi amigo en veinte minutos* (154), *teníamos [tuvimos] que subir al metro* (162), and a constructed *ya conocí [conocía] a Ana desde niña*.
- Probe: good, but add the reverse item «De niña ya ___ (saber) leer».

### 1.2 Assignment audit (i % 5 == 0)

Agreement: **29 / 40 = 72.5%**. "Correction" rates the instructor's change: *clear* = real error; *pref* = both forms are acceptable; *weak target* = the learner erred but the instructor's form is not ideal.

| i | Learner form → instructor | Correction | Mine | Drafter | Agree | Note |
|---|---|---|---|---|---|---|
| 0 | compañera que fue amable → era | clear | ASP.01 | ASP.01 | ✓ | |
| 5 | familia fue muy rica → era | clear | ASP.01 | ASP.01 | ✓ | |
| 10 | no pude dormir → podía | **pref** | NONE | ASP.04 | ✗ | *No pude dormir* ('failed to sleep that night') is idiomatic. Duplicate 59 was coded ASP.01. |
| 15 | escuchaba un sonido → escuchó | clear | ASP.02 | ASP.02 | ✓ | |
| 20 | a veces trajo / llegó → traía / llegaba | clear | ASP.03 | ASP.03 | ✓ | |
| 25 | moría → murió | clear | ASP.02 | ASP.02 | ✓ | |
| 30 | lo que no vio era → fue | clear-ish | ASP.05 (ASP.01 under draft) | NONE | ✗ | Pseudo-cleft: *lo que no vio fue…*; the meaning is clear (his pet Suerte). |
| 35 | fui (a) nadar cuando era pequeña → iba | **pref** | NONE | ASP.03 | ✗ | A single outing is grammatical; *cuando era pequeña* does not force a habit. |
| 40 | le gustaron los dibujos → gustaban | clear-ish | ASP.01 | ASP.01 | ✓ | |
| 45 | fue muy difícil… todo el tiempo → era | clear | ASP.01 | ASP.01 | ✓ | |
| 50 | me encantaron mi trabajo → encantaban | pref-leaning | ASP.01 | ASP.01 | ✓ | *Trabajé* was left as is, so a totalizing reading is coherent. |
| 55 | luego hacía las galletas → hice | clear | ASP.02 | ASP.02 | ✓ | Duplicate of 80. |
| 60 | no entendió mis historias → entendía | clear-ish | ASP.01 | ASP.01 | ✓ | |
| 65 | la cena fue pasta → era | clear | ASP.03 | ASP.01 | ✗ | Recurring dinners in a routine context; overlap between ASP.01 and ASP.03. |
| 70 | fui a escuela primaria → iba; seguía → seguí | clear / pref | ASP.03 (for fui→iba) | NONE | ✗ | Split the row into two items; *seguía* can be habitual. |
| 75 | crecía rica → creció | clear | ASP.02 | ASP.02 | ✓ | Duplicate of 85. |
| 80 | hacía las galletas → hice | clear | ASP.02 | ASP.02 | ✓ | |
| 85 | crecía rica → creció | clear | ASP.02 | ASP.02 | ✓ | |
| 90 | quise ir a casa → quería | clear | ASP.04 | ASP.04 | ✓ | |
| 95 | veíamos a nuestra amiga → vimos | clear | ASP.02 | ASP.02 | ✓ | |
| 100 | su clase comenzó a las 10:30 → comenzaba | **clear** | ASP.01 (rewritten) | NONE | ✗ | The drafter says preterite is natural, but the class had not started when the alarm was set. Prospective/scheduled imperfect. Compare 127, coded ASP.03. |
| 105 | lo que vi era una locura → fue | clear-ish | ASP.05 (ASP.01) | ASP.01 | ✓ | |
| 110 | era muy romántico → fue | pref-leaning | ASP.05 (ASP.01) | ASP.01 | ✓ | |
| 115 | me enseñaba cómo sobrevivir → enseñó | **pref** | NONE | ASP.02 | ✗ | Teaching across a childhood is naturally imperfect. |
| 120 | era nº 1 la semana que se estrenó → fue | clear | ASP.05 (ASP.01) | ASP.01 | ✓ | |
| 125 | ocurrió cada miércoles → ocurría | clear | ASP.03 | ASP.03 | ✓ | |
| 130 | sabía que necesité → necesitaba | clear | ASP.01 | ASP.04 | ✗ | *Necesitar* has no lexical meaning shift. |
| 135 | todos vivieron en la misma casa → vivían | clear-ish | ASP.01 | ASP.01 | ✓ | |
| 140 | una carta… dije → decía | clear | ASP.01 | ASP.01 | ✓ | |
| 145 | siempre quería conocer → quise | **questionable** | NONE | NONE | ✓ | The imperfect is natural here. |
| 150 | su familia durmieron → dormía | clear | ASP.02 | ASP.02 | ✓ | |
| 155 | la araña estuvo → estaba | clear | ASP.01 | ASP.01 | ✓ | |
| 160 | cuando llamaba a mi madre → llamé | **pref** | NONE | ASP.02 | ✗ | 'While I was calling' is grammatical. This item is also the draft's positive example for ASP.02. |
| 165 | se acostó un hombre → acostaba | clear error, **weak target** | ASP.01 | NONE | ✗ | Target should be *estaba acostado*; the learner's form is still an error. |
| 170 | fueron mis favoritos → eran | clear-ish | ASP.01 | ASP.01 | ✓ | |
| 175 | me hizo sentir incómoda → hacía | **pref** | NONE | ASP.02 | ✗ | The drafter's own reason concedes "framing is limited". |
| 180 | fue muy divertido la mayor parte del tiempo → era | clear-ish | ASP.01 | ASP.01 | ✓ | |
| 185 | me ayudó, cocinó, leyó → -aba / -ía | clear | ASP.03 | ASP.03 | ✓ | |
| 190 | dónde estuvo el grupo → estaba | clear | ASP.01 | ASP.01 | ✓ | |
| 195 | no fue una persona (sino) un pollo → era | clear-ish | ASP.01 | ASP.01 | ✓ | |

Patterns in the disagreements:
- **Preferences coded as errors:** 10, 35, 115, 160, 175. These are the most harmful for training, because they teach the evaluator to flag correct Spanish.
- **Codable items left as NONE:** 30, 70, 100, 165.
- **Boundary errors:** 65 (ASP.01 vs ASP.03) and 130 (ASP.04 vs ASP.01).
- **Instructor corrections:** of the 40 audited, about 7 are preferences or questionable (10, 35, 115, 145, 160, 175, plus 50 leaning that way) and one has a weak target (165).

### 1.3 NONE items (28 rows, about 25 unique)

- **Genuinely NONE (preference or ambiguity):** 47, 64 (the instructor swapped *eran/fue* in both directions), 87/186, 104, 121, 124, 126, 131, 141, 145, 151, 196, 29 (the *cantaba* half). This is correct and fine.
- **Not an aspect error; filter out of the concept:** 33 (*faltar* agreement and argument structure), 44 (*hubieron visto*: auxiliary morphology), 84 (*si ella me lo compró*: should be the subjunctive *comprara*; the instructor's *compraba* is colloquial at best). These should go to their own concepts or be dropped, not sit as NONE in the aspect set.
- **Unclear text:** 123.
- **Codable, wrongly NONE:**
  - 30: ASP.05.
  - 100: ASP.01, scheduled; a missing sub-case.
  - 162: *teníamos que → tuvimos que* is ASP.04 *tener que*, a missing verb in that code.
  - 165: ASP.01 with corrected target.
  - 14, after splitting: *tuve que → tenía que* ASP.04; *estuvo horrorizada → estaba* ASP.01; *admitieron → admitían* ASP.02.
  - 62: both changes (*tuvieron → tenían*, *hizo → hacía*) are ASP.03, so they do not even "mix" codes. Its duplicate 36 was coded ASP.01.
  - 70/94: ASP.03 for *fui → iba*.
  - 102: *fueron aburridos → eran* is a preference; *no pudo → podía* is a preference.
  - 114: *sonrió → sonreía* ASP.03 and *fue bebé → era* ASP.01.
- **What these show:** a missing ASP.05 (whole-episode evaluation and pseudo-clefts), *tener que* missing from ASP.04, a missing scheduled/prospective sub-case in ASP.01, and a data policy problem (multi-change rows).

### 1.4 Coverage and gaps

- **Missing:** ASP.05 (above); *tener que* and *haber* (*hubo* vs *había*, see 188) in ASP.04; schedules and prospective statements in ASP.01.
- **Frequent sub-patterns worth naming inside ASP.01** as anchor examples, not separate codes, because they are formulaic and very teachable: age and time (*cuando tuvo [tenía] X años*: 46, 77, 118, 168, 177), and the content of texts (*la carta decía*: 72, 140).
- **No code is unsupported.** ASP.04 has 16 unique items, but about half are *poder* preferences. Once those are cleaned out, real ASP.04 evidence is around 6–8 items (90, 58?, 149, 134, 154, 162, 179). That is enough to keep the code because it is canonical, but the gold set needs constructed or extra examples.
- **Agree with leaving out learner-level patterns** (L1 transfer, narrative flattening, trigger-word overuse). They belong in the learner model.

### 1.5 Verdict: pret/imp

**Usable after revision; not as is.** The four-code backbone is linguistically sound, and three of the four codes (ASP.01–ASP.03) match the real data well. Changes, in order of importance:

1. Remove preference corrections from the error labels (10, 35, 115, 160, 175, the *poder* items in ASP.04, 176) and add the clear/preference flag.
2. Fix the wrong positive examples: ASP.02 "Cuando llamaba [llamé]"; ASP.04 "No pude [podía] dormir", "No me daba [di] cuenta" and "no supieron [sabían]".
3. Split rows with several changes; remove duplicates and group splits by source error.
4. Narrow ASP.04 to the verbs whose meaning truly shifts, and add *tener que* and *haber*. Drop *darse cuenta*, *necesitar* and *recordar*.
5. Split ASP.01 by direction and add ASP.05 for whole-episode evaluations, bounded states and onsets.
6. Add decision rules: stative verb → ASP.01/ASP.05, dynamic verb → ASP.02, recurring → ASP.03 (even with *ser*). Add the scheduled-event case to ASP.01.
7. Move non-aspect items (33, 44, 84) out of the concept. Replace the ASP.03 probe with a minimal pair.

---

## 2. Por vs para (PRP.01–PRP.06)

### 2.1 Codes

**PRP.01 Purpose or goal vs cause or basis: rewrite and split.**
- The core contrast is correct (para + goal or intended use; por + reason, motive, basis, agent).
- At 50 unique errors it is overloaded, with three different things inside:
  - (a) Purpose and intended use: 23, 31, 32, 43, 71/123, 79/137, 91/127, 99/146, 102, 108, 135, 136/159, 163.
  - (b) Cause and basis: *famoso/conocido por* (5, 21, 78, 133, 190), *a prisión por un crimen* (48), *idiota por interrumpir* (105), *premios por* (145), *culpar por* (194), plus the passive agent *afectados por* (176).
  - (c) **Feelings and attitudes toward an object:** *emocionado/agradecido/triste/nervioso/desesperado/miedo/respeto/sentimientos/gracias + por* in 3/170, 15/193, 28/104, 37, 42/66, 52/67, 64, 69, 70/117, 76/168, 90, 92, 94/156, 106, 111, 126/178, 128 and 142. That is about 20 unique errors, the single largest cluster in the corpus.
- Cluster (c) is a different learner problem: English "excited/grateful/afraid **for**" plus *para*. It is not a purpose-versus-cause confusion, and it is learned as noun or adjective + *por* frames. It needs its own code and practice.
- The code also contains preference corrections where *por* is correct: 83/141 (*luchando por establecer* is standard), 154 (*era por una mejor oportunidad*: *por* for motive is fine), 74 (second *para nuestro futuro* is a fine purpose), 143 (*trabajando duro para el futuro de sus hijos* is fine), and 162 (*actividades por hacer* is idiomatic, meaning 'still to do').
- Rewrite: *"Para marks the goal of an action or the intended use of a thing (volver a la tienda para buscarlo, medicina para las pulgas, tarea para la clase); por marks the reason, motive, basis or agent (famoso por, castigado por, me quedé en casa por la lluvia, afectado por). Do not use for feelings or attitudes toward an object (PRP.07), recipients or 'for the sake of' (PRP.02), or evaluative predicates (PRP.06)."*
- The positive example "Estudio por las clases [para las clases]" is weak. Replace it with *volvimos a la tienda por buscarlo [para buscarlo]* (23) or *me quedé en el dormitorio para [por] la lluvia* (36).
- Probe: fine.

**New PRP.07 Feeling or attitude toward someone or something (por).**
- Covers *emocionado, agradecido, preocupado, triste, nervioso, miedo, respeto, pasión, amor, sentimientos, interés, gracias* + **por** where the learner wrote *para*.
- Note that *de* or *con* are sometimes alternatives (*emocionada de verte*). Accept them as correct.
- Practice: `emotion_attitude_por_frames`.
- Probe: «Estoy muy agradecida ___ tu ayuda» / «Tengo mucho respeto ___ mi abuela».
- This is also where *pasión para* (55) and *amor para mí* (153) belong.

**PRP.02 Recipient or beneficiary vs acting on someone's behalf: rewrite.**
- The definition limits the *por* side to "in someone's place". The *por* side learners actually need is **for the sake of / in support of / in honour of**: *hacer mucho por alguien* (35, 68, 152), *votar por* (182/183), *luchar o pelear por* (121/122), *trabajar por él* in his memory (185).
- The draft sends these to NONE as "lexical" while keeping *gracias por* under PRP.01. That is inconsistent.
- It also misses employers and teams, which the drafter nonetheless coded here (*trabajar para S.H.I.E.L.D./una revista/la escuela*: 10, 26, 124, 129). They should be named in the definition.
- The code contains preference corrections where *por* is correct: *trabajar mucho por la familia* (45, 97, 197), *hace cambios por las minorías* (113), *jugar por la selección* (2, 4, 29). The last is common in Latin American sports usage; 169, a duplicate of the same error, was NONE.
- 115 (*espacio para un animal*) is intended use, so PRP.01, not recipient.
- Rewrite: *"Para marks the recipient, beneficiary, audience, employer or team (comprar/cocinar algo para alguien, trabajar para una empresa); por marks for the sake of, in support of, in place of or in honour of (hacer algo por alguien, votar/luchar por). With trabajar/luchar/hacer + a family member, both readings exist: abstain unless the context shows a product handed over or an organisation as employer."*
- Replace the confusing negative example "Estudio por mi familia [para mi familia only if they are recipients]" with *Trabaja mucho por su familia* (acceptable; abstain).
- Probe: fine. Add «Voté ___ Biden».

**PRP.03 Duration or time span vs deadline: keep, with fixes.**
- The contrast is clear and well evidenced. Two refinements:
  1. With durations, the most natural correction is often *durante* or no preposition (*practiqué kung fu trece años*), and with *estar* + perfect it is *desde hace* (150/192). Accept those targets, and note that *por + duration* is more Latin American than Peninsular.
  2. Exclude frequency and fixed expressions: 82 (*cuatro días a la semana* is a frequency with no preposition, not a duration) and 14 (*para siempre* is a fixed expression; *por siempre* also exists). Both go to PRP.08.
- 116 (*tomar el autobús para dos minutos*) is unclear; NONE.
- The deadline positive (*estar delgada por el verano → para*, 0) is fine. 17/22 (*pasajes para el 10 de junio*) is designation rather than deadline, but close enough.
- Probe: good.

**PRP.04 Route or transit vs destination: drop from v2 (park as reserved).**
- Zero items. The only motion items (151/195, *caminó por la biblioteca → para*) have questionable corrections: *por* 'through/around' is right, and a destination needs *a*, not *para*.
- A code with no evidence should not appear in training labels. Keep the definition in a "reserved" list and revive it only if route/destination errors show up in more data. Its examples are correct Spanish.

**PRP.05 Price, payment, or exchange: keep, tightened.**
- Correct, and the cases are clear (18/112, 107/187, 125, 62/132, 11, 59).
- Remove "a reward" from the definition, or state it precisely. Prizes for merit (*premios por su trabajo*, 145) are coded PRP.01 (basis), while a bounty (*40.000 dólares por su captura*) is coded PRP.05.
  - Rule: something of value **given or received in exchange** → PRP.05; **merit or blame as the basis of a judgment** → PRP.01.
- Add 166/184 (*no tiene [recibe] dinero por su trabajo*), which the drafter left as NONE.
- Probe: good.

**PRP.06 Suitability or reference point: keep, with a separation rule and a new probe.**
- Correct and clean (40/81, 95, 160, 33/149, 57/114, 109, 118, 155).
- Separation from PRP.01: if *para* depends on an **evaluative predicate** (*bueno, difícil, importante, perfecto, ventaja, demasiado, mejor, tarde*), use PRP.06. If it is the goal of an **action**, use PRP.01. This rule resolves 41/136/171 (*importante para escalar* is PRP.06; *un río para beber agua* is PRP.01) and 100 (*tarde para su primer día* is PRP.06 or a deadline).
- The probe «Estoy triste ___ mí meaning 'because of myself'» is unnatural and confusing. Replace it with «Este ejercicio es difícil ___ los principiantes» vs «Lo castigaron ___ mentir».

**New PRP.08 Governed preposition, fixed expression, or no preposition needed.**
- **This answers the question about "buscar para" and "pasión para".** Many learner errors with *por/para* are not a meaning choice between the two. Either a word governs the preposition, or Spanish needs a different preposition or none:
  - *razón para / la razón por la que* (20, 60/12)
  - *quedar/estar por + infinitive* (54/85)
  - *preguntar por alguien* (16)
  - *para siempre*, *para nada* (14, 173)
  - *pedir Ø ayuda* (181, 147)
  - *buscar a Buttercup* (172)
  - *esperarlos* (164)
  - *película sobre su personaje* (50)
  - *cuatro días a la semana* (82)
- About 12–14 unique errors, more than PRP.05. The evaluator can identify them in one response. The practice is different (collocation and chunk learning). v1 had PP.07 for this, and v2 discarded it without a replacement, which pushes these items into NONE or into the wrong meaning code (60 → PRP.01).
- Definition: *"The learner used por or para where the choice is fixed by a neighbouring word or expression, or where Spanish uses another preposition or none. The evaluator must give the target (por, para, a, de, con, en, sobre or Ø)."*
- Practice: `lexical_preposition_chunks`.
- Probe: «Buscamos ___ perro por todo el barrio» (Ø/*al*) / «Queda mucho ___ hacer» (*por*).
- *Pasión para* (55) goes to PRP.07, not PRP.08: *por* is the regular attitude preposition, so it is teachable as meaning, not as an arbitrary collocation.

### 2.2 Assignment audit (i % 5 == 0)

Agreement under the draft's own codes: **34 / 40 = 85%**. Under my proposed codes (PRP.07, PRP.08), seven more items differ (15, 70, 90 and 170 go to PRP.07; 20 and 85 go to PRP.08; 55 goes to PRP.07). Those are taxonomy changes, not drafter errors.

| i | Learner form → instructor | Correction | Mine | Drafter | Agree | Note |
|---|---|---|---|---|---|---|
| 0 | delgada por el verano → para | clear | PRP.03 | PRP.03 | ✓ | |
| 5 | famoso para → por | clear | PRP.01 | PRP.01 | ✓ | |
| 10 | trabajan por S.H.I.E.L.D. → para | clear | PRP.02 | PRP.02 | ✓ | Employer. Duplicate of 130. |
| 15 | miedo para la vida de mi madre → por | clear | PRP.01 (PRP.07 proposed) | PRP.01 | ✓ | |
| 20 | razones por esto → para | clear-ish | NONE (PRP.08 proposed) | NONE | ✓ | Governed by *razón*. |
| 25 | volvimos… para Navidad → por | **pref** | NONE | NONE | ✓ | |
| 30 | fue aquí para tres años → por | clear (better *durante*/Ø) | PRP.03 | PRP.03 | ✓ | |
| 35 | hacía mucho para mí → por | clear | PRP.02 (rewritten) | NONE | ✗ | *Hacer mucho por alguien*. The drafter coded the same pattern in 38 as PRP.02. |
| 40 | ventaja por mí → para | clear | PRP.06 | PRP.06 | ✓ | |
| 45 | trabajar por su familia → para | **pref** | NONE | PRP.02 | ✗ | 'For the sake of' *por* is correct. |
| 50 | película por su carácter → para | **weak target** (*sobre*) | NONE (PRP.08 proposed) | NONE | ✓ | |
| 55 | pasión para → por | clear | NONE (PRP.07 proposed) | NONE | ✓ | |
| 60 | la razón por querer → para | clear-ish | NONE (PRP.08 proposed) | PRP.01 | ✗ | The meaning is a reason, yet Spanish requires *para*: a governed preposition, not purpose. |
| 65 | NY para unos días → por | mild | PRP.03 | PRP.03 | ✓ | |
| 70 | emocionada para ver → por | clear | PRP.01 (PRP.07 proposed) | PRP.01 | ✓ | |
| 75 | confiar en ella por cualquier cosa → para | clear | PRP.01 | NONE | ✗ | Purpose: 'trust her for anything'. |
| 80 | casa por mi familia → para | clear | PRP.02 | PRP.02 | ✓ | |
| 85 | queda mucho para aprender → por | clear | NONE (PRP.08 proposed) | NONE | ✓ | |
| 90 | emocionada para el futuro → por | clear | PRP.01 (PRP.07 proposed) | PRP.01 | ✓ | |
| 95 | genial por la sociedad → para | clear | PRP.06 | PRP.06 | ✓ | |
| 100 | tarde por su primer día → para | clear | PRP.03 (or PRP.06) | NONE | ✗ | Target event; the error is clear. |
| 105 | jackass para interrumpir → por | clear | PRP.01 | PRP.01 | ✓ | |
| 110 | saliendo para muchos años → por | clear | PRP.03 | PRP.03 | ✓ | |
| 115 | espacio por un animal → para | clear | PRP.01 | PRP.02 | ✗ | Intended use, not a recipient. The drafter's own reason says "intended for". |
| 120 | cocine por mi familia → para | clear | PRP.02 | PRP.02 | ✓ | |
| 125 | vender para dinero → por | clear | PRP.05 | PRP.05 | ✓ | |
| 130 | trabajan por S.H.I.E.L.D. → para | clear | PRP.02 | PRP.02 | ✓ | |
| 135 | la clase por mi major → para | clear | PRP.01 | PRP.01 | ✓ | |
| 140 | desayuno por nuestra familia → para | clear | PRP.02 | PRP.02 | ✓ | |
| 145 | premios para su trabajo → por | clear | PRP.01 | PRP.01 | ✓ | Conflicts with the "reward" wording in PRP.05. |
| 150 | cuarentena para casi un año → por | clear (better Ø/*desde hace*) | PRP.03 | PRP.03 | ✓ | |
| 155 | algo mejor por su vida → para | clear | PRP.06 | PRP.06 | ✓ | *Soñó de* (→ *con*) is left uncorrected. |
| 160 | bueno por mi salud → para | clear | PRP.06 | PRP.06 | ✓ | |
| 165 | premios para su trabajo → por | clear | PRP.01 | PRP.01 | ✓ | Duplicate of 145. |
| 170 | agradecido para el idioma → por | clear | PRP.01 (PRP.07 proposed) | PRP.01 | ✓ | |
| 175 | para trece años → por | clear (better *durante*) | PRP.03 | PRP.03 | ✓ | |
| 180 | jackass para interrumpir → por | clear | PRP.01 | PRP.01 | ✓ | Duplicate of 105. |
| 185 | trabajar para él → por | clear | PRP.02 | PRP.02 | ✓ | Its duplicate 56 was NONE. |
| 190 | conocido para → por | clear | PRP.01 | PRP.01 | ✓ | |
| 195 | caminó por la biblioteca → para | **questionable** | NONE | NONE | ✓ | *Por* 'through' is correct; a destination would need *a*. |

Instructor corrections in the audit: about 3 are preferences or questionable (25, 45, 195) and about 4 have a better target than the one given (30, 50, 150, 175).

### 2.3 NONE items (43 rows, about 32 unique)

- **Genuinely NONE (preference, ambiguity or unclear text):** 7, 8/177, 9/189, 25, 86/89, 98, 131 (*requeridos por* as an agent is correct), 134, 151/195, 116, 77 (*canté en el desfile* would be natural), 169 (*jugar por* is acceptable; the drafter should then also NONE 2/4/29).
- **Revealing PRP.08 (governed preposition, other preposition or none):** 16 (*preguntó por su hijo*), 20, 54/85, 147 (*pedir*), 164 (*esperarlos*), 172 (*buscar a*), 173 (*para nada*), 181 (*pedir ayuda*), 50 (*sobre*).
- **Revealing the narrow PRP.02 ('for the sake of / support'):** 35/98, 68, 152 (*hacer algo por alguien*), 121/122 (*pelear por una vida mejor*), 182/183 (*votar por*), 56 (= 185).
- **Revealing PRP.07:** 55 (*pasión por*); 153 (*amor por mí*, which also contains *regalos para mí*, PRP.02, so split the row).
- **Plain misses under existing codes:** 36 (*me quedé… para [por] la lluvia* is obviously cause, PRP.01), 75 (PRP.01), 100 (PRP.03/06), 166/184 (*no recibe dinero por su trabajo*, PRP.05), 13/167 (*amables para una familia de cuatro*, plausibly PRP.06), 171 (split: PRP.06 + PRP.01).
- In short, **about two thirds of the por/para NONEs are codable** once PRP.02 is widened and PRP.07 and PRP.08 exist. The drafter's NONE rate (22% of rows) is too high for the reasons above.

### 2.4 Coverage and gaps

- **Missing:** the attitude/emotion object code (PRP.07); the 'for the sake of / in support of' side of PRP.02; the governed, other-preposition and no-preposition code (PRP.08); the passive agent (*afectados por*, 176), which can sit inside PRP.01 as cause or agent.
- **Unsupported:** PRP.04 has zero items, so drop or reserve it. PRP.05 is thin (6 unique errors) but canonical and unambiguous, so keep it.
- **"buscar para", "pasión para":** yes, there is a gap. *Buscar/esperar/pedir* + *para* need Ø (or *a*), not *por*. The instructors sometimes "fix" these to *por* (172, 164, 181), which itself teaches a calque. Those go to PRP.08, with the target given explicitly. *Pasión para* goes to PRP.07.
- **Instructor reliability issues specific to por/para:**
  - Corrections from correct *por* to *para*: 83/141 *luchar por*, 162 *por hacer*, 45/97/197 *trabajar por la familia*, 154, 113.
  - Corrections from correct *para* to *por*: 74 (second change), 143.
  - Inconsistency between instructors on the *quedar por* / *por hacer* frame: 54/85 corrected to *por*, while 162 corrected *por* to *para*.

### 2.5 Verdict: por/para

**Not fit for training as is; fit after the changes below.** The meaning distinctions are right, but the boundaries put items in the wrong place in both directions: preferences are coded as errors, and clear errors are left as NONE. Changes, in order of importance:

1. Add the clear/preference flag and remove preference corrections from the error labels (45/97/197, 83/141, 154, 162, 143, 74b, 113, 2/4/29).
2. Rewrite PRP.02 so its *por* side is 'for the sake of / in support of / in place of' (*hacer algo por, votar por, luchar por*) and its *para* side names employers and teams. Recode 35/68/152/98, 121/122, 182/183, 56.
3. Split the emotion and attitude objects out of PRP.01 into a new PRP.07 (about 20 unique errors).
4. Add PRP.08 (governed preposition, other preposition or none), with the evaluator giving the target. Recode 16, 20, 54/85, 60, 147, 164, 172, 173, 181, 14, 82, 50.
5. Remove duplicates (26% of rows) and split multi-change rows. Fix inconsistent duplicates (38/58, 41/136/171, 56/185, 169 vs 2/4/29).
6. Drop or reserve PRP.04.
7. Separate PRP.05 from PRP.01 (exchange vs merit basis), and PRP.06 from PRP.01 (evaluative predicate vs action goal). Replace the PRP.06 probe and the weak PRP.01 and PRP.02 examples.
8. In PRP.03, accept *durante*, Ø and *desde hace* targets, and send frequency and fixed expressions to PRP.08.
