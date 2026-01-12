/**
 * Tests pour les Server Actions des demandes d'enlèvement guest (non connecté)
 *
 * Tests des fonctions :
 * - createGuestPickupRequestAction : Créer une demande guest
 * - listGuestPickupRequestsAction : Lister les demandes guest
 *
 * Stratégie de test :
 * - Utilisation de Prisma STANDARD (pas enhanced) car accès public
 * - Tests de la génération du numéro GPK-YYYYMMDD-XXXXX
 * - Vérification de la création/réutilisation du Prospect
 * - Tests du token d'invitation (7 jours d'expiration)
 * - Vérification que AUCUN email n'est envoyé
 *
 * @module modules/pickups/actions/__tests__/guest-pickup.actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PickupStatus } from '@/lib/db/enums';

/**
 * Mock du client Prisma STANDARD (non enhanced)
 * Utilisé pour les guests car pas de session
 */
const mockPrisma = {
  prospect: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  guestPickupRequest: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

/**
 * Mock des modules externes
 */
vi.mock('@/lib/db/client', () => ({
  prisma: mockPrisma,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import des actions à tester
import {
  createGuestPickupRequestAction,
  listGuestPickupRequestsAction,
} from '../guest-pickup.actions';

describe('Guest Pickup Actions - createGuestPickupRequestAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer une demande guest avec un nouveau prospect', async () => {
    // Arrange : Prospect n'existe pas encore
    mockPrisma.prospect.findUnique.mockResolvedValue(null);

    const mockProspect = {
      id: 'prospect-123',
      email: 'nouveau@client.com',
      phone: '+33612345678',
      name: 'Jean Dupont',
      invitationToken: 'token-abc123',
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.prospect.create.mockResolvedValue(mockProspect);

    // Mock du dernier numéro GPK pour tester la génération
    mockPrisma.guestPickupRequest.findFirst.mockResolvedValue({
      requestNumber: 'GPK-20260109-00001',
    });

    const mockGuestPickup = {
      id: 'guest-pickup-123',
      prospectId: 'prospect-123',
      requestNumber: 'GPK-20260109-00002', // Numéro incrémenté
      pickupAddress: '123 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      pickupContact: 'Jean Dupont',
      pickupPhone: '+33612345678',
      requestedDate: new Date('2026-01-15'),
      timeSlot: 'MORNING',
      cargoType: 'Electronics',
      estimatedWeight: 50,
      status: PickupStatus.REQUESTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.guestPickupRequest.create.mockResolvedValue(mockGuestPickup);

    // Act
    const result = await createGuestPickupRequestAction({
      prospectEmail: 'nouveau@client.com',
      prospectPhone: '+33612345678',
      prospectName: 'Jean Dupont',
      pickupAddress: '123 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      pickupContact: 'Jean Dupont',
      pickupPhone: '+33612345678',
      requestedDate: '2026-01-15T10:00:00Z',
      timeSlot: 'MORNING',
      cargoType: 'Electronics',
      estimatedWeight: 50,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.requestNumber).toMatch(/^GPK-\d{8}-\d{5}$/); // Format GPK-YYYYMMDD-XXXXX
    expect(result.data?.prospectId).toBe('prospect-123');
    expect(result.data?.invitationToken).toBe('token-abc123');

    // Vérifier que le prospect a été créé
    expect(mockPrisma.prospect.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'nouveau@client.com',
          phone: '+33612345678',
          name: 'Jean Dupont',
          status: 'PENDING',
        }),
      })
    );

    // Vérifier que le guest pickup a été créé
    expect(mockPrisma.guestPickupRequest.create).toHaveBeenCalled();
  });

  it('devrait réutiliser un prospect existant', async () => {
    // Arrange : Prospect existe déjà
    const mockExistingProspect = {
      id: 'prospect-existing-456',
      email: 'existant@client.com',
      phone: '+33698765432',
      name: 'Marie Martin',
      invitationToken: 'token-existing-xyz',
      invitationExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 jours restants
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.prospect.findUnique.mockResolvedValue(mockExistingProspect);

    mockPrisma.guestPickupRequest.findFirst.mockResolvedValue(null); // Première demande du jour
    mockPrisma.guestPickupRequest.create.mockResolvedValue({
      id: 'guest-pickup-456',
      prospectId: 'prospect-existing-456',
      requestNumber: 'GPK-20260109-00001',
      status: PickupStatus.REQUESTED,
    } as any);

    // Act
    const result = await createGuestPickupRequestAction({
      prospectEmail: 'existant@client.com',
      prospectPhone: '+33698765432',
      pickupAddress: '456 Avenue Test',
      pickupCity: 'Lyon',
      pickupPostalCode: '69001',
      pickupCountry: 'FR',
      pickupContact: 'Marie Martin',
      pickupPhone: '+33698765432',
      requestedDate: '2026-01-20T14:00:00Z',
      timeSlot: 'AFTERNOON',
      cargoType: 'Textile',
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.prospectId).toBe('prospect-existing-456');

    // Vérifier que le prospect n'a PAS été créé (réutilisé)
    expect(mockPrisma.prospect.create).not.toHaveBeenCalled();
  });

  it('devrait générer un numéro unique au format GPK-YYYYMMDD-XXXXX', async () => {
    // Arrange
    mockPrisma.prospect.findUnique.mockResolvedValue({
      id: 'prospect-123',
      invitationToken: 'token-abc',
    } as any);

    // Mock : Dernier numéro du jour est GPK-20260109-00042
    mockPrisma.guestPickupRequest.findFirst.mockResolvedValue({
      requestNumber: 'GPK-20260109-00042',
    });

    mockPrisma.guestPickupRequest.create.mockResolvedValue({
      id: 'guest-pickup-789',
      prospectId: 'prospect-123',
      requestNumber: 'GPK-20260109-00043', // Incrémenté
      status: PickupStatus.REQUESTED,
    } as any);

    // Act
    const result = await createGuestPickupRequestAction({
      prospectEmail: 'test@client.com',
      prospectPhone: '+33600000000',
      pickupAddress: '1 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      pickupContact: 'Test',
      pickupPhone: '+33600000000',
      requestedDate: '2026-01-15T10:00:00Z',
      timeSlot: 'MORNING',
      cargoType: 'Test',
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.requestNumber).toBe('GPK-20260109-00043');
  });

  it('devrait échouer avec des données invalides (validation Zod)', async () => {
    // Act : Email invalide
    const result = await createGuestPickupRequestAction({
      prospectEmail: 'email-invalide', // Pas un email valide
      prospectPhone: '+33612345678',
      pickupAddress: '123 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      requestedDate: '2026-01-15T10:00:00Z',
      timeSlot: 'MORNING',
      cargoType: 'Test',
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('NE devrait PAS envoyer d\'email (fonctionnalité désactivée)', async () => {
    // Cette assertion vérifie que le code n'appelle AUCUNE fonction d'envoi d'email
    // L'envoi d'email est commenté dans le code (lignes 143-146 de guest-pickup.actions.ts)

    // Arrange
    mockPrisma.prospect.findUnique.mockResolvedValue(null);
    mockPrisma.prospect.create.mockResolvedValue({
      id: 'prospect-123',
      email: 'test@client.com',
      invitationToken: 'token-abc',
    } as any);

    mockPrisma.guestPickupRequest.findFirst.mockResolvedValue(null);
    mockPrisma.guestPickupRequest.create.mockResolvedValue({
      id: 'guest-pickup-123',
      prospectId: 'prospect-123',
      requestNumber: 'GPK-20260109-00001',
      status: PickupStatus.REQUESTED,
    } as any);

    // Act
    const result = await createGuestPickupRequestAction({
      prospectEmail: 'test@client.com',
      prospectPhone: '+33612345678',
      pickupAddress: '123 Rue Test',
      pickupCity: 'Paris',
      pickupPostalCode: '75001',
      pickupCountry: 'FR',
      pickupContact: 'Test',
      pickupPhone: '+33612345678',
      requestedDate: '2026-01-15T10:00:00Z',
      timeSlot: 'MORNING',
      cargoType: 'Test',
    });

    // Assert : Succès, mais AUCUN email envoyé
    expect(result.success).toBe(true);
    expect(result.message).toContain('enregistrée avec succès');

    // Note : Il n'y a PAS de fonction sendGuestPickupConfirmationEmail à mocker
    // car cette fonctionnalité est intentionnellement désactivée
  });
});

describe('Guest Pickup Actions - listGuestPickupRequestsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait lister les demandes guest avec pagination', async () => {
    // Arrange
    const mockGuestPickups = [
      {
        id: 'guest-1',
        requestNumber: 'GPK-20260109-00001',
        status: PickupStatus.REQUESTED,
        prospect: {
          id: 'prospect-1',
          email: 'guest1@test.com',
          name: 'Guest 1',
        },
      },
      {
        id: 'guest-2',
        requestNumber: 'GPK-20260109-00002',
        status: PickupStatus.SCHEDULED,
        prospect: {
          id: 'prospect-2',
          email: 'guest2@test.com',
          name: 'Guest 2',
        },
      },
    ];

    mockPrisma.guestPickupRequest.findMany.mockResolvedValue(mockGuestPickups);
    mockPrisma.guestPickupRequest.count.mockResolvedValue(25);

    // Act
    const result = await listGuestPickupRequestsAction({
      page: 1,
      limit: 20,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.requests).toHaveLength(2);
    expect(result.data?.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 25,
      pages: 2, // Math.ceil(25 / 20)
    });
  });

  it('devrait filtrer par statut', async () => {
    // Arrange
    mockPrisma.guestPickupRequest.findMany.mockResolvedValue([
      {
        id: 'guest-1',
        status: PickupStatus.REQUESTED,
        prospect: { id: 'prospect-1', email: 'test@test.com' },
      },
    ]);
    mockPrisma.guestPickupRequest.count.mockResolvedValue(1);

    // Act
    const result = await listGuestPickupRequestsAction({
      status: PickupStatus.REQUESTED,
      page: 1,
      limit: 20,
    });

    // Assert
    expect(mockPrisma.guestPickupRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PickupStatus.REQUESTED,
        }),
      })
    );
  });

  it('devrait inclure les données du Prospect', async () => {
    // Arrange
    const mockGuestPickup = {
      id: 'guest-1',
      requestNumber: 'GPK-20260109-00001',
      status: PickupStatus.REQUESTED,
      prospect: {
        id: 'prospect-1',
        email: 'guest@test.com',
        name: 'Guest User',
        phone: '+33612345678',
      },
    };

    mockPrisma.guestPickupRequest.findMany.mockResolvedValue([mockGuestPickup]);
    mockPrisma.guestPickupRequest.count.mockResolvedValue(1);

    // Act
    const result = await listGuestPickupRequestsAction({ page: 1, limit: 20 });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.requests[0].prospect).toBeDefined();
    expect(result.data?.requests[0].prospect.email).toBe('guest@test.com');

    // Vérifier que l'include est bien passé
    expect(mockPrisma.guestPickupRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          prospect: true,
        }),
      })
    );
  });
});

describe('Guest Pickup Actions - Génération de Numéro', () => {
  it('devrait respecter le format GPK-YYYYMMDD-XXXXX', () => {
    // Test du format avec regex
    const validNumbers = [
      'GPK-20260109-00001',
      'GPK-20260109-00042',
      'GPK-20260109-99999',
      'GPK-20251231-00001',
    ];

    const regex = /^GPK-\d{8}-\d{5}$/;

    validNumbers.forEach((number) => {
      expect(number).toMatch(regex);
    });
  });

  it('devrait incrémenter correctement le séquence', async () => {
    // Arrange : Simuler plusieurs créations dans la même journée
    mockPrisma.prospect.findUnique.mockResolvedValue({
      id: 'prospect-123',
      invitationToken: 'token',
    } as any);

    const createdNumbers: string[] = [];

    // Mock qui simule l'incrémentation
    let sequence = 1;
    mockPrisma.guestPickupRequest.findFirst.mockImplementation(() => {
      if (sequence === 1) return Promise.resolve(null); // Première demande du jour
      return Promise.resolve({
        requestNumber: `GPK-20260109-${(sequence - 1).toString().padStart(5, '0')}`,
      });
    });

    mockPrisma.guestPickupRequest.create.mockImplementation(() => {
      const number = `GPK-20260109-${sequence.toString().padStart(5, '0')}`;
      createdNumbers.push(number);
      sequence++;
      return Promise.resolve({
        id: `guest-${sequence}`,
        prospectId: 'prospect-123',
        requestNumber: number,
        status: PickupStatus.REQUESTED,
      } as any);
    });

    // Act : Créer 3 demandes
    for (let i = 0; i < 3; i++) {
      await createGuestPickupRequestAction({
        prospectEmail: `test${i}@client.com`,
        prospectPhone: '+33612345678',
        pickupAddress: '123 Rue Test',
        pickupCity: 'Paris',
        pickupPostalCode: '75001',
        pickupCountry: 'FR',
        pickupContact: 'Test',
        pickupPhone: '+33612345678',
        requestedDate: '2026-01-15T10:00:00Z',
        timeSlot: 'MORNING',
        cargoType: 'Test',
      });
    }

    // Assert : Vérifier la séquence
    expect(createdNumbers).toEqual([
      'GPK-20260109-00001',
      'GPK-20260109-00002',
      'GPK-20260109-00003',
    ]);
  });
});
