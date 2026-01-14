/**
 * Composant : Résumé des erreurs de formulaire
 *
 * Affiche une bannière récapitulative des erreurs de validation
 * en haut du formulaire. S'affiche uniquement quand il y a des erreurs.
 *
 * Caractéristiques :
 * - Animation d'apparition/disparition
 * - Liste cliquable pour scroll vers le champ en erreur
 * - Icône et couleurs d'alerte
 * - Accessible (aria-live pour lecteurs d'écran)
 *
 * Utilisation :
 * ```tsx
 * <FormErrorSummary
 *   errors={errorMessages}
 *   title="Veuillez corriger les erreurs suivantes"
 * />
 * ```
 *
 * @module components/ui/form-error-summary
 */

'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Structure d'une erreur de formulaire
 */
interface FormError {
  /** Nom du champ (label affiché) */
  field: string;
  /** Message d'erreur */
  message: string;
}

/**
 * Props du composant FormErrorSummary
 */
interface FormErrorSummaryProps {
  /** Liste des erreurs à afficher */
  errors: FormError[];

  /** Titre de la bannière */
  title?: string;

  /** Classes CSS additionnelles */
  className?: string;

  /** Afficher un bouton de fermeture */
  dismissible?: boolean;

  /** Callback lors de la fermeture */
  onDismiss?: () => void;

  /** Scroller vers le champ au clic sur une erreur */
  scrollOnClick?: boolean;

  /** Nombre maximum d'erreurs à afficher avant "et X autres" */
  maxErrorsShown?: number;
}

/**
 * Trouver et scroller vers un champ de formulaire par son label
 *
 * @param fieldLabel - Label du champ à chercher
 */
function scrollToField(fieldLabel: string): void {
  // Chercher le label correspondant
  const labels = document.querySelectorAll('label');

  for (const label of labels) {
    // Vérifier si le texte du label contient le nom du champ
    if (label.textContent?.includes(fieldLabel)) {
      // Chercher l'input associé
      const forAttr = label.getAttribute('for');
      let targetElement: HTMLElement | null = null;

      if (forAttr) {
        targetElement = document.getElementById(forAttr);
      }

      // Si pas trouvé par for, chercher l'input suivant le label
      if (!targetElement) {
        targetElement = label.parentElement?.querySelector('input, select, textarea') || null;
      }

      if (targetElement) {
        // Scroll vers l'élément avec offset
        const rect = targetElement.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY - 120;

        window.scrollTo({
          top: absoluteTop,
          behavior: 'smooth',
        });

        // Focus après le scroll
        setTimeout(() => {
          targetElement?.focus();
        }, 300);

        break;
      }
    }
  }
}

/**
 * Composant de résumé des erreurs de formulaire
 *
 * Affiche une bannière d'alerte en haut du formulaire listant toutes
 * les erreurs de validation avec la possibilité de cliquer pour
 * naviguer vers le champ en erreur.
 */
export function FormErrorSummary({
  errors,
  title = 'Veuillez corriger les erreurs suivantes',
  className,
  dismissible = false,
  onDismiss,
  scrollOnClick = true,
  maxErrorsShown = 10,
}: FormErrorSummaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers la bannière quand des erreurs apparaissent
  useEffect(() => {
    if (errors.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      // Scroller seulement si la bannière n'est pas visible
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        containerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  }, [errors.length]);

  // Ne rien afficher s'il n'y a pas d'erreurs
  if (errors.length === 0) {
    return null;
  }

  // Séparer les erreurs affichées et le reste
  const visibleErrors = errors.slice(0, maxErrorsShown);
  const remainingCount = errors.length - maxErrorsShown;

  return (
    <div
      ref={containerRef}
      className={cn('animate-in fade-in-0 slide-in-from-top-2 duration-300', className)}
      role="alert"
      aria-live="polite"
    >
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-5 w-5" />

        <div className="flex-1">
          <AlertTitle className="flex items-center justify-between">
            <span>{title}</span>
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-100"
                onClick={onDismiss}
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertTitle>

          <AlertDescription className="mt-2">
            <ul className="space-y-1 text-sm">
              {visibleErrors.map((error, index) => (
                <li key={`${error.field}-${index}`} className="flex items-start">
                  <span className="mr-2 text-red-400">•</span>
                  {scrollOnClick ? (
                    <button
                      type="button"
                      onClick={() => scrollToField(error.field)}
                      className="text-left hover:underline focus:underline focus:outline-none"
                    >
                      <span className="font-medium">{error.field}</span>
                      <span className="mx-1">:</span>
                      <span>{error.message}</span>
                    </button>
                  ) : (
                    <span>
                      <span className="font-medium">{error.field}</span>
                      <span className="mx-1">:</span>
                      <span>{error.message}</span>
                    </span>
                  )}
                </li>
              ))}

              {remainingCount > 0 && (
                <li className="text-red-500 font-medium mt-2">
                  ... et {remainingCount} autre{remainingCount > 1 ? 's' : ''} erreur
                  {remainingCount > 1 ? 's' : ''}
                </li>
              )}
            </ul>
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}

/**
 * Version compacte du résumé d'erreurs
 *
 * Affiche uniquement le nombre d'erreurs avec possibilité de voir le détail
 */
export function FormErrorSummaryCompact({
  errorCount,
  className,
  onClick,
}: {
  errorCount: number;
  className?: string;
  onClick?: () => void;
}) {
  if (errorCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700',
        'animate-in fade-in-0 duration-200',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">
        {errorCount} erreur{errorCount > 1 ? 's' : ''} de validation
      </span>
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className="ml-auto text-xs underline hover:no-underline focus:outline-none"
        >
          Voir les détails
        </button>
      )}
    </div>
  );
}

export type { FormError, FormErrorSummaryProps };
