import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Exclure les packages serveur du bundle client
  // CRITIQUE : Better Auth utilise AsyncLocalStorage (async_hooks) qui doit rester côté serveur
  serverExternalPackages: [
    "@better-auth/core",
    "better-auth",
    "@prisma/client",
    "prisma",
  ],
  // Configuration Webpack pour exclure les modules Node.js du bundle client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclure les modules Node.js du bundle client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "async_hooks": false,
        "fs": false,
        "net": false,
        "tls": false,
        "child_process": false,
      };
    }
    return config;
  },
  // Désactiver temporairement la vérification TypeScript lors du build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
