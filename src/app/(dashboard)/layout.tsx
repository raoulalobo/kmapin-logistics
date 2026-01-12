/**
 * Layout : Dashboard
 *
 * Layout principal pour toutes les pages du dashboard
 * Structure : Sidebar (desktop) + Header + Contenu principal
 * Responsive : Sidebar en Sheet sur mobile, fixe sur desktop
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/config';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { DashboardOverflowFix } from '@/components/layouts/dashboard-overflow-fix';

/**
 * Metadata pour les pages du dashboard
 */
export const metadata: Metadata = {
  title: {
    template: '%s | Faso Fret Logistics',
    default: 'Dashboard | Faso Fret Logistics',
  },
  description: 'Gestion de fret multi-modal',
};

/**
 * Layout Dashboard
 *
 * Vérifie l'authentification et affiche la structure du dashboard
 * Redirection vers /login si l'utilisateur n'est pas authentifié
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifier l'authentification
  const session = await getSession();

  // Rediriger vers login si non authentifié
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <>
      {/* Composant qui force le style overflow sur html/body */}
      <DashboardOverflowFix />

      <div className="flex h-screen w-full max-w-full overflow-hidden" data-dashboard-layout>
        {/* Sidebar - Masquée sur mobile, visible sur desktop */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:flex-shrink-0">
          <Sidebar userRole={session.user.role} />
        </aside>

        {/* Contenu principal */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Header avec menu mobile et infos utilisateur */}
          <Header user={session.user} userRole={session.user.role} />

          {/* Zone de contenu scrollable */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/10">
            <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
