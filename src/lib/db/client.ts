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
 * Le fichier Prisma généré utilise CommonJS (exports.PrismaClient),
 * mais Turbopack a du mal avec la conversion ESM.
 * Solution : Import direct avec typage manuel pour forcer la résolution correcte.
 */

// Import du module Prisma généré
// @ts-ignore - Turbopack interop nécessite un import sans typage strict
import * as PrismaClientModule from '../../generated/prisma';

// Extraction robuste du constructeur PrismaClient
// Le module peut être wrappé de différentes façons par Turbopack
type PrismaClientConstructor = new (config?: any) => any;

const PrismaClient: PrismaClientConstructor =
  // Cas 1: Export nommé direct (CommonJS standard converti)
  (PrismaClientModule as any)?.PrismaClient ||
  // Cas 2: Wrappé dans default.PrismaClient (Turbopack pattern)
  (PrismaClientModule as any)?.default?.PrismaClient ||
  // Cas 3: Default direct est le constructeur
  (PrismaClientModule as any)?.default ||
  // Cas 4: Le module entier (rare mais possible)
  (() => {
    throw new Error('Unable to extract PrismaClient from Prisma module. Please regenerate Prisma client.');
  })();

// Vérification finale que nous avons bien un constructeur
if (typeof PrismaClient !== 'function') {
  console.error('❌ PrismaClient extraction failed');
  console.error('Module type:', typeof PrismaClientModule);
  console.error('Module keys:', Object.keys(PrismaClientModule || {}));
  console.error('PrismaClient type:', typeof PrismaClient);
  throw new Error('PrismaClient is not a constructor. Try: npm run db:generate');
}

// Singleton pattern pour éviter de créer plusieurs instances
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
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
