/**
 * Client Prisma standard (sans access control)
 * Utilisé pour les opérations système qui nécessitent un accès complet
 *
 * ⚠️  ATTENTION : Ce client bypasse les access policies Zenstack
 * Utiliser avec précaution uniquement pour :
 * - Scripts de migration
 * - Tâches d'administration système
 * - Jobs background qui ne sont pas liés à un utilisateur
 *
 * Pour les opérations utilisateur, utiliser `enhanced-client.ts` à la place
 */

/**
 * Turbopack/Next.js 16 compatibility fix
 *
 * Utilisation de require() au lieu d'import pour éviter les problèmes
 * de bundling Turbopack côté client
 */

// Import type uniquement pour TypeScript
import type { PrismaClient as PrismaClientType } from '@/generated/prisma';

// Import runtime via require (serveur uniquement)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PrismaModule = require('@/generated/prisma');

// Extraction du PrismaClient avec fallbacks pour la compatibilité Turbopack
const PrismaClient =
  PrismaModule.PrismaClient ||
  PrismaModule.default?.PrismaClient ||
  PrismaModule.default;

// Vérification que l'extraction a réussi
if (typeof PrismaClient !== 'function') {
  throw new Error(`PrismaClient extraction failed. Got: ${typeof PrismaClient}`);
}

// Singleton pattern pour éviter de créer plusieurs instances
const prismaClientSingleton = (): PrismaClientType => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }) as PrismaClientType;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

/**
 * Instance globale du client Prisma
 *
 * @example
 * ```ts
 * import { prisma } from '@/lib/db/client';
 *
 * // Utilisé uniquement pour les opérations système
 * const allUsers = await prisma.user.findMany();
 * ```
 */
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

/**
 * Export du client Prisma (alias)
 */
export const db = prisma;

export default prisma;
