import type { NextConfig } from "next";

// Sundial ships as plain static files served at glorious.works/sundial, so the build is a
// static export under that path. (A static export cannot use cacheComponents.) Nothing
// time-dependent renders at build: the board mounts after hydration, and a Playwright test
// checks the exported HTML carries no dates.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/sundial",
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
