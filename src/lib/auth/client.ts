/**
 * Client Better Auth pour le navigateur
 *
 * Permet l'authentification côté client avec gestion automatique des cookies
 */

import { createAuthClient } from 'better-auth/react';

/**
 * Client Better Auth pour le frontend
 *
 * Utilisé dans les composants React pour :
 * - Se connecter (signIn)
 * - S'inscrire (signUp)
 * - Se déconnecter (signOut)
 * - Vérifier la session (useSession)
 *
 * @example
 * ```tsx
 * import { authClient } from '@/lib/auth/client';
 *
 * function LoginForm() {
 *   const { signIn } = authClient;
 *
 *   async function handleLogin() {
 *     await signIn.email({
 *       email: 'user@example.com',
 *       password: 'password123',
 *     });
 *   }
 * }
 * ```
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
});
