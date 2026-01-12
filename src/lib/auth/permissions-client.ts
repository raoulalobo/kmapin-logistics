/**
 * Utilitaires de permissions RBAC côté client
 *
 * Ce fichier contient uniquement les fonctions qui peuvent être utilisées
 * côté client sans dépendre de Better Auth ou de modules Node.js
 *
 * @module lib/auth/permissions-client
 */

import { UserRole } from '@/lib/db/enums';

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

    // Enlèvements personnels
    'pickups:read:own',
    'pickups:create:own', // Peut réserver un enlèvement

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
 * Cette fonction peut être utilisée côté client et côté serveur
 * car elle ne dépend pas de Better Auth.
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
