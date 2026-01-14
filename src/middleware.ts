/**
 * Middleware Next.js - Redirection des utilisateurs authentifiés
 *
 * Ce middleware intercepte les routes publiques (/pickups/request, /purchases/request)
 * et redirige automatiquement les utilisateurs authentifiés vers les versions dashboard.
 *
 * Avantages du middleware :
 * - ⚡ Rapide (avant même le routing Next.js)
 * - 🚫 Pas de flash de contenu (redirection AVANT le rendu)
 * - 🎯 Logique centralisée (pas besoin de modifier chaque page)
 * - 🔒 Plus sécurisé (vérification côté serveur)
 *
 * IMPORTANT : Utilise Node.js Runtime (pas Edge) car Better Auth nécessite Prisma
 * qui utilise des APIs Node.js complètes (setImmediate, fs, etc.)
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/config';

/**
 * Force Node.js Runtime pour compatibilité avec Better Auth + Prisma
 *
 * Better Auth utilise Prisma qui nécessite des APIs Node.js complètes
 * (setImmediate, fs, crypto natif) non disponibles dans Edge Runtime.
 *
 * Performance : Toujours très rapide, juste légèrement moins que Edge.
 */
export const runtime = 'nodejs';

/**
 * Configuration du middleware
 * Définit les routes qui doivent être interceptées
 */
export const config = {
  matcher: [
    '/pickups/request',
    '/purchases/request',
  ],
};

/**
 * Fonction middleware principale
 *
 * Vérifie la session de l'utilisateur et redirige les utilisateurs connectés
 * vers les versions dashboard des formulaires.
 *
 * Workflow :
 * 1. Utilisateur accède à /pickups/request ou /purchases/request
 * 2. Middleware vérifie la session via Better Auth
 * 3. Si connecté → Redirection vers /dashboard/[module]/new
 * 4. Si non connecté → Continue vers la page publique
 *
 * @param request - Requête Next.js entrante
 * @returns Response (redirection ou continuation)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Vérifier la session avec Better Auth
    // On utilise l'API Better Auth qui fonctionne avec les cookies de la requête
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Si l'utilisateur est connecté, rediriger vers la version dashboard
    if (session?.user) {
      console.log(`🔀 [Middleware] Utilisateur connecté (${session.user.email}), redirection depuis ${pathname}`);

      // Mapper les routes publiques vers les routes dashboard
      const dashboardRoutes: Record<string, string> = {
        '/pickups/request': '/dashboard/pickups/new',
        '/purchases/request': '/dashboard/purchases/new',
      };

      const dashboardRoute = dashboardRoutes[pathname];

      if (dashboardRoute) {
        const url = request.nextUrl.clone();
        url.pathname = dashboardRoute;
        return NextResponse.redirect(url);
      }
    }

    // Si pas de session ou route non concernée, continuer normalement
    console.log(`✅ [Middleware] Accès autorisé à ${pathname} (utilisateur non connecté)`);
    return NextResponse.next();
  } catch (error) {
    // En cas d'erreur de vérification de session, laisser passer
    // (pour ne pas bloquer l'accès en cas de problème Better Auth)
    console.error('❌ [Middleware] Erreur vérification session:', error);
    return NextResponse.next();
  }
}
