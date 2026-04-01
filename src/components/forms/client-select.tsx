/**
 * Composant : Sélecteur de clients
 *
 * Composant de sélection de clients avec recherche :
 * - Recherche par nom de client
 * - Affichage nom + email
 * - Compatible avec react-hook-form
 * - Chargement asynchrone des clients
 * - Dropdown rendu via createPortal pour éviter les problèmes de stacking context
 *
 * @module components/forms
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, Building, Check, CaretDown } from '@phosphor-icons/react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Type pour un client simplifié
 */
type Client = {
  id: string;
  name: string;
  email: string;
  legalName?: string | null;
};

/**
 * Props du composant ClientSelect
 */
interface ClientSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Composant de sélection de clients avec recherche
 *
 * Le dropdown est rendu via React.createPortal dans document.body
 * pour éviter les problèmes de stacking context (z-index piégé dans
 * un parent avec transform/opacity/will-change).
 * La position est calculée dynamiquement depuis le getBoundingClientRect
 * du déclencheur, en coordonnées viewport (position: fixed).
 */
export function ClientSelect({
  value,
  onChange,
  placeholder = 'Sélectionnez un client...',
  disabled = false,
}: ClientSelectProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Ref sur le bouton déclencheur pour calculer la position du dropdown
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Ref sur le dropdown lui-même pour le click-outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Position calculée en coordonnées viewport (pour position: fixed)
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  /**
   * Charger les clients au montage du composant
   */
  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      try {
        const { getClientsAction } = await import('@/modules/clients/actions/client.actions');
        const result = await getClientsAction({ page: 1, limit: 100 });

        if (result.success && result.data) {
          const validClients = result.data.clients.filter(
            (c): c is Client => c !== null && c !== undefined && typeof c.name === 'string'
          );
          console.log('[ClientSelect] Clients chargés:', validClients.length);
          setClients(validClients);
          setFilteredClients(validClients);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadClients();
  }, []);

  /**
   * Mettre à jour le client sélectionné quand la valeur change
   */
  useEffect(() => {
    if (value && clients.length > 0) {
      const client = clients.find((c) => c.id === value);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
  }, [value, clients]);

  /**
   * Filtrer les clients selon la recherche
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.legalName && client.legalName.toLowerCase().includes(query))
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  /**
   * Ouvrir le dropdown et calculer sa position en coordonnées viewport.
   * position: fixed utilise les coordonnées viewport → getBoundingClientRect est parfait.
   */
  function openDropdown() {
    if (disabled) return;

    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,   // 4px de marge sous le bouton
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen((prev) => !prev);
  }

  /**
   * Fermer le dropdown quand on clique en dehors
   * Vérifie à la fois le déclencheur ET le dropdown (qui est dans un portail)
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    /**
     * Fermer le dropdown si l'utilisateur scrolle la page
     * (le dropdown resterait sinon à une position obsolète)
     */
    function handleScroll() {
      setIsOpen(false);
      setSearchQuery('');
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isOpen]);

  /**
   * Sélectionner un client
   */
  function selectClient(client: Client) {
    console.log('[ClientSelect] Client sélectionné:', { id: client.id, name: client.name });
    setSelectedClient(client);
    onChange(client.id);
    setIsOpen(false);
    setSearchQuery('');
  }

  /**
   * Obtenir les initiales du nom du client
   */
  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="relative">
      {/* Bouton déclencheur */}
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between"
        onClick={openDropdown}
        disabled={disabled}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {getInitials(selectedClient.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="font-medium">{selectedClient.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedClient.legalName || selectedClient.email}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <CaretDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {/*
       * Dropdown rendu via createPortal dans document.body
       *
       * Pourquoi ? La position: absolute est piégée dans le stacking context
       * du parent (Card avec shadow, transform, etc.). Les cards "Dépôt" et
       * "Itinéraire" rendues après dans le DOM passaient par-dessus malgré z-50.
       *
       * createPortal + position: fixed = rendu hors hiérarchie DOM, coordonnées
       * viewport absolues → aucun stacking context parent ne peut interférer.
       */}
      {isOpen && dropdownRect && typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
          >
            <Card className="p-0 shadow-lg bg-background border-border/50">
              {/* Champ de recherche */}
              <div className="p-3 border-b">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, raison sociale ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              {/* Liste des clients */}
              <ScrollArea className="max-h-[300px]">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Chargement des clients...
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'Aucun client trouvé' : 'Aucun client disponible'}
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                        onClick={() => selectClient(client)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {client.legalName || client.email}
                          </p>
                        </div>
                        {value === client.id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer avec compteur */}
              {!isLoading && filteredClients.length > 0 && (
                <div className="p-2 border-t bg-muted/50">
                  <p className="text-xs text-muted-foreground text-center">
                    {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé
                    {filteredClients.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </Card>
          </div>,
          document.body
        )
      }
    </div>
  );
}
