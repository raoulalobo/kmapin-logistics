/**
 * Composant : DepotSelect
 *
 * Sélecteur de dépôt pour les formulaires (devis, expéditions).
 * Charge les dépôts actifs via listDepotsForSelect() et affiche un combobox
 * avec recherche.
 *
 * Options disponibles :
 * - "Défaut" (value = '') → déclenche le fallback PDF : tous les dépôts apparaissent
 * - Un dépôt spécifique (value = id) → seul ce dépôt apparaît sur le PDF
 *
 * Affiche le format : "CODE - Nom" (ex: "OUA-01 - Dépôt Ouagadougou")
 *
 * Le dropdown est rendu via createPortal dans document.body pour éviter
 * les problèmes de stacking context (z-index piégé dans un parent avec
 * transform/opacity/shadow qui crée son propre contexte).
 *
 * @param value - ID du dépôt sélectionné
 * @param onChange - Callback quand la sélection change
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CircleNotch, CaretUpDown, Check, Warehouse, Buildings } from '@phosphor-icons/react';
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

  // Ref sur le bouton trigger pour calculer la position du dropdown
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Ref sur le dropdown pour le click-outside (portail = hors du DOM parent)
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Position calculée en coordonnées viewport (pour position: fixed)
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Charger les dépôts au montage
  useEffect(() => {
    async function loadDepots() {
      try {
        const data = await listDepotsForSelect();
        setDepots(data);
        // Pas d'auto-sélection : "Défaut" (value = '') est une option valide
        // qui déclenche le fallback PDF (tous les dépôts affichés sur le document)
      } catch {
        console.error('[DepotSelect] Erreur chargement dépôts');
      } finally {
        setLoading(false);
      }
    }
    loadDepots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Ouvrir le dropdown et calculer sa position en coordonnées viewport.
   * getBoundingClientRect() retourne des coordonnées viewport → parfait pour position: fixed.
   */
  function openDropdown() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setOpen((prev) => !prev);
  }

  /**
   * Fermer le dropdown au clic extérieur.
   * Vérifie le trigger ET le dropdown (qui est dans un portail, hors du DOM parent).
   */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideDropdown) {
        setOpen(false);
        setSearch('');
      }
    }

    /**
     * Fermer si l'utilisateur scrolle (le dropdown resterait à une position obsolète)
     */
    function handleScroll() {
      setOpen(false);
      setSearch('');
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [open]);

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
    <div>
      {/* Bouton trigger */}
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={openDropdown}
      >
        {/* Affichage du dépôt sélectionné, ou "Défaut" si aucun dépôt explicite */}
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <Warehouse className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-mono text-xs">{selected.code}</span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Buildings className="h-4 w-4 shrink-0" />
            <span>Défaut — tous les dépôts</span>
          </span>
        )}
        <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {/*
       * Dropdown via createPortal dans document.body
       *
       * position: fixed + coordonnées getBoundingClientRect() = rendu hors
       * de toute hiérarchie de stacking context. Évite le problème où les
       * cards suivantes (Itinéraire, etc.) passaient par-dessus le dropdown.
       */}
      {open && dropdownRect && typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
              backgroundColor: 'white', // fond opaque explicite — bypasse les vars CSS
              borderRadius: '0.375rem',
              border: '1px solid hsl(214.3 31.8% 91.4%)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              overflow: 'hidden',
            }}
          >
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
              {/* Option spéciale "Défaut" — déclenche le fallback PDF (tous les dépôts affichés) */}
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent border-b',
                  !value && 'bg-accent'
                )}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    !value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Buildings className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">Défaut</span>
                <span className="ml-auto text-xs text-muted-foreground">tous les dépôts</span>
              </button>
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
          </div>,
          document.body
        )
      }
    </div>
  );
}
