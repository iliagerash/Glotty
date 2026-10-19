# Labelling instructions

You are an expert Spanish teacher and applied linguist. Label each of the 116 learner responses in `items.jsonl`. The learners are adult English speakers at roughly B1 level. Each line has an `id`, the `prompt` the learner was answering, and the learner's `response`.

Judge every item yourself, one by one, as a teacher would. Do not write code, keyword rules or heuristics to assign labels. Label every item exactly once, even if it looks like a near-duplicate of another.

## Rules

### What you are judging

Only two things:

- **Preterite vs imperfect.** Was the aspect choice right?
- **Por vs para.** Was the preposition choice right?

Ignore everything else when choosing the label: missing accents, gender agreement, vocabulary, word order. Mention notable ones in the notes if you like.

### Labels

| Label | Use when |
|---|---|
| **Correct** | Every preterite/imperfect and por/para choice fits the most plausible reading. One acceptable reading is enough. |
| **Incorrect** | At least one choice is wrong under every plausible reading. |
| **Ambiguous** | A choice is right under one plausible reading and wrong under another, and nothing in the prompt settles it. In the notes, write the question you would ask the learner. The readings are about what the learner meant, not facts the speaker is unsure of: *No sé si llegó a las ocho o a las nueve* is judged as written. |
| **N/A** | The response contains no preterite or imperfect form and no *por* or *para* at all (e.g. it is entirely in the present). If any such form appears, label it Correct or Incorrect even when the choice is obviously right. |

Be charitable. *Ayer iba al supermercado y compré leche* is correct: the trip is background, the purchase is the event. Time words like *ayer* do not force the preterite. The limit: in a narrative, a clause that only sets the scene for the other events needs the imperfect. *Entré en la sala, hizo frío y la música sonó fuerte* is Incorrect (PI.06). A missing accent does not change the tense you judge: read *comia* as *comía*. Accept any usage an educated native speaker from some Spanish-speaking region would accept, and note the region if it matters.

### Diagnosis code (Incorrect only)

Pick the code that explains **why** the learner chose wrong, not just what is wrong. Read the "Not this code" line before choosing. If several errors appear, code the one most central to the response. If nothing fits, use `UNKNOWN`. A rising `UNKNOWN` rate tells us the taxonomy needs work, so don't stretch a code to avoid it.

### Confidence

- **Guess.** You could argue it either way.
- **Fairly sure.** You'd defend this label, but a colleague might disagree.
- **Certain.** Any trained annotator would agree.

## Diagnostic taxonomy

Use exactly one of these codes for an `incorrect` label. Read each code's "Is NOT this code" examples before choosing.

### PI.01: Background/foreground inversion (es.gram.aspect.pret_imp)
The learner selects the preterite for clauses providing background or descriptive context within a narrative, reserving no aspectual contrast for foregrounded events.
Is this code: *Cuando fui joven, jugué al fútbol todos los días. | *Hacía frío y llovió cuando salí.
Is NOT this code: Ayer iba al supermercado y compré leche. (Correct: the trip is backgrounded and the purchase foregrounded) | La fiesta fue divertida. (Correct: bounded evaluation of a completed event, not background description)

### PI.02: Lexical trigger overgeneralization (es.gram.aspect.pret_imp)
Lexical temporal markers such as 'ayer', 'anoche', or 'una vez' are mechanically treated as forcing the preterite, overriding imperfect aspect even when setting descriptive background.
Is this code: *Ayer cuando volví a casa, la puerta estuvo abierta. | *Anoche hubo mucho ruido y no pude dormir mientras estudié.
Is NOT this code: Ayer salí a las seis. (Correct: single bounded completed event) | Anoche cené con Marta. (Correct: punctual event)

### PI.03: Durative-verb default (es.gram.aspect.pret_imp)
Inherently durative verbs (vivir, esperar, dormir) are mechanically conjugated in the imperfect regardless of explicit temporal bounding or completed duration.
Is this code: *Vivía en Sevilla durante tres años y luego me mudé a Madrid. | *Esperaba dos horas en el aeropuerto hasta que cancelaron el vuelo.
Is NOT this code: Vivía en Sevilla cuando era estudiante. (Correct: unbounded past state) | Esperaba el autobús tranquilamente. (Correct: continuous unbounded action)

### PI.04: Habitual past mapped to preterite (es.gram.aspect.pret_imp)
Recurring or habitual past routines are expressed using the preterite instead of the imperfect.
Is this code: *De niño, todos los veranos fui a la playa con mi familia. | *Siempre comí a las dos cuando trabajaba allí.
Is NOT this code: Fui tres veces al cine la semana pasada. (Correct: discrete quantified occurrences) | Ese verano fui a la playa todos los días pero un día llovió. (Preterite possible when framing total period as completed)

### PI.05: State-verb aspect shift not acquired (es.gram.aspect.pret_imp)
Failure to recognize the semantic shift in state verbs across aspects (conocer: conocía vs conocí; saber: sabía vs supe; querer: quería vs quiso; poder: podía vs pude).
Is this code: *Ayer finalmente sabía la verdad sobre el proyecto. | *Conocía a María anoche en la fiesta de cumpleaños.
Is NOT this code: Ya sabía la respuesta antes de la clase. (Correct: continuous knowledge) | Conocía muy bien esa ciudad. (Correct: established acquaintance)

### PI.06: Narrative flattening (es.gram.aspect.pret_imp)
Collapsing an entire past narrative into the preterite, eliminating all background descriptions, ongoing actions, and simultaneous states.
Is this code: *Ayer fui al parque, fue un día bonito, los pájaros cantaron y de repente vi un perro. | *Entré en la sala, hizo frío y la música sonó fuerte.
Is NOT this code: Me levanté, me duché, desayuné y salí. (Correct: sequential foreground actions) | Llegó, vio el desorden y gritó. (Correct: sequence of punctual events)

### PI.07: L1 transfer: English past progressive mapped mechanically (es.gram.aspect.pret_imp)
Mechanical 1-to-1 transfer mapping English 'was doing' exclusively to imperfect/progressive, and English simple past 'did' exclusively to preterite, missing Spanish aspectual nuances.
Is this code: *Cuando viví en Madrid (because English says 'When I lived in Madrid'). | *Tenía un accidente ayer mientras conducía.
Is NOT this code: Estaba comiendo cuando llamaron. (Correct use of past progressive) | Ayer comí una manzana. (Correct simple past mapping)

### PI.08: Bounded duration misread as ongoing (es.gram.aspect.pret_imp)
The presence of a duration expression leads the learner to interpret the action as ongoing and choose imperfect, missing that the duration is complete and bounded.
Is this code: *La película duraba dos horas ayer. | *Estaba enfermo durante tres días la semana pasada.
Is NOT this code: La película era larga y duraba mucho. (Imperfect valid for descriptive characteristic) | Estaba enfermo cuando me llamaste. (Correct: state holding at reference time)

### PP.01: Beneficiary/purpose conflation (es.sem.por_para)
The learner confuses acting on behalf of / in place of someone (por) with acting toward a recipient / destination (para), treating both as an undifferentiated beneficiary.
Is this code: *Hice el examen para ti porque estabas enfermo. (Intended substitution/on behalf of) | *Compré este regalo por ti. (Intended recipient/destination of gift)
Is NOT this code: Trabajo para una empresa tecnológica. (Correct: recipient/purpose of labour) | Lo hice por compasión. (Correct: motive/cause)

### PP.02: Motion: route vs destination (es.sem.por_para)
Conflating the path/transit through a space (por) with the final goal/destination of motion (para).
Is this code: *Caminamos para el parque durante una hora. (Intended: walking through the park) | *El tren sale por Barcelona a las diez. (Intended: destination)
Is NOT this code: Salimos para Madrid en el vuelo de la mañana. (Correct: destination) | El ladrón escapó por la ventana. (Correct: route/transit)

### PP.03: Cause vs goal conflation (es.sem.por_para)
Collapsing antecedent motive/cause looking backward (por) into forward-looking purpose/objective (para).
Is this code: *Llegué tarde para el tráfico. (Intended: because of traffic) | *Estudio español por conseguir un mejor empleo. (Intended: in order to)
Is NOT this code: Llegué tarde por la lluvia. (Correct: cause) | Estudio para aprobar el examen. (Correct: purpose)

### PP.04: Duration vs deadline conflation (es.sem.por_para)
Confusing the time span over which an event extends (por) with the point in time marking a deadline (para).
Is this code: *Necesito este informe por el viernes. (Intended deadline) | *Estudiamos para tres horas ayer por la tarde. (Intended duration)
Is NOT this code: El proyecto debe estar listo para mañana. (Correct: deadline) | Vivió en Granada por dos años. (Acceptable duration)

### PP.05: Exchange/substitution unrecognized (es.sem.por_para)
Failing to use 'por' to denote economic exchange, price, trade, or direct substitution.
Is this code: *Pagué cincuenta euros para estos zapatos. | *Te cambio mi manzana para tu bocadillo.
Is NOT this code: Compré un libro para mi hermano por quince euros. (Correct use of both: para recipient, por price) | Pagué por adelantado. (Correct fixed usage)

### PP.06: Undifferentiated L1 'for' (es.sem.por_para)
The learner has no coherent mental partition between por and para; choices are essentially random or governed by phonetic intuition due to English 'for' mapping to both.
Is this code: *Gracias para la ayuda. | *Estudio por ser médico. | *Caminamos para la playa por una hora. | *Este regalo es por ti.
Is NOT this code: Consistent errors restricted only to recipient vs beneficiary (code as PP.01, not PP.06)

### PP.07: Fixed expression treated as rule-derived (es.sem.por_para)
Treating high-frequency lexicalized fixed chunks ('gracias por', 'por favor', 'por ejemplo', 'por fin', 'para siempre') as if they required compositional grammatical reasoning, often selecting the wrong preposition.
Is this code: *Muchas gracias para todo. | *Para fin hemos llegado después de diez horas. | *Para ejemplo, podemos considerar esta opción.
Is NOT this code: Gracias por invitarme. (Correct lexicalized chunk) | Por favor, siéntate. (Correct)

### UNKNOWN: Uncategorized misconception (all)
Mandatory catch-all for learner errors that do not conform to any established diagnostic code in the taxonomy. Retained for human review and taxonomy version evolution.
Is this code: Novel or idiosyncratic syntactic structures not captured by PI.01-PI.08 or PP.01-PP.07.
Is NOT this code: Any error matching defined criteria for PI.01-PI.08 or PP.01-PP.07.

## Output

Return a downloadable file named `labels.jsonl`: one JSON object per line, one line per item, 116 lines in total, in any order. No other text in the file.

```json
{"item_id": "syn-0123456789", "evaluation": "incorrect", "diagnosis_code": "PI.06", "confidence": 2, "notes": "hizo -> hacía"}
```

- `item_id`: the item's `id`, copied exactly.
- `evaluation`: `correct`, `incorrect`, `uncertain` (the label called Ambiguous above) or `not_applicable` (N/A).
- `diagnosis_code`: a code from the taxonomy (or `UNKNOWN`) when `evaluation` is `incorrect`; otherwise `null`.
- `confidence`: `1` guess, `2` fairly sure, `3` certain.
- `notes`: for `incorrect`, the corrected target word(s), e.g. `"hizo -> hacía"`; for `uncertain`, the one question you would ask the learner; otherwise `""`. Keep it short.

If you cannot finish all 116 items in one reply, continue in further replies until every item has a line, then give the complete file.
