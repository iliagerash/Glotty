// Binding types for cloudflare-env.d.ts. Taken one by one from
// @cloudflare/workers-types rather than loading its globals, which would
// replace the DOM fetch/Response types the client pages rely on.
type D1Database = import("@cloudflare/workers-types").D1Database;
type Fetcher = import("@cloudflare/workers-types").Fetcher;
