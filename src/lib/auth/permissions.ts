/**
 * Système de permissions RBAC - Faso Fret Logistics
 *
 * Définit les permissions par rôle et fournit des helpers
 * pour vérifier les autorisations dans les Server Actions.
 *
 * @module lib/auth/permissions
 */

import { UserRole } from '@/lib/db/enums';
import { requireAuth } from './config';

// Importer les fonctions côté client pour les utiliser dans ce fichier
import { hasPermission, PERMISSIONS, type Permission } from './permissions-client';

// Réexporter pour que les autres fichiers puissent les importer depuis ce module
export { PERMISSIONS, hasPermission, type Permission };

/**
 * Middleware pour exiger une permission spécifique
 * À utiliser dans les Server Actions
 *
 * @param permission - Permission requise
 * @throws Error si l'utilisateur n'a pas la permission
 * @returns Session utilisateur si autorisé
 *
 * @example
 * ```ts
 * // Dans une Server Action
 * export async function deleteShipment(id: string) {
 *   // Vérifie que l'utilisateur a la permission shipments:delete
 *   await requirePermission('shipments:delete');
 *
 *   // Si on arrive ici, l'utilisateur est autorisé
 *   await db.shipment.delete({ where: { id } });
 * }
 * ```
 */
export async function requirePermission(permission: string) {
  const session = await requireAuth();

  if (!session?.user) {
    throw new Error('Unauthorized: You must be logged in');
  }

  const userRole = session.user.role as UserRole;

  if (!hasPermission(userRole, permission)) {
    throw new Error(
      `Forbidden: You don't have permission to '${permission}'. Required role with this permission.`
    );
  }

  return session;
}

/**
 * Vérifier si un utilisateur a l'un des rôles spécifiés
 *
 * @param allowedRoles - Liste des rôles autorisés
 * @throws Error si l'utilisateur n'a pas l'un des rôles
 * @returns Session utilisateur si autorisé
 *
 * @example
 * ```ts
 * export async function financialReport() {
 *   // Seuls les ADMIN et FINANCE_MANAGER peuvent accéder
 *   await requireRole(['ADMIN', 'FINANCE_MANAGER']);
 *
 *   // Logique du rapport financier
 * }
 * ```
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();

  if (!session?.user) {
    throw new Error('Unauthorized: You must be logged in');
  }

  const userRole = session.user.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    throw new Error(
      `Forbidden: This action requires one of these roles: ${allowedRoles.join(', ')}`
    );
  }

  return session;
}

/**
 * Helper pour vérifier si l'utilisateur est admin
 *
 * @example
 * ```ts
 * export async function deleteUser(id: string) {
 *   await requireAdmin();
 *   // Seuls les admins peuvent supprimer des users
 * }
 * ```
 */
export async function requireAdmin() {
  return requireRole(['ADMIN']);
}

/**
 * Vérifier si l'utilisateur peut accéder aux données d'un Client
 *
 * Le Client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier).
 * Cette fonction vérifie que l'utilisateur appartient au même Client ou a un rôle
 * qui lui permet d'accéder à tous les clients.
 *
 * @param clientId - ID du Client (COMPANY ou INDIVIDUAL) à vérifier
 * @throws Error si l'utilisateur n'a pas accès à ce Client
 * @returns Session utilisateur
 *
 * @example
 * ```ts
 * export async function getClientData(clientId: string) {
 *   const session = await requireClientAccess(clientId);
 *
 *   // L'utilisateur peut accéder aux données de ce client
 *   const data = await db.client.findUnique({ where: { id: clientId } });
 * }
 * ```
 */
export async function requireClientAccess(clientId: string) {
  const session = await requireAuth();

  const userRole = session.user.role as UserRole;

  // Admin a accès à tous les clients
  if (userRole === 'ADMIN') {
    return session;
  }

  // Operations et Finance managers ont accès à tous les clients
  if (userRole === 'OPERATIONS_MANAGER' || userRole === 'FINANCE_MANAGER') {
    return session;
  }

  // Les autres rôles doivent être rattachés au même client
  if (session.user.clientId !== clientId) {
    throw new Error('Forbidden: You can only access data from your own client');
  }

  return session;
}

/**
 * @deprecated Utilisez requireClientAccess à la place
 * Alias pour compatibilité avec l'ancien code
 */
export const requireCompanyAccess = requireClientAccess;
