/**
 * Composant : Action d'Assignation d'Entreprise
 *
 * Dialog permettant aux administrateurs d'assigner un utilisateur
 * à une entreprise cliente ou de le dissocier.
 *
 * @module components/users
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Buildings, CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

import {
  assignUserCompanyAction,
  getCompaniesForSelectAction,
} from '@/modules/users';

/**
 * Props du composant UserCompanyAction
 */
interface UserCompanyActionProps {
  /** ID de l'utilisateur */
  userId: string;
  /** Nom de l'utilisateur (pour l'affichage) */
  userName: string;
  /** ID de l'entreprise actuelle (ou null) */
  currentClientId: string | null;
  /** Élément déclencheur (bouton) */
  children: React.ReactNode;
}

/**
 * Dialog d'assignation d'entreprise
 *
 * Charge la liste des entreprises disponibles et permet
 * de sélectionner une entreprise ou "Aucune entreprise"
 */
export function UserCompanyAction({
  userId,
  userName,
  currentClientId,
  children,
}: UserCompanyActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États du dialog et des données
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    currentClientId
  );
  const [companies, setCompanies] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  /**
   * Charger la liste des entreprises au montage du dialog
   */
  useEffect(() => {
    if (isDialogOpen && companies.length === 0) {
      loadCompanies();
    }
  }, [isDialogOpen]);

  /**
   * Charger les entreprises disponibles
   */
  async function loadCompanies() {
    setIsLoadingCompanies(true);
    try {
      const result = await getCompaniesForSelectAction();
      if (result.success && result.data) {
        setCompanies(result.data);
      } else {
        toast.error('Erreur lors du chargement des entreprises');
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Erreur lors du chargement des entreprises');
    } finally {
      setIsLoadingCompanies(false);
    }
  }

  /**
   * Soumettre l'assignation d'entreprise
   */
  function handleSubmit() {
    // Vérifier si l'entreprise a changé
    if (selectedCompanyId === currentClientId) {
      toast.info('L\'assignation est déjà définie à cette valeur');
      return;
    }

    startTransition(async () => {
      const result = await assignUserCompanyAction(userId, {
        clientId: selectedCompanyId || '',
      });

      if (!result.success) {
        toast.error(
          result.error || 'Erreur lors de l\'assignation de l\'entreprise'
        );
      } else {
        const message = selectedCompanyId
          ? `${userName} a été assigné à l'entreprise`
          : `${userName} a été dissocié de l'entreprise`;
        toast.success(message);

        // Fermer le dialog
        setIsDialogOpen(false);

        // Rafraîchir la page
        router.refresh();
      }
    });
  }

  /**
   * Réinitialiser la sélection lors de la fermeture
   */
  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelectedCompanyId(currentClientId);
    }
    setIsDialogOpen(open);
  }

  /**
   * Obtenir le nom de l'entreprise actuelle
   */
  const currentCompanyName =
    companies.find((c) => c.id === currentClientId)?.name || null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assigner à une entreprise</DialogTitle>
          <DialogDescription>
            Associez {userName} à une entreprise cliente ou dissociez-le.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Affichage de l'entreprise actuelle */}
          {currentClientId && currentCompanyName && (
            <div className="space-y-2">
              <Label>Entreprise actuelle</Label>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Buildings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{currentCompanyName}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!currentClientId && (
            <div className="space-y-2">
              <Label>Entreprise actuelle</Label>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Aucune entreprise assignée
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sélection de la nouvelle entreprise */}
          <div className="space-y-2">
            <Label htmlFor="company-select">
              Nouvelle entreprise <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedCompanyId || 'none'}
              onValueChange={(value) =>
                setSelectedCompanyId(value === 'none' ? null : value)
              }
              disabled={isPending || isLoadingCompanies}
            >
              <SelectTrigger id="company-select">
                <SelectValue placeholder="Sélectionnez une entreprise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune entreprise</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sélectionnez "Aucune entreprise" pour dissocier l'utilisateur
            </p>
          </div>

          {/* Message si l'entreprise n'a pas changé */}
          {selectedCompanyId === currentClientId && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Sélectionnez une entreprise différente de l'entreprise actuelle
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              isLoadingCompanies ||
              selectedCompanyId === currentClientId
            }
          >
            {isPending ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Assignation...
              </>
            ) : (
              <>
                <Buildings className="mr-2 h-4 w-4" />
                Assigner
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
