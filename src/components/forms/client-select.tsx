/**
 * Composant : Sélecteur de clients
 *
 * Composant de sélection de clients avec recherche :
 * - Recherche par nom de client
 * - Affichage nom + email
 * - Compatible avec react-hook-form
 * - Chargement asynchrone des clients
 *
 * @module components/forms
 */

'use client';

import { useState, useEffect, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Charger les clients au montage du composant
   */
  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      try {
        // Importer l'action côté client (évite les erreurs de bundling)
        const { getClientsAction } = await import('@/modules/clients/actions/client.actions');

        // Récupérer tous les clients (limite à 100 pour l'instant)
        const result = await getClientsAction({ page: 1, limit: 100 });

        if (result.success && result.data) {
          // Filtrer les éléments null ou invalides (protection défensive)
          // Prisma ne devrait pas retourner de null, mais on se protège au cas où
          const validClients = result.data.clients.filter(
            (c): c is Client => c !== null && c !== undefined && typeof c.name === 'string'
          );

          // === DIAGNOSTIC LOGS ===
          console.log('[ClientSelect] Clients chargés:', validClients.length);
          console.log('[ClientSelect] Liste des IDs:', validClients.map(c => ({ id: c.id, name: c.name })));
          if (validClients.length !== result.data.clients.length) {
            console.warn('[ClientSelect] Attention: certains clients ont été filtrés car invalides');
          }
          // === FIN DIAGNOSTIC ===

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
   * Recherche par nom, email et raison sociale
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
   * Fermer le dropdown quand on clique à l'extérieur
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Sélectionner un client
   * Met à jour l'état local et notifie le parent via onChange
   */
  function selectClient(client: Client) {
    // === DIAGNOSTIC LOGS ===
    console.log('[ClientSelect] Client sélectionné:', { id: client.id, name: client.name });
    console.log('[ClientSelect] Appel onChange avec:', client.id);
    console.log('[ClientSelect] Type de client.id:', typeof client.id);
    // === FIN DIAGNOSTIC ===

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
    <div ref={containerRef} className="relative">
      {/* Bouton de sélection */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between"
        onClick={() => !disabled && setIsOpen(!isOpen)}
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

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute z-50 mt-2 w-full p-0 shadow-lg backdrop-blur-md bg-background/95 border-border/50">
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
      )}
    </div>
  );
}
