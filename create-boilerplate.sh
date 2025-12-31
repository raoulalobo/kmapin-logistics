#!/bin/bash

################################################################################
# Script de Création du Boilerplate Next.js SaaS
#
# Ce script crée automatiquement un boilerplate réutilisable basé sur
# le projet Faso Fret/KmapIn en supprimant toute la logique métier et en
# gardant uniquement l'infrastructure (Auth, RBAC, UI, Multi-tenant)
#
# Usage: bash create-boilerplate.sh
################################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SOURCE_DIR=$(pwd)
BOILERPLATE_DIR="/home/alobo/Bureau/NextJS/boilerplate/v1"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Création du Boilerplate Next.js Multi-Tenant SaaS        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# PHASE 1: Préparation
################################################################################

echo -e "${YELLOW}[Phase 1/10]${NC} Préparation de la structure..."

# Nettoyer le dossier s'il existe déjà
if [ -d "$BOILERPLATE_DIR" ]; then
    echo -e "${YELLOW}⚠️  Le dossier existe déjà. Suppression...${NC}"
    rm -rf "$BOILERPLATE_DIR"
fi

# Créer la structure de base
mkdir -p "$BOILERPLATE_DIR"/{src,scripts,docs/examples,prisma}
mkdir -p "$BOILERPLATE_DIR"/src/{app,components,lib,modules,types}
mkdir -p "$BOILERPLATE_DIR"/src/app/{api,\(auth\),\(dashboard\)}
mkdir -p "$BOILERPLATE_DIR"/src/components/{ui,layouts,dashboard,users,companies,profile}
mkdir -p "$BOILERPLATE_DIR"/src/lib/{auth,db}
mkdir -p "$BOILERPLATE_DIR"/src/modules/{dashboard,users,companies}
mkdir -p "$BOILERPLATE_DIR"/src/modules/{dashboard,users,companies}/{actions,schemas}

echo -e "${GREEN}✓ Structure créée${NC}"

################################################################################
# PHASE 2: Copie des fichiers AS-IS
################################################################################

echo -e "${YELLOW}[Phase 2/10]${NC} Copie des fichiers core..."

# Configuration
cp tsconfig.json tailwind.config.ts next.config.ts .gitignore "$BOILERPLATE_DIR/" 2>/dev/null || true
cp postcss.config.mjs "$BOILERPLATE_DIR/" 2>/dev/null || true

# Scripts
cp scripts/create-admin.ts "$BOILERPLATE_DIR"/scripts/
cp scripts/reset-admin-password.ts "$BOILERPLATE_DIR"/scripts/

# Lib
cp src/lib/utils.ts "$BOILERPLATE_DIR"/src/lib/
cp -r src/lib/db "$BOILERPLATE_DIR"/src/lib/
cp -r src/lib/auth "$BOILERPLATE_DIR"/src/lib/

# Types
cp -r src/types "$BOILERPLATE_DIR"/src/

# Composants UI (tous les shadcn/ui)
cp -r src/components/ui "$BOILERPLATE_DIR"/src/components/

# Layouts
cp -r src/components/layouts "$BOILERPLATE_DIR"/src/components/

# Pages Auth
cp -r src/app/\(auth\) "$BOILERPLATE_DIR"/src/app/

# API Routes
cp -r src/app/api "$BOILERPLATE_DIR"/src/app/

# App root files
cp src/app/globals.css "$BOILERPLATE_DIR"/src/app/
cp src/app/layout.tsx "$BOILERPLATE_DIR"/src/app/
cp src/app/page.tsx "$BOILERPLATE_DIR"/src/app/ 2>/dev/null || true

# Dashboard layout
mkdir -p "$BOILERPLATE_DIR"/src/app/\(dashboard\)
cp src/app/\(dashboard\)/layout.tsx "$BOILERPLATE_DIR"/src/app/\(dashboard\)/ 2>/dev/null || true

# Settings page (generic)
if [ -d "src/app/(dashboard)/settings" ]; then
    cp -r src/app/\(dashboard\)/settings "$BOILERPLATE_DIR"/src/app/\(dashboard\)/
fi

echo -e "${GREEN}✓ Fichiers core copiés${NC}"

################################################################################
# PHASE 3: Adaptation du schema.zmodel
################################################################################

echo -e "${YELLOW}[Phase 3/10]${NC} Création du schema.zmodel simplifié..."

cat > "$BOILERPLATE_DIR"/schema.zmodel << 'ZMODEL_EOF'
// ============================================
// Boilerplate Next.js - Multi-tenant SaaS avec RBAC
// ============================================

/**
 * Generator Prisma standard
 */
generator client {
  provider      = "prisma-client-js"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

/**
 * Plugin Zenstack pour hooks React Query
 */
plugin hooks {
  provider = '@zenstackhq/tanstack-query'
  target = 'react'
  version = 'v5'
  output = "../src/lib/hooks"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// CONTEXTE D'AUTHENTIFICATION
// ============================================

/**
 * Type Auth - Définit le contexte utilisateur pour Zenstack
 *
 * CRITIQUE : Ce type est obligatoire pour que auth() fonctionne
 * dans les access policies.
 */
type Auth {
  id        String   @id
  role      UserRole
  companyId String?

  @@auth
}

// ============================================
// AUTHENTIFICATION & RBAC
// ============================================

/**
 * Rôles utilisateurs
 *
 * - ADMIN: Accès complet à toutes les données
 * - OPERATIONS_MANAGER: Gestion des opérations
 * - FINANCE_MANAGER: Gestion financière
 * - CLIENT: Accès limité à sa company
 * - VIEWER: Lecture seule limitée
 */
enum UserRole {
  ADMIN
  OPERATIONS_MANAGER
  FINANCE_MANAGER
  CLIENT
  VIEWER
}

/**
 * Modèle User
 *
 * Access Control:
 * - ADMIN: Accès complet à tous les users
 * - Managers: Lecture des users de leur company
 * - Tous: Lecture et modification de leur propre profil
 */
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?
  phone         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations Better Auth
  accounts Account[]
  sessions Session[]

  // RBAC & Multi-tenancy
  role        UserRole @default(CLIENT)
  companyId   String?
  company     Company? @relation(fields: [companyId], references: [id])
  permissions Json?    // Permissions custom additionnelles (optionnel)

  // 🔐 Access Policies

  // Les admins peuvent tout faire
  @@allow('all', auth().role == ADMIN)

  // Chaque user peut lire et modifier son propre profil
  @@allow('read,update', auth().id == id)

  // Les managers peuvent lire les users de leur company
  @@allow('read', auth().companyId == companyId &&
    (auth().role == OPERATIONS_MANAGER || auth().role == FINANCE_MANAGER))

  // Par défaut, tout est interdit
  @@deny('all', true)

  @@index([companyId])
  @@map("user")
}

/**
 * Modèle Company - Multi-tenancy
 *
 * Permet l'isolation des données par organisation.
 *
 * Access Control:
 * - ADMIN: Accès complet
 * - Managers: Lecture de toutes les companies
 * - Users d'une company: Lecture et modification de leur company
 */
model Company {
  id         String   @id @default(cuid())
  name       String
  legalName  String?
  taxId      String?  @unique
  email      String
  phone      String?
  address    String
  city       String
  postalCode String?
  country    String
  website    String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  users User[]

  // 🔐 Access Policies

  // Les admins peuvent tout faire
  @@allow('all', auth().role == ADMIN)

  // Les managers peuvent lire toutes les companies
  @@allow('read', auth().role == OPERATIONS_MANAGER || auth().role == FINANCE_MANAGER)

  // Les users d'une company peuvent lire et modifier leur company
  @@allow('read,update', auth().companyId == id)

  @@deny('all', true)

  @@index([taxId])
  @@map("company")
}

// ============================================
// AUTHENTIFICATION (Better Auth)
// ============================================

/**
 * Modèle Account (OAuth + Email/Password)
 * Conforme au schéma Better Auth officiel
 */
model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // 🔐 Access Policies
  @@allow('all', auth().role == ADMIN)
  @@allow('all', auth().id == userId)
  @@deny('all', true)

  @@unique([providerId, accountId])
  @@index([userId])
  @@map("account")
}

/**
 * Modèle Session
 * Conforme au schéma Better Auth officiel
 */
model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 🔐 Access Policies
  @@allow('all', auth().role == ADMIN)
  @@allow('all', auth().id == userId)
  @@deny('all', true)

  @@index([userId])
  @@map("session")
}

/**
 * Modèle VerificationToken (Legacy)
 */
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  // 🔐 Access Policies
  @@allow('read', true)
  @@allow('all', auth().role == ADMIN)
  @@deny('all', true)

  @@unique([identifier, token])
  @@map("verification_token")
}

/**
 * Modèle Verification (Better Auth)
 * Pour vérification d'email et réinitialisation de mot de passe
 */
model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // 🔐 Access Policies
  @@allow('read', true)
  @@allow('all', auth().role == ADMIN)
  @@deny('all', true)

  @@index([identifier])
  @@map("verification")
}

// ============================================
// AJOUTEZ VOS PROPRES MODELS ICI
// ============================================

/*
 * Exemple de modèle métier avec access control:
 *
 * model Product {
 *   id          String   @id @default(cuid())
 *   name        String
 *   description String?
 *   price       Float
 *   companyId   String
 *   company     Company  @relation(fields: [companyId], references: [id])
 *   createdAt   DateTime @default(now())
 *   updatedAt   DateTime @updatedAt
 *
 *   // 🔐 Access Policies
 *
 *   // Les admins peuvent tout faire
 *   @@allow('all', auth().role == ADMIN)
 *
 *   // Les operations managers peuvent tout faire
 *   @@allow('all', auth().role == OPERATIONS_MANAGER)
 *
 *   // Les users d'une company peuvent lire les produits de leur company
 *   @@allow('read', auth().companyId == companyId)
 *
 *   // Les finance managers peuvent lire tous les produits
 *   @@allow('read', auth().role == FINANCE_MANAGER)
 *
 *   @@deny('all', true)
 *
 *   @@index([companyId])
 * }
 */
ZMODEL_EOF

echo -e "${GREEN}✓ Schema.zmodel créé${NC}"

################################################################################
# PHASE 4: Adaptation des permissions
################################################################################

echo -e "${YELLOW}[Phase 4/10]${NC} Adaptation des permissions..."

# Créer permissions-client.ts simplifié
cat > "$BOILERPLATE_DIR"/src/lib/auth/permissions-client.ts << 'PERMISSIONS_EOF'
/**
 * Système de permissions RBAC - Client
 *
 * Convention: resource:action[:scope]
 * Exemples: users:read, users:create, users:read:own
 */

import type { UserRole } from '@/generated/prisma';

export type Permission =
  // Users
  | 'users:create'
  | 'users:read'
  | 'users:read:own'
  | 'users:update'
  | 'users:update:own'
  | 'users:delete'

  // Companies
  | 'companies:create'
  | 'companies:read'
  | 'companies:read:own'
  | 'companies:update'
  | 'companies:update:own'
  | 'companies:delete'

  // Settings
  | 'settings:read'
  | 'settings:update'

  /*
   * AJOUTEZ VOS PROPRES PERMISSIONS ICI
   *
   * Exemple pour un module "Products":
   *
   * | 'products:create'
   * | 'products:read'
   * | 'products:read:own'
   * | 'products:update'
   * | 'products:update:own'
   * | 'products:delete'
   */
  ;

/**
 * Matrice de permissions par rôle
 */
export const PERMISSIONS: Record<UserRole, Permission[] | ['*']> = {
  ADMIN: ['*'],  // Wildcard = tous les droits

  OPERATIONS_MANAGER: [
    'users:read', 'users:update:own',
    'companies:read', 'companies:update:own',
    'settings:read',
    // Ajoutez vos permissions ici
  ],

  FINANCE_MANAGER: [
    'users:read', 'users:update:own',
    'companies:read',
    'settings:read',
  ],

  CLIENT: [
    'users:read:own', 'users:update:own',
    'companies:read:own',
    'settings:read',
  ],

  VIEWER: [
    'users:read:own',
    'companies:read:own',
    'settings:read',
  ],
};

/**
 * Vérifier si un rôle a une permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = PERMISSIONS[role];

  // Wildcard check
  if (rolePermissions.includes('*' as any)) return true;

  return (rolePermissions as Permission[]).includes(permission);
}

/*
 * GUIDE: Comment ajouter des permissions pour un module "Products"
 *
 * 1. Ajouter dans Permission type ci-dessus:
 *    | 'products:create' | 'products:read' | 'products:update' | 'products:delete'
 *
 * 2. Ajouter dans PERMISSIONS:
 *    OPERATIONS_MANAGER: [..., 'products:create', 'products:read', 'products:update', 'products:delete']
 *    CLIENT: [..., 'products:read:own']
 *
 * 3. Utiliser dans Server Actions:
 *    await requirePermission('products:create');
 */
PERMISSIONS_EOF

# Adapter permissions.ts (server-side)
cat > "$BOILERPLATE_DIR"/src/lib/auth/permissions.ts << 'PERMISSIONS_SERVER_EOF'
/**
 * Système de permissions RBAC - Server
 *
 * Helpers pour vérifier les permissions dans les Server Actions
 */

'use server';

import { requireAuth } from './config';
import { hasPermission, type Permission } from './permissions-client';
import type { UserRole } from '@/generated/prisma';

/**
 * Exiger une permission spécifique
 * Throw une erreur si l'utilisateur n'a pas la permission
 */
export async function requirePermission(permission: Permission) {
  const session = await requireAuth();

  if (!hasPermission(session.user.role, permission)) {
    throw new Error(`Forbidden: You don't have permission to '${permission}'`);
  }

  return session;
}

/**
 * Exiger l'un des rôles spécifiés
 * Throw une erreur si l'utilisateur n'a pas l'un des rôles
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error(`Forbidden: This action requires one of these roles: ${allowedRoles.join(', ')}`);
  }

  return session;
}

/**
 * Vérifier l'accès à une company
 * Les admins et managers ont accès à toutes les companies
 * Les autres doivent être de la même company
 */
export async function requireCompanyAccess(companyId: string) {
  const session = await requireAuth();
  const userRole = session.user.role;

  // ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER ont accès à toutes
  const canAccessAll = ['ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER'].includes(userRole);

  if (canAccessAll) {
    return session;
  }

  // Les autres doivent être de la même company
  if (session.user.companyId !== companyId) {
    throw new Error('Forbidden: You can only access data from your own company');
  }

  return session;
}
PERMISSIONS_SERVER_EOF

echo -e "${GREEN}✓ Permissions adaptées${NC}"

################################################################################
# PHASE 5: Adaptation de la Sidebar
################################################################################

echo -e "${YELLOW}[Phase 5/10]${NC} Adaptation de la sidebar..."

# Adapter la sidebar avec navigation simplifiée
cat > "$BOILERPLATE_DIR"/src/components/layouts/sidebar.tsx << 'SIDEBAR_EOF'
/**
 * Composant : Sidebar
 *
 * Navigation latérale simplifiée pour le boilerplate
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Package,
  UserGear,
  Gear,
  SquaresFour,
  User,
  Buildings,
} from '@phosphor-icons/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { hasPermission } from '@/lib/auth/permissions-client';
import type { UserRole } from '@/generated/prisma';

type NavLink = {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
};

type NavSection = {
  title: string;
  links: NavLink[];
};

const navigation: NavSection[] = [
  {
    title: 'Principal',
    links: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: SquaresFour,
      },
    ],
  },
  {
    title: 'Gestion',
    links: [
      {
        label: 'Utilisateurs',
        href: '/dashboard/users',
        icon: UserGear,
        permission: 'users:read',
      },
      {
        label: 'Companies',
        href: '/dashboard/companies',
        icon: Buildings,
        permission: 'companies:read',
      },
      {
        label: 'Mon Profil',
        href: '/dashboard/profile',
        icon: User,
      },
      {
        label: 'Paramètres',
        href: '/dashboard/settings',
        icon: Gear,
      },
    ],
  },

  /*
   * EXEMPLE: Comment ajouter vos propres sections
   *
   * {
   *   title: 'Votre Module',
   *   links: [
   *     { label: 'Produits', href: '/dashboard/products', icon: Package, permission: 'products:read' },
   *   ],
   * },
   */
];

interface SidebarProps {
  className?: string;
  userRole?: UserRole;
}

export function Sidebar({ className, userRole = 'CLIENT' }: SidebarProps) {
  const pathname = usePathname();

  const filterLinksByPermission = (links: NavLink[]): NavLink[] => {
    return links.filter((link) => {
      if (!link.permission) return true;
      if (hasPermission(userRole, link.permission as any)) return true;
      if (hasPermission(userRole, `${link.permission}:own` as any)) return true;
      return false;
    });
  };

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      links: filterLinksByPermission(section.links),
    }))
    .filter((section) => section.links.length > 0);

  return (
    <div className={cn('flex h-full flex-col border-r bg-background', className)}>
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <span className="text-lg">{process.env.NEXT_PUBLIC_APP_NAME || 'My SaaS App'}</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 py-4">
          {filteredNavigation.map((section) => (
            <div key={section.title} className="space-y-1">
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h4>

              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{link.label}</span>
                  </Link>
                );
              })}

              {section !== navigation[navigation.length - 1] && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          v1.0.0
        </p>
      </div>
    </div>
  );
}
SIDEBAR_EOF

echo -e "${GREEN}✓ Sidebar adaptée${NC}"

################################################################################
# PHASE 6: Création du package.json
################################################################################

echo -e "${YELLOW}[Phase 6/10]${NC} Création du package.json..."

cat > "$BOILERPLATE_DIR"/package.json << 'PACKAGE_EOF'
{
  "name": "nextjs-saas-boilerplate",
  "version": "1.0.0",
  "description": "Next.js Multi-Tenant SaaS Boilerplate with RBAC and Zenstack",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "npx zenstack generate",
    "db:generate": "npx zenstack generate && npx prisma generate",
    "db:push": "npx prisma db push",
    "db:studio": "npx prisma studio",
    "create-admin": "tsx scripts/create-admin.ts",
    "reset-admin-password": "tsx scripts/reset-admin-password.ts"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@noble/hashes": "^2.0.1",
    "@phosphor-icons/react": "^2.1.10",
    "@prisma/client": "^6.19.0",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@tanstack/react-query": "^5.90.11",
    "@zenstackhq/runtime": "2.22.0",
    "@zenstackhq/tanstack-query": "^2.22.0",
    "better-auth": "^1.4.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "next": "^16.0.8",
    "next-themes": "^0.4.6",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "react-hook-form": "^7.67.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.17",
    "@types/bcrypt": "^6.0.0",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "bcrypt": "^6.0.0",
    "dotenv": "^17.2.3",
    "eslint": "^9.39.1",
    "eslint-config-next": "^16.0.6",
    "postcss": "^8.5.6",
    "prisma": "^6.19.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "zenstack": "2.22.0"
  }
}
PACKAGE_EOF

echo -e "${GREEN}✓ package.json créé${NC}"

################################################################################
# PHASE 7: Création du .env.example
################################################################################

echo -e "${YELLOW}[Phase 7/10]${NC} Création du .env.example..."

cat > "$BOILERPLATE_DIR"/.env.example << 'ENV_EOF'
# ============================================
# CONFIGURATION REQUISE
# ============================================

# Database PostgreSQL (REQUIS)
# Exemple local: postgresql://postgres:password@localhost:5432/myapp
# Exemple Neon: postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Better Auth Configuration (REQUIS)
# Générer avec: openssl rand -base64 32
BETTER_AUTH_SECRET="your-secret-key-here-change-me"

# URL de base de l'application (REQUIS)
# Dev: http://localhost:3000
# Prod: https://myapp.com
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# ============================================
# CONFIGURATION OPTIONNELLE
# ============================================

# --- OAuth Providers (Optionnel) ---
# Décommenter pour activer Google/Microsoft OAuth

# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"

# MICROSOFT_CLIENT_ID="your-microsoft-client-id"
# MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# --- Application Branding (Optionnel) ---
# NEXT_PUBLIC_APP_NAME="My SaaS App"
ENV_EOF

echo -e "${GREEN}✓ .env.example créé${NC}"

################################################################################
# PHASE 8: Création du README.md
################################################################################

echo -e "${YELLOW}[Phase 8/10]${NC} Création du README.md..."

cat > "$BOILERPLATE_DIR"/README.md << 'README_EOF'
# Next.js Multi-Tenant SaaS Boilerplate

Boilerplate Next.js 16 complet avec authentification, RBAC (Role-Based Access Control), multi-tenancy, et interface shadcn/ui prête à l'emploi.

## ✨ Features

### Core
- ✅ **Next.js 16** avec App Router et React 19
- ✅ **TypeScript** en mode strict
- ✅ **PostgreSQL** avec Prisma ORM
- ✅ **Zenstack** pour Access Control automatique (RBAC)
- ✅ **Better Auth** pour authentification complète
- ✅ **Multi-tenant** avec isolation par Company

### Authentification
- ✅ Email/Password
- ✅ OAuth (Google, Microsoft) - Optionnel
- ✅ Réinitialisation de mot de passe
- ✅ Gestion de sessions sécurisée

### RBAC (Rôles & Permissions)
- ✅ 5 rôles prédéfinis: ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER, CLIENT, VIEWER
- ✅ Access policies Zenstack automatiques
- ✅ Permissions granulaires par resource
- ✅ Multi-tenancy avec isolation des données

### Interface Utilisateur
- ✅ 40+ composants shadcn/ui
- ✅ Dashboard responsive avec sidebar
- ✅ TailwindCSS 4
- ✅ Formulaires avec React Hook Form + Zod

## 🚀 Quick Start (10 minutes)

### Prérequis
- Node.js 20+
- PostgreSQL 14+
- npm/yarn/pnpm

### Installation

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Configurer la base de données**
   ```bash
   cp .env.example .env
   # Éditer .env et modifier DATABASE_URL
   ```

3. **Générer le schema et pousser vers la DB**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Créer un administrateur**
   ```bash
   npm run create-admin
   # Suivre les instructions
   ```

5. **Démarrer le serveur**
   ```bash
   npm run dev
   ```

6. **Se connecter**
   - Ouvrir http://localhost:3000
   - Login avec les credentials admin créés
   - Accéder au dashboard

## 🔐 RBAC & Permissions

### Rôles

| Rôle | Description | Accès |
|------|-------------|-------|
| ADMIN | Administrateur système | Accès complet |
| OPERATIONS_MANAGER | Gestionnaire opérations | CRUD sur les données métier |
| FINANCE_MANAGER | Gestionnaire finances | Lecture toutes données + gestion finances |
| CLIENT | Client externe | Lecture limitée à sa company |
| VIEWER | Observateur | Lecture seule limitée |

### Exemple de Policy Zenstack

```zmodel
model YourModel {
  // ... fields

  @@allow('all', auth().role == ADMIN)
  @@allow('create,read,update', auth().role == OPERATIONS_MANAGER)
  @@allow('read', auth().companyId == companyId)
  @@deny('all', true)
}
```

## 📁 Structure du Projet

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Pages authentification
│   ├── (dashboard)/       # Pages dashboard protégées
│   └── api/               # API Routes
├── components/            # Composants React
│   ├── ui/               # shadcn/ui components
│   └── layouts/          # Layouts (Sidebar, Header)
├── lib/                  # Bibliothèques et configurations
│   ├── auth/            # Configuration Better Auth
│   └── db/              # Prisma clients (standard + enhanced)
├── modules/             # Modules métier (à créer)
└── types/               # Types TypeScript globaux
```

## 🛠️ Personnalisation

### Changer le nom de l'app

```bash
# Rechercher/Remplacer
"My SaaS App" → "Votre App"

# Ou utiliser la variable d'environnement
NEXT_PUBLIC_APP_NAME="Votre App"
```

### Ajouter un module

1. Créer le modèle dans `schema.zmodel`
2. Ajouter les permissions dans `src/lib/auth/permissions-client.ts`
3. Créer les Server Actions dans `src/modules/[module]/actions/`
4. Créer les pages dans `src/app/(dashboard)/[module]/`
5. Ajouter dans la sidebar `src/components/layouts/sidebar.tsx`

## 🚢 Déploiement

### Vercel (Recommandé)

```bash
npm i -g vercel
vercel --prod
```

### Variables d'Environnement Requises

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://mon-app.vercel.app"
```

## 📄 License

MIT License - Libre d'utilisation pour projets personnels et commerciaux.

---

**Créé avec ❤️ pour accélérer le développement de SaaS multi-tenant**
README_EOF

echo -e "${GREEN}✓ README.md créé${NC}"

################################################################################
# FIN - Résumé
################################################################################

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Boilerplate créé avec succès !${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📦 Ce qui a été créé :${NC}"
echo "  ✓ Structure de base complète"
echo "  ✓ Système d'authentification (Better Auth)"
echo "  ✓ Composants UI (40+ shadcn/ui)"
echo "  ✓ Schema Zenstack simplifié avec RBAC"
echo "  ✓ Système de permissions"
echo "  ✓ Sidebar adaptée"
echo "  ✓ Configuration (package.json, .env.example)"
echo "  ✓ README.md"
echo ""
echo -e "${YELLOW}📍 Localisation :${NC}"
echo "  $BOILERPLATE_DIR"
echo ""
echo -e "${YELLOW}🚀 Prochaines étapes :${NC}"
echo "  1. cd $BOILERPLATE_DIR"
echo "  2. cp .env.example .env"
echo "  3. Éditer .env et configurer DATABASE_URL"
echo "  4. npm install"
echo "  5. npm run db:generate && npm run db:push"
echo "  6. npm run create-admin"
echo "  7. npm run dev"
echo ""
echo -e "${YELLOW}📝 À ajouter manuellement (optionnel) :${NC}"
echo "  - Modules exemple (Users, Companies, Profile)"
echo "  - Dashboard générique avec stats"
echo "  - Documentation complète (QUICKSTART.md, CUSTOMIZATION.md, etc.)"
echo ""
echo -e "${BLUE}Consultez le plan détaillé dans :${NC}"
echo "  $SOURCE_DIR/.claude/plans/validated-honking-lark.md"
echo ""
