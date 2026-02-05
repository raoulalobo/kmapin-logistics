/**
 * Root Layout - Layout principal de l'application
 *
 * Ce layout encapsule TOUTES les pages de l'application et définit :
 * - Les metadata SEO globales (titre, description)
 * - La structure HTML de base (<html>, <body>)
 * - Les providers globaux (TanStack Query, etc.)
 * - Le composant Toaster pour les notifications
 *
 * Les metadata utilisent le nom de la plateforme depuis la configuration système,
 * permettant aux ADMIN de personnaliser le branding via /dashboard/settings/platform.
 *
 * @module app/layout
 */

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import { getSystemConfig } from '@/modules/system-config/lib/get-system-config';

/**
 * Génération des métadonnées SEO dynamiques pour le site
 *
 * Utilise le nom complet de la plateforme et le slogan depuis SystemConfig.
 * Ces valeurs sont modifiables par les ADMIN dans les paramètres de la plateforme.
 *
 * Le cache de getSystemConfig() (1h) évite les requêtes DB répétées.
 *
 * @returns Metadata Next.js avec titre et description basés sur la config
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getSystemConfig();

  return {
    title: `${config.platformFullName} - Gestion de Fret Multi-Modal`,
    description:
      config.platformSlogan ||
      'Plateforme de gestion logistique pour transport routier, maritime, aérien et ferroviaire',
  };
}

/**
 * Root Layout de l'application
 *
 * Structure de base :
 * - html lang="fr" pour l'accessibilité et le SEO
 * - body avec font-sans et antialiased pour une typographie propre
 * - Providers pour les contextes globaux (TanStack Query)
 * - Toaster pour les notifications toast de l'application
 *
 * @param children - Contenu des pages (tous les layouts et pages de l'app)
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
