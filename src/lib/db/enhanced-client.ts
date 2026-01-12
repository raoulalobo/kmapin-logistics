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
import { UserRole } from '@/lib/db/enums';

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

  // Préparer le contexte pour Zenstack
  const context = {
    id: user.id,
    role: user.role,
    companyId: user.companyId,
  };

  // Appliquer les access policies avec le contexte utilisateur
  return enhance(prisma, { user: context });
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

  // Convertir la string du rôle en enum UserRole pour Zenstack
  // Better Auth retourne une string ("ADMIN") mais Zenstack attend l'enum (UserRole.ADMIN)
  const roleString = session.user.role as string;
  const roleEnum = UserRole[roleString as keyof typeof UserRole];

  if (!roleEnum) {
    console.error(`[getEnhancedPrismaFromSession] Rôle invalide: ${roleString}`);
    throw new Error(`Invalid user role: ${roleString}`);
  }

  return getEnhancedPrisma({
    id: session.user.id,
    role: roleEnum,
    companyId: session.user.companyId,
  });
}

/**
 * Type pour le client enhanced
 */
export type EnhancedPrismaClient = ReturnType<typeof getEnhancedPrisma>;
