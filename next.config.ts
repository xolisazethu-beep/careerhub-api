import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  images: {
    // Assignment 3.3, Part 3 — company logos are served by ui-avatars.com (a
    // remote host), so it must be whitelisted here for next/image to optimise
    // it. Use `remotePatterns`, never the deprecated `domains` array.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
    ],
  },
};

// Assignment 3.3, Part 4 — wrap the config in the bundle analyzer. It is inert
// unless ANALYZE=true (set by the `analyze` script), so normal dev/build are
// unaffected. `npm run analyze` opens client.html + server.html treemaps.
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
