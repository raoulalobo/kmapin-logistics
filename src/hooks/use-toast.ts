/**
 * Hook useToast - Wrapper pour sonner toast
 *
 * Fournit une API simple pour afficher des notifications toast
 * Compatible avec l'API shadcn/ui toast mais utilise sonner en arrière-plan
 */

import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

/**
 * Hook pour afficher des notifications toast
 *
 * @example
 * ```tsx
 * const { toast } = useToast();
 *
 * toast({
 *   title: 'Succès',
 *   description: 'Opération réussie',
 * });
 *
 * toast({
 *   title: 'Erreur',
 *   description: 'Une erreur est survenue',
 *   variant: 'destructive',
 * });
 * ```
 */
export function useToast() {
  const toast = ({ title, description, variant, duration = 5000 }: ToastProps) => {
    const message = description || title || '';
    const titleText = title && description ? title : undefined;

    if (variant === 'destructive') {
      sonnerToast.error(message, {
        description: titleText,
        duration,
      });
    } else {
      sonnerToast.success(message, {
        description: titleText,
        duration,
      });
    }
  };

  return { toast };
}
