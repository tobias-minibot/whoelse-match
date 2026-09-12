import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(webRoot, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@whoelse/core"],
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/seed.json", "../../data/seed.json"],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
