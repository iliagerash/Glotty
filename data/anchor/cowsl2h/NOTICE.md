# COWS-L2H anchor items

Some items in `data/gold/items.jsonl` (ids `cows-…`, source `learner`) are sentences from the
**UC Davis Corpus of Written Spanish, L2 and Heritage Speakers (COWS-L2H)**,
https://github.com/ucdaviscl/cowsl2h, commit `ebb11724f258f3ed377a27ed34f08897a8e5639c`, used under the Apache License 2.0
(copy in `LICENSE` next to this file). Their labels in `data/gold/model_labels/anchor-cowsl2h.jsonl`
are derived from the corpus's instructor corrections by `scripts/anchor-import.ts`; the sentences
are unchanged apart from whitespace.

Corpus paper: "COWS-L2H: A corpus of Spanish learner writing", *Research in Corpus Linguistics*,
https://ricl.aelinco.es/index.php/ricl/article/view/109.
