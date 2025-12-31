/**
 * Bouton de création d'un pays
 *
 * Ouvre un dialog/modal avec le formulaire de création de pays
 */
'use client';

import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { CountryFormDialog } from './country-form-dialog';

/**
 * Bouton permettant d'ouvrir le dialog de création de pays
 *
 * @example
 * ```tsx
 * <CreateCountryButton />
 * ```
 */
export function CreateCountryButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="h-5 w-5" weight="fill" />
        Ajouter un pays
      </Button>

      <CountryFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        mode="create"
      />
    </>
  );
}
