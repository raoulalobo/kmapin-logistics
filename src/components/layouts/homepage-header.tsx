/**
 * Header dynamique pour la homepage
 *
 * Affiche différents boutons selon l'état de connexion de l'utilisateur
 *
 * @module components/layouts/homepage-header
 */

'use client';

import Link from 'next/link';
import { Package, Envelope, Globe, CircleNotch, Airplane, Boat, Calculator, CalendarBlank, CaretDown, User, SignOut, SquaresFour, MagnifyingGlass, ShoppingCart } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useSafeSession } from '@/lib/auth/hooks';
import { authClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export function HomepageHeader() {
  const { data: session, isLoading } = useSafeSession();
  const router = useRouter();

  /**
   * Gérer la déconnexion de l'utilisateur
   */
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      // Forcer un rechargement complet de la page pour invalider toute la session
      // Cela garantit que tous les caches sont vidés et la session mise à jour
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex h-20 items-center justify-between gap-4 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#003D82]">
            <Package className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">Faso Fret</span>
        </Link>

        {/* Navigation principale */}
        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 text-base min-w-0">
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
                <Link href="/#calculateur" className="flex items-center gap-3 cursor-pointer">
                  <Calculator className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Calcul devis</div>
                    <div className="text-xs text-gray-500">Obtenez un devis gratuit</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/tracking" className="flex items-center gap-3 cursor-pointer">
                  <MagnifyingGlass className="h-5 w-5 text-[#003D82]" weight="bold" />
                  <div>
                    <div className="font-medium">Suivi de colis</div>
                    <div className="text-xs text-gray-500">Suivez votre expédition</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/pickups/request" className="flex items-center gap-3 cursor-pointer">
                  <CalendarBlank className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Demande d'enlèvement</div>
                    <div className="text-xs text-gray-500">Planifiez votre collecte</div>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/purchases/request" className="flex items-center gap-3 cursor-pointer">
                  <ShoppingCart className="h-5 w-5 text-[#003D82]" />
                  <div>
                    <div className="font-medium">Achat délégué</div>
                    <div className="text-xs text-gray-500">Nous achetons pour vous</div>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-[#003D82] hover:bg-[#002952] text-white">
                  <User className="h-4 w-4 mr-2" />
                  {session.user.name || session.user.email?.split('@')[0]}
                  <CaretDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name || 'Utilisateur'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center cursor-pointer">
                    <SquaresFour className="h-4 w-4 mr-2" />
                    Tableau de bord
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center cursor-pointer text-red-600">
                  <SignOut className="h-4 w-4 mr-2" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
