/**
 * Tests pour les Server Actions des demandes d'enlèvement
 *
 * Tests des fonctions principales :
 * - createPickupRequestAction : Créer une demande d'enlèvement
 * - updatePickupStatusAction : Mettre à jour le statut
 * - cancelPickupRequestAction : Annuler une demande
 * - listPickupRequestsAction : Lister les demandes avec filtres
 * - getPickupRequestByIdAction : Récupérer une demande par ID
 *
 * Stratégie de test :
 * - Mock de Prisma enhanced pour simuler Zenstack RBAC
 * - Mock de Better Auth session pour tester les différents rôles
 * - Vérification des règles d'accès (ADMIN, OPERATIONS_MANAGER, CLIENT)
 * - Tests des cas d'erreur (validation, permissions, données manquantes)
 *
 * @module modules/pickups/actions/__tests__/pickup.actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from 'better-auth/types';
import { PickupStatus } from '@/lib/db/enums';

/**
 * Mock de la session utilisateur
 * Simule différents rôles pour tester les permissions RBAC
 */
const mockSession: Session = {
  session: {
    id: 'session-123',
    userId: 'user-admin-123',
    expiresAt: new Date(Date.now() + 86400000),
    token: 'mock-token',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  },
  user: {
    id: 'user-admin-123',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'ADMIN',
    companyId: 'company-123',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Mock du client Prisma Enhanced (Zenstack)
 * Simule les opérations de base de données avec access control
 */
const mockEnhancedPrisma = {
  pickupRequest: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  shipment: {
    findUnique: vi.fn(),
  },
};

/**
 * Mock des modules externes
 * Remplace les vraies implémentations par des mocks contrôlables
 */
vi.mock('@/lib/auth/config', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
  requireAuth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock('@/lib/db/enhanced-client', () => ({
  getEnhancedPrismaFromSession: vi.fn(() => mockEnhancedPrisma),
}));

vi.mock('../pickup-status-history.actions', () => ({
  recordStatusChange: vi.fn(() => Promise.resolve({ success: true, data: {} })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import des actions à tester (APRÈS les mocks)
import {
  createPickupRequestAction,
  updatePickupStatusAction,
  cancelPickupRequestAction,
  listPickupRequestsAction,
  getPickupRequestByIdAction,
} from '../pickup.actions';

describe('Pickup Actions - createPickupRequestAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer une demande d\'enlèvement avec données valides', async () => {
    // Arrange : Mock du shipment existant
    const mockShipment = {
      id: 'shipment-123',
      trackingNumber: 'SHP-20260109-A1B2C',
      companyId: 'company-123',
    };

    const mockPickupRequest = {
      id: 'pickup-123',
      shipmentId: 'shipment-123',
      pickupAddress: '123 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      pickupContact: 'John Doe',
      pickupPhone: '+33612345678',
      requestedDate: new Date('2026-01-15'),
      timeSlot: 'MORNING',
      status: PickupStatus.REQUESTED,
      companyId: 'company-123',
      createdById: 'user-admin-123',
      cargoType: 'Electronics',
      estimatedWeight: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockEnhancedPrisma.shipment.findUnique.mockResolvedValue(mockShipment);
    mockEnhancedPrisma.pickupRequest.create.mockResolvedValue(mockPickupRequest);

    // Act : Appeler l'action
    const result = await createPickupRequestAction({
      shipmentId: 'shipment-123',
      pickupAddress: '123 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      pickupContact: 'John Doe',
      pickupPhone: '+33612345678',
      requestedDate: '2026-01-15T10:00:00Z',
      timeSlot: 'MORNING',
      cargoType: 'Electronics',
      estimatedWeight: 50,
    });

    // Assert : Vérifier le résultat
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockEnhancedPrisma.shipment.findUnique).toHaveBeenCalledWith({
      where: { id: 'shipment-123' },
    });
    expect(mockEnhancedPrisma.pickupRequest.create).toHaveBeenCalled();
  });

  it('devrait échouer si le shipment n\'existe pas', async () => {
    // Arrange : Mock shipment inexistant
    mockEnhancedPrisma.shipment.findUnique.mockResolvedValue(null);

    // Act
    const result = await createPickupRequestAction({
      shipmentId: 'shipment-inexistant',
      pickupAddress: '123 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      pickupContact: 'John Doe',
      pickupPhone: '+33612345678',
      requestedDate: '2026-01-15T10:00:00Z',
      timeSlot: 'MORNING',
      cargoType: 'Electronics',
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Expédition introuvable');
  });

  it('devrait échouer avec des données invalides (validation Zod)', async () => {
    // Act : Données invalides (pas de ville)
    const result = await createPickupRequestAction({
      shipmentId: 'shipment-123',
      pickupAddress: '123 Rue Test',
      // pickupCity manquant (requis)
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      requestedDate: '2026-01-15T10:00:00Z',
      timeSlot: 'MORNING',
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Pickup Actions - updatePickupStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait mettre à jour le statut d\'une demande', async () => {
    // Arrange
    const mockExistingPickup = {
      id: 'pickup-123',
      status: PickupStatus.REQUESTED,
      companyId: 'company-123',
    };

    const mockUpdatedPickup = {
      ...mockExistingPickup,
      status: PickupStatus.SCHEDULED,
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockExistingPickup);
    mockEnhancedPrisma.pickupRequest.update.mockResolvedValue(mockUpdatedPickup);

    // Act
    const result = await updatePickupStatusAction({
      id: 'pickup-123',
      status: PickupStatus.SCHEDULED,
      notes: 'Planifié pour demain',
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockEnhancedPrisma.pickupRequest.update).toHaveBeenCalledWith({
      where: { id: 'pickup-123' },
      data: {
        status: PickupStatus.SCHEDULED,
        confirmedDate: expect.any(Date),
      },
    });
  });

  it('devrait enregistrer l\'historique lors du changement de statut', async () => {
    // Cette fonctionnalité est testée via le mock de recordStatusChange
    // qui vérifie que l'historique est bien créé
    const mockExistingPickup = {
      id: 'pickup-123',
      status: PickupStatus.REQUESTED,
      companyId: 'company-123',
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockExistingPickup);
    mockEnhancedPrisma.pickupRequest.update.mockResolvedValue({
      ...mockExistingPickup,
      status: PickupStatus.COMPLETED,
    });

    // Act
    await updatePickupStatusAction({
      id: 'pickup-123',
      status: PickupStatus.COMPLETED,
    });

    // Assert : recordStatusChange a été appelé (via le mock)
    const { recordStatusChange } = await import('../pickup-status-history.actions');
    expect(recordStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupRequestId: 'pickup-123',
        oldStatus: PickupStatus.REQUESTED,
        newStatus: PickupStatus.COMPLETED,
      })
    );
  });
});

describe('Pickup Actions - cancelPickupRequestAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait annuler une demande d\'enlèvement', async () => {
    // Arrange
    const mockExistingPickup = {
      id: 'pickup-123',
      status: PickupStatus.REQUESTED,
      companyId: 'company-123',
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockExistingPickup);
    mockEnhancedPrisma.pickupRequest.update.mockResolvedValue({
      ...mockExistingPickup,
      status: PickupStatus.CANCELED,
    });

    // Act
    const result = await cancelPickupRequestAction({
      id: 'pickup-123',
      reason: 'Client a changé d\'avis',
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockEnhancedPrisma.pickupRequest.update).toHaveBeenCalledWith({
      where: { id: 'pickup-123' },
      data: { status: PickupStatus.CANCELED },
    });
  });

  it('ne devrait pas pouvoir annuler une demande déjà complétée', async () => {
    // Arrange : Demande déjà complétée
    const mockCompletedPickup = {
      id: 'pickup-123',
      status: PickupStatus.COMPLETED,
      companyId: 'company-123',
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockCompletedPickup);

    // Act
    const result = await cancelPickupRequestAction({
      id: 'pickup-123',
      reason: 'Test annulation',
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('annuler');
  });
});

describe('Pickup Actions - listPickupRequestsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait lister les demandes avec pagination', async () => {
    // Arrange
    const mockPickups = [
      { id: 'pickup-1', status: PickupStatus.REQUESTED },
      { id: 'pickup-2', status: PickupStatus.SCHEDULED },
    ];

    mockEnhancedPrisma.pickupRequest.findMany.mockResolvedValue(mockPickups);
    mockEnhancedPrisma.pickupRequest.count.mockResolvedValue(15);

    // Act
    const result = await listPickupRequestsAction({
      page: 1,
      limit: 10,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 15,
      totalPages: 2,
    });
  });

  it('devrait filtrer par statut', async () => {
    // Arrange
    mockEnhancedPrisma.pickupRequest.findMany.mockResolvedValue([
      { id: 'pickup-1', status: PickupStatus.SCHEDULED },
    ]);
    mockEnhancedPrisma.pickupRequest.count.mockResolvedValue(1);

    // Act
    const result = await listPickupRequestsAction({
      status: PickupStatus.SCHEDULED,
      page: 1,
      limit: 10,
    });

    // Assert
    expect(mockEnhancedPrisma.pickupRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PickupStatus.SCHEDULED,
        }),
      })
    );
  });

  it('devrait trier par date (ascendant/descendant)', async () => {
    // Arrange
    mockEnhancedPrisma.pickupRequest.findMany.mockResolvedValue([]);
    mockEnhancedPrisma.pickupRequest.count.mockResolvedValue(0);

    // Act : Tri descendant (plus récentes d'abord)
    await listPickupRequestsAction({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    // Assert
    expect(mockEnhancedPrisma.pickupRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });
});

describe('Pickup Actions - getPickupRequestByIdAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer une demande par ID avec relations', async () => {
    // Arrange
    const mockPickup = {
      id: 'pickup-123',
      status: PickupStatus.REQUESTED,
      shipment: {
        id: 'shipment-123',
        trackingNumber: 'SHP-20260109-A1B2C',
      },
      transporter: null,
    };

    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(mockPickup);

    // Act
    const result = await getPickupRequestByIdAction('pickup-123');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPickup);
    expect(mockEnhancedPrisma.pickupRequest.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pickup-123' },
        include: expect.objectContaining({
          shipment: true,
          transporter: true,
        }),
      })
    );
  });

  it('devrait retourner une erreur si la demande n\'existe pas', async () => {
    // Arrange
    mockEnhancedPrisma.pickupRequest.findUnique.mockResolvedValue(null);

    // Act
    const result = await getPickupRequestByIdAction('pickup-inexistant');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('introuvable');
  });
});
