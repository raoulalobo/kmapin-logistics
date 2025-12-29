# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

**Faso Fret Logistics v2** - Plateforme de gestion logistique pour transport multi-modal (routier, maritime, aérien, ferroviaire).

## Stack Technique Clé

- **Next.js 16** avec App Router et React 19
- **TypeScript** strict mode activé
- **Prisma** + **Zenstack** pour ORM et Access Control (RBAC)
- **Better Auth** pour l'authentification
- **TanStack Query** pour state management serveur
- **shadcn/ui** + **TailwindCSS** pour l'interface
- **Backblaze B2** pour le stockage de fichiers
- **Inngest** pour les jobs asynchrones

## Architecture du Code

### Structure Générale

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Routes authentification (login, register, reset-password)
│   ├── (dashboard)/         # Routes dashboard protégées
│   └── api/                 # API Routes (auth, pdf, inngest)
├── modules/                  # Modules métier avec actions et schémas
│   ├── clients/
│   ├── shipments/
│   ├── invoices/
│   ├── quotes/
│   ├── users/
│   └── tracking/
├── components/               # Composants React
│   ├── ui/                  # shadcn/ui components
│   └── [feature]/           # Composants par feature
├── lib/                      # Bibliothèques et configurations
│   ├── db/                  # Prisma client standard et enhanced (Zenstack)
│   ├── auth/                # Configuration Better Auth
│   ├── storage/             # Backblaze B2
│   ├── pdf/                 # Génération PDF
│   └── inngest/             # Jobs asynchrones
└── generated/                # Code généré par Prisma et Zenstack
```

### Patterns Architecturaux Importants

#### 1. Access Control avec Zenstack

**CRITIQUE** : Ce projet utilise **Zenstack** pour appliquer automatiquement les règles d'accès RBAC définies dans `schema.zmodel`.

- **Fichier source** : `schema.zmodel` (PAS `prisma/schema.prisma`)
- **Client Enhanced** : Toujours utiliser `getEnhancedPrisma()` depuis `src/lib/db/enhanced-client.ts` dans les Server Actions
- **Client Standard** : `prisma` depuis `src/lib/db/client.ts` est utilisé UNIQUEMENT pour les scripts et migrations

**Workflow de modification du schéma** :
```bash
# 1. Modifier schema.zmodel (PAS schema.prisma)
# 2. Générer les clients
npm run db:generate
# 3. Pousser vers la DB
npm run db:push
```

**Exemple d'utilisation dans une Server Action** :
```typescript
import { getSession } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';

export async function listShipments() {
  'use server';

  const session = await getSession();
  if (!session?.user) throw new Error('Unauthorized');

  // Le client enhanced applique automatiquement les access policies
  // Un CLIENT verra uniquement les shipments de sa company
  // Un ADMIN verra tous les shipments
  const db = getEnhancedPrismaFromSession(session);
  const shipments = await db.shipment.findMany();

  return shipments;
}
```

#### 2. Organisation des Modules Métier

Chaque module suit cette structure standardisée :
```
modules/[feature]/
├── actions/           # Server Actions (functions marquées 'use server')
│   └── [feature].actions.ts
├── schemas/           # Schémas Zod pour validation de formulaires
│   └── [feature].schema.ts
└── index.ts           # Exports publics du module
```

**Convention** : Les Server Actions sont toujours préfixées par un verbe d'action (ex: `createShipment`, `updateInvoice`, `deleteQuote`).

#### 3. Authentification Better Auth

Better Auth gère l'authentification avec plusieurs providers :
- Email/Password (avec vérification d'email obligatoire)
- OAuth (Google, Microsoft)
- 2FA/MFA

**Helpers d'authentification** (`src/lib/auth/config.ts`) :
```typescript
import { getSession, requireAuth, requireAdmin } from '@/lib/auth/config';

// Récupérer la session (nullable)
const session = await getSession();

// Exiger l'authentification (throw si non authentifié)
const session = await requireAuth();

// Exiger le rôle ADMIN (throw si pas admin)
const session = await requireAdmin();
```

**Session enrichie** : La session contient automatiquement les champs `role` et `companyId` grâce à la configuration `additionalFields` de Better Auth.

#### 4. Rôles et Permissions (RBAC)

Système de rôles défini dans `schema.zmodel` :

| Rôle | Description | Accès |
|------|-------------|-------|
| `ADMIN` | Administrateur système | Accès complet à toutes les données |
| `OPERATIONS_MANAGER` | Gestionnaire des opérations | Création/modification des expéditions, tracking, transporteurs |
| `FINANCE_MANAGER` | Gestionnaire financier | Gestion factures/devis, lecture expéditions |
| `CLIENT` | Client externe | Lecture uniquement des données de sa company |
| `VIEWER` | Observateur | Lecture limitée |

**Important** : Les access policies sont définies dans `schema.zmodel` avec `@@allow()` et `@@deny()` et appliquées automatiquement par Zenstack.

## Commandes de Développement

### Développement Local
```bash
# Démarrer le serveur de développement (port 3000 par défaut)
npm run dev

# Si le port 3000 est occupé, utiliser un port alternatif
PORT=3001 npm run dev
```

### Base de Données
```bash
# Générer les clients Prisma et Zenstack (TOUJOURS FAIRE APRÈS MODIFICATION DU SCHEMA)
npm run db:generate

# Pousser le schéma vers la base de données
npm run db:push

# Ouvrir Prisma Studio (interface graphique DB)
npm run db:studio

# Seed la base de données (si configuré)
npm run db:seed
```

### Gestion des Utilisateurs
```bash
# Créer un utilisateur administrateur
npm run create-admin

# Avec des paramètres personnalisés
EMAIL="admin@example.com" PASSWORD="MyPassword123!" NAME="Admin Name" npm run create-admin

# Réinitialiser le mot de passe d'un admin
npm run reset-admin-password
```

### Build et Production
```bash
# Vérifier les erreurs ESLint
npm run lint

# Build de production
npm run build

# Démarrer le serveur de production
npm run start
```

## Conventions de Code

### TypeScript
- **Mode strict activé** : Tous les types doivent être explicites
- **Path alias** : Utiliser `@/` pour importer depuis `src/`
- **Target ES2017** pour compatibilité

### Server Actions
- Toujours utiliser la directive `'use server'` en première ligne
- Toujours vérifier l'authentification avec `getSession()` ou `requireAuth()`
- Utiliser `getEnhancedPrisma()` pour bénéficier de l'access control automatique
- Préfixer les noms par un verbe d'action (create, update, delete, list, get)

**Exemple type** :
```typescript
'use server';

import { requireAuth } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
import { createShipmentSchema } from '../schemas/shipment.schema';

export async function createShipment(data: unknown) {
  const session = await requireAuth();
  const db = getEnhancedPrismaFromSession(session);

  // Valider avec Zod
  const validated = createShipmentSchema.parse(data);

  // Créer avec access control automatique
  const shipment = await db.shipment.create({
    data: validated,
  });

  return shipment;
}
```

### Composants React
- **Server Components par défaut** dans l'App Router
- **'use client'** uniquement si nécessaire (hooks, interactivité, browser APIs)
- **Préférer les Server Actions** aux API Routes pour les mutations
- Utiliser **shadcn/ui** pour les composants UI standards

### Validation de Formulaires
- **React Hook Form** + **Zod** pour tous les formulaires
- Schémas Zod dans `modules/[feature]/schemas/`
- Réutiliser les schémas côté client ET serveur

## Stockage de Fichiers

Le projet utilise **Backblaze B2** (compatible S3) :
- Configuration dans `src/lib/storage/backblaze.ts`
- Upload côté serveur via Server Actions
- Variables d'environnement requises (voir `.env.example`)

## Génération de PDF

Bibliothèques utilisées :
- `jspdf` + `jspdf-autotable` pour factures et devis
- Templates dans `src/lib/pdf/`
- API Route : `/api/pdf/[type]/[id]` pour télécharger les PDF

## Tests

Actuellement, aucun framework de tests n'est configuré. Pour ajouter des tests, installer :
- `vitest` ou `jest` pour les tests unitaires
- `@testing-library/react` pour les tests de composants
- `playwright` pour les tests E2E

## Variables d'Environnement Critiques

**Obligatoires** :
- `DATABASE_URL` : Connexion PostgreSQL
- `BETTER_AUTH_SECRET` : Secret pour JWT (générer avec `openssl rand -base64 32`)
- `BETTER_AUTH_URL` : URL de base de l'application

**Stockage Backblaze** (si utilisé) :
- `NEXT_PUBLIC_BACKBLAZE_ENDPOINT`
- `NEXT_PUBLIC_BACKBLAZE_REGION`
- `NEXT_PUBLIC_BACKBLAZE_BUCKET_NAME`
- `BACKBLAZE_ACCESS_KEY_ID` (privé, serveur uniquement)
- `BACKBLAZE_SECRET_ACCESS_KEY` (privé, serveur uniquement)

**OAuth** (optionnel) :
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`

## Dépannage Courant

### Problème : "Failed to fetch dynamically imported module"
- Vérifier que toutes les dépendances sont installées : `npm install`
- Supprimer `.next` et rebuilder : `rm -rf .next && npm run dev`
- Vérifier la version de Next.js dans `package.json`

### Problème : Access policies ne fonctionnent pas
- Vérifier que vous utilisez `getEnhancedPrisma()` et PAS `prisma` directement
- Vérifier que la session contient bien `user.role` et `user.companyId`
- Relancer `npm run db:generate` après modification de `schema.zmodel`

### Problème : Port déjà utilisé
- Identifier le processus : `lsof -i :3000`
- Tuer le processus : `kill -9 <PID>`
- Ou utiliser un autre port : `PORT=3001 npm run dev`

## Déploiement

Le projet est configuré pour **Vercel** :
- Utiliser `vercel --prod --yes` pour déployer
- Configurer toutes les variables d'environnement dans le dashboard Vercel
- La base de données doit être accessible depuis Vercel (ex: Neon, Supabase, Railway)

## Ressources

- [Next.js App Router](https://nextjs.org/docs/app)
- [Zenstack Documentation](https://zenstack.dev) - Access Control avec Prisma
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Prisma Documentation](https://www.prisma.io/docs)
