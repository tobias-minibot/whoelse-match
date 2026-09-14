import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(webRoot, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@whoelse/core", "@whoelse/mcp-server"],
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/seed.json", "../../data/seed.json"],
    "/q": ["./data/seed.json", "../../data/seed.json"],
    "/who-else/[slug]": ["./data/seed.json", "../../data/seed.json"],
    "/og": ["./data/seed.json", "../../data/seed.json"],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
