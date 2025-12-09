import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Exclure les packages serveur du bundle client
  serverExternalPackages: [
    "@better-auth/core",
    "better-auth",
    "@prisma/client",
    "prisma",
  ],
};

export default nextConfig;
