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
        className="bg-[#003D82] hover:bg-[#002952]"
      >
        <Plus className="mr-2 h-4 w-4" />
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
