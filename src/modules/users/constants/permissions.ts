/**
 * Constantes : Catégories de Permissions
 *
 * Organisation des permissions par catégories pour l'interface
 * utilisateur (dialog de gestion des permissions custom)
 *
 * Chaque permission inclut:
 * - id : Identifiant unique (format "resource:action" ou "resource:action:scope")
 * - label : Libellé court à afficher
 * - description : Description complète de la permission
 *
 * @module modules/users/constants
 */

/**
 * Interface pour une permission individuelle
 */
export interface PermissionItem {
  /** Identifiant unique (ex: "clients:read") */
  id: string;
  /** Libellé court (ex: "Consulter les clients") */
  label: string;
  /** Description complète de la permission */
  description: string;
}

/**
 * Catégories de permissions organisées par domaine fonctionnel
 *
 * Structure :
 * {
 *   "Nom de la catégorie": [
 *     { id: "permission:id", label: "Libellé", description: "Description..." },
 *     ...
 *   ]
 * }
 */
export const PERMISSION_CATEGORIES: Record<string, PermissionItem[]> = {
  /**
   * Catégorie : Clients
   * Gestion des entreprises clientes
   */
  Clients: [
    {
      id: 'clients:read',
      label: 'Consulter les clients',
      description:
        'Permet de visualiser la liste des clients et leurs informations détaillées',
    },
    {
      id: 'clients:create',
      label: 'Créer des clients',
      description:
        'Permet d\'ajouter de nouveaux clients (entreprises) dans le système',
    },
    {
      id: 'clients:update',
      label: 'Modifier les clients',
      description:
        'Permet de mettre à jour les informations des clients existants',
    },
    {
      id: 'clients:delete',
      label: 'Supprimer des clients',
      description:
        'Permet de supprimer des clients (si aucune donnée associée)',
    },
  ],

  /**
   * Catégorie : Expéditions
   * Gestion des shipments et opérations logistiques
   */
  Expéditions: [
    {
      id: 'shipments:read',
      label: 'Consulter les expéditions',
      description:
        'Permet de visualiser toutes les expéditions dans le système',
    },
    {
      id: 'shipments:read:own',
      label: 'Consulter ses propres expéditions',
      description:
        'Permet de visualiser uniquement les expéditions de sa propre entreprise',
    },
    {
      id: 'shipments:create',
      label: 'Créer des expéditions',
      description: 'Permet d\'enregistrer de nouvelles expéditions',
    },
    {
      id: 'shipments:update',
      label: 'Modifier les expéditions',
      description: 'Permet de mettre à jour les informations des expéditions',
    },
    {
      id: 'shipments:delete',
      label: 'Supprimer des expéditions',
      description: 'Permet de supprimer des expéditions',
    },
  ],

  /**
   * Catégorie : Factures
   * Gestion de la facturation client
   */
  Factures: [
    {
      id: 'invoices:read',
      label: 'Consulter les factures',
      description: 'Permet de visualiser toutes les factures',
    },
    {
      id: 'invoices:read:own',
      label: 'Consulter ses propres factures',
      description:
        'Permet de visualiser uniquement les factures de sa propre entreprise',
    },
    {
      id: 'invoices:create',
      label: 'Créer des factures',
      description: 'Permet de générer de nouvelles factures',
    },
    {
      id: 'invoices:update',
      label: 'Modifier les factures',
      description:
        'Permet de mettre à jour les factures (avant validation finale)',
    },
    {
      id: 'invoices:delete',
      label: 'Supprimer des factures',
      description: 'Permet de supprimer des factures (si non payées)',
    },
  ],

  /**
   * Catégorie : Devis
   * Gestion des devis et propositions commerciales
   */
  Devis: [
    {
      id: 'quotes:read',
      label: 'Consulter les devis',
      description: 'Permet de visualiser tous les devis',
    },
    {
      id: 'quotes:read:own',
      label: 'Consulter ses propres devis',
      description:
        'Permet de visualiser uniquement les devis de sa propre entreprise',
    },
    {
      id: 'quotes:create',
      label: 'Créer des devis',
      description: 'Permet de générer de nouveaux devis',
    },
    {
      id: 'quotes:create:own',
      label: 'Demander un devis',
      description:
        'Permet à un client de demander un devis pour son entreprise',
    },
    {
      id: 'quotes:update',
      label: 'Modifier les devis',
      description: 'Permet de mettre à jour les devis existants',
    },
    {
      id: 'quotes:update:own',
      label: 'Modifier ses propres devis',
      description:
        'Permet à un client de modifier ses propres devis en brouillon (DRAFT)',
    },
  ],

  /**
   * Catégorie : Documents
   * Gestion des documents (CMR, factures, douane, etc.)
   */
  Documents: [
    {
      id: 'documents:read',
      label: 'Consulter les documents',
      description: 'Permet de visualiser et télécharger tous les documents',
    },
    {
      id: 'documents:read:own',
      label: 'Consulter ses propres documents',
      description:
        'Permet de visualiser uniquement les documents de sa propre entreprise',
    },
    {
      id: 'documents:upload',
      label: 'Téléverser des documents',
      description:
        'Permet d\'ajouter de nouveaux documents (CMR, factures, etc.)',
    },
  ],

  /**
   * Catégorie : Tracking
   * Suivi des expéditions en temps réel
   */
  Tracking: [
    {
      id: 'tracking:read',
      label: 'Consulter le suivi',
      description: 'Permet de visualiser le suivi de toutes les expéditions',
    },
    {
      id: 'tracking:read:own',
      label: 'Consulter son propre suivi',
      description:
        'Permet de visualiser uniquement le suivi des expéditions de sa propre entreprise',
    },
    {
      id: 'tracking:create',
      label: 'Ajouter des événements de suivi',
      description:
        'Permet d\'enregistrer de nouveaux événements de tracking (chargement, livraison, etc.)',
    },
  ],

  /**
   * Catégorie : Douanes
   * Gestion des documents et formalités douanières
   */
  Douanes: [
    {
      id: 'customs:read',
      label: 'Consulter les documents douaniers',
      description:
        'Permet de visualiser les déclarations et documents douaniers',
    },
    {
      id: 'customs:create',
      label: 'Créer des documents douaniers',
      description: 'Permet de générer de nouvelles déclarations douanières',
    },
    {
      id: 'customs:update',
      label: 'Modifier les documents douaniers',
      description: 'Permet de mettre à jour les déclarations douanières',
    },
  ],

  /**
   * Catégorie : Rapports
   * Génération et consultation des rapports analytiques
   */
  Rapports: [
    {
      id: 'reports:read',
      label: 'Consulter les rapports',
      description: 'Permet de visualiser tous les rapports générés',
    },
    {
      id: 'reports:operations',
      label: 'Rapports opérationnels',
      description:
        'Permet de générer des rapports sur les expéditions et la logistique',
    },
    {
      id: 'reports:financial',
      label: 'Rapports financiers',
      description:
        'Permet de générer des rapports de facturation et comptabilité',
    },
    {
      id: 'reports:analytics',
      label: 'Rapports analytiques',
      description:
        'Permet de générer des analyses avancées et tableaux de bord',
    },
  ],

  /**
   * Catégorie : Notifications
   * Gestion des notifications système
   */
  Notifications: [
    {
      id: 'notifications:read:own',
      label: 'Consulter ses notifications',
      description: 'Permet de visualiser ses propres notifications',
    },
    {
      id: 'notifications:create',
      label: 'Créer des notifications',
      description:
        'Permet d\'envoyer des notifications aux utilisateurs (email, SMS, etc.)',
    },
  ],

  /**
   * Catégorie : Profil
   * Gestion du profil utilisateur personnel
   */
  Profil: [
    {
      id: 'profile:read:own',
      label: 'Consulter son profil',
      description: 'Permet de visualiser ses propres informations de profil',
    },
    {
      id: 'profile:update:own',
      label: 'Modifier son profil',
      description:
        'Permet de mettre à jour ses propres informations personnelles',
    },
  ],

  /**
   * Catégorie : Administration
   * Permissions réservées aux administrateurs
   */
  Administration: [
    {
      id: 'users:read',
      label: 'Consulter les utilisateurs',
      description:
        'Permet de visualiser la liste des utilisateurs du système',
    },
    {
      id: 'users:create',
      label: 'Créer des utilisateurs',
      description: 'Permet d\'ajouter de nouveaux utilisateurs',
    },
    {
      id: 'users:update',
      label: 'Modifier les utilisateurs',
      description:
        'Permet de mettre à jour les informations des utilisateurs',
    },
    {
      id: 'users:delete',
      label: 'Supprimer des utilisateurs',
      description: 'Permet de désactiver ou supprimer des utilisateurs',
    },
    {
      id: 'users:manage:permissions',
      label: 'Gérer les permissions',
      description:
        'Permet d\'attribuer ou retirer des permissions aux utilisateurs',
    },
  ],
};

/**
 * Liste plate de toutes les permissions disponibles
 * Utile pour la validation et les autocomplètes
 */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION_CATEGORIES)
  .flat()
  .map((p) => p.id);

/**
 * Récupérer les informations d'une permission par son ID
 *
 * @param permissionId - ID de la permission (ex: "clients:read")
 * @returns PermissionItem ou undefined si non trouvée
 */
export function getPermissionInfo(
  permissionId: string
): PermissionItem | undefined {
  for (const category of Object.values(PERMISSION_CATEGORIES)) {
    const permission = category.find((p) => p.id === permissionId);
    if (permission) {
      return permission;
    }
  }
  return undefined;
}

/**
 * Récupérer la catégorie d'une permission
 *
 * @param permissionId - ID de la permission
 * @returns Nom de la catégorie ou undefined
 */
export function getPermissionCategory(
  permissionId: string
): string | undefined {
  for (const [categoryName, permissions] of Object.entries(
    PERMISSION_CATEGORIES
  )) {
    if (permissions.some((p) => p.id === permissionId)) {
      return categoryName;
    }
  }
  return undefined;
}
