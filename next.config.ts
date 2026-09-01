import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile in a parent dir isn't picked up.
  turbopack: {
    root: path.join(__dirname),
  },
  // Keep sharp's native binary out of the bundle; load it at runtime.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
