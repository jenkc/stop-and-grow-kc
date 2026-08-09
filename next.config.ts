import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["stopandgrowkc.org", "192.168.2.179"],
  // Hide the dev-mode badge in the corner. The site is demoed to testers over
  // the cloudflared tunnel while running `pnpm dev`, and the badge reads as
  // part of the page to anyone who is not a developer. Compile and runtime
  // errors still surface normally.
  devIndicators: false,
};

export default nextConfig;
