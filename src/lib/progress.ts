/**
 * Progress lines for long-running scripts, rewritten in place on stdout:
 *
 *   label: 23/156, 1 failed, 2m40s elapsed, ~15m26s left
 *   label: waiting, 1m12s elapsed
 *
 * Errors printed with console.error should start with "\n" so they don't
 * overwrite the line.
 */

export const duration = (ms: number) => `${Math.floor(ms / 60000)}m${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}s`;

/** A counter: call tick() after each item (failed or not), done() at the end. */
export function progress(total: number, label: string) {
  const started = Date.now();
  let finished = 0;
  let failed = 0;
  const draw = () => {
    const elapsed = Date.now() - started;
    const eta = finished ? (elapsed / finished) * (total - finished) : 0;
    const left = finished && finished < total ? `, ~${duration(eta)} left` : "";
    process.stdout.write(`\r  ${label}: ${finished}/${total}${failed ? `, ${failed} failed` : ""}, ${duration(elapsed)} elapsed${left}   `);
  };
  draw();
  return {
    tick(ok = true) {
      finished++;
      if (!ok) failed++;
      draw();
    },
    done() {
      draw();
      process.stdout.write("\n");
    },
  };
}

/** For one slow call: a line with the elapsed time, redrawn every second until the promise settles. */
export async function waiting<T>(label: string, work: Promise<T>): Promise<T> {
  const started = Date.now();
  const draw = () => process.stdout.write(`\r  ${label}: waiting, ${duration(Date.now() - started)} elapsed   `);
  draw();
  const timer = setInterval(draw, 1000);
  try {
    return await work;
  } finally {
    clearInterval(timer);
    draw();
    process.stdout.write("\n");
  }
}
