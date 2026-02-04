# Architecture - Faso Fret Logistics

## 📋 Vue d'ensemble

**Faso Fret Logistics** est une plateforme SaaS de gestion logistique multi-modale (routier, maritime, aérien, ferroviaire) construite avec Next.js 15 et TypeScript. L'application permet de gérer l'ensemble du cycle de vie des expéditions, des devis aux livraisons, avec un système de tracking en temps réel.

## 🏗️ Architecture Globale

### Architecture Technique

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   App Router │  │  React 19    │  │  TailwindCSS │          │
│  │   (RSC/SSR)  │  │  Components  │  │  + shadcn/ui │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              State Management                             │   │
│  │  • TanStack Query (Server State)                         │   │
│  │  • React Hook Form + Zod (Forms)                         │   │
│  │  • Zustand (Client State - si nécessaire)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Next.js API Routes)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Server       │  │  Better Auth │  │   Zenstack   │          │
│  │ Actions      │  │  (Auth)      │  │   (ACL)      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Business Logic Modules                       │   │
│  │  • Shipments  • Quotes    • Pickups                      │   │
│  │  • Purchases  • Clients   • Documents                    │   │
│  │  • Tracking   • Invoicing • Pricing                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (Prisma ORM)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (Neon Serverless)                            │   │
│  │  • Users & Auth  • Shipments  • Clients                  │   │
│  │  • Quotes        • Pickups    • Purchases                │   │
│  │  • Documents     • Tracking   • Logs                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Backblaze   │  │    Resend    │  │   Inngest    │          │
│  │  B2 Storage  │  │   (Emails)   │  │   (Jobs)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Patterns Architecturaux

### 1. **Modular Monolith**
L'application est structurée en modules métier indépendants dans `src/modules/`:
- Chaque module contient sa logique métier, actions, et composants
- Couplage faible entre modules
- Facilite l'évolution vers des microservices si nécessaire

### 2. **Server-First Architecture**
- **React Server Components (RSC)** par défaut
- **Server Actions** pour les mutations
- Minimise le JavaScript côté client
- Améliore les performances et le SEO

### 3. **Type-Safe End-to-End**
- **TypeScript** strict sur toute la stack
- **Zod** pour la validation runtime
- **Prisma** pour le typage de la base de données
- **Zenstack** pour l'access control typé

### 4. **Role-Based Access Control (RBAC)**
- Implémenté via **Zenstack** au niveau de la base de données
- 5 rôles: ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER, CLIENT, VIEWER
- Permissions granulaires par entité et opération

## 📂 Structure du Projet

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
│   │   ├── shared/               # Composants partagés
│   │   ├── pickups/              # Composants enlèvements
│   │   ├── purchases/            # Composants achats
│   │   ├── quotes/               # Composants devis
│   │   └── shipments/            # Composants expéditions
│   │
│   ├── modules/                  # Modules métier
│   │   ├── auth/                 # Authentification
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
│   │   ├── pricing/              # Tarification
│   │   └── dashboard/            # Dashboard KPIs
│   │
│   ├── lib/                      # Bibliothèques
│   │   ├── auth/                 # Configuration Better Auth
│   │   ├── db/                   # Configuration Prisma
│   │   ├── email/                # Service email (Resend)
│   │   ├── storage/              # Backblaze B2
│   │   ├── inngest/              # Jobs asynchrones
│   │   ├── pdf/                  # Génération PDF
│   │   └── utils/                # Utilitaires
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
└── package.json                  # Dépendances
```

## 🔐 Système d'Authentification

### Better Auth
- **Email/Password** avec hashing bcrypt
- **OAuth** (Google, Microsoft) pour SSO entreprise
- **2FA/MFA** optionnel
- **Sessions** sécurisées (7 jours)
- **Reset password** avec tokens

### Flow d'authentification
```
1. Login → Better Auth vérifie credentials
2. Session créée → Cookie httpOnly sécurisé
3. Middleware vérifie session → Redirection si nécessaire
4. Zenstack enhanced client → Filtrage automatique des données
```

## 🛡️ Contrôle d'Accès (RBAC)

### Zenstack Access Control
Zenstack génère un client Prisma "enhanced" qui applique automatiquement les règles d'accès:

```typescript
// schema.zmodel
model Shipment {
  // Règles d'accès
  @@allow('read', auth().role == 'ADMIN' || auth().clientId == clientId)
  @@allow('create', auth().role in ['ADMIN', 'OPERATIONS_MANAGER'])
  @@allow('update', auth().role in ['ADMIN', 'OPERATIONS_MANAGER'])
  @@allow('delete', auth().role == 'ADMIN')
}
```

### Rôles et Permissions

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **ADMIN** | Administrateur système | Accès complet à tout |
| **OPERATIONS_MANAGER** | Gestionnaire opérations | CRUD expéditions, devis, enlèvements |
| **FINANCE_MANAGER** | Gestionnaire finance | Lecture + facturation |
| **CLIENT** | Client final | Lecture ses propres données |
| **VIEWER** | Observateur | Lecture uniquement |

## 💾 Modèle de Données

### Entités Principales

#### **User**
- Authentification et profil
- Lien vers Client (multi-tenant)
- Rôle RBAC

#### **Client**
- Type: COMPANY ou INDIVIDUAL
- Informations légales (SIRET, TVA)
- Relations: Users, Shipments, Quotes

#### **Shipment**
- Expédition complète
- Origine/Destination
- Statuts (DRAFT → DELIVERED)
- Tracking events
- Documents attachés

#### **Quote**
- Devis avec tarification
- Workflow: DRAFT → SENT → ACCEPTED → Shipment
- Token public pour tracking
- Rattachement automatique au compte

#### **PickupRequest**
- Demande d'enlèvement de colis
- Formulaire public ou dashboard
- Token public pour tracking
- Workflow: NOUVEAU → PRISE_EN_CHARGE → EFFECTUE

#### **PurchaseRequest**
- Achat délégué (shopping service)
- Formulaire public ou dashboard
- Token public pour tracking
- Workflow: NOUVEAU → EN_COURS → LIVRE

#### **Document**
- Fichiers attachés (PDF, images)
- Stockage Backblaze B2
- Types: factures, preuves, CMR, etc.

#### **TrackingEvent**
- Événements de suivi
- Géolocalisation (latitude/longitude)
- Timeline de l'expédition

### Relations Clés

```
User ──┬─→ Client ──┬─→ Shipment ──┬─→ TrackingEvent
       │            │               ├─→ Document
       │            │               └─→ PickupRequest
       │            │
       │            ├─→ Quote ──────────→ Shipment (conversion)
       │            │
       │            ├─→ PickupRequest ──→ Document
       │            │
       │            └─→ PurchaseRequest ─→ Document
       │
       └─→ Session
```

## 🔄 Flux de Données

### 1. **Création d'Expédition**
```
Client Form → Server Action → Zenstack Client → Prisma → PostgreSQL
                    ↓
              Validation Zod
                    ↓
              Check Permissions (Zenstack)
                    ↓
              Create Shipment + TrackingEvent
                    ↓
              Inngest Job (Email notification)
```

### 2. **Demande Publique (Pickup/Purchase)**
```
Public Form → Server Action → Create with Token
                    ↓
              Email avec lien tracking
                    ↓
              User crée compte → Auto-attach via email
                    ↓
              Demande visible dans dashboard
```

### 3. **Upload de Document**
```
File Upload → Server Action → Backblaze B2 (presigned URL)
                    ↓
              Create Document record
                    ↓
              Link to Shipment/Quote/Pickup
```

## 🎨 Frontend Architecture

### Composants

#### **Server Components (RSC)**
- Par défaut pour toutes les pages
- Fetch data directement côté serveur
- Pas de JavaScript côté client
- Meilleur SEO et performances

#### **Client Components**
- Marqués avec `"use client"`
- Pour interactivité (forms, modals, etc.)
- Utilisent TanStack Query pour data fetching
- React Hook Form pour formulaires

### State Management

#### **Server State (TanStack Query)**
```typescript
// Fetch data avec cache automatique
const { data: shipments } = useQuery({
  queryKey: ['shipments'],
  queryFn: () => getShipmentsAction(),
});
```

#### **Form State (React Hook Form + Zod)**
```typescript
const form = useForm({
  resolver: zodResolver(shipmentSchema),
  defaultValues: {...},
});
```

## 🚀 Déploiement

### Environnements

#### **Development**
- Local avec `npm run dev`
- PostgreSQL local ou Neon
- Emails en console

#### **Staging**
- Vercel Preview Deployments
- Base de données Neon (staging)
- Emails Resend (test)

#### **Production**
- Vercel Production
- Base de données Neon (production)
- Emails Resend (production)
- CDN Vercel Edge Network
- Région: Paris (cdg1)

### CI/CD

#### **Vercel**
- Auto-deploy sur push GitHub
- Preview deployments sur PR
- Environment variables via Vercel Dashboard
- Build: `next build`

#### **Jenkins (Optionnel)**
- Pipeline custom pour déploiements complexes
- Tests automatisés
- Notifications

## 📊 Services Externes

### **Backblaze B2**
- Stockage de fichiers (documents, photos)
- Compatible S3 API
- Presigned URLs pour upload direct
- Bucket: `kmapin-logistics-documents`

### **Resend**
- Service d'emails transactionnels
- Templates HTML
- Tracking d'ouverture/clics
- Webhooks pour statuts

### **Inngest**
- Jobs asynchrones et workflows
- Retry automatique
- Monitoring et logs
- Use cases:
  - Envoi d'emails différés
  - Notifications automatiques
  - Génération de rapports

### **Neon**
- PostgreSQL serverless
- Auto-scaling
- Branching pour staging
- Backups automatiques

## 🧪 Tests

### **Vitest**
- Tests unitaires et d'intégration
- Testing Library pour composants React
- Coverage reports

```bash
npm run test              # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

## 🔧 Configuration

### Variables d'Environnement

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://..."

# Storage (Backblaze B2)
NEXT_PUBLIC_BACKBLAZE_ENDPOINT="..."
NEXT_PUBLIC_BACKBLAZE_REGION="..."
NEXT_PUBLIC_BACKBLAZE_BUCKET_NAME="..."
BACKBLAZE_ACCESS_KEY_ID="..."
BACKBLAZE_SECRET_ACCESS_KEY="..."

# Email (Resend)
RESEND_API_KEY="..."
EMAIL_PROVIDER="resend"  # ou "console" en dev

# OAuth (optionnel)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## 📈 Performance

### Optimisations

#### **Next.js 15**
- React Server Components (RSC)
- Streaming SSR
- Partial Prerendering (PPR)
- Image Optimization

#### **Database**
- Indexes sur colonnes fréquemment requêtées
- Connection pooling (Prisma)
- Prepared statements

#### **Caching**
- Next.js automatic caching
- TanStack Query cache
- CDN caching (Vercel Edge)

## 🔒 Sécurité

### Mesures Implémentées

- **Authentication**: Better Auth avec sessions sécurisées
- **Authorization**: Zenstack RBAC au niveau DB
- **CSRF Protection**: Tokens automatiques (Better Auth)
- **XSS Protection**: React automatic escaping
- **SQL Injection**: Prisma parameterized queries
- **Rate Limiting**: Vercel Edge Functions
- **HTTPS**: Obligatoire en production
- **Secrets**: Variables d'environnement (jamais en code)

## 📚 Documentation Technique

### Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zenstack Documentation](https://zenstack.dev)
- [Better Auth Documentation](https://www.better-auth.com)
- [TanStack Query Documentation](https://tanstack.com/query)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## 🎯 Roadmap Technique

### Phase 1 (Actuel)
- ✅ Architecture de base
- ✅ Authentification et RBAC
- ✅ Modules principaux (Shipments, Quotes, Pickups, Purchases)
- ✅ Dashboard et KPIs
- ✅ Upload de documents

### Phase 2 (En cours)
- 🔄 Tracking en temps réel avec WebSockets
- 🔄 Notifications push
- 🔄 Optimisation de routes
- 🔄 Intégrations API transporteurs

### Phase 3 (Futur)
- 📋 Analytics avancés
- 📋 Machine Learning pour prédictions
- 📋 Mobile app (React Native)
- 📋 API publique pour intégrations tierces
