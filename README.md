# 🚚 Faso Fret Logistics

**Plateforme SaaS de gestion logistique multi-modale** pour transport routier, maritime, aérien et ferroviaire.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Stack Technique](#-stack-technique)
- [Fonctionnalités](#-fonctionnalités)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Développement Local](#-développement-local)
- [Build et Production](#-build-et-production)
- [Déploiement](#-déploiement)
- [Scripts Disponibles](#-scripts-disponibles)
- [Structure du Projet](#-structure-du-projet)
- [Tests](#-tests)
- [Documentation](#-documentation)

## 🎯 Vue d'ensemble

**Faso Fret Logistics** est une plateforme complète de gestion logistique permettant de gérer l'ensemble du cycle de vie des expéditions internationales :

- 📦 **Gestion des expéditions** (routier, maritime, aérien, ferroviaire)
- 💰 **Devis et facturation** automatisés
- 📍 **Tracking en temps réel** avec géolocalisation
- 🚛 **Demandes d'enlèvement** (pickup requests)
- 🛒 **Achats délégués** (shopping service)
- 👥 **Gestion multi-clients** avec RBAC
- 📊 **Dashboard et KPIs** en temps réel
- 📄 **Génération de documents** (PDF, factures, CMR)

> 💡 **Architecture moderne** : Next.js 15 avec React Server Components, TypeScript strict, et contrôle d'accès au niveau base de données.

## 🚀 Stack Technique

### Frontend

| Technologie | Version | Usage |
|------------|---------|-------|
| **Next.js** | 15 | Framework React avec App Router |
| **React** | 19 | Bibliothèque UI avec Server Components |
| **TypeScript** | 5.9 | Typage statique |
| **TailwindCSS** | 4.0 | Styling utility-first |
| **shadcn/ui** | Latest | Composants UI (Radix UI) |
| **Lucide React** | Latest | Icônes |
| **React Hook Form** | 7.67 | Gestion de formulaires |
| **Zod** | 4.1 | Validation de schémas |
| **TanStack Query** | 5.90 | State management serveur |
| **Framer Motion** | 12.23 | Animations |

### Backend

| Technologie | Version | Usage |
|------------|---------|-------|
| **Next.js API Routes** | 15 | API REST |
| **Better Auth** | 1.4 | Authentification (Email, OAuth, 2FA) |
| **Prisma** | 6.19 | ORM PostgreSQL |
| **Zenstack** | 2.22 | Access Control Layer (RBAC) |
| **PostgreSQL** | 16+ | Base de données (Neon Serverless) |
| **Inngest** | 3.46 | Jobs asynchrones et workflows |

### Services Externes

| Service | Usage |
|---------|-------|
| **Backblaze B2** | Stockage de fichiers (S3-compatible) |
| **Resend** | Emails transactionnels |
| **Vercel** | Hébergement et CI/CD |
| **Neon** | PostgreSQL serverless |

## 📋 Fonctionnalités

### ✅ Phase 1 (MVP - Implémenté)

- **Authentification complète**
  - Email/Password avec Better Auth
  - OAuth (Google, Microsoft)
  - 2FA/MFA optionnel
  - Reset password sécurisé
  
- **Gestion des expéditions**
  - Création et suivi d'expéditions
  - Multi-modal (routier, maritime, aérien, ferroviaire)
  - Statuts détaillés (DRAFT → DELIVERED)
  - Tracking events avec géolocalisation
  
- **Devis intelligents**
  - Génération automatique de devis
  - Calcul de tarification dynamique
  - Workflow complet (DRAFT → ACCEPTED → Shipment)
  - Tracking public par token
  
- **Demandes d'enlèvement**
  - Formulaire public et dashboard
  - Tracking par token
  - Rattachement automatique au compte
  
- **Achats délégués**
  - Service de shopping international
  - Formulaire public et dashboard
  - Suivi de commande
  
- **Gestion des clients**
  - Types : COMPANY et INDIVIDUAL
  - Multi-tenant avec isolation des données
  
- **RBAC (Role-Based Access Control)**
  - 5 rôles : ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER, CLIENT, VIEWER
  - Permissions granulaires au niveau DB
  
- **Documents**
  - Upload vers Backblaze B2
  - Types : factures, preuves, CMR, photos
  - Génération PDF automatique
  
- **Dashboard**
  - KPIs en temps réel
  - Graphiques et statistiques
  - Rapports exportables

### 🔄 Phase 2 (En cours)

- Tracking en temps réel avec WebSockets
- Notifications push
- Portail client dédié
- Gestion des transporteurs
- Optimisation de routes
- Reporting avancé

### 📋 Phase 3 (Planifié)

- Analytics avancés avec ML
- Consolidation de fret
- Gestion douanière complète
- API publique pour intégrations
- Application mobile (React Native)

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** 20+ ([Télécharger](https://nodejs.org/))
- **npm** 10+ (inclus avec Node.js)
- **PostgreSQL** 16+ (ou compte [Neon](https://neon.tech/))
- **Git** ([Télécharger](https://git-scm.com/))

### Comptes Services Externes (Optionnels)

- [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) - Stockage de fichiers
- [Resend](https://resend.com/) - Emails transactionnels
- [Vercel](https://vercel.com/) - Hébergement (pour production)
- [Neon](https://neon.tech/) - PostgreSQL serverless (pour production)

## 🛠️ Installation

### 1. Cloner le Repository

```bash
git clone https://github.com/votre-org/kmapin-logistics.git
cd kmapin-logistics
```

### 2. Installer les Dépendances

```bash
npm install
```

Cette commande installe toutes les dépendances et exécute automatiquement `npx zenstack generate` (via `postinstall`).

### 3. Configurer les Variables d'Environnement

```bash
cp .env.example .env
```

Éditez `.env` avec vos propres valeurs (voir section [Configuration](#-configuration)).

### 4. Configurer la Base de Données

#### Option A : PostgreSQL Local

```bash
# Créer une base de données
createdb kmapin_logistics

# Mettre à jour DATABASE_URL dans .env
DATABASE_URL="postgresql://user:password@localhost:5432/kmapin_logistics"
```

#### Option B : Neon (PostgreSQL Serverless)

1. Créer un compte sur [Neon](https://neon.tech/)
2. Créer un nouveau projet
3. Copier la `DATABASE_URL` dans `.env`

### 5. Générer les Clients Prisma et Zenstack

```bash
npm run db:generate
```

Cette commande génère :
- Le client Prisma à partir de `schema.zmodel`
- Le client Zenstack enhanced avec RBAC
- Les types TypeScript

### 6. Pousser le Schéma vers la Base de Données

```bash
npm run db:push
```

Cette commande crée toutes les tables dans votre base de données.

### 7. (Optionnel) Créer un Utilisateur Admin

```bash
npm run create-admin
```

Suivez les instructions pour créer votre premier compte administrateur.

## ⚙️ Configuration

### Variables d'Environnement Essentielles

Éditez le fichier `.env` :

```bash
# ════════════════════════════════════════════════════════════
# DATABASE
# ════════════════════════════════════════════════════════════
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# ════════════════════════════════════════════════════════════
# AUTHENTICATION (Better Auth)
# ════════════════════════════════════════════════════════════
# Générer un secret sécurisé : openssl rand -base64 32
BETTER_AUTH_SECRET="your-super-secret-key-change-in-production"
BETTER_AUTH_URL="http://localhost:3000"

# ════════════════════════════════════════════════════════════
# BACKBLAZE B2 STORAGE
# ════════════════════════════════════════════════════════════
# Public (accessible côté client)
NEXT_PUBLIC_BACKBLAZE_ENDPOINT="https://s3.us-east-005.backblazeb2.com"
NEXT_PUBLIC_BACKBLAZE_REGION="us-east-005"
NEXT_PUBLIC_BACKBLAZE_BUCKET_NAME="your-bucket-name"

# Private (serveur uniquement - NE PAS préfixer avec NEXT_PUBLIC_)
BACKBLAZE_ACCESS_KEY_ID="your-access-key-id"
BACKBLAZE_SECRET_ACCESS_KEY="your-secret-access-key"

# ════════════════════════════════════════════════════════════
# EMAIL SERVICE (Resend)
# ════════════════════════════════════════════════════════════
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_PROVIDER="console"  # "console" en dev, "resend" en prod

# ════════════════════════════════════════════════════════════
# OAUTH (Optionnel)
# ════════════════════════════════════════════════════════════
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
```

### Configuration Backblaze B2

1. Créer un compte [Backblaze B2](https://www.backblaze.com/b2/sign-up.html)
2. Créer un bucket (ex: `kmapin-logistics-documents`)
3. Créer une Application Key avec accès au bucket
4. Copier les credentials dans `.env`

### Configuration Resend

1. Créer un compte [Resend](https://resend.com/signup)
2. Créer une API Key
3. Copier la clé dans `.env`
4. En développement, utiliser `EMAIL_PROVIDER="console"` pour afficher les emails en console

## 💻 Développement Local

### Démarrer le Serveur de Développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

### Mode Webpack (si nécessaire)

Par défaut, Next.js 15 utilise Turbopack. Pour utiliser Webpack :

```bash
npm run dev -- --webpack
```

### Ouvrir Prisma Studio

Pour explorer et modifier la base de données visuellement :

```bash
npm run db:studio
```

Prisma Studio s'ouvrira sur [http://localhost:5555](http://localhost:5555)

### Hot Reload

Le serveur de développement supporte le hot reload :
- **Server Components** : Rechargement automatique
- **Client Components** : Fast Refresh
- **Server Actions** : Rechargement automatique

## 🏗️ Build et Production

### Build de Production

```bash
npm run build
```

Cette commande :
1. Compile TypeScript
2. Génère les bundles optimisés
3. Optimise les images
4. Génère les pages statiques

### Démarrer en Mode Production (Local)

```bash
npm run start
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

### Vérifier le Build

Avant de déployer, vérifiez que le build fonctionne localement :

```bash
npm run build && npm run start
```

## 🚀 Déploiement

### Déploiement sur Vercel (Recommandé)

#### Méthode 1 : Via GitHub (Automatique)

1. **Pusher le code sur GitHub**
   ```bash
   git push origin main
   ```

2. **Connecter à Vercel**
   - Aller sur [vercel.com](https://vercel.com/)
   - Cliquer sur "New Project"
   - Importer votre repository GitHub
   - Vercel détecte automatiquement Next.js

3. **Configurer les Variables d'Environnement**
   - Dans Vercel Dashboard → Settings → Environment Variables
   - Ajouter toutes les variables de `.env`
   - **Important** : Changer `BETTER_AUTH_URL` vers votre domaine Vercel

4. **Déployer**
   - Vercel déploie automatiquement sur chaque push
   - Preview deployments sur chaque PR
   - Production deployment sur `main`

#### Méthode 2 : Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Login
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

#### Configuration Vercel

Le fichier `vercel.json` est déjà configuré :

```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "regions": ["cdg1"]  // Paris
}
```

### Déploiement sur d'autres Plateformes

#### Docker (Optionnel)

Créer un `Dockerfile` :

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

Build et run :

```bash
docker build -t kmapin-logistics .
docker run -p 3000:3000 --env-file .env kmapin-logistics
```

### Checklist Pré-Déploiement

- [ ] Variables d'environnement configurées
- [ ] `BETTER_AUTH_SECRET` changé (production)
- [ ] `BETTER_AUTH_URL` pointe vers le domaine de production
- [ ] Base de données de production créée (Neon)
- [ ] Migrations appliquées (`npm run db:push`)
- [ ] Compte admin créé (`npm run create-admin`)
- [ ] Backblaze B2 bucket configuré
- [ ] Resend API key configurée
- [ ] Build local réussi (`npm run build`)
- [ ] Tests passent (`npm run test`)

## 📝 Scripts Disponibles

### Développement

```bash
npm run dev              # Démarrer le serveur de développement
npm run dev -- --webpack # Démarrer avec Webpack au lieu de Turbopack
npm run lint             # Linter ESLint
```

### Build et Production

```bash
npm run build            # Build de production
npm run start            # Démarrer le serveur de production
```

### Base de Données

```bash
npm run db:generate      # Générer Prisma + Zenstack clients
npm run db:push          # Pousser le schéma vers la DB (sans migrations)
npm run db:studio        # Ouvrir Prisma Studio
npm run db:seed          # Seed la base de données (si configuré)
```

### Utilitaires

```bash
npm run create-admin           # Créer un utilisateur admin
npm run reset-admin-password   # Réinitialiser le mot de passe admin
```

### Tests

```bash
npm run test              # Exécuter les tests
npm run test:watch        # Tests en mode watch
npm run test:ui           # Interface UI pour les tests
npm run test:coverage     # Rapport de couverture
npm run test:pickups      # Tests spécifiques aux pickups
```

## 📁 Structure du Projet

```
kmapin-logistics/
├── prisma/
│   └── schema.prisma              # Schéma Prisma (généré par Zenstack)
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/               # Routes authentification
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── reset-password/
│   │   │   └── _actions/         # Server Actions auth
│   │   │
│   │   ├── (dashboard)/          # Routes dashboard (protégées)
│   │   │   └── dashboard/
│   │   │       ├── page.tsx      # Dashboard principal
│   │   │       ├── shipments/    # Gestion expéditions
│   │   │       ├── quotes/       # Gestion devis
│   │   │       ├── pickups/      # Gestion enlèvements
│   │   │       ├── purchases/    # Achats délégués
│   │   │       ├── clients/      # Gestion clients
│   │   │       ├── users/        # Gestion utilisateurs
│   │   │       ├── tracking/     # Suivi expéditions
│   │   │       ├── reports/      # Rapports
│   │   │       └── settings/     # Configuration
│   │   │
│   │   ├── (public)/             # Routes publiques
│   │   │   ├── pickups/
│   │   │   │   ├── request/      # Formulaire enlèvement public
│   │   │   │   └── track/        # Tracking enlèvement
│   │   │   ├── purchases/
│   │   │   │   ├── request/      # Formulaire achat délégué
│   │   │   │   └── track/        # Tracking achat
│   │   │   └── tracking/
│   │   │       └── [token]/      # Tracking public par token
│   │   │
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/             # Better Auth endpoints
│   │   │   └── inngest/          # Inngest webhook
│   │   │
│   │   ├── layout.tsx            # Layout racine
│   │   ├── page.tsx              # Page d'accueil
│   │   └── providers.tsx         # Providers React
│   │
│   ├── components/               # Composants React
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layouts/              # Layouts (Sidebar, Header)
│   │   ├── forms/                # Formulaires réutilisables
│   │   └── shared/               # Composants partagés
│   │
│   ├── modules/                  # Modules métier
│   │   ├── shipments/            # Expéditions
│   │   │   ├── actions/          # Server Actions
│   │   │   ├── schemas/          # Schémas Zod
│   │   │   └── types/            # Types TypeScript
│   │   ├── quotes/               # Devis
│   │   ├── pickups/              # Enlèvements
│   │   ├── purchases/            # Achats délégués
│   │   ├── clients/              # Clients
│   │   ├── documents/            # Documents
│   │   ├── tracking/             # Tracking
│   │   └── pricing/              # Tarification
│   │
│   ├── lib/                      # Bibliothèques
│   │   ├── auth/                 # Configuration Better Auth
│   │   ├── db/                   # Configuration Prisma
│   │   ├── email/                # Service email (Resend)
│   │   ├── storage/              # Backblaze B2
│   │   ├── inngest/              # Jobs asynchrones
│   │   └── pdf/                  # Génération PDF
│   │
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # Types TypeScript globaux
│   ├── zenstack/                 # Zenstack enhanced client
│   └── middleware.ts             # Next.js Middleware
│
├── scripts/                      # Scripts utilitaires
│   ├── create-admin.ts           # Créer un admin
│   └── reset-admin-password.ts   # Reset mot de passe admin
│
├── schema.zmodel                 # Schéma Zenstack (source)
├── next.config.ts                # Configuration Next.js
├── tailwind.config.ts            # Configuration Tailwind
├── tsconfig.json                 # Configuration TypeScript
├── vitest.config.ts              # Configuration tests
├── package.json                  # Dépendances
└── README.md                     # Ce fichier
```

## 🧪 Tests

### Exécuter les Tests

```bash
# Tous les tests
npm run test

# Mode watch
npm run test:watch

# Interface UI
npm run test:ui

# Rapport de couverture
npm run test:coverage
```

### Écrire des Tests

Les tests utilisent **Vitest** et **Testing Library** :

```typescript
// src/modules/shipments/__tests__/shipment.test.ts
import { describe, it, expect } from 'vitest';
import { createShipment } from '../actions/shipment.actions';

describe('Shipment Actions', () => {
  it('should create a shipment', async () => {
    const result = await createShipment({
      // ... données de test
    });
    expect(result.success).toBe(true);
  });
});
```

## 📚 Documentation

### Documentation du Projet

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture détaillée du système
- **[CHANGELOG_SKELETONS.md](./CHANGELOG_SKELETONS.md)** - Historique des changements
- **[TESTING.md](./TESTING.md)** - Guide de tests
- **[PERMISSIONS_SUMMARY.md](./PERMISSIONS_SUMMARY.md)** - Résumé des permissions RBAC

### Documentation Externe

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zenstack Documentation](https://zenstack.dev)
- [Better Auth Documentation](https://www.better-auth.com)
- [TanStack Query Documentation](https://tanstack.com/query)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## 🔐 Sécurité

### Bonnes Pratiques Implémentées

- ✅ **Authentication** : Better Auth avec sessions sécurisées
- ✅ **Authorization** : Zenstack RBAC au niveau base de données
- ✅ **CSRF Protection** : Tokens automatiques (Better Auth)
- ✅ **XSS Protection** : React automatic escaping
- ✅ **SQL Injection** : Prisma parameterized queries
- ✅ **HTTPS** : Obligatoire en production (Vercel)
- ✅ **Secrets** : Variables d'environnement (jamais en code)
- ✅ **Rate Limiting** : Vercel Edge Functions

### Signaler une Vulnérabilité

Si vous découvrez une vulnérabilité de sécurité, veuillez envoyer un email à **security@kmapin.com**.

## 🤝 Contribution

Ce projet est propriétaire. Pour contribuer :

1. Créer une branche feature : `git checkout -b feature/ma-feature`
2. Commit les changements : `git commit -m 'Add: ma feature'`
3. Push la branche : `git push origin feature/ma-feature`
4. Ouvrir une Pull Request

## 📄 Licence

**Propriétaire** - Faso Fret Logistics © 2025

Tous droits réservés. Ce code est la propriété de Faso Fret Logistics et ne peut être utilisé, copié, modifié ou distribué sans autorisation écrite préalable.

## 📞 Support

- **Email** : support@kmapin.com
- **Documentation** : [docs.kmapin.com](https://docs.kmapin.com)
- **Status** : [status.kmapin.com](https://status.kmapin.com)

---

**Développé avec ❤️ par l'équipe Faso Fret Logistics**
