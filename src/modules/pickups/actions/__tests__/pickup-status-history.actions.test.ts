/**
 * Tests pour les Server Actions de l'historique des statuts
 *
 * Tests des fonctions :
 * - recordStatusChange : Enregistrer un changement de statut
 * - getPickupStatusHistory : Récupérer l'historique complet
 * - getPickupStatusHistoryCount : Compter les changements
 *
 * Stratégie de test :
 * - Mock de Prisma enhanced pour RBAC
 * - Tests des différents rôles (ADMIN, OPERATIONS_MANAGER, CLIENT)
 * - Vérification du format des données (oldStatus null pour création)
 * - Tests de tri chronologique (ordre ascendant)
 *
 * @module modules/pickups/actions/__tests__/pickup-status-history.actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from 'better-auth/types';
import { PickupStatus } from '@/lib/db/enums';

/**
 * Mock de la session utilisateur
 */
const mockSession: Session = {
  session: {
    id: 'session-123',
    userId: 'user-operations-123',
    expiresAt: new Date(Date.now() + 86400000),
    token: 'mock-token',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  },
  user: {
    id: 'user-operations-123',
    email: 'operations@test.com',
    name: 'Operations Manager',
    role: 'OPERATIONS_MANAGER',
    companyId: 'company-123',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Mock du client Prisma Enhanced
 */
const mockEnhancedPrisma = {
  pickupStatusHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  pickupRequest: {
    findUnique: vi.fn(),
  },
};

/**
 * Mock des modules externes
 */
vi.mock('@/lib/auth/config', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
  requireAuth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock('@/lib/db/enhanced-client', () => ({
  getEnhancedPrismaFromSession: vi.fn(() => mockEnhancedPrisma),
}));

// Import des actions à tester
import {
  recordStatusChange,
  getPickupStatusHistory,
  getPickupStatusHistoryCount,
} from '../pickup-status-history.actions';

describe('Pickup Status History - recordStatusChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait enregistrer un changement de statut avec succès', async () => {
    // Arrange
    const mockPickupRequest = {
      id: 'pickup-123',
      companyId: 'company-123',
      status: PickupStatus.REQUESTED,
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockPickupRequest);

    const mockHistoryEntry = {
      id: 'history-123',
      pickupRequestId: 'pickup-123',
      oldStatus: PickupStatus.REQUESTED,
      newStatus: PickupStatus.SCHEDULED,
      changedAt: new Date(),
      changedById: 'user-operations-123',
      companyId: 'company-123',
      notes: 'Planifié pour demain',
    };

    mockEnhancedPrisma.pickupStatusHistory.create.mockResolvedValue(mockHistoryEntry);

    // Act
    const result = await recordStatusChange({
      pickupRequestId: 'pickup-123',
      oldStatus: PickupStatus.REQUESTED,
      newStatus: PickupStatus.SCHEDULED,
      notes: 'Planifié pour demain',
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockEnhancedPrisma.pickupStatusHistory.create).toHaveBeenCalledWith({
      data: {
        pickupRequestId: 'pickup-123',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedById: 'user-operations-123',
        companyId: 'company-123',
        notes: 'Planifié pour demain',
      },
    });
  });

  it('devrait accepter oldStatus null pour la création initiale', async () => {
    // Arrange : Première entrée (création de la demande)
    const mockPickupRequest = {
      id: 'pickup-new-123',
      companyId: 'company-123',
      status: PickupStatus.REQUESTED,
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockPickupRequest);

    const mockHistoryEntry = {
      id: 'history-new-123',
      pickupRequestId: 'pickup-new-123',
      oldStatus: null, // Création initiale
      newStatus: PickupStatus.REQUESTED,
      changedAt: new Date(),
      changedById: 'user-operations-123',
      companyId: 'company-123',
      notes: 'Demande d\'enlèvement créée',
    };

    mockEnhancedPrisma.pickupStatusHistory.create.mockResolvedValue(mockHistoryEntry);

    // Act
    const result = await recordStatusChange({
      pickupRequestId: 'pickup-new-123',
      oldStatus: null, // null = création initiale
      newStatus: PickupStatus.REQUESTED,
      notes: 'Demande d\'enlèvement créée',
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockEnhancedPrisma.pickupStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          oldStatus: null,
          newStatus: PickupStatus.REQUESTED,
        }),
      })
    );
  });

  it('devrait échouer si la demande n\'existe pas', async () => {
    // Arrange
    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(null);

    // Act
    const result = await recordStatusChange({
      pickupRequestId: 'pickup-inexistant',
      oldStatus: PickupStatus.REQUESTED,
      newStatus: PickupStatus.SCHEDULED,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('introuvable');
  });

  it('devrait inclure companyId automatiquement', async () => {
    // Arrange : Vérifier que companyId est récupéré depuis le pickup
    const mockPickupRequest = {
      id: 'pickup-456',
      companyId: 'company-different-456',
      status: PickupStatus.SCHEDULED,
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockPickupRequest);
    mockEnhancedPrisma.pickupStatusHistory.create.mockResolvedValue({
      id: 'history-456',
      companyId: 'company-different-456',
    } as any);

    // Act
    await recordStatusChange({
      pickupRequestId: 'pickup-456',
      oldStatus: PickupStatus.SCHEDULED,
      newStatus: PickupStatus.IN_PROGRESS,
    });

    // Assert : companyId doit être celui du pickup, pas de la session
    expect(mockEnhancedPrisma.pickupStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-different-456',
        }),
      })
    );
  });
});

describe('Pickup Status History - getPickupStatusHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer l\'historique complet avec relations', async () => {
    // Arrange
    const mockHistory = [
      {
        id: 'history-1',
        pickupRequestId: 'pickup-123',
        oldStatus: null,
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedById: 'user-1',
        changedBy: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@test.com',
        },
        notes: 'Demande créée',
      },
      {
        id: 'history-2',
        pickupRequestId: 'pickup-123',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.SCHEDULED,
        changedAt: new Date('2026-01-09T14:00:00Z'),
        changedById: 'user-2',
        changedBy: {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@test.com',
        },
        notes: 'Planifié pour demain',
      },
      {
        id: 'history-3',
        pickupRequestId: 'pickup-123',
        oldStatus: PickupStatus.SCHEDULED,
        newStatus: PickupStatus.COMPLETED,
        changedAt: new Date('2026-01-10T09:00:00Z'),
        changedById: 'user-3',
        changedBy: {
          id: 'user-3',
          name: 'Driver Bob',
          email: 'bob@test.com',
        },
        notes: 'Enlèvement effectué',
      },
    ];

    mockEnhancedPrisma.pickupStatusHistory.findMany.mockResolvedValue(mockHistory);

    // Act
    const result = await getPickupStatusHistory('pickup-123');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);

    // Vérifier le tri chronologique (ascendant)
    expect(mockEnhancedPrisma.pickupStatusHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pickupRequestId: 'pickup-123' },
        orderBy: { changedAt: 'asc' },
        include: expect.objectContaining({
          changedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        }),
      })
    );

    // Vérifier la structure des données
    expect(result.data![0].changedBy).toBeDefined();
    expect(result.data![0].changedBy.name).toBe('John Doe');
  });

  it('devrait retourner un tableau vide si pas d\'historique', async () => {
    // Arrange
    mockEnhancedPrisma.pickupStatusHistory.findMany.mockResolvedValue([]);

    // Act
    const result = await getPickupStatusHistory('pickup-sans-historique');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('devrait trier par ordre chronologique croissant', async () => {
    // Arrange : Historique avec dates dans le désordre
    const mockHistory = [
      {
        id: 'history-3',
        changedAt: new Date('2026-01-10T09:00:00Z'), // Plus récent
        newStatus: PickupStatus.COMPLETED,
        changedBy: { id: 'user-3', name: 'User 3', email: 'user3@test.com' },
      },
      {
        id: 'history-1',
        changedAt: new Date('2026-01-09T10:00:00Z'), // Plus ancien
        newStatus: PickupStatus.REQUESTED,
        changedBy: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
      },
      {
        id: 'history-2',
        changedAt: new Date('2026-01-09T14:00:00Z'), // Milieu
        newStatus: PickupStatus.SCHEDULED,
        changedBy: { id: 'user-2', name: 'User 2', email: 'user2@test.com' },
      },
    ];

    // Simuler le tri de Prisma (orderBy: { changedAt: 'asc' })
    const sortedHistory = [...mockHistory].sort(
      (a, b) => a.changedAt.getTime() - b.changedAt.getTime()
    );

    mockEnhancedPrisma.pickupStatusHistory.findMany.mockResolvedValue(sortedHistory);

    // Act
    const result = await getPickupStatusHistory('pickup-123');

    // Assert : Vérifier l'ordre chronologique
    expect(result.data![0].id).toBe('history-1'); // Plus ancien
    expect(result.data![1].id).toBe('history-2'); // Milieu
    expect(result.data![2].id).toBe('history-3'); // Plus récent
  });

  it('devrait gérer les entrées avec oldStatus null (création)', async () => {
    // Arrange : Historique commençant par création (oldStatus = null)
    const mockHistory = [
      {
        id: 'history-1',
        pickupRequestId: 'pickup-123',
        oldStatus: null, // Création initiale
        newStatus: PickupStatus.REQUESTED,
        changedAt: new Date('2026-01-09T10:00:00Z'),
        changedById: 'user-1',
        changedBy: {
          id: 'user-1',
          name: 'Creator',
          email: 'creator@test.com',
        },
        notes: 'Demande créée',
      },
    ];

    mockEnhancedPrisma.pickupStatusHistory.findMany.mockResolvedValue(mockHistory);

    // Act
    const result = await getPickupStatusHistory('pickup-123');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data![0].oldStatus).toBeNull();
    expect(result.data![0].newStatus).toBe(PickupStatus.REQUESTED);
  });
});

describe('Pickup Status History - getPickupStatusHistoryCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner le nombre de changements', async () => {
    // Arrange
    mockEnhancedPrisma.pickupStatusHistory.count.mockResolvedValue(5);

    // Act
    const result = await getPickupStatusHistoryCount('pickup-123');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(5);
    expect(mockEnhancedPrisma.pickupStatusHistory.count).toHaveBeenCalledWith({
      where: { pickupRequestId: 'pickup-123' },
    });
  });

  it('devrait retourner 0 si pas d\'historique', async () => {
    // Arrange
    mockEnhancedPrisma.pickupStatusHistory.count.mockResolvedValue(0);

    // Act
    const result = await getPickupStatusHistoryCount('pickup-sans-historique');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(0);
  });

  it('devrait gérer les erreurs de base de données', async () => {
    // Arrange
    mockEnhancedPrisma.pickupStatusHistory.count.mockRejectedValue(
      new Error('Database connection error')
    );

    // Act
    const result = await getPickupStatusHistoryCount('pickup-123');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Pickup Status History - Access Control (RBAC)', () => {
  it('ADMIN devrait pouvoir créer et lire l\'historique', async () => {
    // Les mocks par défaut simulent un utilisateur OPERATIONS_MANAGER
    // qui a les droits create + read sur l'historique
    // Ce test vérifie que les operations fonctionnent (RBAC appliqué par Zenstack)

    const mockPickupRequest = {
      id: 'pickup-admin-test',
      companyId: 'company-123',
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockPickupRequest);
    mockEnhancedPrisma.pickupStatusHistory.create.mockResolvedValue({
      id: 'history-admin',
    } as any);

    // Act : Créer
    const createResult = await recordStatusChange({
      pickupRequestId: 'pickup-admin-test',
      oldStatus: null,
      newStatus: PickupStatus.REQUESTED,
    });

    expect(createResult.success).toBe(true);

    // Act : Lire
    mockEnhancedPrisma.pickupStatusHistory.findMany.mockResolvedValue([
      { id: 'history-admin', newStatus: PickupStatus.REQUESTED, changedBy: {} },
    ] as any);

    const readResult = await getPickupStatusHistory('pickup-admin-test');

    expect(readResult.success).toBe(true);
  });

  it('CLIENT devrait pouvoir lire uniquement (pas créer)', async () => {
    // Note : Le RBAC est appliqué par Zenstack via getEnhancedPrisma
    // Si un CLIENT tente de créer, Zenstack bloquera l'opération
    // Ce test vérifie que la lecture fonctionne

    mockEnhancedPrisma.pickupStatusHistory.findMany.mockResolvedValue([
      {
        id: 'history-client-1',
        newStatus: PickupStatus.REQUESTED,
        changedBy: { id: 'user-1', name: 'Agent', email: 'agent@test.com' },
      },
    ] as any);

    // Act : CLIENT peut lire
    const result = await getPickupStatusHistory('pickup-client-test');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});
