# Guide des Tests - Faso Fret Logistics v2

Ce document décrit la stratégie de tests, les outils utilisés, et comment exécuter les tests pour le projet Kmapin Logistics v2.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Stack de tests](#stack-de-tests)
3. [Installation](#installation)
4. [Exécution des tests](#exécution-des-tests)
5. [Structure des tests](#structure-des-tests)
6. [Tests des enlèvements (Pickups)](#tests-des-enlèvements-pickups)
7. [Pipeline CI/CD (Jenkins)](#pipeline-cicd-jenkins)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'ensemble

Le projet utilise **Vitest** comme framework de tests pour :
- Tests unitaires des Server Actions (logique métier)
- Tests d'intégration des composants React
- Tests de validation des schémas Zod
- Tests des access policies Zenstack (RBAC)

**Objectifs de couverture :**
- **70% minimum** pour les modules critiques (pickups, shipments, invoices)
- **80%+ recommandé** pour les Server Actions
- **60%+ acceptable** pour les composants UI

---

## 🛠️ Stack de tests

| Outil | Usage | Version |
|-------|-------|---------|
| **Vitest** | Framework de tests (compatible Jest) | ^4.0.16 |
| **@testing-library/react** | Tests de composants React | ^16.3.1 |
| **@testing-library/user-event** | Simulation d'interactions utilisateur | ^14.6.1 |
| **happy-dom** | Environnement DOM léger pour tests | ^20.1.0 |
| **@vitest/ui** | Interface graphique pour Vitest | ^4.0.16 |

---

## 📦 Installation

Les dépendances de tests sont déjà installées si vous avez exécuté `npm install`. Sinon :

```bash
npm install --save-dev vitest @vitest/ui @vitejs/plugin-react happy-dom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

---

## ▶️ Exécution des tests

### Commandes disponibles

```bash
# Exécuter tous les tests (mode CI)
npm run test

# Mode watch (développement) - relance automatiquement les tests modifiés
npm run test:watch

# Interface graphique Vitest (recommandé pour le développement)
npm run test:ui

# Tests avec rapport de couverture
npm run test:coverage

# Tests spécifiques aux enlèvements (pickups)
npm run test:pickups
```

### Exemples d'usage

#### Développement local
```bash
# Ouvrir l'interface graphique (recommandé)
npm run test:ui

# Ou mode watch en ligne de commande
npm run test:watch
```

#### Avant de commit
```bash
# Vérifier que tous les tests passent avec couverture
npm run test:coverage
```

#### CI/CD (Jenkins)
```bash
# Exécution complète avec rapport de couverture (utilisé par Jenkins)
npm run test:coverage
```

---

## 📁 Structure des tests

Les tests suivent la convention **`__tests__`** :

```
src/
├── modules/
│   └── pickups/
│       ├── actions/
│       │   ├── __tests__/
│       │   │   ├── pickup.actions.test.ts
│       │   │   ├── guest-pickup.actions.test.ts
│       │   │   └── pickup-status-history.actions.test.ts
│       │   ├── pickup.actions.ts
│       │   ├── guest-pickup.actions.ts
│       │   └── pickup-status-history.actions.ts
│       └── schemas/
│           └── pickup.schema.ts
│
└── components/
    └── pickups/
        ├── __tests__/
        │   ├── PickupStatusHistory.test.tsx
        │   └── pickup-request-public-form.test.tsx
        ├── PickupStatusHistory.tsx
        └── pickup-request-public-form.tsx
```

**Convention de nommage :**
- Fichiers de test : `*.test.ts` ou `*.test.tsx`
- Dossier : `__tests__/` dans chaque module/composant
- Nom de fichier : `[nom-du-fichier-testé].test.ts`

---

## 📦 Tests des enlèvements (Pickups)

### Tests des Server Actions

**Fichiers testés :**
- `pickup.actions.ts` : Création, mise à jour, annulation, liste des pickups
- `guest-pickup.actions.ts` : Pickups pour utilisateurs non connectés
- `pickup-status-history.actions.ts` : Historique des changements de statut

**Ce qui est testé :**
- ✅ Validation Zod des données d'entrée
- ✅ RBAC (permissions selon les rôles ADMIN, OPERATIONS_MANAGER, CLIENT)
- ✅ Génération de numéros uniques (GPK-YYYYMMDD-XXXXX)
- ✅ Enregistrement automatique de l'historique
- ✅ Gestion des cas d'erreur (shipment inexistant, données invalides)
- ✅ Création/réutilisation des Prospects
- ✅ Absence d'envoi d'emails pour les guests (fonctionnalité désactivée)

**Exemple de lancement :**
```bash
# Tous les tests Server Actions pickups
npm run test -- src/modules/pickups/actions/__tests__

# Un seul fichier
npm run test -- src/modules/pickups/actions/__tests__/pickup.actions.test.ts
```

### Tests des Composants UI

**Fichiers testés :**
- `PickupStatusHistory.tsx` : Timeline d'historique des statuts
- `pickup-request-public-form.tsx` : Formulaire public de demande

**Ce qui est testé :**
- ✅ Affichage des éléments (badges, timeline, champs)
- ✅ Validation côté client (React Hook Form + Zod)
- ✅ Pré-remplissage si utilisateur connecté
- ✅ Toasts de notification (success, error, invitation)
- ✅ Redirection après soumission
- ✅ États de chargement (bouton désactivé pendant soumission)
- ✅ Accessibilité (headings, labels, ARIA)

**Exemple de lancement :**
```bash
# Tous les tests de composants pickups
npm run test -- src/components/pickups/__tests__

# Un seul composant
npm run test -- src/components/pickups/__tests__/PickupStatusHistory.test.tsx
```

### Stratégie de mocking

#### Mocking des Server Actions
```typescript
// Mock de Prisma Enhanced (Zenstack RBAC)
const mockEnhancedPrisma = {
  pickupRequest: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/db/enhanced-client', () => ({
  getEnhancedPrismaFromSession: vi.fn(() => mockEnhancedPrisma),
}));
```

#### Mocking des hooks d'authentification
```typescript
// Mock de useSafeSession (mode connecté/non connecté)
let mockSession: any = null; // ou un objet session

vi.mock('@/lib/auth/hooks', () => ({
  useSafeSession: () => ({
    data: mockSession,
    status: mockSession ? 'authenticated' : 'unauthenticated',
  }),
}));
```

#### Mocking des toasts
```typescript
// Mock de sonner (notifications)
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: mockToast,
}));
```

---

## 🚀 Pipeline CI/CD (Jenkins)

### Configuration Jenkins

Le fichier `Jenkinsfile` à la racine du projet définit la pipeline complète :

**Stages de la pipeline :**
1. **Checkout** : Clone le code depuis Git
2. **Install Dependencies** : `npm ci` (installation propre)
3. **Generate Prisma & Zenstack** : `npm run db:generate`
4. **Lint** : `npm run lint` (ESLint)
5. **Run Tests** : `npm run test:coverage` (tous les tests)
6. **Run Pickup Tests** : `npm run test:pickups` (tests pickups isolés)
7. **Build** : `npm run build` (build Next.js)
8. **Security Audit** : `npm audit` (vulnérabilités)

### Variables d'environnement Jenkins

À configurer dans Jenkins (Credentials) :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL_TEST` | URL PostgreSQL de test | `postgresql://test:test@localhost:5432/kmapin_test` |
| `BETTER_AUTH_SECRET_TEST` | Secret pour Better Auth (tests) | Générer avec `openssl rand -base64 32` |
| `SLACK_WEBHOOK_URL` | Webhook Slack pour notifications (optionnel) | `https://hooks.slack.com/services/...` |

### Notifications

La pipeline envoie des notifications Slack (si configuré) :
- ✅ **Succès** : Message vert avec détails du commit
- ❌ **Échec** : Message rouge avec lien vers les logs
- ⚠️ **Instable** : Message orange (tests échoués mais build OK)

### Webhooks Git

Pour déclencher automatiquement la pipeline sur chaque push :

**GitHub :**
```
URL : http://your-jenkins-server/github-webhook/
Events : Push, Pull Request
```

**GitLab :**
```
URL : http://your-jenkins-server/project/kmapin-logistics
Events : Push, Merge Request
```

---

## ✅ Best Practices

### 1. Tests unitaires (Server Actions)

```typescript
describe('createPickupRequestAction', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Réinitialiser les mocks avant chaque test
  });

  it('devrait créer une demande avec données valides', async () => {
    // Arrange : Préparer les mocks
    mockEnhancedPrisma.shipment.findUnique.mockResolvedValue(mockShipment);
    mockEnhancedPrisma.pickupRequest.create.mockResolvedValue(mockPickupRequest);

    // Act : Appeler la fonction
    const result = await createPickupRequestAction(validData);

    // Assert : Vérifier le résultat
    expect(result.success).toBe(true);
    expect(mockEnhancedPrisma.pickupRequest.create).toHaveBeenCalled();
  });
});
```

### 2. Tests de composants React

```typescript
describe('PickupStatusHistory', () => {
  it('devrait afficher toutes les entrées', () => {
    // Arrange
    const mockHistory = [/* ... */];

    // Act
    render(<PickupStatusHistory history={mockHistory} />);

    // Assert : Vérifier le DOM
    expect(screen.getByText('Historique des Statuts')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### 3. Tests avec interactions utilisateur

```typescript
it('devrait soumettre le formulaire', async () => {
  const user = userEvent.setup();
  render(<PickupRequestPublicForm />);

  // Remplir les champs
  await user.type(screen.getByLabelText(/Email/i), 'test@test.com');
  await user.type(screen.getByLabelText(/Ville/i), 'Paris');

  // Soumettre
  await user.click(screen.getByRole('button', { name: /Envoyer/i }));

  // Vérifier l'appel de l'action
  await waitFor(() => {
    expect(mockCreateGuestPickupRequestAction).toHaveBeenCalled();
  });
});
```

### 4. Tests des cas d'erreur

```typescript
it('devrait gérer les erreurs de validation', async () => {
  // Act : Données invalides
  const result = await createPickupRequestAction({ invalidData: true });

  // Assert : Échec attendu
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
});
```

---

## 🐛 Troubleshooting

### Problème : Tests échouent avec "Cannot find module"

**Cause :** Les clients Prisma/Zenstack ne sont pas générés.

**Solution :**
```bash
npm run db:generate
```

### Problème : Tests échouent avec "Unauthorized" ou erreurs RBAC

**Cause :** Le mock de `getSession()` ou `requireAuth()` n'est pas configuré.

**Solution :**
```typescript
// Ajouter ce mock en début de fichier de test
vi.mock('@/lib/auth/config', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
  requireAuth: vi.fn(() => Promise.resolve(mockSession)),
}));
```

### Problème : Tests de composants échouent avec erreur de Router

**Cause :** `useRouter` de Next.js n'est pas mocké.

**Solution :**
```typescript
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));
```

### Problème : Timeout des tests (erreur après 5 secondes)

**Cause :** Un test attend une promesse qui ne se résout jamais.

**Solution :**
```typescript
// Augmenter le timeout pour ce test spécifique
it('long test', async () => {
  // ...
}, { timeout: 10000 }); // 10 secondes au lieu de 5
```

### Problème : Couverture de code insuffisante

**Cause :** Certains cas ne sont pas testés (branches if/else, cas d'erreur).

**Solution :**
```bash
# Voir le rapport détaillé
npm run test:coverage
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
```

Puis ajouter des tests pour les lignes non couvertes (surlignées en rouge).

---

## 📊 Rapports de tests

### Rapport de couverture

Après `npm run test:coverage`, ouvrir :
```
coverage/lcov-report/index.html
```

**Fichiers générés :**
- `coverage/lcov.info` : Format LCOV (compatible CI/CD)
- `coverage/coverage-summary.json` : Résumé JSON
- `coverage/lcov-report/` : Rapport HTML interactif

### Rapport de tests (format JUnit)

Pour intégration Jenkins/CI :
```bash
# Générer le rapport JUnit
npm run test -- --reporter=junit --outputFile=test-results/junit.xml
```

---

## 🔗 Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
- [Jest Matchers (compatibles Vitest)](https://jestjs.io/docs/expect)

---

## ✉️ Support

En cas de problème avec les tests :
1. Vérifier ce guide de troubleshooting
2. Consulter les logs Jenkins (si CI/CD)
3. Ouvrir une issue dans le repository avec :
   - Commande exécutée
   - Message d'erreur complet
   - Version de Node.js (`node --version`)
   - Système d'exploitation

---

**Dernière mise à jour :** 2026-01-09
**Version Vitest :** 4.0.16
**Contact :** Équipe DevOps Faso Fret Logistics
