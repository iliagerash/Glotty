import { defineConfig } from "drizzle-kit";

// Generates SQL migrations only. They are applied with wrangler
// (npm run db:migrate / db:migrate:remote), which tracks them in D1.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  strict: true,
  verbose: true,
});
