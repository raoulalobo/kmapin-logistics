# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⛔ Règle d'or — BLOQUANTE (priorité maximale)

**Aucune modification de code (Edit, Write) n'est autorisée** sans avoir complété ces étapes dans l'ordre :

1. **Identifier** les skills concernés (cf. tableau "Consultation des skills" plus bas)
2. **Invoquer** chaque skill pertinent avec l'outil `Skill` et lire ses règles
3. **Créer un fichier plan** dans `.claude/plans/plan-<objectif>.md` via le skill `plan-management` (avec permission utilisateur)
4. **Lire** les fichiers impactés (vérifier types, interfaces, dépendances)
5. **Puis seulement** implémenter

**Exception unique** : correction triviale touchant **1 seul fichier** ET **≤ 3 lignes modifiées** ET ne nécessitant aucune décision d'architecture. Dans ce cas, les étapes 1-3 peuvent être omises, mais l'étape 4 reste obligatoire.

**Rappels critiques** :
- Un plan fourni dans un message utilisateur ≠ un fichier plan dans `.claude/plans/`
- Les skills ne s'invoquent **jamais implicitement** — toujours utiliser l'outil `Skill` explicitement
- La perception de simplicité d'une tâche **ne justifie pas** de court-circuiter ce processus

## Projet

**Faso Fret Logistics v2** - Plateforme de gestion logistique pour transport multi-modal (routier, maritime, aérien, ferroviaire).

## Stack Technique Clé

- **Next.js 16** avec App Router et React 19
- **TypeScript** strict mode activé
- **Prisma** + **Zenstack** pour ORM et Access Control (RBAC)
- **Better Auth** pour l'authentification
- **TanStack Query** pour state management serveur
- **Zustand** + **Immer** pour state management client (UI, formulaires complexes)
- **Zod v4** pour validation de données (client + serveur)
- **shadcn/ui** + **TailwindCSS** pour l'interface
- **Resend** + **React Email** pour l'envoi d'emails transactionnels
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
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Zod v4 Documentation](https://zod.dev)
- [React Email Documentation](https://react.email/docs)
- [Resend Documentation](https://resend.com/docs)

---

## Skills Agent (Claude Code)

Le projet dispose de **9 skills** installés dans `.claude/skills/` (symlinks vers `.agents/skills/`). Ces skills fournissent des guidelines automatiques selon le contexte de travail.

### Liste des skills installés

| Skill | Quand le consulter |
|-------|-------------------|
| `plan-management` | Création/modification de fichiers dans `.claude/plans/` — nommage descriptif, permission obligatoire, relations entre plans |
| `next-best-practices` | Écriture de code Next.js — App Router, RSC, metadata, optimisation images, route handlers |
| `vercel-react-best-practices` | Composants React — éviter waterfalls, optimiser bundle, Server Components, re-renders |
| `vercel-composition-patterns` | Refactoring composants — compound components, state lifting, dependency injection |
| `better-auth-best-practices` | Configuration auth — sessions, plugins (2FA, org, passkey), pièges courants |
| `supabase-postgres-best-practices` | Optimisation DB — requêtes, indexes, connexions, RLS, locking |
| `frontend-design` | Design UI — direction esthétique claire, éviter "AI slop", typographie, animations |
| `ui-ux-pro-max` | Design system — 50 styles, 97 palettes, 57 font pairings, checklist pré-livraison |
| `agent-browser` | Tests navigateur — automatisation, scraping, capture screenshots |

### Commande d'installation d'un skill

```bash
# Installer un skill depuis un repo GitHub (flag -y pour non-interactif)
npx skills add https://github.com/<org>/<repo> --skill <skill-name> -y

# Exemples utilisés dans ce projet :
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices -y
npx skills add https://github.com/better-auth/skills --skill better-auth-best-practices -y
npx skills add https://github.com/vercel-labs/next-skills --skill next-best-practices -y
```

### Règle de gestion des plans

Conformément au skill `plan-management`, chaque fichier de plan dans `.claude/plans/` doit :
- Avoir un **nom descriptif** en kebab-case (ex: `plan-stack-skills-guidelines.md`)
- Suivre le **template obligatoire** (Contexte, Objectif, Plans en relation, Architecture, Étapes, Vérification)
- Obtenir la **permission utilisateur** avant création, écrasement ou suppression

---

## Guidelines Zustand + Immer

### Quand utiliser Zustand (vs TanStack Query)

| Cas d'usage | Outil |
|-------------|-------|
| Données serveur (listes, détails, pagination) | **TanStack Query** (déjà en place) |
| État UI global (sidebar, modals, thème, toasts) | **Zustand** |
| État formulaire complexe multi-étapes | **Zustand** + Immer |
| État éphémère local à un composant | **useState** classique |

### Conventions de nommage

- Fichiers stores : `src/lib/store/use-<domaine>-store.ts`
- Hook export : `use<Domaine>Store` (ex: `useUiStore`, `useQuoteFormStore`)
- Actions préfixées par verbe : `setSidebarOpen`, `addNotification`, `resetForm`

### Pattern de base avec Immer

```typescript
// src/lib/store/use-ui-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface UiState {
  sidebarOpen: boolean;
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

// Immer permet de muter directement le state dans les actions
// Au lieu de : set((state) => ({ ...state, sidebarOpen: true }))
// On écrit : set((state) => { state.sidebarOpen = true })
export const useUiStore = create<UiState>()(
  immer((set) => ({
    sidebarOpen: true,
    setSidebarOpen: (open) => set((state) => { state.sidebarOpen = open }),
    toggleSidebar: () => set((state) => { state.sidebarOpen = !state.sidebarOpen }),
  }))
);
```

### Règles d'utilisation

- **JAMAIS** stocker des données serveur dans Zustand — utiliser TanStack Query
- **Toujours** utiliser le middleware `immer` pour les stores avec état imbriqué
- **Sélecteurs atomiques** : `useUiStore((s) => s.sidebarOpen)` plutôt que `useUiStore()` (évite re-renders inutiles)
- **Pas de logique async** dans les stores — les appels API restent dans les Server Actions

---

## Guidelines Zod v4

### Différences clés avec Zod v3

Le projet utilise **Zod v4** (`^4.1.13`). Points d'attention :

| Zod v3 (ancien) | Zod v4 (actuel) |
|------------------|------------------|
| `z.string().min(1, { message: "..." })` | `z.string().min(1, "...")` (message inline simplifié) |
| `z.object({}).strict()` | `z.object({}).strict()` (inchangé) |
| `z.enum(["A", "B"])` | `z.enum(["A", "B"])` (inchangé) |
| `zodResolver(schema)` | `zodResolver(schema)` (compatible via `@hookform/resolvers`) |
| Erreurs TS `required_error` | **Connu** — erreurs TS2353 pré-existantes, non bloquantes |

### Conventions du projet

- Schémas dans `modules/[feature]/schemas/[feature].schema.ts`
- Nommer les schémas : `create<Feature>Schema`, `update<Feature>Schema`
- Réutiliser le même schéma côté client (validation formulaire) ET serveur (Server Action)
- Pattern extraction de type : `type CreateShipment = z.infer<typeof createShipmentSchema>`

### Exemple complet

```typescript
// modules/quotes/schemas/quote.schema.ts
import { z } from 'zod';

// Schéma d'un package individuel
export const packageSchema = z.object({
  description: z.string().optional(),
  quantity: z.number().int().min(1, "Minimum 1"),
  cargoType: z.enum(["GENERAL", "FRAGILE", "DANGEROUS", "PERISHABLE", "OVERSIZED"]),
  weight: z.number().positive("Le poids doit être positif"),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

// Extraction du type pour usage dans les composants
export type PackageInput = z.infer<typeof packageSchema>;
```

---

## Guidelines Zenstack (Access Control)

### Principes fondamentaux

- **Source de vérité** : `schema.zmodel` (JAMAIS modifier `prisma/schema.prisma` directement)
- **Client Enhanced** : `getEnhancedPrismaFromSession(session)` dans TOUTES les Server Actions
- **Client Standard** : `prisma` uniquement pour scripts, seeds, migrations

### Workflow de modification

```bash
# 1. Modifier schema.zmodel
# 2. Générer les clients (Zenstack + Prisma)
npm run db:generate
# 3. Pousser le schéma vers la DB
npm run db:push
```

### Patterns access policies

```zmodel
// Lecture : tout le monde authentifié
@@allow('read', auth() != null)

// CRUD complet pour les admins
@@allow('all', auth().role == ADMIN)

// Lecture filtrée par company pour les clients
@@allow('read', auth().role == CLIENT && auth().companyId == companyId)

// Cascade sur relation parent
// Les policies du QuotePackage héritent du Quote via la relation
@@allow('read', auth().role == CLIENT && quote.clientId == auth().clientId)
```

### Pièges courants

- Oublier `npm run db:generate` après modification → les types TypeScript ne correspondent pas
- Utiliser `prisma` au lieu de `getEnhancedPrisma()` → bypass des access policies
- Ne pas inclure `auth()` dans les policies → accès refusé partout

---

## Guidelines Better Auth

### Configuration actuelle

- Email/Password avec vérification obligatoire
- OAuth (Google, Microsoft)
- Session enrichie avec `role` et `companyId` (via `additionalFields`)
- Helpers : `getSession()`, `requireAuth()`, `requireAdmin()`

### Patterns importants

```typescript
// Récupérer la session dans un Server Component ou Server Action
const session = await getSession();
// session.user contient : id, email, name, role, companyId

// Protéger une Server Action (throw si non authentifié)
const session = await requireAuth();

// Protéger une route admin (throw si pas ADMIN)
const session = await requireAdmin();
```

### Variables d'environnement

```env
BETTER_AUTH_SECRET=<générer avec openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
# OAuth (optionnel)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

Consulter le skill `better-auth-best-practices` pour : plugins (2FA, passkey, organizations), gestion des sessions (DB vs secondaryStorage), et pièges courants.

---

## Guidelines Resend + React Email

### Architecture email

```
src/
├── lib/email/
│   └── resend.ts              # Client Resend + fonction sendEmail()
└── components/emails/
    ├── base-layout.tsx         # Layout React Email partagé (header, footer, couleurs)
    ├── welcome.tsx             # Template bienvenue
    ├── quote-pdf.tsx           # Template envoi devis PDF
    └── invitation.tsx          # Template invitation utilisateur
```

### Pattern d'envoi

```typescript
// 1. Importer le template React Email et le renderer
import { render } from '@react-email/components';
import { WelcomeEmail } from '@/components/emails/welcome';

// 2. Générer le HTML depuis le composant React
const html = await render(WelcomeEmail({ userName: 'Jean', quoteCount: 2 }));

// 3. Envoyer via la fonction sendEmail existante
await sendEmail({
  to: 'client@example.com',
  subject: 'Bienvenue sur Faso Fret',
  html,
});
```

### Convention des templates React Email

- Chaque template est un composant React exporté par défaut
- Props typées avec interface dédiée (ex: `WelcomeEmailProps`)
- Utiliser `<BaseLayout>` pour le header/footer/couleurs partagés
- La configuration plateforme (`platformFullName`, `primaryColor`) est passée via props

### Mode développement vs production

- `EMAIL_PROVIDER=console` : emails affichés dans la console (pas d'envoi réel)
- `EMAIL_PROVIDER=resend` : envoi réel via Resend API
- Variable requise : `RESEND_API_KEY`

---

## Méthodologie de Travail

### Approche incrémentale et itérative

Chaque feature ou refactoring suit ce cycle :

1. **Planifier** : Créer un plan dans `.claude/plans/` (skill `plan-management`)
2. **Implémenter par étape** : Une étape = un changement testable isolément
3. **Tester** : Vérifier manuellement ou par tests automatisés après chaque étape
4. **Valider** : L'utilisateur confirme avant de passer à l'étape suivante
5. **Documenter** : Mettre à jour le plan avec le statut (FAIT / A FAIRE)

### Consultation des skills

| Tâche | Skills à consulter |
|-------|-------------------|
| Nouveau composant React | `vercel-react-best-practices` + `vercel-composition-patterns` |
| Page / Route Next.js | `next-best-practices` |
| Design / UI | `frontend-design` + `ui-ux-pro-max` |
| Authentification / Sessions | `better-auth-best-practices` |
| Requêtes DB / Schéma | `supabase-postgres-best-practices` |
| Plans de travail | `plan-management` |
| Tests navigateur | `agent-browser` |
