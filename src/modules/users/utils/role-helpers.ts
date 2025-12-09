/**
 * Helpers : Gestion des Rôles Utilisateurs
 *
 * Fonctions utilitaires pour manipuler et afficher
 * les rôles utilisateurs dans l'interface
 *
 * @module modules/users/utils
 */

import type { UserRole } from '../schemas/user.schema';

/**
 * Informations complètes sur un rôle
 */
export interface RoleInfo {
  /** Rôle technique */
  role: UserRole;
  /** Label affiché dans l'UI */
  label: string;
  /** Description complète du rôle */
  description: string;
  /** Variant du badge pour l'affichage */
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * Mappage complet des informations par rôle
 *
 * Chaque rôle possède:
 * - Un label français pour l'affichage
 * - Une description détaillée de ses responsabilités
 * - Une variante de badge pour l'UI
 */
const ROLE_INFO_MAP: Record<UserRole, RoleInfo> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrateur',
    description:
      'Accès complet au système. Peut gérer tous les utilisateurs, clients, expéditions, factures et paramètres. Accès à toutes les fonctionnalités sans restriction.',
    badgeVariant: 'destructive', // Rouge pour indiquer pouvoir maximal
  },

  OPERATIONS_MANAGER: {
    role: 'OPERATIONS_MANAGER',
    label: 'Gestionnaire d\'Opérations',
    description:
      'Gère les expéditions, le tracking, les transporteurs et les douanes. Peut créer et modifier des clients. Accès complet aux opérations logistiques quotidiennes.',
    badgeVariant: 'default', // Bleu primaire
  },

  FINANCE_MANAGER: {
    role: 'FINANCE_MANAGER',
    label: 'Gestionnaire Financier',
    description:
      'Gère la facturation, les devis et les rapports financiers. Peut consulter les expéditions et clients pour établir les factures. Accès aux statistiques financières.',
    badgeVariant: 'secondary', // Gris/neutre
  },

  CLIENT: {
    role: 'CLIENT',
    label: 'Client',
    description:
      'Portail client avec accès limité. Peut consulter ses propres expéditions, factures et devis. Peut demander des devis et consulter le tracking de ses envois.',
    badgeVariant: 'outline', // Contour seulement
  },

  VIEWER: {
    role: 'VIEWER',
    label: 'Observateur',
    description:
      'Accès en lecture seule. Peut consulter les expéditions, clients, factures et rapports mais ne peut rien modifier. Idéal pour les stagiaires ou auditeurs.',
    badgeVariant: 'outline', // Contour seulement
  },
};

/**
 * Récupérer le label français d'un rôle
 *
 * Convertit un rôle technique (ex: "OPERATIONS_MANAGER")
 * en un label lisible (ex: "Gestionnaire d'Opérations")
 *
 * @param role - Rôle utilisateur
 * @returns Label français du rôle
 *
 * @example
 * ```ts
 * getRoleLabel('ADMIN'); // "Administrateur"
 * getRoleLabel('CLIENT'); // "Client"
 * ```
 */
export function getRoleLabel(role: UserRole): string {
  return ROLE_INFO_MAP[role]?.label || role;
}

/**
 * Récupérer la description complète d'un rôle
 *
 * Retourne une description détaillée des responsabilités
 * et permissions associées au rôle
 *
 * @param role - Rôle utilisateur
 * @returns Description complète du rôle
 *
 * @example
 * ```ts
 * getRoleDescription('ADMIN');
 * // "Accès complet au système. Peut gérer tous les utilisateurs..."
 * ```
 */
export function getRoleDescription(role: UserRole): string {
  return (
    ROLE_INFO_MAP[role]?.description ||
    'Aucune description disponible pour ce rôle'
  );
}

/**
 * Récupérer la variante de badge pour un rôle
 *
 * Retourne la variante Shadcn/ui appropriée pour
 * l'affichage visuel du rôle dans un Badge
 *
 * @param role - Rôle utilisateur
 * @returns Variante du badge ('default', 'secondary', 'destructive', 'outline')
 *
 * @example
 * ```tsx
 * <Badge variant={getRoleBadgeVariant(user.role)}>
 *   {getRoleLabel(user.role)}
 * </Badge>
 * ```
 */
export function getRoleBadgeVariant(
  role: UserRole
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return ROLE_INFO_MAP[role]?.badgeVariant || 'outline';
}

/**
 * Récupérer les informations complètes d'un rôle
 *
 * Retourne toutes les informations (label, description, variant)
 * pour un rôle donné
 *
 * @param role - Rôle utilisateur
 * @returns Informations complètes du rôle
 *
 * @example
 * ```ts
 * const info = getRoleInfo('ADMIN');
 * console.log(info.label);        // "Administrateur"
 * console.log(info.description);  // "Accès complet..."
 * console.log(info.badgeVariant); // "destructive"
 * ```
 */
export function getRoleInfo(role: UserRole): RoleInfo {
  return (
    ROLE_INFO_MAP[role] || {
      role,
      label: role,
      description: 'Rôle inconnu',
      badgeVariant: 'outline',
    }
  );
}

/**
 * Récupérer tous les rôles disponibles avec leurs informations
 *
 * Utile pour générer des listes de sélection (select, radio)
 * dans les formulaires
 *
 * @returns Tableau de tous les rôles avec leurs informations
 *
 * @example
 * ```tsx
 * const roles = getAllRoles();
 * return (
 *   <Select>
 *     {roles.map(role => (
 *       <SelectItem key={role.role} value={role.role}>
 *         {role.label}
 *       </SelectItem>
 *     ))}
 *   </Select>
 * );
 * ```
 */
export function getAllRoles(): RoleInfo[] {
  return Object.values(ROLE_INFO_MAP);
}

/**
 * Vérifier si un rôle est un rôle de gestion
 *
 * Détermine si le rôle a des responsabilités de gestion
 * (ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER)
 *
 * @param role - Rôle à vérifier
 * @returns true si c'est un rôle de gestion
 *
 * @example
 * ```ts
 * isManagerRole('ADMIN');              // true
 * isManagerRole('OPERATIONS_MANAGER'); // true
 * isManagerRole('CLIENT');             // false
 * ```
 */
export function isManagerRole(role: UserRole): boolean {
  return ['ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER'].includes(role);
}

/**
 * Vérifier si un rôle peut gérer d'autres utilisateurs
 *
 * Seul ADMIN peut gérer les utilisateurs
 *
 * @param role - Rôle à vérifier
 * @returns true si le rôle peut gérer les utilisateurs
 *
 * @example
 * ```ts
 * canManageUsers('ADMIN');  // true
 * canManageUsers('CLIENT'); // false
 * ```
 */
export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Récupérer une couleur d'affichage pour un rôle
 *
 * Retourne une classe Tailwind CSS pour colorer
 * les éléments selon le rôle
 *
 * @param role - Rôle utilisateur
 * @returns Classe CSS Tailwind pour la couleur
 *
 * @example
 * ```tsx
 * <div className={getRoleColor(user.role)}>
 *   {getRoleLabel(user.role)}
 * </div>
 * ```
 */
export function getRoleColor(role: UserRole): string {
  const colorMap: Record<UserRole, string> = {
    ADMIN: 'text-red-600 dark:text-red-400',
    OPERATIONS_MANAGER: 'text-blue-600 dark:text-blue-400',
    FINANCE_MANAGER: 'text-green-600 dark:text-green-400',
    CLIENT: 'text-gray-600 dark:text-gray-400',
    VIEWER: 'text-gray-500 dark:text-gray-500',
  };

  return colorMap[role] || 'text-gray-600';
}
