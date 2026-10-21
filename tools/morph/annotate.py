"""Morphological annotation for Glotty's data pipeline (Workflow v2).

Reads a JSONL file, annotates the given text fields of each record with spaCy,
and writes one JSONL record per input record:

    {"id": ..., "fields": {"<field>": [[text, lemma, pos, feats, sent, space], ...]}}

feats is spaCy's morphology string (e.g. "Mood=Ind|Number=Sing|Person=3|Tense=Past|VerbForm=Fin"),
sent is the token's sentence number within that field, and space is 1 when
a space follows the token, so the text can be rebuilt. Punctuation is kept
(pos "PUNCT"). Concept-agnostic: detectors in TypeScript read these features.

    python tools/morph/annotate.py --in data/morph/cowsl2h-input.jsonl \\
        --out data/morph/cowsl2h.jsonl --fields essay,corrected1,corrected2

Resumable: records already in --out are skipped.
"""

import argparse
import json
import os
import sys
import time


def duration(seconds: float) -> str:
    return f"{int(seconds // 60)}m{int(seconds % 60):02d}s"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="inp", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--fields", required=True, help="comma-separated text fields to annotate")
    parser.add_argument("--model", default="es_core_news_lg")
    parser.add_argument("--batch", type=int, default=64)
    args = parser.parse_args()

    import spacy  # imported here so --help works without spaCy installed

    nlp = spacy.load(args.model, disable=["ner"])
    fields = [f.strip() for f in args.fields.split(",") if f.strip()]

    done = set()
    if os.path.exists(args.out):
        with open(args.out, encoding="utf-8") as f:
            done = {json.loads(line)["id"] for line in f if line.strip()}
    with open(args.inp, encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]
    todo = [r for r in records if r["id"] not in done]
    print(f"Annotating {len(todo)} records ({len(done)} already done), fields {fields}, model {args.model}.")

    # One flat stream of (record index, field, text) so spaCy can batch across records.
    jobs = [(i, field, r.get(field) or "") for i, r in enumerate(todo) for field in fields]
    out_fields: dict[int, dict[str, list]] = {}
    remaining = {i: len(fields) for i in range(len(todo))}
    started = time.time()
    finished = 0

    with open(args.out, "a", encoding="utf-8") as out:
        texts = (text for _, _, text in jobs)
        for (i, field, _), doc in zip(jobs, nlp.pipe(texts, batch_size=args.batch)):
            sent_of = {}
            for n, sent in enumerate(doc.sents):
                for tok in sent:
                    sent_of[tok.i] = n
            out_fields.setdefault(i, {})[field] = [
                [t.text, t.lemma_, t.pos_, str(t.morph), sent_of.get(t.i, 0), 1 if t.whitespace_ else 0] for t in doc if not t.is_space
            ]
            remaining[i] -= 1
            if remaining[i] == 0:
                out.write(json.dumps({"id": todo[i]["id"], "fields": out_fields.pop(i)}, ensure_ascii=False) + "\n")
                finished += 1
                elapsed = time.time() - started
                eta = elapsed / finished * (len(todo) - finished)
                sys.stdout.write(f"\r  {finished}/{len(todo)} records, {duration(elapsed)} elapsed, ~{duration(eta)} left   ")
                sys.stdout.flush()
    sys.stdout.write("\n")
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
