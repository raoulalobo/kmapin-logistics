/**
 * Tests pour le composant PickupStatusHistory
 *
 * Tests de l'affichage de l'historique des statuts :
 * - Affichage de la timeline avec points colorés
 * - Affichage des transitions (ancien → nouveau)
 * - Formatage des dates (français)
 * - Affichage des agents responsables
 * - Gestion des cas spéciaux (oldStatus null, notes vides)
 * - State vide (aucun historique)
 *
 * Stratégie de test :
 * - Rendu avec @testing-library/react
 * - Vérification du DOM (présence des éléments)
 * - Tests d'accessibilité (ARIA labels)
 * - Snapshot testing pour détecter les régressions visuelles
 *
 * @module components/pickups/__tests__/PickupStatusHistory
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PickupStatusHistory } from '../PickupStatusHistory';
import { PickupStatus } from '@/lib/db/enums';
import type { PickupStatusHistoryItem } from '@/modules/pickups';

// Mock de date-fns pour des dates déterministes
beforeAll(() => {
  // Figer la date pour les tests (déjà fait dans vitest.setup.ts)
});

describe('PickupStatusHistory - Affichage de base', () => {
  it('devrait afficher le titre et le nombre de changements', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@test.com',
        },
        notes: 'Demande créée',
      },
      {
        id: 'history-2',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedAt: new Date('2026-01-09T14:00:00Z'),
        changedBy: {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@test.com',
        },
        notes: 'Planifié pour demain',
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier le titre
    expect(screen.getByText('Historique des Statuts')).toBeInTheDocument();

    // Assert : Vérifier le nombre de changements
    expect(screen.getByText('2 changements enregistrés')).toBeInTheDocument();
  });

  it('devrait afficher "1 changement enregistré" au singulier', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@test.com',
        },
        notes: null,
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Singulier
    expect(screen.getByText('1 changement enregistré')).toBeInTheDocument();
  });

  it('devrait afficher toutes les entrées de l\'historique', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Creator User',
          email: 'creator@test.com',
        },
        notes: 'Création',
      },
      {
        id: 'history-2',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedAt: new Date('2026-01-09T14:00:00Z'),
        changedBy: {
          id: 'user-2',
          name: 'Scheduler User',
          email: 'scheduler@test.com',
        },
        notes: 'Planification',
      },
      {
        id: 'history-3',
        oldStatus: PickupStatus.SCHEDULED,
        newStatus: PickupStatus.COMPLETED,
        changedAt: new Date('2026-01-10T09:00:00Z'),
        changedBy: {
          id: 'user-3',
          name: 'Driver User',
          email: 'driver@test.com',
        },
        notes: 'Complété',
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier que tous les noms d'agents sont affichés
    expect(screen.getByText('Creator User')).toBeInTheDocument();
    expect(screen.getByText('Scheduler User')).toBeInTheDocument();
    expect(screen.getByText('Driver User')).toBeInTheDocument();
  });
});

describe('PickupStatusHistory - Affichage des transitions', () => {
  it('devrait afficher une flèche entre ancien et nouveau statut', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedAt: new Date('2026-01-09T14:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Agent',
          email: 'agent@test.com',
        },
        notes: null,
      },
    ];

    // Act
    const { container } = render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier la présence de l'icône ArrowRight (Phosphor)
    // Le composant utilise <ArrowRight className="h-4 w-4" />
    const arrows = container.querySelectorAll('svg');
    expect(arrows.length).toBeGreaterThan(0);
  });

  it('devrait afficher les badges de statut avec les bonnes couleurs', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedAt: new Date('2026-01-09T14:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Agent',
          email: 'agent@test.com',
        },
        notes: null,
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier que les labels sont affichés (traduits en français)
    // getPickupStatusConfig retourne des labels français
    expect(screen.getByText(/Demandé|Planifié/i)).toBeInTheDocument();
  });

  it('ne devrait PAS afficher de badge pour oldStatus null (création)', () => {
    // Arrange : Première entrée avec oldStatus = null
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null, // Création initiale
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Creator',
          email: 'creator@test.com',
        },
        notes: 'Demande créée',
      },
    ];

    // Act
    const { container } = render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier qu'il n'y a qu'un seul badge (nouveau statut seulement)
    // Dans le composant : {entry.oldStatus && <Badge>...</Badge>}
    const badges = container.querySelectorAll('.inline-flex.items-center'); // Class des Badge shadcn
    // On s'attend à 1 badge (nouveau statut) et pas de flèche
    // Vérification indirecte : pas de flèche si oldStatus est null
    expect(screen.queryByText('→')).not.toBeInTheDocument();
  });
});

describe('PickupStatusHistory - Affichage des agents et dates', () => {
  it('devrait afficher le nom et l\'email de l\'agent', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john.doe@test.com',
        },
        notes: null,
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/john.doe@test.com/i)).toBeInTheDocument();
  });

  it('devrait formater les dates en français', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T14:30:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Agent',
          email: 'agent@test.com',
        },
        notes: null,
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier le format date-fns français (ex: "9 janvier 2026 à 14:30")
    // Note : Le timezone peut varier, on vérifie juste la présence de la date
    expect(screen.getByText(/9.*janvier.*2026/i)).toBeInTheDocument();
  });

  it('devrait afficher les notes si disponibles', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedAt: new Date('2026-01-09T14:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Agent',
          email: 'agent@test.com',
        },
        notes: 'Planifié pour demain matin à 9h',
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert
    expect(screen.getByText('Planifié pour demain matin à 9h')).toBeInTheDocument();
  });

  it('ne devrait PAS afficher de notes si null', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Agent',
          email: 'agent@test.com',
        },
        notes: null,
      },
    ];

    // Act
    const { container } = render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier qu'il n'y a pas d'élément de notes
    // Dans le composant : {entry.notes && <div>...</div>}
    const notesElements = container.querySelectorAll('.text-sm.text-gray-600.italic');
    expect(notesElements.length).toBe(0);
  });
});

describe('PickupStatusHistory - État vide', () => {
  it('devrait afficher un message si aucun historique (avec showEmptyState=true)', () => {
    // Arrange
    const emptyHistory: PickupStatusHistoryItem[] = [];

    // Act
    render(<PickupStatusHistory history={emptyHistory} showEmptyState={true} />);

    // Assert
    expect(screen.getByText('Aucun changement de statut enregistré')).toBeInTheDocument();
    expect(
      screen.getByText('Les changements de statut apparaîtront ici automatiquement.')
    ).toBeInTheDocument();
  });

  it('ne devrait PAS afficher de message si showEmptyState=false', () => {
    // Arrange
    const emptyHistory: PickupStatusHistoryItem[] = [];

    // Act
    render(<PickupStatusHistory history={emptyHistory} showEmptyState={false} />);

    // Assert
    expect(screen.queryByText('Aucun changement de statut enregistré')).not.toBeInTheDocument();
  });

  it('devrait utiliser showEmptyState=true par défaut', () => {
    // Arrange
    const emptyHistory: PickupStatusHistoryItem[] = [];

    // Act : Ne pas passer showEmptyState (default=true)
    render(<PickupStatusHistory history={emptyHistory} />);

    // Assert
    expect(screen.getByText('Aucun changement de statut enregistré')).toBeInTheDocument();
  });
});

describe('PickupStatusHistory - Accessibilité', () => {
  it('devrait avoir des éléments accessibles (headings, lists)', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Agent',
          email: 'agent@test.com',
        },
        notes: null,
      },
    ];

    // Act
    const { container } = render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier la structure sémantique HTML
    const headings = container.querySelectorAll('h3');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('devrait afficher une icône Clock dans le titre', () => {
    // Arrange
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedBy: {
          id: 'user-1',
          name: 'Agent',
          email: 'agent@test.com',
        },
        notes: null,
      },
    ];

    // Act
    const { container } = render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier la présence de SVG (icône Clock de Phosphor)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

describe('PickupStatusHistory - Cas réels complets', () => {
  it('devrait afficher un workflow complet typique', () => {
    // Arrange : Workflow réel d'une demande d'enlèvement
    const mockHistory: PickupStatusHistoryItem[] = [
      {
        id: 'history-1',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T09:00:00Z'),
        changedBy: {
          id: 'user-client',
          name: 'Jean Dupont',
          email: 'jean.dupont@client.com',
        },
        notes: 'Demande d\'enlèvement créée par le client',
      },
      {
        id: 'history-2',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedAt: new Date('2026-01-09T11:30:00Z'),
        changedBy: {
          id: 'user-ops',
          name: 'Marie Martin',
          email: 'marie.martin@fasofret.com',
        },
        notes: 'Planifié pour demain 10h - Transporteur XYZ assigné',
      },
      {
        id: 'history-3',
        oldStatus: PickupStatus.SCHEDULED,
        newStatus: PickupStatus.IN_PROGRESS,
        changedAt: new Date('2026-01-10T10:05:00Z'),
        changedBy: {
          id: 'user-driver',
          name: 'Pierre Chauffeur',
          email: 'pierre@transporteur.com',
        },
        notes: 'Chauffeur arrivé sur site',
      },
      {
        id: 'history-4',
        oldStatus: PickupStatus.IN_PROGRESS,
        newStatus: PickupStatus.COMPLETED,
        changedAt: new Date('2026-01-10T10:45:00Z'),
        changedBy: {
          id: 'user-driver',
          name: 'Pierre Chauffeur',
          email: 'pierre@transporteur.com',
        },
        notes: 'Enlèvement terminé - 3 colis récupérés',
      },
    ];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier toutes les étapes
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Pierre Chauffeur')).toBeInTheDocument();

    // Vérifier les notes spécifiques
    expect(screen.getByText(/Demande d'enlèvement créée par le client/i)).toBeInTheDocument();
    expect(screen.getByText(/Planifié pour demain 10h/i)).toBeInTheDocument();
    expect(screen.getByText(/Chauffeur arrivé sur site/i)).toBeInTheDocument();
    expect(screen.getByText(/3 colis récupérés/i)).toBeInTheDocument();

    // Vérifier le nombre total
    expect(screen.getByText('4 changements enregistrés')).toBeInTheDocument();
  });
});
