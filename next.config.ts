import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Définir explicitement la racine de traçage des fichiers de sortie
  // pour éviter les avertissements liés à la détection de plusieurs fichiers de verrouillage
  outputFileTracingRoot: "/home/alobo/Bureau/NextJS/kmapin/v2",
  // Exclure les packages serveur du bundle client
  // CRITIQUE : Better Auth utilise AsyncLocalStorage (async_hooks) qui doit rester côté serveur
  serverExternalPackages: [
    "@better-auth/core",
    "better-auth",
    "@prisma/client",
    "prisma",
  ],
  // Configuration Turbopack (Next.js 16+ utilise Turbopack par défaut)
  // Cette configuration vide permet d'accepter Turbopack sans erreur
  // Les modules Node.js sont automatiquement exclus du bundle client par Turbopack
  turbopack: {},
  // Configuration Webpack (utilisée si --webpack est passé ou en fallback)
  // Conservée pour compatibilité arrière
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
