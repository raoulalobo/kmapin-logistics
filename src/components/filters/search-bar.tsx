/**
 * Composant : SearchBar
 *
 * Barre de recherche réutilisable avec :
 * - Icône de recherche
 * - Bouton de clear
 * - Placeholder personnalisable
 * - Intégration avec useFilters pour debouncing automatique
 *
 * @module components/filters
 */

'use client';

import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Props du composant SearchBar
 */
interface SearchBarProps {
  /**
   * Valeur actuelle de la recherche
   */
  value: string;

  /**
   * Callback appelé quand la valeur change
   */
  onChange: (value: string) => void;

  /**
   * Texte du placeholder
   * @default "Rechercher..."
   */
  placeholder?: string;

  /**
   * Classe CSS additionnelle
   */
  className?: string;
}

/**
 * Barre de recherche avec debouncing automatique
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className = '',
}: SearchBarProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Icône de recherche */}
      <MagnifyingGlass className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />

      {/* Input de recherche */}
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
      />

      {/* Bouton de clear (visible seulement si valeur présente) */}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 h-7 w-7"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Effacer la recherche</span>
        </Button>
      )}
    </div>
  );
}
