/**
 * Composant : DepotContactList
 *
 * Affiche la liste des contacts d'un dépôt avec possibilité d'ajouter,
 * modifier ou supprimer des contacts (ADMIN uniquement).
 * Le contact principal (isPrimary) est mis en évidence.
 *
 * @param depotId - ID du dépôt parent
 * @param contacts - Liste des contacts du dépôt
 * @param isAdmin - Permet l'ajout/modification/suppression
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Star, Trash, PencilSimple, Phone, EnvelopeSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { removeDepotContact } from '@/modules/depots/actions/depot.actions';
import { DepotContactDialog } from './depot-contact-dialog';

/**
 * Type d'un contact tel que retourné par getDepot()
 */
interface Contact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface DepotContactListProps {
  depotId: string;
  contacts: Contact[];
  isAdmin: boolean;
}

export function DepotContactList({ depotId, contacts, isAdmin }: DepotContactListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // État pour le dialog d'ajout/modification de contact
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  /**
   * Ouvrir le dialog pour ajouter un nouveau contact
   */
  function handleAdd() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  /**
   * Ouvrir le dialog pour modifier un contact existant
   */
  function handleEdit(contact: Contact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  /**
   * Supprimer un contact après confirmation
   */
  async function handleDelete(contactId: string) {
    if (!confirm('Supprimer ce contact ?')) return;

    setIsDeleting(contactId);
    try {
      await removeDepotContact(contactId);
      toast({
        title: 'Contact supprimé',
        description: 'Le contact a été supprimé avec succès.',
      });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  }

  /**
   * Callback après succès du dialog (ajout ou modification)
   */
  function handleDialogSuccess() {
    setDialogOpen(false);
    setEditingContact(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* Bouton ajouter (ADMIN uniquement) */}
      {isAdmin && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un contact
        </Button>
      )}

      {/* Liste des contacts */}
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun contact
        </p>
      ) : (
        contacts.map((contact) => (
          <div
            key={contact.id}
            className="rounded-lg border p-3 space-y-1.5 relative"
          >
            {/* Nom + badge principal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{contact.name}</span>
                {contact.isPrimary && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" weight="fill" />
                    Principal
                  </Badge>
                )}
              </div>
              {/* Actions ADMIN */}
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(contact)}
                  >
                    <PencilSimple className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(contact.id)}
                    disabled={isDeleting === contact.id}
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Rôle */}
            {contact.role && (
              <p className="text-xs text-muted-foreground">{contact.role}</p>
            )}

            {/* Coordonnées */}
            <div className="space-y-0.5">
              {contact.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <EnvelopeSimple className="h-3 w-3" />
                  <span>{contact.email}</span>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* Dialog ajout/modification */}
      <DepotContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        depotId={depotId}
        contact={editingContact}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
