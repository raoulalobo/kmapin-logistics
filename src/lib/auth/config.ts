/**
 * Configuration Better Auth - Faso Fret Logistics
 *
 * Configuration de l'authentification avec Better Auth incluant:
 * - Email/Password
 * - OAuth (Google, Microsoft pour SSO entreprise)
 * - 2FA / MFA
 * - RBAC (Role-Based Access Control)
 * - Sessions sécurisées
 *
 * @see https://www.better-auth.com/docs
 */

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/db/client';

/**
 * Instance Better Auth configurée pour l'application
 *
 * Gère l'authentification complète avec les providers:
 * - Email/Password avec vérification d'email
 * - OAuth (Google pour SSO)
 * - 2FA/MFA pour sécurité renforcée
 */
export const auth = betterAuth({
  /**
   * Adapter Prisma pour stocker les données d'authentification
   * Utilise les modèles : User, Account, Session, VerificationToken
   */
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  /**
   * Champs additionnels pour le modèle User
   *
   * Better Auth utilise ces champs pour automatiquement enrichir la session
   * avec les données RBAC nécessaires. Ces champs sont automatiquement inclus
   * dans la session sans nécessiter de callback custom.
   *
   * @see https://www.better-auth.com/docs/concepts/database#additional-fields
   */
  user: {
    additionalFields: {
      /**
       * Rôle de l'utilisateur pour le contrôle d'accès RBAC
       * Les valeurs possibles sont définies dans l'enum UserRole du schéma Prisma
       */
      role: {
        type: 'string',
        required: true,
        defaultValue: 'CLIENT',
        input: false, // Empêche les utilisateurs de définir leur propre rôle lors de l'inscription
        returned: true, // Inclure dans la session et les réponses API
      },
      /**
       * ID de la compagnie à laquelle appartient l'utilisateur
       * Utilisé pour le filtrage multi-tenant des données
       */
      companyId: {
        type: 'string',
        required: false,
        defaultValue: null,
        input: false, // Empêche les utilisateurs de choisir leur compagnie lors de l'inscription
        returned: true, // Inclure dans la session et les réponses API
      },
    },
  },

  /**
   * Configuration Email/Password
   * Authentification traditionnelle (vérification d'email désactivée temporairement)
   */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,

    /**
     * Durée de validité du token de réinitialisation de mot de passe (en secondes)
     * Par défaut: 1 heure (3600 secondes)
     */
    resetPasswordTokenExpiresIn: 3600,

    /**
     * Callback pour envoyer l'email de réinitialisation de mot de passe
     * Better Auth génère automatiquement le token et l'URL
     *
     * @param user - Utilisateur demandant la réinitialisation
     * @param url - URL complète de réinitialisation avec token (API Better Auth)
     * @param token - Token de réinitialisation généré
     */
    sendResetPassword: async ({ user, url, token }) => {
      // Construire l'URL directe vers notre page avec le token
      const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
      const directUrl = `${baseUrl}/reset-password?token=${token}`;

      // Pour le développement : afficher le lien en console
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📧 RÉINITIALISATION DE MOT DE PASSE');
      console.log('═══════════════════════════════════════════════════════');
      console.log('👤 Utilisateur:', user.name);
      console.log('📧 Email:      ', user.email);
      console.log('');
      console.log('🔗 Lien de réinitialisation:');
      console.log('   ', directUrl);
      console.log('');
      console.log('⏰ Valide pendant: 1 heure');
      console.log('═══════════════════════════════════════════════════════\n');

      // TODO: Production - Envoyer via Resend
      // import { sendEmail } from '@/lib/email';
      // await sendEmail({
      //   to: user.email,
      //   subject: 'Réinitialisation de mot de passe - Faso Fret Logistics',
      //   html: `
      //     <h1>Réinitialisation de mot de passe</h1>
      //     <p>Bonjour ${user.name},</p>
      //     <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
      //     <p><a href="${url}">Cliquez ici pour réinitialiser votre mot de passe</a></p>
      //     <p>Ce lien est valide pendant 1 heure.</p>
      //     <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      //   `,
      // });
    },
  },

  /**
   * Providers OAuth pour SSO entreprise
   * Permet aux utilisateurs de se connecter avec leurs comptes professionnels
   */
  socialProviders: {
    // Google OAuth (pour SSO)
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },

    // Microsoft OAuth (pour SSO entreprise)
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenant: 'common', // 'common' pour tous les comptes Microsoft
      enabled: !!process.env.MICROSOFT_CLIENT_ID,
    },
  },

  /**
   * Configuration 2FA/MFA
   * Authentification à deux facteurs pour sécurité renforcée
   */
  twoFactor: {
    enabled: true,
    issuer: 'Faso Fret Logistics',
  },

  /**
   * Configuration des sessions
   */
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // Mise à jour de la session chaque jour
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache de 5 minutes
    },
  },

  /**
   * Configuration avancée
   */
  advanced: {
    // Générer des IDs sécurisés
    generateId: () => crypto.randomUUID(),

    // Cookies sécurisés en production
    useSecureCookies: process.env.NODE_ENV === 'production',

    // Support cross-subdomain pour staging/production
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
      domain: process.env.COOKIE_DOMAIN, // ex: .kmapin.com
    },
  },

  /**
   * URL de base de l'application
   */
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  /**
   * Secret pour signer les tokens JWT
   * IMPORTANT : Changer cette valeur en production !
   */
  secret: process.env.BETTER_AUTH_SECRET!,

  /**
   * Callbacks personnalisés
   */
  callbacks: {
    /**
     * Callback après création d'un utilisateur
     * Utilisé pour assigner le rôle par défaut et autres données
     */
    async user({ user, account }) {
      // Le rôle par défaut CLIENT est déjà défini dans additionalFields
      // Pas besoin de l'assigner ici
      return user;
    },

    /**
     * Callback lors de la connexion
     * Utilisé pour logs ou analytics
     */
    async signIn({ user, account }) {
      console.log(`User ${user.email} signed in`);
      return true;
    },

    /**
     * NOTA : Le callback session n'est plus nécessaire car nous utilisons
     * additionalFields qui enrichit automatiquement la session avec les champs
     * personnalisés (role, companyId).
     *
     * Better Auth inclut automatiquement les additionalFields dans la session
     * lorsque returned: true est défini.
     */
  },
});

/**
 * Type pour l'instance auth (pour TypeScript)
 */
export type Auth = typeof auth;

/**
 * Type pour la session utilisateur avec champs custom
 */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: 'ADMIN' | 'OPERATIONS_MANAGER' | 'FINANCE_MANAGER' | 'CLIENT' | 'VIEWER';
  companyId?: string | null;
}

/**
 * Helper pour obtenir la session de l'utilisateur connecté
 *
 * IMPORTANT : En Next.js App Router (Server Components), il faut passer les headers
 * de la requête pour que Better Auth puisse lire les cookies de session.
 *
 * @returns Session avec user et métadonnées ou null
 *
 * @example
 * ```ts
 * import { getSession } from '@/lib/auth/config';
 *
 * export async function myAction() {
 *   const session = await getSession();
 *   if (!session?.user) {
 *     throw new Error('Unauthorized');
 *   }
 *
 *   console.log('User role:', session.user.role);
 * }
 * ```
 */
export async function getSession() {
  // En Next.js App Router, on doit utiliser les headers de la requête
  // pour que Better Auth puisse lire les cookies de session
  const { headers } = await import('next/headers');

  const headersList = await headers();

  // Debug: afficher les cookies reçus
  const cookies = headersList.get('cookie');
  console.log('🔍 [getSession] Cookies reçus:', cookies ? cookies.substring(0, 100) + '...' : 'AUCUN');

  const session = await auth.api.getSession({
    headers: headersList,
  });

  console.log('🔍 [getSession] Session récupérée:', session ? `User: ${session.user?.email}` : 'NULL');

  return session;
}

/**
 * Helper pour vérifier si l'utilisateur est authentifié
 *
 * @throws Error si pas authentifié
 * @returns Session utilisateur
 *
 * @example
 * ```ts
 * import { requireAuth } from '@/lib/auth/config';
 *
 * export async function protectedAction() {
 *   const session = await requireAuth();
 *   // session.user est garanti non-null
 * }
 * ```
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized: You must be logged in');
  }

  return session;
}

/**
 * Helper pour vérifier si l'utilisateur est administrateur
 *
 * @throws Error si pas authentifié ou pas admin
 * @returns Session utilisateur avec rôle ADMIN
 *
 * @example
 * ```ts
 * import { requireAdmin } from '@/lib/auth/config';
 *
 * export async function adminOnlyAction() {
 *   const session = await requireAdmin();
 *   // session.user.role est garanti 'ADMIN'
 * }
 * ```
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required');
  }

  return session;
}
