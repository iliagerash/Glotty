/**
 * Smoke test for the gateway: one structured evaluator call per model.
 *
 *   npm run ai:ping                      # both tiers
 *   npm run ai:ping -- cloudflare:@cf/... cloudflare:@cf/...
 */
import "dotenv/config";
import { evaluate } from "@/lib/evaluator";

const SAMPLE = {
  prompt: "Cuéntame qué hacías los veranos cuando eras niño.",
  response: "Cuando era niño, todos los veranos fui a la playa con mi familia.",
};

async function main() {
  const models = process.argv.slice(2);
  for (const model of models.length ? models : ["fast", "strong"]) {
    try {
      const r = await evaluate(SAMPLE, { model });
      console.log(
        `OK   ${r.model}  ${r.latencyMs}ms  ${r.evaluation}@${r.evalConfidence} ${r.diagnosisCode ?? ""}` +
          `  tokens ${r.usage.inputTokens}/${r.usage.outputTokens}`,
      );
    } catch (err) {
      console.log(`FAIL ${model}  ${(err as Error).name}: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
}

main();
