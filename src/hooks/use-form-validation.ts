/**
 * Hook : Gestion avancée de la validation des formulaires
 *
 * Ce hook fournit des fonctionnalités UX améliorées pour la validation :
 * - Toast de synthèse avec liste des erreurs lors de la soumission
 * - Scroll automatique vers le premier champ en erreur
 * - Focus automatique sur le premier champ en erreur
 * - Compteur d'erreurs en temps réel
 *
 * Utilisation :
 * ```tsx
 * const form = useForm({ resolver: zodResolver(schema) });
 * const { onSubmitWithValidation, errorCount } = useFormValidation(form);
 *
 * <form onSubmit={onSubmitWithValidation(handleSubmit)}>
 * ```
 *
 * @module hooks/use-form-validation
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { type FieldErrors, type UseFormReturn, type FieldValues } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * Options de configuration du hook
 */
interface UseFormValidationOptions {
  /**
   * Afficher un toast lors d'une soumission avec erreurs
   * @default true
   */
  showToast?: boolean;

  /**
   * Scroller vers le premier champ en erreur
   * @default true
   */
  scrollToError?: boolean;

  /**
   * Focus sur le premier champ en erreur
   * @default true
   */
  focusOnError?: boolean;

  /**
   * Offset de scroll (pixels au-dessus du champ)
   * @default 100
   */
  scrollOffset?: number;

  /**
   * Durée du toast en millisecondes
   * @default 5000
   */
  toastDuration?: number;

  /**
   * Titre personnalisé pour le toast d'erreur
   * @default "Formulaire invalide"
   */
  toastTitle?: string;

  /**
   * Labels personnalisés pour les champs (pour affichage dans le toast)
   * Ex: { contactEmail: 'Email', weight: 'Poids' }
   */
  fieldLabels?: Record<string, string>;
}

/**
 * Résultat du hook
 */
interface UseFormValidationReturn<TFieldValues extends FieldValues> {
  /**
   * Wrapper pour handleSubmit qui ajoute la gestion des erreurs
   */
  onSubmitWithValidation: (
    onValid: (data: TFieldValues) => void | Promise<void>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;

  /**
   * Nombre d'erreurs actuel
   */
  errorCount: number;

  /**
   * Liste formatée des erreurs pour affichage
   */
  errorMessages: Array<{ field: string; message: string }>;

  /**
   * Scroller et focus sur le premier champ en erreur manuellement
   */
  scrollToFirstError: () => void;

  /**
   * Afficher un toast avec les erreurs actuelles manuellement
   */
  showErrorToast: () => void;
}

/**
 * Labels par défaut pour les champs courants (français)
 */
const DEFAULT_FIELD_LABELS: Record<string, string> = {
  // Contact
  contactEmail: 'Email',
  contactPhone: 'Téléphone',
  contactName: 'Nom du contact',
  email: 'Email',
  phone: 'Téléphone',
  name: 'Nom',

  // Adresse
  address: 'Adresse',
  city: 'Ville',
  postalCode: 'Code postal',
  country: 'Pays',
  originCountry: 'Pays d\'origine',
  destinationCountry: 'Pays de destination',
  originAddress: 'Adresse d\'origine',
  destinationAddress: 'Adresse de destination',
  originCity: 'Ville d\'origine',
  destinationCity: 'Ville de destination',
  pickupAddress: 'Adresse d\'enlèvement',
  pickupCity: 'Ville d\'enlèvement',
  deliveryAddress: 'Adresse de livraison',
  deliveryCity: 'Ville de livraison',

  // Marchandise
  weight: 'Poids',
  length: 'Longueur',
  width: 'Largeur',
  height: 'Hauteur',
  volume: 'Volume',
  cargoType: 'Type de marchandise',
  packageCount: 'Nombre de colis',
  description: 'Description',

  // Transport
  transportMode: 'Mode de transport',
  priority: 'Priorité',

  // Dates
  requestedDate: 'Date souhaitée',
  dueDate: 'Date d\'échéance',
  issueDate: 'Date d\'émission',

  // Financier
  subtotal: 'Sous-total',
  taxRate: 'Taux de TVA',
  total: 'Total',
  estimatedPrice: 'Prix estimé',
  maxBudget: 'Budget maximum',

  // Produit (achats délégués)
  productName: 'Nom du produit',
  productUrl: 'URL du produit',
  quantity: 'Quantité',

  // Divers
  clientId: 'Client',      // ID du Client (entreprise ou particulier)
  companyId: 'Entreprise', // Legacy - à supprimer après migration
  items: 'Lignes',
  notes: 'Notes',
  specialInstructions: 'Instructions spéciales',
};

/**
 * Extraire récursivement les erreurs d'un objet FieldErrors
 *
 * Gère les erreurs imbriquées (ex: items[0].description)
 *
 * @param errors - Objet d'erreurs de React Hook Form
 * @param fieldLabels - Labels personnalisés pour les champs
 * @param prefix - Préfixe pour les chemins imbriqués
 * @returns Liste d'erreurs formatées
 */
function extractErrors(
  errors: FieldErrors,
  fieldLabels: Record<string, string>,
  prefix = ''
): Array<{ field: string; message: string }> {
  const result: Array<{ field: string; message: string }> = [];

  for (const [key, value] of Object.entries(errors)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const fieldLabel = fieldLabels[key] || fieldLabels[fieldPath] || key;

    if (value && typeof value === 'object') {
      // Vérifier si c'est une erreur directe (a un message)
      if ('message' in value && typeof value.message === 'string') {
        result.push({
          field: fieldLabel,
          message: value.message,
        });
      }
      // Vérifier si c'est un tableau d'erreurs (ex: items)
      else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            result.push(
              ...extractErrors(item as FieldErrors, fieldLabels, `${fieldPath}[${index}]`)
            );
          }
        });
      }
      // Vérifier si c'est un objet imbriqué
      else {
        result.push(...extractErrors(value as FieldErrors, fieldLabels, fieldPath));
      }
    }
  }

  return result;
}

/**
 * Trouver le premier élément de formulaire en erreur dans le DOM
 *
 * Recherche par attribut aria-invalid ou par nom de champ
 *
 * @param errors - Objet d'erreurs de React Hook Form
 * @returns Premier élément en erreur ou null
 */
function findFirstErrorElement(errors: FieldErrors): HTMLElement | null {
  // Récupérer les noms de champs en erreur
  const errorFieldNames = Object.keys(errors);

  if (errorFieldNames.length === 0) return null;

  // Essayer de trouver par aria-invalid d'abord (plus fiable)
  const invalidElement = document.querySelector('[aria-invalid="true"]') as HTMLElement;
  if (invalidElement) return invalidElement;

  // Sinon, chercher par nom de champ
  for (const fieldName of errorFieldNames) {
    // Chercher par attribut name
    const byName = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
    if (byName) return byName;

    // Chercher par id
    const byId = document.getElementById(fieldName);
    if (byId) return byId;

    // Chercher par id avec suffixe -form-item (pattern shadcn/ui)
    const formItemElement = document.querySelector(`[id$="${fieldName}-form-item"]`) as HTMLElement;
    if (formItemElement) return formItemElement;
  }

  return null;
}

/**
 * Hook de gestion avancée de la validation des formulaires
 *
 * @param form - Instance de useForm de React Hook Form
 * @param options - Options de configuration
 * @returns Fonctions et données de validation
 */
export function useFormValidation<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<TFieldValues> {
  const {
    showToast = true,
    scrollToError = true,
    focusOnError = true,
    scrollOffset = 100,
    toastDuration = 5000,
    toastTitle = 'Formulaire invalide',
    fieldLabels = {},
  } = options;

  // Fusionner les labels par défaut avec les labels personnalisés
  const allLabels = { ...DEFAULT_FIELD_LABELS, ...fieldLabels };

  // Référence pour éviter les toasts multiples
  const toastShownRef = useRef(false);

  // Extraire les erreurs formatées
  const {
    formState: { errors },
  } = form;

  const errorMessages = extractErrors(errors as FieldErrors, allLabels);
  const errorCount = errorMessages.length;

  /**
   * Scroller et focus sur le premier champ en erreur
   */
  const scrollToFirstError = useCallback(() => {
    const firstErrorElement = findFirstErrorElement(errors as FieldErrors);

    if (firstErrorElement) {
      // Scroll avec offset
      if (scrollToError) {
        const elementRect = firstErrorElement.getBoundingClientRect();
        const absoluteTop = elementRect.top + window.scrollY - scrollOffset;

        window.scrollTo({
          top: absoluteTop,
          behavior: 'smooth',
        });
      }

      // Focus après un court délai (pour que le scroll soit terminé)
      if (focusOnError) {
        setTimeout(() => {
          // Chercher l'input à l'intérieur de l'élément si nécessaire
          const focusableElement =
            firstErrorElement.tagName === 'INPUT' ||
            firstErrorElement.tagName === 'SELECT' ||
            firstErrorElement.tagName === 'TEXTAREA'
              ? firstErrorElement
              : firstErrorElement.querySelector('input, select, textarea');

          if (focusableElement && 'focus' in focusableElement) {
            (focusableElement as HTMLElement).focus();
          }
        }, 300);
      }
    }
  }, [errors, scrollToError, focusOnError, scrollOffset]);

  /**
   * Afficher un toast avec les erreurs
   */
  const showErrorToast = useCallback(() => {
    if (!showToast || errorCount === 0) return;

    // Construire le message du toast
    const description =
      errorCount === 1
        ? `${errorMessages[0].field} : ${errorMessages[0].message}`
        : `${errorCount} erreurs à corriger :\n• ${errorMessages
            .slice(0, 5)
            .map((e) => `${e.field} : ${e.message}`)
            .join('\n• ')}${errorCount > 5 ? `\n• ... et ${errorCount - 5} autre(s)` : ''}`;

    toast.error(toastTitle, {
      description,
      duration: toastDuration,
    });
  }, [showToast, errorCount, errorMessages, toastTitle, toastDuration]);

  /**
   * Wrapper pour handleSubmit qui gère les erreurs
   */
  const onSubmitWithValidation = useCallback(
    (onValid: (data: TFieldValues) => void | Promise<void>) => {
      return form.handleSubmit(
        // onValid - appelé si le formulaire est valide
        async (data) => {
          toastShownRef.current = false;
          await onValid(data);
        },
        // onInvalid - appelé si le formulaire est invalide
        () => {
          // Éviter les toasts multiples en cas de soumissions répétées
          if (!toastShownRef.current) {
            toastShownRef.current = true;

            // Attendre que les erreurs soient mises à jour dans le DOM
            setTimeout(() => {
              showErrorToast();
              scrollToFirstError();
            }, 50);
          }
        }
      );
    },
    [form, showErrorToast, scrollToFirstError]
  );

  // Réinitialiser le flag de toast quand les erreurs changent
  useEffect(() => {
    if (errorCount === 0) {
      toastShownRef.current = false;
    }
  }, [errorCount]);

  return {
    onSubmitWithValidation,
    errorCount,
    errorMessages,
    scrollToFirstError,
    showErrorToast,
  };
}

export type { UseFormValidationOptions, UseFormValidationReturn };
