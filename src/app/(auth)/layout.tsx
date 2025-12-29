/**
 * Layout pour les pages d'authentification
 *
 * Layout minimaliste sans navigation avec notifications toast
 */

import type { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Authentification - Faso Fret Logistics',
  description: 'Connexion et inscription à la plateforme Faso Fret Logistics',
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
