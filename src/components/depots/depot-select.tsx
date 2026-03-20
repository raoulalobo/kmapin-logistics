/**
 * Composant : DepotSelect
 *
 * Sélecteur de dépôt pour les formulaires (devis, expéditions).
 * Charge les dépôts actifs via listDepotsForSelect() et affiche un combobox
 * avec recherche. Le dépôt par défaut est pré-sélectionné si aucune valeur n'est fournie.
 *
 * Affiche le format : "CODE - Nom" (ex: "OUA-01 - Dépôt Ouagadougou")
 *
 * @param value - ID du dépôt sélectionné
 * @param onChange - Callback quand la sélection change
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { CircleNotch, CaretUpDown, Check, Warehouse } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { listDepotsForSelect } from '@/modules/depots/actions/depot.actions';

/**
 * Type d'un dépôt simplifié pour le sélecteur
 */
interface DepotOption {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

interface DepotSelectProps {
  value?: string;
  onChange: (value: string) => void;
}

export function DepotSelect({ value, onChange }: DepotSelectProps) {
  const [depots, setDepots] = useState<DepotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Charger les dépôts au montage
  useEffect(() => {
    async function loadDepots() {
      try {
        const data = await listDepotsForSelect();
        setDepots(data);

        // Si aucune valeur sélectionnée, pré-sélectionner le dépôt par défaut
        if (!value) {
          const defaultDepot = data.find((d) => d.isDefault);
          if (defaultDepot) {
            onChange(defaultDepot.id);
          }
        }
      } catch {
        console.error('[DepotSelect] Erreur chargement dépôts');
      } finally {
        setLoading(false);
      }
    }
    loadDepots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrer les dépôts par recherche (nom ou code)
  const filtered = depots.filter((d) => {
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
  });

  // Dépôt sélectionné pour l'affichage
  const selected = depots.find((d) => d.id === value);

  if (loading) {
    return (
      <Button variant="outline" className="w-full justify-start" disabled>
        <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
        Chargement des dépôts...
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bouton trigger */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <Warehouse className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-mono text-xs">{selected.code}</span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Sélectionner un dépôt...</span>
        )}
        <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Champ de recherche */}
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Rechercher un dépôt..."
              className="w-full rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Liste des options */}
          <ScrollArea className="max-h-[200px]">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun dépôt trouvé
              </p>
            ) : (
              filtered.map((depot) => (
                <button
                  key={depot.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent',
                    value === depot.id && 'bg-accent'
                  )}
                  onClick={() => {
                    onChange(depot.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === depot.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {depot.code}
                  </span>
                  <span className="truncate">{depot.name}</span>
                  {depot.isDefault && (
                    <span className="ml-auto text-xs text-muted-foreground">(défaut)</span>
                  )}
                </button>
              ))
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
