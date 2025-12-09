/**
 * API Route : Better Auth
 *
 * Gère tous les endpoints d'authentification via Better Auth
 * Route catch-all qui délègue à Better Auth
 *
 * Endpoints disponibles :
 * - POST /api/auth/sign-in/email : Connexion email/password
 * - POST /api/auth/sign-up/email : Inscription email/password
 * - POST /api/auth/sign-out : Déconnexion
 * - GET /api/auth/session : Obtenir la session
 * - Et tous les autres endpoints Better Auth
 */

import { auth } from '@/lib/auth/config';
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * Exporter les handlers HTTP pour Next.js App Router
 * Better Auth gère automatiquement tous les endpoints
 */
export const { GET, POST } = toNextJsHandler(auth);
