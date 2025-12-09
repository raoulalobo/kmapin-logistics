/**
 * Système de permissions RBAC - KmapIn Logistics
 *
 * Définit les permissions par rôle et fournit des helpers
 * pour vérifier les autorisations dans les Server Actions.
 *
 * @module lib/auth/permissions
 */

import { UserRole } from '@/generated/prisma';
import { requireAuth } from './config';

/**
 * Définition complète des permissions par rôle
 *
 * Format : 'resource:action' ou 'resource:action:scope'
 * - resource : shipments, invoices, clients, users, etc.
 * - action : read, create, update, delete, manage
 * - scope : own (données personnelles uniquement), all (toutes les données)
 */
export const PERMISSIONS = {
  /**
   * ADMIN - Accès complet à toutes les fonctionnalités
   */
  ADMIN: ['*'], // Wildcard = tous les droits

  /**
   * OPERATIONS_MANAGER - Gestion des expéditions et opérations
   */
  OPERATIONS_MANAGER: [
    // Expéditions
    'shipments:read',
    'shipments:create',
    'shipments:update',
    'shipments:delete',

    // Clients
    'clients:read',
    'clients:create',
    'clients:update',

    // Transporteurs
    'transporters:read',
    'transporters:manage',

    // Tracking
    'tracking:read',
    'tracking:create',

    // Devis
    'quotes:read',
    'quotes:create',
    'quotes:update',

    // Douanes
    'customs:read',
    'customs:create',
    'customs:update',

    // Documents
    'documents:read',
    'documents:upload',

    // Notifications
    'notifications:create',

    // Rapports opérationnels
    'reports:operations',
  ],

  /**
   * FINANCE_MANAGER - Gestion financière et facturation
   */
  FINANCE_MANAGER: [
    // Factures
    'invoices:read',
    'invoices:create',
    'invoices:update',
    'invoices:delete',

    // Devis
    'quotes:read',
    'quotes:create',
    'quotes:update',

    // Expéditions (lecture pour facturation)
    'shipments:read',

    // Clients (lecture pour facturation)
    'clients:read',

    // Rapports financiers
    'reports:financial',
    'reports:analytics',

    // Documents financiers
    'documents:read',
    'documents:upload',
  ],

  /**
   * CLIENT - Portail client limité
   * Peut uniquement voir ses propres données
   */
  CLIENT: [
    // Expéditions personnelles
    'shipments:read:own',

    // Devis personnels
    'quotes:read:own',
    'quotes:create:own', // Peut demander un devis

    // Factures personnelles
    'invoices:read:own',

    // Documents personnels
    'documents:read:own',

    // Tracking de ses propres expéditions
    'tracking:read:own',

    // Profil personnel
    'profile:read:own',
    'profile:update:own',

    // Notifications personnelles
    'notifications:read:own',
  ],

  /**
   * VIEWER - Consultation uniquement
   * Accès en lecture sur la plupart des données
   */
  VIEWER: [
    'shipments:read',
    'clients:read',
    'invoices:read',
    'quotes:read',
    'documents:read',
    'tracking:read',
    'reports:read',
  ],
} as const;

/**
 * Type des permissions disponibles
 */
export type Permission = keyof typeof PERMISSIONS;

/**
 * Vérifier si un rôle possède une permission spécifique
 *
 * @param userRole - Rôle de l'utilisateur
 * @param permission - Permission à vérifier (ex: 'shipments:create')
 * @returns true si l'utilisateur a la permission
 *
 * @example
 * ```ts
 * hasPermission('ADMIN', 'shipments:delete'); // true
 * hasPermission('CLIENT', 'shipments:delete'); // false
 * hasPermission('CLIENT', 'shipments:read:own'); // true
 * ```
 */
export function hasPermission(
  userRole: UserRole,
  permission: string
): boolean {
  const userPermissions = PERMISSIONS[userRole];

  // Vérifier si userPermissions existe et n'est pas undefined
  if (!userPermissions || !Array.isArray(userPermissions)) {
    console.error(`[hasPermission] Permissions non définies pour le rôle: ${userRole}`);
    return false;
  }

  // Admin a tous les droits
  if (userPermissions.includes('*')) {
    return true;
  }

  // Vérification exacte
  if (userPermissions.includes(permission)) {
    return true;
  }

  // Vérification avec wildcard (ex: shipments:*)
  const [resource, action, scope] = permission.split(':');

  // Check resource:*
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  // Check resource:action (ignore scope)
  // Ex: Si user a 'shipments:read', accepter 'shipments:read:own'
  if (scope && userPermissions.includes(`${resource}:${action}`)) {
    return true;
  }

  return false;
}

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
 * Vérifier si l'utilisateur peut accéder aux données d'une company
 *
 * @param companyId - ID de la company à vérifier
 * @throws Error si l'utilisateur n'a pas accès à cette company
 * @returns Session utilisateur
 *
 * @example
 * ```ts
 * export async function getCompanyData(companyId: string) {
 *   const session = await requireCompanyAccess(companyId);
 *
 *   // L'utilisateur peut accéder aux données de cette company
 *   const data = await db.company.findUnique({ where: { id: companyId } });
 * }
 * ```
 */
export async function requireCompanyAccess(companyId: string) {
  const session = await requireAuth();

  const userRole = session.user.role as UserRole;

  // Admin a accès à toutes les companies
  if (userRole === 'ADMIN') {
    return session;
  }

  // Operations et Finance managers ont accès à toutes les companies
  if (userRole === 'OPERATIONS_MANAGER' || userRole === 'FINANCE_MANAGER') {
    return session;
  }

  // Les autres rôles doivent être de la même company
  if (session.user.companyId !== companyId) {
    throw new Error('Forbidden: You can only access data from your own company');
  }

  return session;
}
