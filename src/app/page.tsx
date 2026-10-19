import Link from "next/link";

/**
 * The learner experience is being rebuilt on a measured evaluator (§49).
 * Until the evaluator passes its gates, the only working surface is the
 * gold-set annotation tool.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Glotty</h1>
      <p className="mt-3 text-slate-700">
        The conversation is being rebuilt on top of a measured evaluator. The first step is a gold set of labelled
        learner responses.
      </p>
      <Link href="/annotate" className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-white">
        Annotate the gold set
      </Link>
    </main>
  );
}
