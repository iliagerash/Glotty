# Tatoeba sentences in the training data

`inject-pool.jsonl` contains sentences from [Tatoeba](https://tatoeba.org), via the
[ManyThings.org export](https://www.manythings.org/anki/) (`spa-eng.zip`), licensed under
[CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/). Each item keeps its original
attribution line (`attribution`). Error items are altered versions of the original sentences
(one preterite/imperfect or por/para form swapped, `scripts/inject.ts`); the originals are kept
as the correct items.
