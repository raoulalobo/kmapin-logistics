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
    <div className="flex h-full overflow-hidden">
      {/* Sidebar - Masquée sur mobile, visible sur desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar userRole={session.user.role} />
      </aside>

      {/* Contenu principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header avec menu mobile et infos utilisateur */}
        <Header user={session.user} userRole={session.user.role} />

        {/* Zone de contenu scrollable */}
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="mx-auto max-w-7xl p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
