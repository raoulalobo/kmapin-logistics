/**
 * Déclarations de types pour Better Auth
 *
 * Ce fichier étend les types de Better Auth pour inclure les champs personnalisés
 * de notre application (role, clientId) dans la session utilisateur.
 *
 * Le clientId représente l'ID du Client unifié (type COMPANY ou INDIVIDUAL)
 * auquel l'utilisateur est rattaché.
 *
 * Better Auth utilise module augmentation pour permettre l'extension de ses types.
 * @see https://www.better-auth.com/docs/customization/typescript
 */

import type { UserRole } from '@/generated/prisma';

/**
 * Extension du module Better Auth pour ajouter les champs custom à la session
 *
 * Cette déclaration permet à TypeScript de reconnaître les champs 'role' et 'clientId'
 * dans session.user, qui sont ajoutés par le callback session dans auth/config.ts
 */
declare module 'better-auth/types' {
  /**
   * Interface User étendue avec les champs RBAC
   * Ces champs sont ajoutés à la session via le callback session()
   */
  interface User {
    /**
     * Rôle de l'utilisateur pour le contrôle d'accès RBAC
     * Défini dans le schéma Prisma, valeur par défaut: CLIENT
     */
    role: UserRole;

    /**
     * ID du Client (COMPANY ou INDIVIDUAL) auquel appartient l'utilisateur
     * Utilisé pour filtrer les données selon le client (multi-tenant)
     * Null uniquement pour les ADMIN système
     */
    clientId: string | null;
  }

  /**
   * Interface Session étendue avec les champs custom de User
   * La session hérite automatiquement des champs de User
   */
  interface Session {
    user: User;
  }
}

/**
 * Type utilitaire pour la session utilisateur avec auto-complétion
 * Utilise le type Session étendu de Better Auth
 *
 * @example
 * ```ts
 * import { requireAuth } from '@/lib/auth/config';
 *
 * const session = await requireAuth();
 * // TypeScript connaît maintenant session.user.role et session.user.clientId
 * console.log(session.user.role); // UserRole
 * console.log(session.user.clientId); // string | null (ID du Client COMPANY ou INDIVIDUAL)
 * ```
 */
export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  clientId: string | null;  // ID du Client (COMPANY ou INDIVIDUAL)
};
