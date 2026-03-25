import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import type { NextConfig } from "next";

const sharedEnvFiles = [
  path.resolve(process.cwd(), "../..", ".env.local"),
  path.resolve(process.cwd(), "../..", ".env"),
];

for (const envFile of sharedEnvFiles) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
