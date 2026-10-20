import path from "path";
import taxonomy from "../../data/taxonomy/mvp_taxonomy.json";

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

/** Bundled at build time, so it also works in the Worker, which has no file system. */
export function loadTaxonomy(): TaxonomyCode[] {
  return taxonomy as TaxonomyCode[];
}

export function taxonomyCodes(): Set<string> {
  return new Set(loadTaxonomy().map((t) => t.code));
}
