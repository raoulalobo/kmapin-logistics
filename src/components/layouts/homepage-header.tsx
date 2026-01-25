/**
 * Header dynamique pour la homepage
 *
 * Affiche différents boutons selon l'état de connexion de l'utilisateur
 *
 * @module components/layouts/homepage-header
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Package,
  Envelope,
  Globe,
  CircleNotch,
  Airplane,
  Boat,
  Calculator,
  CalendarBlank,
  CaretDown,
  User,
  SignOut,
  SquaresFour,
  MagnifyingGlass,
  ShoppingCart,
  FileText,
  List,
  House,
  Question,
  Info,
  Phone,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSafeSession } from '@/lib/auth/hooks';
import { authClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

/**
 * Props du composant HomepageHeader
 *
 * @param platformName - Nom de la plateforme (depuis SystemConfig, défaut: "Faso Fret")
 * @param platformFullName - Nom complet de la plateforme (depuis SystemConfig, défaut: "Faso Fret Logistics")
 * @param primaryColor - Couleur primaire de la marque (depuis SystemConfig, défaut: "#003D82")
 */
interface HomepageHeaderProps {
  platformName?: string;
  platformFullName?: string;
  primaryColor?: string;
}

export function HomepageHeader({
  platformName = 'Faso Fret',
  platformFullName = 'Faso Fret Logistics',
  primaryColor = '#003D82',
}: HomepageHeaderProps = {}) {
  const { data: session, isLoading } = useSafeSession();
  const router = useRouter();

  // État pour contrôler l'ouverture/fermeture du menu mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        {/* Menu burger mobile - visible uniquement sur mobile/tablette */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <List className="h-6 w-6 text-[#003D82]" weight="bold" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>

          {/*
           * Menu mobile en Sheet (panneau latéral)
           * Contient toute la navigation et les actions
           */}
          <SheetContent side="left" className="p-0 w-80 bg-white">
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <div className="flex h-full flex-col">
              {/* En-tête du menu mobile avec logo (nom dynamique) */}
              <div className="flex h-20 items-center border-b px-6">
                <Link
                  href="/"
                  className="flex items-center gap-3"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Package className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">{platformName}</span>
                </Link>
              </div>

              {/* Navigation mobile avec scroll */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 py-6">
                  {/* Section principale */}
                  <div className="space-y-1">
                    <h4 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Navigation
                    </h4>
                    <Link
                      href="/"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <House className="h-5 w-5 text-[#003D82]" />
                      Accueil
                    </Link>
                    <Link
                      href="/#calculateur"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calculator className="h-5 w-5 text-[#003D82]" />
                      Devis gratuit
                    </Link>
                    <Link
                      href="/#faq"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Question className="h-5 w-5 text-[#003D82]" />
                      FAQ
                    </Link>
                    <Link
                      href="/#why-kmapin"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Info className="h-5 w-5 text-[#003D82]" />
                      À propos
                    </Link>
                    <Link
                      href="/#contact"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Phone className="h-5 w-5 text-[#003D82]" />
                      Contact
                    </Link>
                  </div>

                  <Separator />

                  {/* Section Services */}
                  <div className="space-y-1">
                    <h4 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Services
                    </h4>
                    <Link
                      href="/services/transport-aerien"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Airplane className="h-5 w-5 text-[#003D82]" />
                      <div>
                        <div>Transport Aérien</div>
                        <div className="text-xs text-gray-500">Livraison express mondiale</div>
                      </div>
                    </Link>
                    <Link
                      href="/services/transport-maritime"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Boat className="h-5 w-5 text-[#003D82]" />
                      <div>
                        <div>Transport Maritime</div>
                        <div className="text-xs text-gray-500">Fret FCL et LCL</div>
                      </div>
                    </Link>
                    <Link
                      href="/tracking"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <MagnifyingGlass className="h-5 w-5 text-[#003D82]" weight="bold" />
                      <div>
                        <div>Suivi de colis</div>
                        <div className="text-xs text-gray-500">Suivez votre expédition</div>
                      </div>
                    </Link>
                    <Link
                      href="/pickups/request"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <CalendarBlank className="h-5 w-5 text-[#003D82]" />
                      <div>
                        <div>Demande d'enlèvement</div>
                        <div className="text-xs text-gray-500">Planifiez votre collecte</div>
                      </div>
                    </Link>
                    <Link
                      href="/purchases/request"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ShoppingCart className="h-5 w-5 text-[#003D82]" />
                      <div>
                        <div>Achat délégué</div>
                        <div className="text-xs text-gray-500">Nous achetons pour vous</div>
                      </div>
                    </Link>
                  </div>

                  <Separator />

                  {/* Bouton de connexion/déconnexion mobile */}
                  <div className="px-3">
                    {isLoading ? (
                      <Button disabled className="w-full bg-[#003D82] text-white">
                        <CircleNotch className="h-4 w-4 animate-spin mr-2" />
                        Chargement...
                      </Button>
                    ) : session?.user ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#003D82] text-white">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{session.user.name || 'Utilisateur'}</p>
                            <p className="text-xs text-gray-500">{session.user.email}</p>
                          </div>
                        </div>
                        <Button
                          asChild
                          className="w-full bg-[#003D82] hover:bg-[#002952] text-white"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link href="/dashboard">
                            <SquaresFour className="h-4 w-4 mr-2" />
                            Tableau de bord
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleSignOut();
                          }}
                        >
                          <SignOut className="h-4 w-4 mr-2" />
                          Se déconnecter
                        </Button>
                      </div>
                    ) : (
                      <Button
                        asChild
                        className="w-full bg-[#003D82] hover:bg-[#002952] text-white"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/login">
                          <User className="h-4 w-4 mr-2" />
                          Se connecter
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Footer du menu mobile (nom dynamique) */}
              <div className="border-t p-4">
                <p className="text-xs text-center text-gray-500">
                  © {new Date().getFullYear()} {platformFullName}
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo (nom dynamique depuis la configuration) */}
        <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <Package className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">{platformName}</span>
        </Link>

        {/* Navigation principale (desktop uniquement) */}
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
                    <div className="text-xs text-gray-500">Estimation instantanée</div>
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
        <div className="flex items-center space-x-4 lg:space-x-6">
          {/* Icônes d'action - cachées sur mobile car présentes dans le menu */}
          <button className="hidden sm:block text-gray-700 hover:text-gray-900">
            <Envelope className="h-5 w-5" />
          </button>
          <button className="hidden sm:block text-gray-700 hover:text-gray-900">
            <Globe className="h-5 w-5" />
          </button>

          {/* Affichage conditionnel selon l'état de session - caché sur mobile (présent dans le menu burger) */}
          {isLoading ? (
            <Button disabled className="hidden lg:flex bg-[#003D82] text-white">
              <CircleNotch className="h-4 w-4 animate-spin mr-2" />
              Chargement...
            </Button>
          ) : session?.user ? (
            /* Menu utilisateur connecté - caché sur mobile (présent dans le menu burger) */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="hidden lg:flex bg-[#003D82] hover:bg-[#002952] text-white">
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
            /* Bouton connexion - caché sur mobile (présent dans le menu burger) */
            <Button asChild className="hidden lg:flex bg-[#003D82] hover:bg-[#002952] text-white">
              <Link href="/login">Se connecter</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
