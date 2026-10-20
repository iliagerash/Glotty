import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Gives `next dev` the bindings from wrangler.jsonc (the local D1 under .wrangler/).
initOpenNextCloudflareForDev();
