/**
 * Client Prisma Enhanced avec Zenstack Access Control
 *
 * Ce fichier fournit un client Prisma "enhanced" qui applique automatiquement
 * les access policies définies dans schema.zmodel.
 *
 * Les policies sont appliquées en fonction du contexte utilisateur (auth())
 * et garantissent que chaque utilisateur ne peut accéder qu'aux données
 * qu'il est autorisé à voir/modifier selon son rôle.
 *
 * @example
 * ```ts
 * // Dans une Server Action
 * import { getEnhancedPrisma } from '@/lib/db/enhanced-client';
 *
 * export async function listShipments() {
 *   const db = await getEnhancedPrisma();
 *
 *   // Les access policies sont appliquées automatiquement !
 *   // Un CLIENT ne verra que les shipments de sa company
 *   // Un ADMIN verra tous les shipments
 *   const shipments = await db.shipment.findMany();
 *
 *   return shipments;
 * }
 * ```
 */

import { enhance } from '@zenstackhq/runtime';
import { prisma } from './client';
import { UserRole } from '@/generated/prisma';

/**
 * Interface pour le contexte utilisateur
 * Correspond aux champs utilisés dans les access policies (@@allow, @@deny)
 */
export interface AuthContext {
  id: string;
  role: UserRole;
  companyId?: string | null;
}

/**
 * Obtenir un client Prisma enhanced avec access control Zenstack
 *
 * Cette fonction crée un client Prisma qui applique automatiquement
 * les access policies en fonction de l'utilisateur connecté.
 *
 * @param user - Contexte utilisateur (depuis Better Auth ou session)
 * @returns Client Prisma enhanced avec access policies appliquées
 *
 * @example
 * ```ts
 * // Avec un utilisateur connecté
 * const db = await getEnhancedPrisma({
 *   id: 'user-123',
 *   role: 'CLIENT',
 *   companyId: 'company-456'
 * });
 *
 * // Sans utilisateur (accès public limité)
 * const db = await getEnhancedPrisma();
 * ```
 */
export function getEnhancedPrisma(user?: AuthContext | null) {
  // Si pas d'utilisateur, retourner un client avec accès minimal
  if (!user) {
    return enhance(prisma, {
      user: undefined,
    });
  }

  // Appliquer les access policies avec le contexte utilisateur
  return enhance(prisma, {
    user: {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
    },
  });
}

/**
 * Obtenir un client Prisma enhanced à partir d'une session Better Auth
 *
 * @param session - Session Better Auth avec user.id, user.role, user.companyId
 * @returns Client Prisma enhanced
 *
 * @example
 * ```ts
 * import { auth } from '@/lib/auth/config';
 * import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
 *
 * export async function myAction() {
 *   const session = await auth();
 *   const db = getEnhancedPrismaFromSession(session);
 *
 *   // Access policies appliquées automatiquement
 *   const shipments = await db.shipment.findMany();
 * }
 * ```
 */
export function getEnhancedPrismaFromSession(session: any) {
  if (!session?.user) {
    return enhance(prisma, { user: undefined });
  }

  return getEnhancedPrisma({
    id: session.user.id,
    role: session.user.role as UserRole,
    companyId: session.user.companyId,
  });
}

/**
 * Type pour le client enhanced
 */
export type EnhancedPrismaClient = ReturnType<typeof getEnhancedPrisma>;
