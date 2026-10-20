import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * The D1 database bound as DB in wrangler.jsonc. Bindings exist per request,
 * so call this inside a request handler, not at module load. In `next dev`
 * it is the local D1 under .wrangler/ (see next.config.ts).
 */
export function getDb() {
  return drizzle(getCloudflareContext().env.DB, { schema });
}

export { schema };
