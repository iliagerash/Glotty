/**
 * Lists the text-generation models available to this Cloudflare account,
 * so the candidate list in src/lib/ai/config.ts can be checked.
 *
 *   npm run ai:models
 */
import "dotenv/config";

async function main() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set");

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?task=Text%20Generation&per_page=200`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as {
    result: Array<{ name: string; properties?: Array<{ property_id: string; value: unknown }> }>;
  };

  for (const m of body.result.sort((a, b) => a.name.localeCompare(b.name))) {
    const props = Object.fromEntries((m.properties ?? []).map((p) => [p.property_id, p.value]));
    const flags = [
      props.context_window ? `ctx=${props.context_window}` : "",
      props.function_calling ? "tools" : "",
      props.beta ? "beta" : "",
      props.planned_deprecation_date ? `deprecates=${props.planned_deprecation_date}` : "",
    ].filter(Boolean);
    console.log(`cloudflare:${m.name}${flags.length ? `  (${flags.join(", ")})` : ""}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
