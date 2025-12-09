/**
 * Layout pour les pages d'authentification
 *
 * Layout minimaliste sans navigation avec notifications toast
 */

import type { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Authentification - KmapIn Logistics',
  description: 'Connexion et inscription à la plateforme KmapIn Logistics',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  );
}
