/**
 * Types et interfaces pour le système StandardModal
 *
 * Ce fichier définit tous les types TypeScript utilisés par les composants
 * de modales standardisées de l'application.
 */

/**
 * Représente un item sélectionnable dans une StandardModal
 *
 * @template T - Type des données supplémentaires associées à l'item
 *
 * @example
 * ```typescript
 * const permissionItem: StandardModalItem = {
 *   id: 'shipments:read',
 *   label: 'Voir les expéditions',
 *   description: 'Permission de lecture des expéditions',
 *   status: 'active',
 *   category: 'Opérations',
 * };
 * ```
 */
export interface StandardModalItem<T = any> {
  /**
   * Identifiant unique de l'item
   * Utilisé pour gérer la sélection
   */
  id: string;

  /**
   * Label principal affiché
   * Texte visible par l'utilisateur
   */
  label: string;

  /**
   * Description secondaire (optionnelle)
   * Affichée en dessous du label en texte plus petit
   */
  description?: string;

  /**
   * Statut visuel avec indicateur coloré (point)
   * - 'active' : Vert - Item actif/actuel
   * - 'inactive' : Gris - Item inactif/désactivé
   * - 'pending' : Jaune - Item en attente
   * - 'default' : Bleu - Statut par défaut
   */
  status?: 'active' | 'inactive' | 'pending' | 'default';

  /**
   * Badge à afficher sur l'item (optionnel)
   * Permet d'ajouter un tag visuel (ex: "Admin", "Nouveau", etc.)
   */
  badge?: {
    /** Texte du badge */
    text: string;
    /** Variante de style du badge */
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  };

  /**
   * Indique si l'item est désactivé (non sélectionnable)
   * L'item apparaît grisé et n'est pas cliquable
   */
  disabled?: boolean;

  /**
   * Raison de la désactivation (optionnelle)
   * Affichée dans un tooltip au survol si l'item est disabled
   */
  disabledReason?: string;

  /**
   * Données associées à l'item (optionnelles)
   * Permet de stocker des informations supplémentaires
   * de type générique T
   */
  data?: T;

  /**
   * Catégorie pour le groupement (optionnelle)
   * Permet d'organiser les items en sections
   */
  category?: string;
}

/**
 * Configuration des filtres, recherche et tri de la modale
 *
 * @example
 * ```typescript
 * const filters: StandardModalFilters = {
 *   searchEnabled: true,
 *   searchPlaceholder: 'Rechercher une permission...',
 *   filterOptions: [
 *     { label: 'Opérations', value: 'operations' },
 *     { label: 'Commercial', value: 'commercial' },
 *   ],
 *   sortOptions: [
 *     {
 *       label: 'Alphabétique',
 *       value: 'alpha',
 *       sortFn: (a, b) => a.label.localeCompare(b.label),
 *     },
 *   ],
 * };
 * ```
 */
export interface StandardModalFilters {
  /**
   * Active la barre de recherche
   * Si true, une SearchBar s'affiche en haut de la modale
   */
  searchEnabled?: boolean;

  /**
   * Placeholder de la barre de recherche
   * Texte affiché dans le champ de recherche vide
   */
  searchPlaceholder?: string;

  /**
   * Options de filtre par catégorie
   * Affiche un Select dropdown pour filtrer les items
   */
  filterOptions?: Array<{
    /** Label affiché dans le dropdown */
    label: string;
    /** Valeur du filtre (doit correspondre à item.category) */
    value: string;
  }>;

  /**
   * Label du filtre
   * Texte affiché pour le dropdown de filtre
   */
  filterLabel?: string;

  /**
   * Options de tri
   * Affiche un Select dropdown pour trier les items
   */
  sortOptions?: Array<{
    /** Label affiché dans le dropdown */
    label: string;
    /** Valeur unique du tri */
    value: string;
    /**
     * Fonction de comparaison pour Array.sort()
     * Prend deux items et retourne -1, 0 ou 1
     */
    sortFn: (a: StandardModalItem, b: StandardModalItem) => number;
  }>;

  /**
   * Label du tri
   * Texte affiché pour le dropdown de tri
   */
  sortLabel?: string;
}

/**
 * Props du composant StandardModal principal
 *
 * @template T - Type des données associées aux items
 *
 * @example
 * ```typescript
 * <StandardModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Sélectionner des permissions"
 *   items={permissionItems}
 *   selectedIds={selectedPermissionIds}
 *   onSelectionChange={setSelectedPermissionIds}
 *   selectionMode="multiple"
 *   filters={{ searchEnabled: true }}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export interface StandardModalProps<T = any> {
  /**
   * État d'ouverture de la modale
   * Contrôle la visibilité du Dialog
   */
  open: boolean;

  /**
   * Callback de changement d'état d'ouverture
   * Appelé lors de la fermeture/ouverture de la modale
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Titre de la modale
   * Affiché en haut du DialogHeader
   */
  title: string;

  /**
   * Description de la modale (optionnelle)
   * Affichée sous le titre en texte secondaire
   */
  description?: string;

  /**
   * Liste des items à afficher dans la modale
   * Peut être vide (affiche "Aucun élément trouvé")
   */
  items: StandardModalItem<T>[];

  /**
   * Mode de sélection
   * - 'single' : Un seul item sélectionnable (comportement radio)
   * - 'multiple' : Plusieurs items sélectionnables (comportement checkbox)
   * @default 'multiple'
   */
  selectionMode?: 'single' | 'multiple';

  /**
   * IDs des items actuellement sélectionnés
   * Array vide si aucune sélection
   */
  selectedIds: string[];

  /**
   * Callback de changement de sélection
   * Appelé à chaque clic sur un item
   * Reçoit le nouveau tableau d'IDs sélectionnés
   */
  onSelectionChange?: (ids: string[]) => void;

  /**
   * Configuration des filtres, recherche et tri (optionnelle)
   * Si non fournie, aucun filtre n'est affiché
   */
  filters?: StandardModalFilters;

  /**
   * Callback de soumission (optionnel)
   * Appelé lors du clic sur le bouton de validation
   * Reçoit les IDs sélectionnés
   * Peut être async pour gérer des opérations asynchrones
   */
  onSubmit?: (selectedIds: string[]) => void | Promise<void>;

  /**
   * Configuration du bouton "Add New" (optionnel)
   * Si fourni, affiche un bouton à gauche du footer
   * Permet d'ajouter un nouvel item depuis la modale
   */
  addNew?: {
    /** Label du bouton (ex: "Nouvelle entreprise") */
    label: string;
    /** Callback appelé au clic sur le bouton */
    onClick: () => void;
    /** Icône personnalisée (optionnelle, par défaut: Plus) */
    icon?: React.ReactNode;
  };

  /**
   * Labels personnalisés pour les boutons (optionnels)
   */
  labels?: {
    /** Label du bouton de soumission (défaut: "Sélectionner") */
    submit?: string;
    /** Label du bouton d'annulation (défaut: "Annuler") */
    cancel?: string;
  };

  /**
   * État de chargement de la modale
   * Si true, les boutons sont désactivés et affichent un état loading
   * @default false
   */
  isLoading?: boolean;

  /**
   * Largeur maximale de la modale
   * @default '2xl'
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

  /**
   * Hauteur maximale de la modale
   * Valeur CSS (ex: "90vh", "600px")
   * @default '90vh'
   */
  maxHeight?: string;

  /**
   * Active le groupement par catégorie
   * Si true, les items sont groupés par leur propriété `category`
   * avec des titres de section
   * @default false
   */
  groupByCategory?: boolean;
}
