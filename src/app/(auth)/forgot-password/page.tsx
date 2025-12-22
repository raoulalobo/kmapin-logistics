/**
 * Page : Mot de passe oublié
 *
 * Permet aux utilisateurs de demander un lien de réinitialisation de mot de passe
 * Le lien sera affiché en console (dev) ou envoyé par email (production)
 */

'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Envelope, CircleNotch, ArrowLeft } from '@phosphor-icons/react';
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

import { requestPasswordResetAction } from '../_actions/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /**
   * Handler pour la soumission du formulaire
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await requestPasswordResetAction(formData);

      if ('error' in result) {
        toast.error('Erreur', {
          description: result.error,
        });
      } else {
        toast.success('Demande envoyée', {
          description: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation. Vérifiez également vos spams.',
          duration: 6000, // Afficher plus longtemps pour que l'utilisateur lise bien
        });
        router.push('/login');
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Envelope className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Mot de passe oublié ?
          </CardTitle>
          <CardDescription className="text-center">
            Entrez votre adresse email pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Envelope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  required
                  disabled={isPending}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Si cette adresse correspond à un compte, vous recevrez un email avec les instructions de réinitialisation
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Envoyer le lien'
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour à la connexion
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
