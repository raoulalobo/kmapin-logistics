/**
 * Header dynamique pour la homepage
 *
 * Affiche différents boutons selon l'état de connexion de l'utilisateur
 *
 * @module components/layouts/homepage-header
 */

'use client';

import Link from 'next/link';
import { Package, Mail, Globe2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSafeSession } from '@/lib/auth/hooks';

export function HomepageHeader() {
  const { data: session, isLoading } = useSafeSession();

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#003D82]">
            <Package className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">KmapIn</span>
        </Link>

        {/* Navigation principale */}
        <nav className="hidden lg:flex items-center space-x-8 text-base">
          <Link
            href="#quote-calculator"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Devis gratuit
          </Link>
          <Link
            href="#faq"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            FAQ
          </Link>
          <Link
            href="#services"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Services
          </Link>
          <Link
            href="#about"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            À propos
          </Link>
          <Link
            href="#contact"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Contact
          </Link>
        </nav>

        {/* Actions - Boutons dynamiques selon l'état de connexion */}
        <div className="flex items-center space-x-6">
          <button className="text-gray-700 hover:text-gray-900">
            <Mail className="h-5 w-5" />
          </button>
          <button className="text-gray-700 hover:text-gray-900">
            <Globe2 className="h-5 w-5" />
          </button>

          {/* Affichage conditionnel selon l'état de session */}
          {isLoading ? (
            <Button disabled className="bg-[#003D82] text-white">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Chargement...
            </Button>
          ) : session?.user ? (
            <Button asChild className="bg-[#003D82] hover:bg-[#002952] text-white">
              <Link href="/dashboard">Mon compte</Link>
            </Button>
          ) : (
            <Button asChild className="bg-[#003D82] hover:bg-[#002952] text-white">
              <Link href="/login">Se connecter</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
