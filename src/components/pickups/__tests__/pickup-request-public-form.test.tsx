/**
 * Tests pour le formulaire public de demande d'enlèvement
 *
 * Tests du composant PickupRequestPublicForm :
 * - Affichage des champs du formulaire
 * - Validation côté client (React Hook Form + Zod)
 * - Pré-remplissage si utilisateur connecté
 * - Soumission du formulaire
 * - Notifications toast (success, error, invitation)
 * - Redirection selon le mode (connecté/non connecté)
 *
 * Stratégie de test :
 * - Mock de useSafeSession pour tester les deux modes
 * - Mock de createGuestPickupRequestAction (Server Action)
 * - User events pour simuler les interactions
 * - Vérification des toasts (sonner)
 *
 * @module components/pickups/__tests__/pickup-request-public-form
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PickupRequestPublicForm } from '../pickup-request-public-form';

/**
 * Mock de next/navigation
 */
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

/**
 * Mock de useSafeSession
 * Permet de tester le mode connecté et non connecté
 */
let mockSession: any = null;

vi.mock('@/lib/auth/hooks', () => ({
  useSafeSession: () => ({
    data: mockSession,
    status: mockSession ? 'authenticated' : 'unauthenticated',
  }),
}));

/**
 * Mock de la Server Action
 */
const mockCreateGuestPickupRequestAction = vi.fn();

vi.mock('@/modules/pickups/actions/guest-pickup.actions', () => ({
  createGuestPickupRequestAction: (...args: any[]) =>
    mockCreateGuestPickupRequestAction(...args),
}));

/**
 * Mock de sonner (toast notifications)
 */
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: mockToast,
}));

describe('PickupRequestPublicForm - Affichage initial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null; // Mode non connecté par défaut
  });

  it('devrait afficher tous les champs requis', () => {
    // Act
    render(<PickupRequestPublicForm />);

    // Assert : Vérifier les sections principales
    expect(screen.getByText('Vos Coordonnées')).toBeInTheDocument();
    expect(screen.getByText('Adresse d\'enlèvement')).toBeInTheDocument();
    expect(screen.getByText('Planification')).toBeInTheDocument();
    expect(screen.getByText('Détails de la Marchandise')).toBeInTheDocument();

    // Assert : Vérifier les champs requis (*)
    expect(screen.getByLabelText(/Email.*\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Téléphone.*\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse complète.*\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ville.*\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Code postal.*\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date souhaitée.*\*/i)).toBeInTheDocument();
  });

  it('devrait afficher le bouton de soumission', () => {
    // Act
    render(<PickupRequestPublicForm />);

    // Assert
    expect(screen.getByRole('button', { name: /Envoyer la Demande/i })).toBeInTheDocument();
  });

  it('devrait afficher "* Champs obligatoires"', () => {
    // Act
    render(<PickupRequestPublicForm />);

    // Assert
    expect(screen.getByText('* Champs obligatoires')).toBeInTheDocument();
  });
});

describe('PickupRequestPublicForm - Mode non connecté', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null; // Non connecté
  });

  it('devrait permettre de saisir l\'email (non disabled)', () => {
    // Act
    render(<PickupRequestPublicForm />);

    // Assert
    const emailInput = screen.getByLabelText(/Email.*\*/i) as HTMLInputElement;
    expect(emailInput).toBeEnabled();
  });

  it('ne devrait PAS pré-remplir les champs', () => {
    // Act
    render(<PickupRequestPublicForm />);

    // Assert : Les champs sont vides
    const emailInput = screen.getByLabelText(/Email.*\*/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/Nom complet/i) as HTMLInputElement;

    expect(emailInput.value).toBe('');
    expect(nameInput.value).toBe('');
  });
});

describe('PickupRequestPublicForm - Mode connecté', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {
      user: {
        id: 'user-123',
        email: 'connecte@test.com',
        name: 'Utilisateur Connecté',
        role: 'CLIENT',
        companyId: 'company-123',
      },
      session: {
        id: 'session-123',
        token: 'token-abc',
      },
    };
  });

  it('devrait pré-remplir l\'email et le nom', () => {
    // Act
    render(<PickupRequestPublicForm />);

    // Assert
    const emailInput = screen.getByLabelText(/Email.*\*/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/Nom complet/i) as HTMLInputElement;

    expect(emailInput.value).toBe('connecte@test.com');
    expect(nameInput.value).toBe('Utilisateur Connecté');
  });

  it('devrait désactiver le champ email (disabled)', () => {
    // Act
    render(<PickupRequestPublicForm />);

    // Assert
    const emailInput = screen.getByLabelText(/Email.*\*/i) as HTMLInputElement;
    expect(emailInput).toBeDisabled();
  });
});

describe('PickupRequestPublicForm - Validation côté client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('devrait afficher une erreur si email invalide', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PickupRequestPublicForm />);

    // Act : Saisir un email invalide
    const emailInput = screen.getByLabelText(/Email.*\*/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'email-invalide');

    // Soumettre le formulaire
    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert : Attendre le message d'erreur de validation Zod
    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });
  });

  it('devrait empêcher la soumission si champs requis manquants', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PickupRequestPublicForm />);

    // Act : Soumettre sans remplir les champs
    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert : createGuestPickupRequestAction ne doit PAS être appelé
    expect(mockCreateGuestPickupRequestAction).not.toHaveBeenCalled();
  });
});

describe('PickupRequestPublicForm - Soumission (mode non connecté)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('devrait appeler createGuestPickupRequestAction avec les bonnes données', async () => {
    // Arrange
    const user = userEvent.setup();
    mockCreateGuestPickupRequestAction.mockResolvedValue({
      success: true,
      data: {
        prospectId: 'prospect-123',
        requestNumber: 'GPK-20260109-00001',
        guestPickupId: 'guest-123',
        invitationToken: 'token-abc',
      },
      message: 'Demande enregistrée',
    });

    render(<PickupRequestPublicForm />);

    // Act : Remplir les champs obligatoires
    await user.type(screen.getByLabelText(/Email.*\*/i), 'test@client.com');
    await user.type(screen.getByLabelText(/Téléphone.*\*/i), '+33612345678');
    await user.type(screen.getByLabelText(/Adresse complète.*\*/i), '123 Rue Test');
    await user.type(screen.getByLabelText(/Ville.*\*/i), 'Paris');
    await user.type(screen.getByLabelText(/Code postal.*\*/i), '75001');
    await user.type(screen.getByLabelText(/Date souhaitée.*\*/i), '2026-01-15T10:00');
    await user.type(screen.getByLabelText(/Type de marchandise.*\*/i), 'Electronics');

    // Soumettre
    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert : Attendre l'appel de l'action
    await waitFor(() => {
      expect(mockCreateGuestPickupRequestAction).toHaveBeenCalledWith(
        expect.objectContaining({
          prospectEmail: 'test@client.com',
          prospectPhone: '+33612345678',
          pickupAddress: '123 Rue Test',
          pickupCity: 'Paris',
          pickupPostalCode: '75001',
          cargoType: 'Electronics',
        })
      );
    });
  });

  it('devrait afficher les toasts de succès avec numéro de demande', async () => {
    // Arrange
    const user = userEvent.setup();
    mockCreateGuestPickupRequestAction.mockResolvedValue({
      success: true,
      data: {
        prospectId: 'prospect-123',
        requestNumber: 'GPK-20260109-00042',
        guestPickupId: 'guest-123',
        invitationToken: 'token-abc',
      },
      message: 'Demande enregistrée avec succès',
    });

    render(<PickupRequestPublicForm />);

    // Act : Remplir et soumettre (version courte)
    await user.type(screen.getByLabelText(/Email.*\*/i), 'test@client.com');
    await user.type(screen.getByLabelText(/Téléphone.*\*/i), '+33612345678');
    await user.type(screen.getByLabelText(/Adresse complète.*\*/i), '123 Rue Test');
    await user.type(screen.getByLabelText(/Ville.*\*/i), 'Paris');
    await user.type(screen.getByLabelText(/Code postal.*\*/i), '75001');
    await user.type(screen.getByLabelText(/Date souhaitée.*\*/i), '2026-01-15T10:00');
    await user.type(screen.getByLabelText(/Type de marchandise.*\*/i), 'Test');

    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert : Vérifier les toasts
    await waitFor(() => {
      // Toast success avec numéro
      expect(mockToast.success).toHaveBeenCalledWith(
        'Votre demande d\'enlèvement a été enregistrée avec succès !',
        expect.objectContaining({
          description: 'Numéro de demande : GPK-20260109-00042',
          duration: 8000,
        })
      );

      // Toast info avec invitation
      expect(mockToast.info).toHaveBeenCalledWith(
        'Créez un compte pour suivre l\'état de votre demande en temps réel',
        expect.objectContaining({
          description: 'Vous pourrez consulter l\'historique et recevoir des notifications',
          duration: 10000,
          action: expect.objectContaining({
            label: 'Créer un compte',
          }),
        })
      );
    });
  });

  it('devrait afficher un toast d\'erreur en cas d\'échec', async () => {
    // Arrange
    const user = userEvent.setup();
    mockCreateGuestPickupRequestAction.mockResolvedValue({
      success: false,
      error: 'Erreur de création',
    });

    render(<PickupRequestPublicForm />);

    // Act : Remplir et soumettre
    await user.type(screen.getByLabelText(/Email.*\*/i), 'test@client.com');
    await user.type(screen.getByLabelText(/Téléphone.*\*/i), '+33612345678');
    await user.type(screen.getByLabelText(/Adresse complète.*\*/i), '123 Rue Test');
    await user.type(screen.getByLabelText(/Ville.*\*/i), 'Paris');
    await user.type(screen.getByLabelText(/Code postal.*\*/i), '75001');
    await user.type(screen.getByLabelText(/Date souhaitée.*\*/i), '2026-01-15T10:00');
    await user.type(screen.getByLabelText(/Type de marchandise.*\*/i), 'Test');

    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Erreur de création');
    });
  });
});

describe('PickupRequestPublicForm - Soumission (mode connecté)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {
      user: {
        id: 'user-123',
        email: 'connecte@test.com',
        name: 'Utilisateur Connecté',
        role: 'CLIENT',
        companyId: 'company-123',
      },
      session: {
        id: 'session-123',
        token: 'token-abc',
      },
    };
  });

  it('devrait rediriger vers /dashboard/pickups après succès', async () => {
    // Arrange
    const user = userEvent.setup();
    mockCreateGuestPickupRequestAction.mockResolvedValue({
      success: true,
      data: { requestNumber: 'GPK-20260109-00001' },
      message: 'Demande enregistrée',
    });

    render(<PickupRequestPublicForm />);

    // Act : Remplir et soumettre (les champs email/nom sont déjà pré-remplis)
    await user.type(screen.getByLabelText(/Adresse complète.*\*/i), '123 Rue Test');
    await user.type(screen.getByLabelText(/Ville.*\*/i), 'Paris');
    await user.type(screen.getByLabelText(/Code postal.*\*/i), '75001');
    await user.type(screen.getByLabelText(/Date souhaitée.*\*/i), '2026-01-15T10:00');
    await user.type(screen.getByLabelText(/Type de marchandise.*\*/i), 'Test');

    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert : Redirection vers dashboard
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/pickups');
    });
  });

  it('devrait afficher des toasts différents pour utilisateur connecté', async () => {
    // Arrange
    const user = userEvent.setup();
    mockCreateGuestPickupRequestAction.mockResolvedValue({
      success: true,
      data: { requestNumber: 'GPK-20260109-00001' },
      message: 'Demande enregistrée !',
    });

    render(<PickupRequestPublicForm />);

    // Act
    await user.type(screen.getByLabelText(/Adresse complète.*\*/i), '123 Rue Test');
    await user.type(screen.getByLabelText(/Ville.*\*/i), 'Paris');
    await user.type(screen.getByLabelText(/Code postal.*\*/i), '75001');
    await user.type(screen.getByLabelText(/Date souhaitée.*\*/i), '2026-01-15T10:00');
    await user.type(screen.getByLabelText(/Type de marchandise.*\*/i), 'Test');

    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert : Toasts pour utilisateur connecté (sans invitation)
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Demande enregistrée !');
      expect(mockToast.info).toHaveBeenCalledWith(
        'Votre demande est visible dans votre tableau de bord'
      );

      // Ne devrait PAS afficher l'invitation à créer un compte
      expect(mockToast.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Créez un compte')
      );
    });
  });
});

describe('PickupRequestPublicForm - État de chargement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('devrait désactiver le bouton pendant la soumission', async () => {
    // Arrange
    const user = userEvent.setup();
    mockCreateGuestPickupRequestAction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
    );

    render(<PickupRequestPublicForm />);

    // Act : Remplir et soumettre
    await user.type(screen.getByLabelText(/Email.*\*/i), 'test@client.com');
    await user.type(screen.getByLabelText(/Téléphone.*\*/i), '+33612345678');
    await user.type(screen.getByLabelText(/Adresse complète.*\*/i), '123 Rue Test');
    await user.type(screen.getByLabelText(/Ville.*\*/i), 'Paris');
    await user.type(screen.getByLabelText(/Code postal.*\*/i), '75001');
    await user.type(screen.getByLabelText(/Date souhaitée.*\*/i), '2026-01-15T10:00');
    await user.type(screen.getByLabelText(/Type de marchandise.*\*/i), 'Test');

    const submitButton = screen.getByRole('button', { name: /Envoyer la Demande/i });
    await user.click(submitButton);

    // Assert : Bouton désactivé + texte changé
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Envoi en cours...')).toBeInTheDocument();
  });
});
