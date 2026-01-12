/**
 * Composant : Header
 *
 * En-tête du dashboard avec navigation mobile, infos utilisateur
 * et actions rapides (notifications, profil, déconnexion)
 */

'use client';

import { useState, useEffect } from 'react';
import { List, Bell, SignOut, Gear } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { logoutAction } from '@/app/(auth)/_actions/auth';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/generated/prisma';
import { countPendingQuotesAction } from '@/modules/quotes';

/**
 * Props du composant Header
 */
interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  userRole?: UserRole; // Rôle de l'utilisateur pour le passer à la Sidebar mobile
}

/**
 * Composant Header
 *
 * En-tête responsive avec :
 * - List hamburger pour mobile (ouvre la sidebar en sheet)
 * - List utilisateur avec dropdown (profil, paramètres, déconnexion)
 * - Notifications (badge indicatif)
 */
export function Header({ user, userRole = 'CLIENT' }: HeaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingQuotesCount, setPendingQuotesCount] = useState(0);

  /**
   * Charger le nombre de devis en attente de validation
   * Uniquement pour les ADMIN et MANAGERS
   */
  useEffect(() => {
    async function loadPendingQuotes() {
      // Seuls les ADMIN et MANAGERS voient les notifications
      if (userRole === 'CLIENT' || userRole === 'VIEWER') {
        return;
      }

      const result = await countPendingQuotesAction();
      if (result.success) {
        setPendingQuotesCount(result.data);
      }
    }

    loadPendingQuotes();

    // Recharger toutes les 30 secondes
    const interval = setInterval(loadPendingQuotes, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  /**
   * Handler pour la déconnexion
   * Appelle l'action serveur et redirige vers la page d'accueil
   */
  async function handleLogout() {
    setIsLoading(true);
    try {
      await logoutAction();
      router.push('/'); // Redirection vers la page d'accueil
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setIsLoading(false);
    }
  }

  /**
   * Obtenir les initiales de l'utilisateur pour l'avatar
   */
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center gap-4 border-b bg-background px-6">
      {/* List hamburger mobile - Affiche la sidebar en Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <List className="h-5 w-5" />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar userRole={userRole} />
        </SheetContent>
      </Sheet>

      {/* Espace flexible pour pousser les éléments à droite */}
      <div className="flex-1" />

      {/* Actions rapides */}
      <div className="flex items-center gap-2">
        {/* Notifications - Badge pour les devis en attente */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => router.push('/dashboard/quotes')}
          title={pendingQuotesCount > 0 ? `${pendingQuotesCount} devis en attente de validation` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {/* Badge de notification dynamique */}
          {pendingQuotesCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {pendingQuotesCount > 9 ? '9+' : pendingQuotesCount}
            </span>
          )}
          <span className="sr-only">
            {pendingQuotesCount > 0 ? `${pendingQuotesCount} notifications` : 'Notifications'}
          </span>
        </Button>

        {/* List utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end" forceMount>
            {/* Infos utilisateur */}
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || 'Utilisateur'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'email@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Actions */}
            <DropdownMenuItem asChild>
              <a href="/dashboard/settings" className="cursor-pointer">
                <Gear className="mr-2 h-4 w-4" />
                <span>Paramètres</span>
              </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Déconnexion */}
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <SignOut className="mr-2 h-4 w-4" />
              <span>{isLoading ? 'Déconnexion...' : 'Se déconnecter'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
