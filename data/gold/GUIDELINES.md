# Gold set annotation guidelines

These are the rules for labelling learner responses at `/annotate`. The evaluator prompt (`prompts/evaluator/v4.md`) follows the same rules. If you change one, change the other, because the benchmark compares the two.

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

## Diagnosis code (Incorrect only)

Pick the code that explains **why** the learner chose wrong, not just what is wrong. Read the "Not this code" line before choosing. If several errors appear, code the one most central to the response. If nothing fits, use `UNKNOWN`. A rising `UNKNOWN` rate tells us the taxonomy needs work, so don't stretch a code to avoid it.

## Confidence

- **Guess.** You could argue it either way.
- **Fairly sure.** You'd defend this label, but a colleague might disagree.
- **Certain.** Any trained annotator would agree.

## Independence

Label without looking at anyone else's labels, at the evaluator's output, or at `generator_intent.jsonl`. Agreement between annotators (κ) only means something if the labels are independent.

## Splits

About 30% of items are assigned to a held-out split by a hash of their ID. You annotate everything the same way. The split only matters for the benchmark: prompts are tuned on `dev`, and `heldout` is only reported.
