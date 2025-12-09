/**
 * Exports centralisés pour l'authentification
 *
 * @module lib/auth
 */

// Configuration Better Auth
export { auth, getSession, requireAuth, type Auth, type SessionUser } from './config';

// Système de permissions RBAC
export {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  requireRole,
  requireAdmin,
  requireCompanyAccess,
  type Permission,
} from './permissions';

/**
 * Guide d'utilisation :
 *
 * 1. Obtenir la session de l'utilisateur :
 *    ```ts
 *    import { getSession } from '@/lib/auth';
 *    const session = await getSession();
 *    ```
 *
 * 2. Exiger une authentification :
 *    ```ts
 *    import { requireAuth } from '@/lib/auth';
 *    const session = await requireAuth(); // Throw si pas connecté
 *    ```
 *
 * 3. Vérifier une permission :
 *    ```ts
 *    import { requirePermission } from '@/lib/auth';
 *    await requirePermission('shipments:delete');
 *    ```
 *
 * 4. Vérifier un rôle :
 *    ```ts
 *    import { requireRole } from '@/lib/auth';
 *    await requireRole(['ADMIN', 'OPERATIONS_MANAGER']);
 *    ```
 */
