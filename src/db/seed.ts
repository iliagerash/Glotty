/**
 * Seeds the taxonomy and the concept graph into D1.
 *
 *   npm run db:seed            # local D1 (.wrangler/)
 *   npm run db:seed -- --remote
 *
 * A script outside the Worker has no D1 binding, so this writes the
 * statements to .wrangler/seed.sql and runs them with `wrangler d1 execute`.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const quote = (v: unknown): string =>
  v === null || v === undefined ? "NULL" : `'${String(typeof v === "string" ? v : JSON.stringify(v)).replace(/'/g, "''")}'`;

function upsert(table: string, key: string, row: Record<string, unknown>): string {
  const cols = Object.keys(row);
  const updates = cols.filter((c) => c !== key).map((c) => `"${c}" = excluded."${c}"`);
  return (
    `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) ` +
    `VALUES (${cols.map((c) => quote(row[c])).join(", ")}) ` +
    `ON CONFLICT ("${key}") DO UPDATE SET ${updates.join(", ")};`
  );
}

function seedStatements(): string[] {
  const statements: string[] = [];

  const taxonomyPath = path.join(process.cwd(), "data", "taxonomy", "mvp_taxonomy.json");
  if (fs.existsSync(taxonomyPath)) {
    const rawTaxonomy = JSON.parse(fs.readFileSync(taxonomyPath, "utf-8"));
    console.log(`Taxonomy: ${rawTaxonomy.length} diagnostic codes`);
    for (const item of rawTaxonomy) {
      statements.push(
        upsert("taxonomy_codes", "code", {
          code: item.code,
          name: item.name,
          domain: item.domain,
          definition: item.definition,
          positive_examples: item.positive_examples,
          negative_examples: item.negative_examples,
          distinguishing_probe: item.distinguishing_probe,
          intervention_family: item.intervention_family,
        }),
      );
    }
  }

  const graphPath = path.join(process.cwd(), "data", "graph", "mvp_graph.json");
  if (fs.existsSync(graphPath)) {
    const rawGraph = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
    console.log(`Graph: ${rawGraph.concepts.length} concept nodes, ${rawGraph.edges.length} edges`);
    for (const c of rawGraph.concepts) {
      statements.push(
        upsert("concepts", "id", {
          id: c.id,
          name: c.name,
          domain: c.domain,
          cefr_level: c.cefr_level,
          description: c.description,
        }),
      );
    }
    // Edges have no natural key, so they are replaced wholesale.
    statements.push(`DELETE FROM "concept_edges";`);
    for (const edge of rawGraph.edges) {
      statements.push(
        `INSERT INTO "concept_edges" ("source", "target", "edge_type") ` +
          `VALUES (${quote(edge.source)}, ${quote(edge.target)}, ${quote(edge.type)});`,
      );
    }
  }

  return statements;
}

const remote = process.argv.includes("--remote");
const file = path.join(process.cwd(), ".wrangler", "seed.sql");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, seedStatements().join("\n") + "\n");
execFileSync("npx", ["wrangler", "d1", "execute", "DB", remote ? "--remote" : "--local", "--file", file], {
  stdio: "inherit",
});
console.log(`Seeded ${remote ? "remote" : "local"} D1.`);
