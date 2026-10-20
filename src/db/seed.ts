/**
 * Seeds the taxonomy and the concept graph into D1.
 *
 *   npm run db:seed            # local D1 (.wrangler/)
 *   npm run db:seed -- --remote
 *
 * The statements run through `wrangler d1 execute` (src/db/wrangler.ts).
 */
import fs from "fs";
import path from "path";
import { executeStatements, insertSql, isRemote } from "./wrangler";

function upsert(table: string, key: string, row: Record<string, unknown>): string {
  const updates = Object.keys(row)
    .filter((c) => c !== key)
    .map((c) => `"${c}" = excluded."${c}"`);
  return insertSql(table, row, `ON CONFLICT ("${key}") DO UPDATE SET ${updates.join(", ")}`);
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
      statements.push(insertSql("concept_edges", { source: edge.source, target: edge.target, edge_type: edge.type }));
    }
  }

  return statements;
}

const remote = isRemote();
executeStatements("seed", seedStatements(), remote);
console.log(`Seeded ${remote ? "remote" : "local"} D1.`);
