/**
 * Header dynamique pour la homepage
 *
 * Affiche différents boutons selon l'état de connexion de l'utilisateur
 *
 * @module components/layouts/homepage-header
 */

'use client';

import Link from 'next/link';
import { Package, Envelope, Globe, CircleNotch, Airplane, Boat, Truck, Warehouse, Anchor, Strategy, CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
            href="/#calculateur"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Devis gratuit
          </Link>
          <Link
            href="/#faq"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            FAQ
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors font-medium outline-none">
              Services
              <CaretDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem asChild>
                <Link href="/services/transport-aerien" className="flex items-center gap-3 cursor-pointer">
                  <Airplane className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Transport Aérien</div>
                    <div className="text-xs text-gray-500">Livraison express mondiale</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/services/transport-maritime" className="flex items-center gap-3 cursor-pointer">
                  <Boat className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Transport Maritime</div>
                    <div className="text-xs text-gray-500">Fret FCL et LCL</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/services/transport-routier" className="flex items-center gap-3 cursor-pointer">
                  <Truck className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Transport Routier</div>
                    <div className="text-xs text-gray-500">Livraison porte-à-porte</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/services/entreposage" className="flex items-center gap-3 cursor-pointer">
                  <Warehouse className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Solutions d'Entreposage</div>
                    <div className="text-xs text-gray-500">Stockage et distribution</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/services/services-portuaires" className="flex items-center gap-3 cursor-pointer">
                  <Anchor className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Services Portuaires</div>
                    <div className="text-xs text-gray-500">Dédouanement et manutention</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/services/logistique-4pl" className="flex items-center gap-3 cursor-pointer">
                  <Strategy className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Logistique 4PL</div>
                    <div className="text-xs text-gray-500">Pilotage stratégique</div>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/#why-kmapin"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            À propos
          </Link>
          <Link
            href="/#contact"
            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Contact
          </Link>
        </nav>

        {/* Actions - Boutons dynamiques selon l'état de connexion */}
        <div className="flex items-center space-x-6">
          <button className="text-gray-700 hover:text-gray-900">
            <Envelope className="h-5 w-5" />
          </button>
          <button className="text-gray-700 hover:text-gray-900">
            <Globe className="h-5 w-5" />
          </button>

          {/* Affichage conditionnel selon l'état de session */}
          {isLoading ? (
            <Button disabled className="bg-[#003D82] text-white">
              <CircleNotch className="h-4 w-4 animate-spin mr-2" />
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
