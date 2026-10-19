import fs from "fs";
import path from "path";

export interface TaxonomyCode {
  code: string;
  name: string;
  domain: string;
  definition: string;
  positive_examples: string[];
  negative_examples: string[];
  distinguishing_probe: string;
  intervention_family: string;
}

export const MVP_CLUSTERS = ["es.gram.aspect.pret_imp", "es.sem.por_para"] as const;

export const TAXONOMY_PATH = path.join(process.cwd(), "data", "taxonomy", "mvp_taxonomy.json");

let cached: TaxonomyCode[] | null = null;

export function loadTaxonomy(): TaxonomyCode[] {
  if (!cached) cached = JSON.parse(fs.readFileSync(TAXONOMY_PATH, "utf-8")) as TaxonomyCode[];
  return cached;
}

export function taxonomyCodes(): Set<string> {
  return new Set(loadTaxonomy().map((t) => t.code));
}
