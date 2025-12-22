/**
 * Page : Réinitialisation de mot de passe
 *
 * Permet de définir un nouveau mot de passe via un token de réinitialisation
 */

'use client';

import { useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Key, Lock, CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { resetPasswordAction } from '../_actions/auth';

/**
 * Composant interne avec accès aux searchParams
 */
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isPending, startTransition] = useTransition();

  /**
   * Handler pour la soumission du formulaire
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    // Ajouter le token au formData
    if (token) {
      formData.append('token', token);
    }

    startTransition(async () => {
      const result = await resetPasswordAction(formData);

      if ('error' in result) {
        toast.error('Erreur de réinitialisation', {
          description: result.error,
        });
      } else {
        toast.success('Mot de passe modifié !', {
          description: 'Redirection vers la page de connexion...',
        });
        // Succès : rediriger vers la page de connexion
        router.push(result.redirectTo || '/login');
      }
    });
  }

  // Vérifier si le token est présent
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Key className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Lien invalide</CardTitle>
            <CardDescription>
              Le lien de réinitialisation est invalide ou a expiré.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">Retour à la connexion</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Définissez votre nouveau mot de passe
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Champ mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 8 caractères avec majuscule, minuscule et chiffre
              </p>
            </div>

            {/* Champ confirmation */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Modification en cours...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Modifier le mot de passe
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="hover:text-primary underline underline-offset-4"
              >
                Retour à la connexion
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

/**
 * Page exportée avec Suspense boundary
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <CircleNotch className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
