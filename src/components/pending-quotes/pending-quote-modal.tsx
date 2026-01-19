/**
 * Composant : PendingQuoteModal
 *
 * Modal de confirmation pour le rattachement des devis en attente
 * Affiche un aperçu des devis et propose à l'utilisateur de les rattacher
 * à son compte nouvellement créé
 *
 * UI Features :
 * - En-tête avec icône et titre explicatif
 * - Liste des devis avec origine, destination, poids et prix
 * - Boutons d'action : "Rattacher" (primary) et "Non merci" (outline)
 * - États de chargement et d'erreur gérés
 *
 * @module components/pending-quotes/pending-quote-modal
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  FloppyDisk,
  CircleNotch,
  MapPin,
  Package,
  CurrencyEur,
  X,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createQuotesFromPendingAction } from '@/modules/quotes/actions/pending-quote.actions';
import type { PendingQuote } from '@/hooks/use-pending-quotes';

/**
 * Mapping des noms de pays complets pour affichage
 * Convertit les codes ISO en noms lisibles
 */
const countryNames: Record<string, string> = {
  BF: 'Burkina Faso',
  CI: "Côte d'Ivoire",
  SN: 'Sénégal',
  ML: 'Mali',
  NE: 'Niger',
  BJ: 'Bénin',
  TG: 'Togo',
  GH: 'Ghana',
  FR: 'France',
  BE: 'Belgique',
  DE: 'Allemagne',
  ES: 'Espagne',
  IT: 'Italie',
  GB: 'Royaume-Uni',
  US: 'États-Unis',
  CN: 'Chine',
};

/**
 * Obtenir le nom d'un pays à partir de son code
 * Retourne le code si le nom n'est pas trouvé
 *
 * @param code - Code ISO du pays (ex: "FR")
 * @returns Nom complet du pays (ex: "France")
 */
const getCountryName = (code: string): string => {
  // Si c'est déjà un nom complet (plus de 2 caractères), le retourner
  if (code.length > 2) return code;
  return countryNames[code.toUpperCase()] || code;
};

/**
 * Props du composant PendingQuoteModal
 *
 * @property open - Contrôle l'affichage du modal
 * @property onOpenChange - Callback appelé lors du changement d'état
 * @property pendingQuotes - Liste des devis à rattacher
 * @property onSuccess - Callback appelé après rattachement réussi
 * @property onDismiss - Callback appelé si l'utilisateur refuse
 */
interface PendingQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingQuotes: PendingQuote[];
  onSuccess: () => void;
  onDismiss: () => void;
}

/**
 * Modal de rattachement des devis en attente
 *
 * Workflow utilisateur :
 * 1. L'utilisateur voit le résumé de ses devis calculés précédemment
 * 2. Il clique sur "Rattacher à mon compte" pour créer les Quote en base
 * 3. Succès → redirection vers /dashboard/quotes
 * 4. Ou il clique sur "Non merci" pour ignorer et supprimer de localStorage
 *
 * @example
 * <PendingQuoteModal
 *   open={showModal}
 *   onOpenChange={setShowModal}
 *   pendingQuotes={pendingQuotes}
 *   onSuccess={clearAllPendingQuotes}
 *   onDismiss={clearAllPendingQuotes}
 * />
 */
export function PendingQuoteModal({
  open,
  onOpenChange,
  pendingQuotes,
  onSuccess,
  onDismiss,
}: PendingQuoteModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handler pour le rattachement des devis
   * Appelle la Server Action et gère les états
   */
  const handleAttach = async () => {
    setIsLoading(true);

    try {
      // Préparer les données pour la Server Action
      const quotesData = pendingQuotes.map((quote) => ({
        formData: quote.formData,
        result: quote.result,
      }));

      // Appeler la Server Action
      const result = await createQuotesFromPendingAction(quotesData);

      if (result.success) {
        // Afficher le succès avec les numéros de devis
        const message =
          result.data.createdCount === 1
            ? `Devis ${result.data.quoteNumbers[0]} rattaché avec succès !`
            : `${result.data.createdCount} devis rattachés avec succès !`;

        toast.success(message, {
          description: 'Vous pouvez les retrouver dans votre espace Devis.',
        });

        // Nettoyer localStorage
        onSuccess();

        // Fermer le modal
        onOpenChange(false);

        // Rediriger vers la liste des devis
        router.push('/dashboard/quotes');
      } else {
        toast.error(result.error || 'Erreur lors du rattachement');
      }
    } catch (error) {
      console.error('Erreur rattachement devis:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handler pour le refus du rattachement
   * Nettoie localStorage et ferme le modal
   */
  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          {/* En-tête avec icône */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <FloppyDisk className="h-5 w-5 text-[#003D82]" weight="fill" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {pendingQuotes.length === 1
                  ? 'Un devis vous attend !'
                  : `${pendingQuotes.length} devis vous attendent !`}
              </DialogTitle>
              <DialogDescription>
                Nous avons retrouvé des devis calculés avant votre inscription.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Liste des devis */}
        <div className="space-y-3 max-h-64 overflow-y-auto py-2">
          {pendingQuotes.map((quote, index) => (
            <div
              key={quote.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              {/* Infos route et poids */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <MapPin className="h-4 w-4 text-[#003D82] flex-shrink-0" />
                  <span className="truncate">
                    {getCountryName(quote.formData.originCountry)} →{' '}
                    {getCountryName(quote.formData.destinationCountry)}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {quote.formData.weight.toLocaleString('fr-FR')} kg
                  </span>
                  <span className="text-gray-300">•</span>
                  <span>
                    {new Date(quote.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* Prix estimé */}
              <div className="text-right flex-shrink-0 ml-3">
                <div className="flex items-center gap-1 font-bold text-[#003D82]">
                  <CurrencyEur className="h-4 w-4" />
                  {quote.result.estimatedCost.toLocaleString('fr-FR')}
                </div>
                <span className="text-xs text-gray-400">estimé</span>
              </div>
            </div>
          ))}
        </div>

        {/* Note informative */}
        <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          💡 Les devis seront enregistrés comme <strong>brouillons</strong> dans
          votre espace. Vous pourrez ensuite les envoyer pour obtenir un devis
          officiel.
        </p>

        {/* Actions */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Non merci
          </Button>
          <Button
            onClick={handleAttach}
            disabled={isLoading}
            className="bg-[#003D82] hover:bg-[#002952] text-white flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <CircleNotch className="h-4 w-4 animate-spin" />
                Rattachement...
              </>
            ) : (
              <>
                <FloppyDisk className="h-4 w-4" />
                Rattacher à mon compte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
