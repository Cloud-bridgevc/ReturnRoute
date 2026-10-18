import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lambda handlers in src/lambdas are bundled separately by AWS SAM (esbuild).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
