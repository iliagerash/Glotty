/**
 * The learner experience is being rebuilt on a measured evaluator (§49).
 * Until the evaluator passes its gates there is nothing for learners here;
 * the gold set and the benchmark are offline scripts (see README).
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Glotty</h1>
      <p className="mt-3 text-slate-700">
        The conversation is being rebuilt on top of a measured evaluator. Nothing is open to learners until it passes
        its gates.
      </p>
    </main>
  );
}
