import { db } from "./index";
import { concepts, conceptEdges, taxonomyCodes, user } from "./schema";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";

async function runSeed() {
  console.log("🌱 Starting Glotty Database Seed...");

  // 1. Seed Taxonomy Codes
  const taxonomyPath = path.join(process.cwd(), "data", "taxonomy", "mvp_taxonomy.json");
  if (fs.existsSync(taxonomyPath)) {
    const rawTaxonomy = JSON.parse(fs.readFileSync(taxonomyPath, "utf-8"));
    console.log(`Loading ${rawTaxonomy.length} diagnostic taxonomy codes...`);

    for (const item of rawTaxonomy) {
      await db
        .insert(taxonomyCodes)
        .values({
          code: item.code,
          name: item.name,
          domain: item.domain,
          definition: item.definition,
          positiveExamples: item.positive_examples,
          negativeExamples: item.negative_examples,
          distinguishingProbe: item.distinguishing_probe,
          interventionFamily: item.intervention_family,
        })
        .onConflictDoUpdate({
          target: taxonomyCodes.code,
          set: {
            name: item.name,
            domain: item.domain,
            definition: item.definition,
            positiveExamples: item.positive_examples,
            negativeExamples: item.negative_examples,
            distinguishingProbe: item.distinguishing_probe,
            interventionFamily: item.intervention_family,
          },
        });
    }
    console.log("✓ Diagnostic taxonomy populated.");
  }

  // 2. Seed Knowledge Graph
  const graphPath = path.join(process.cwd(), "data", "graph", "mvp_graph.json");
  if (fs.existsSync(graphPath)) {
    const rawGraph = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
    console.log(`Loading ${rawGraph.concepts.length} concept nodes and ${rawGraph.edges.length} edges...`);

    for (const c of rawGraph.concepts) {
      await db
        .insert(concepts)
        .values({
          id: c.id,
          name: c.name,
          domain: c.domain,
          cefrLevel: c.cefr_level,
          description: c.description,
        })
        .onConflictDoUpdate({
          target: concepts.id,
          set: {
            name: c.name,
            domain: c.domain,
            cefrLevel: c.cefr_level,
            description: c.description,
          },
        });
    }

    // Clear existing edges before re-seeding edges
    await db.delete(conceptEdges);
    for (const edge of rawGraph.edges) {
      await db.insert(conceptEdges).values({
        source: edge.source,
        target: edge.target,
        edgeType: edge.type,
      });
    }
    console.log("✓ Concept graph nodes and directed edges populated.");
  }

  // 3. Seed Default Test User
  const testUserId = "usr_b1_learner_default";
  const existingUser = await db.select().from(user).where(eq(user.id, testUserId));
  if (existingUser.length === 0) {
    await db.insert(user).values({
      id: testUserId,
      name: "Alex Rivera",
      email: "alex.learner@glotty.ai",
      emailVerified: true,
    });
    console.log("✓ Default test learner Alex Rivera created.");
  }

  console.log("✨ Seed finished successfully!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
