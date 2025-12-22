/**
 * Composant : Header
 *
 * En-tête du dashboard avec navigation mobile, infos utilisateur
 * et actions rapides (notifications, profil, déconnexion)
 */

'use client';

import { useState } from 'react';
import { List, Bell, SignOut, User, Gear } from '@phosphor-icons/react';
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
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6">
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
        {/* Notifications (placeholder pour plus tard) */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Badge de notification */}
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          <span className="sr-only">Notifications</span>
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
              <a href="/dashboard/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Mon profil</span>
              </a>
            </DropdownMenuItem>

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
