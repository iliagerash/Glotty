/**
 * D1 access for Node scripts (seed, gold:push, gold:pull). A script outside
 * the Worker has no D1 binding, so these shell out to `wrangler d1 execute`
 * against the DB binding in wrangler.jsonc: the local D1 under .wrangler/,
 * or the deployed one with --remote.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

export const isRemote = (argv = process.argv) => argv.includes("--remote");

const where = (remote: boolean) => (remote ? "--remote" : "--local");

/** SQL string literal; objects and arrays are stored as JSON text. */
export function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${(typeof v === "string" ? v : JSON.stringify(v)).replace(/'/g, "''")}'`;
}

export function insertSql(table: string, row: Record<string, unknown>, onConflict = ""): string {
  const cols = Object.keys(row);
  return (
    `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) ` +
    `VALUES (${cols.map((c) => sqlValue(row[c])).join(", ")})${onConflict ? " " + onConflict : ""};`
  );
}

/** Runs statements as one file, in order. */
export function executeStatements(name: string, statements: string[], remote: boolean): void {
  const file = path.join(process.cwd(), ".wrangler", `${name}.sql`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, statements.join("\n") + "\n");
  execFileSync("npx", ["wrangler", "d1", "execute", "DB", where(remote), "--file", file, "--yes"], {
    stdio: "inherit",
  });
}

/** Rows of one SELECT. */
export function query<T>(sql: string, remote: boolean): T[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "DB", where(remote), "--json", "--command", sql], {
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const results = JSON.parse(out.slice(out.indexOf("["))) as { results: T[] }[];
  return results.flatMap((r) => r.results);
}
