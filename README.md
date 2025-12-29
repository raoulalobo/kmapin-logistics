# Faso Fret Logistics - Gestion de Fret Multi-Modal

Plateforme de gestion logistique pour transport routier, maritime, aérien et ferroviaire.

## 🚀 Stack Technique

### Frontend
- **Next.js 15** avec App Router
- **TypeScript**
- **TailwindCSS** pour le styling
- **shadcn/ui** pour les composants UI
- **Lucide React** pour les icônes
- **React Hook Form** + **Zod** pour les formulaires
- **TanStack Query** pour la gestion du state serveur
- **Zustand** pour le state management client

### Backend
- **Next.js API Routes**
- **Better Auth** pour l'authentification
- **Neon** (PostgreSQL serverless)
- **Prisma** comme ORM
- **Zenstack** pour l'access control
- **Inngest** pour les jobs asynchrones
- **Upstash Redis** pour le cache

### Stockage & Services
- **Backblaze B2** pour le stockage de fichiers
- **Resend** pour les emails
- **Vercel** pour l'hébergement

## 📋 Fonctionnalités

### MVP (Phase 1)
- ✅ Authentification et gestion des utilisateurs (RBAC)
- ✅ Gestion des clients
- ✅ Gestion des expéditions (création, suivi, statuts)
- ✅ Système de tracking basique
- ✅ Génération de devis
- ✅ Facturation simple
- ✅ Génération de documents PDF
- ✅ Dashboard avec KPIs

### Phase 2
- Suivi temps réel avec géolocalisation
- Transport multi-modal complet
- Portail client dédié
- Gestion des transporteurs
- Notifications automatiques
- Reporting avancé

### Phase 3
- Optimisation de routes
- Consolidation de fret
- Gestion douanière complète
- Analytics avancés
- Intégrations APIs transporteurs

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés

# Générer le client Prisma et Zenstack
npm run db:generate

# Pousser le schéma vers la base de données
npm run db:push

# Seed la base de données (optionnel)
npm run db:seed

# Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

## 📁 Structure du Projet

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Routes authentification
│   ├── (dashboard)/         # Routes dashboard
│   └── (portal)/            # Portail client
├── components/               # Composants React
│   ├── ui/                  # shadcn/ui components
│   ├── layouts/             # Layouts
│   ├── forms/               # Formulaires
│   └── shared/              # Composants partagés
├── modules/                  # Modules métier
│   ├── auth/                # Authentification
│   ├── shipments/           # Expéditions
│   ├── clients/             # Clients
│   ├── invoicing/           # Facturation
│   └── ...                  # Autres modules
├── lib/                      # Bibliothèques
│   ├── db/                  # Configuration DB
│   ├── auth/                # Configuration auth
│   ├── storage/             # Backblaze
│   └── ...
├── hooks/                    # Custom React hooks
├── types/                    # Types TypeScript
└── utils/                    # Utilitaires
```

## 🔐 Rôles Utilisateurs

- **ADMIN** : Accès complet
- **OPERATIONS_MANAGER** : Gestion des expéditions
- **FINANCE_MANAGER** : Facturation et finance
- **CLIENT** : Portail client (lecture uniquement)
- **VIEWER** : Consultation uniquement

## 📝 Scripts Disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linter ESLint
npm run db:generate  # Générer Prisma + Zenstack
npm run db:push      # Pousser le schéma DB
npm run db:studio    # Ouvrir Prisma Studio
npm run db:seed      # Seed la base de données
```

## 🌐 Variables d'Environnement

Voir `.env.example` pour la liste complète des variables d'environnement nécessaires.

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zenstack Documentation](https://zenstack.dev)
- [Better Auth Documentation](https://www.better-auth.com)

## 📄 Licence

Propriétaire - Faso Fret
