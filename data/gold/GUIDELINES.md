# Gold set annotation guidelines

These are the rules for labelling learner responses. Both governance judges follow them (`gold:label`). The evaluator prompt (`prompts/evaluator/v4.md`) follows the same rules. If you change one, change the other, because the benchmark compares the two.

## What you are judging

Only two things:

- **Preterite vs imperfect.** Was the aspect choice right?
- **Por vs para.** Was the preposition choice right?

Ignore everything else when choosing the label: missing accents, gender agreement, vocabulary, word order, and choices among other prepositions. Mention notable ones in the notes if you like.

One exception: a *por* or *para* where Spanish needs a different preposition (*con*, *en*, *a*, *de*) or none at all counts as a por/para error. *Estoy buscando para mis llaves* is Incorrect (PP.06: English "for" carried over; *buscar* takes no preposition). Use `UNKNOWN` when English "for" doesn't explain it. Apply this only when the *por* or *para* has no valid reading: a destination, cause, duration or other standard use is fine even if another preposition would also work.

## Labels

| Label | Use when |
|---|---|
| **Correct** | Every preterite/imperfect and por/para choice fits the most plausible reading. One acceptable reading is enough. |
| **Incorrect** | At least one choice is wrong under every plausible reading. |
| **Ambiguous** | A choice is right under one plausible reading and wrong under another, and nothing in the prompt settles it. In the notes, write the question you would ask the learner. The readings are about what the learner meant, not facts the speaker is unsure of: *No sé si llegó a las ocho o a las nueve* is judged as written. |
| **N/A** | The response contains no preterite or imperfect form and no *por* or *para* at all (e.g. it is entirely in the present). If any such form appears, label it Correct or Incorrect even when the choice is obviously right. |

Be charitable. *Ayer iba al supermercado y compré leche* is correct: the trip is background, the purchase is the event. Time words like *ayer* do not force the preterite. The limit: in a narrative, a clause that only sets the scene for the other events needs the imperfect. *Entré en la sala, hizo frío y la música sonó fuerte* is Incorrect (PI.06). A missing accent does not change the tense you judge: read *comia* as *comía*. Accept any usage an educated native speaker from some Spanish-speaking region would accept, and note the region if it matters.

## Choosing between readings

Correct needs one natural reading, but not every conceivable one. Weigh the readings for this prompt:

- The reading that makes the learner right is the more natural one → **Correct**. Don't invent a less likely reading to make it Ambiguous.
- The readings are about equally natural and the prompt doesn't settle it → **Ambiguous**.
- The reading that makes the learner wrong is clearly the more natural one → **Incorrect**. Don't rescue the choice with a strained reading.

The prompt counts. *Caminé para la estación* is Correct: heading to the station is natural, and nothing suggests walking around inside it. Answering *¿Dónde estudias?*, *Estudio para la biblioteca* is Incorrect (UNKNOWN): the prompt asks where, which needs *en*.

## Recurring cases

- **A state at the moment of another past event** needs the imperfect. *Cuando llegué a la estación, el tren estuvo lleno* is Incorrect: the full train is the scene at arrival. The preterite of a state is right when the sentence bounds it (*La tienda estuvo cerrada toda la semana*, *Estuve enfermo tres días*) or when it sums up a finished event as a whole (*La boda fue preciosa*). Don't supply a bound the sentence doesn't give.
- **Por + infinitive.** An infinitive that names what the action is meant to achieve takes *para*: *Ahorré dinero por comprar una moto* is Incorrect (PP.03), even though a motive reading can be constructed. *Por* + infinitive is right when the infinitive names a cause that already holds or happened: *Me multaron por aparcar mal*, *Lo hice por no tener otra opción*.

## Diagnosis code (Incorrect only)

Pick the code that explains **why** the learner chose wrong, not just what is wrong. Read the "Not this code" line before choosing. If several errors appear, code the one most central to the response. If nothing fits, use `UNKNOWN`. A rising `UNKNOWN` rate tells us the taxonomy needs work, so don't stretch a code to avoid it.

When two codes both fit, prefer the more specific one:

- **Imperfect with a completed, bounded duration** (*durante dos años*, *tres horas*, *hasta que…*): PI.03 when the verb is an inherently durative activity or state (*vivir, esperar, dormir, trabajar, estudiar*); PI.08 when the duration expression itself misled the learner, typically with *durar* or *estar*/*ser* + a state (*La reunión duraba una hora*, *Estaba enfermo durante tres días*).
- **Preterite for background:** PI.06 when every past verb in a multi-clause narrative is preterite, scene-setting included; otherwise PI.02 when a time word such as *ayer*, *anoche* or *una vez* plausibly drove the choice; otherwise PI.01.
- **Habits** (*siempre, cada, todos los días, de niño…*) in the preterite: PI.04, even when English transfer could also explain it. Use PI.07 only when the learner's choices track the English progressive versus simple past and no more specific code fits.
- **Por/para:** use the specific code (PP.01–PP.05) when the error fits one contrast. PP.06 is for a *por*/*para* where English "for" needs a different preposition or none in Spanish, or for errors across several contrasts in one response.

## Confidence

- **Guess.** You could argue it either way.
- **Fairly sure.** You'd defend this label, but a colleague might disagree.
- **Certain.** Any trained annotator would agree.

## Independence

Label without looking at anyone else's labels, at the evaluator's output, or at `generator_intent.jsonl`. Agreement between annotators (κ) only means something if the labels are independent.

## Splits

About 30% of items are assigned to a held-out split by a hash of their ID. You annotate everything the same way. The split only matters for the benchmark: prompts are tuned on `dev`, and `heldout` is only reported.
