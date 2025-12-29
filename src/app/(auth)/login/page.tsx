/**
 * Page : Connexion
 *
 * Formulaire de connexion avec email/password ou OAuth
 * Design moderne split-screen avec branding
 */

'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignIn, Envelope, Lock, CircleNotch, ArrowLeft, Package, CheckSquare, Square } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { authClient } from '@/lib/auth/client';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rememberMe, setRememberMe] = useState(false);

  /**
   * Handler pour la soumission du formulaire
   *
   * Utilise le SDK client Better Auth pour gérer l'authentification.
   * Le SDK gère automatiquement les cookies de session via le navigateur.
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    startTransition(async () => {
      try {
        // Utiliser le SDK client Better Auth
        // Le SDK gère automatiquement les cookies via le navigateur
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: '/dashboard',
        });

        if (result.error) {
          toast.error('Erreur de connexion', {
            description: result.error.message || 'Email ou mot de passe incorrect',
          });
        } else {
          toast.success('Connexion réussie !', {
            description: 'Redirection vers votre espace...',
          });
          // Succès : rediriger vers le dashboard
          router.push('/dashboard');
          router.refresh(); // Rafraîchir pour charger la session
        }
      } catch (error) {
        console.error('Login error:', error);
        toast.error('Erreur de connexion', {
          description: 'Une erreur est survenue lors de la connexion',
        });
      }
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Côté gauche - Branding & Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#003D82] via-[#002952] to-[#001a33] relative overflow-hidden">
        {/* Pattern de fond décoratif */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl"></div>
        </div>

        {/* Contenu */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo et titre */}
          <div>
            <Link href="/" className="flex items-center space-x-3 mb-12 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                <Package className="h-7 w-7 text-white" />
              </div>
              <span className="text-2xl font-bold">KmapIn Logistics</span>
            </Link>

            <div className="space-y-6 max-w-md">
              <h1 className="text-4xl font-bold leading-tight">
                Connectez-vous à votre espace professionnel
              </h1>
              <p className="text-lg text-blue-100">
                Gérez vos expéditions internationales, suivez vos envois en temps réel et accédez à tous vos documents logistiques.
              </p>
            </div>
          </div>

          {/* Points clés */}
          <div className="space-y-4 max-w-md">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <CheckSquare className="h-5 w-5 text-blue-200" weight="fill" />
              </div>
              <div>
                <h3 className="font-semibold">Suivi en temps réel</h3>
                <p className="text-sm text-blue-100">Suivez vos expéditions à chaque étape</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <CheckSquare className="h-5 w-5 text-blue-200" weight="fill" />
              </div>
              <div>
                <h3 className="font-semibold">Gestion complète</h3>
                <p className="text-sm text-blue-100">Devis, factures, documents douaniers</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <CheckSquare className="h-5 w-5 text-blue-200" weight="fill" />
              </div>
              <div>
                <h3 className="font-semibold">Support dédié</h3>
                <p className="text-sm text-blue-100">Une équipe à votre écoute 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Côté droit - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Retour à l'accueil (mobile) */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors lg:hidden mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </Link>

          {/* Header du formulaire */}
          <div className="text-center lg:text-left">
            {/* Logo mobile */}
            <div className="flex justify-center lg:hidden mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#003D82]">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900">Bienvenue !</h2>
            <p className="mt-2 text-gray-600">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Adresse email
              </Label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  required
                  disabled={isPending}
                  className="pl-11 h-12 border-gray-300 focus:border-[#003D82] focus:ring-[#003D82]"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                  Mot de passe
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#003D82] hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="pl-11 h-12 border-gray-300 focus:border-[#003D82] focus:ring-[#003D82]"
                />
              </div>
            </div>

            {/* Se souvenir de moi */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-sm text-gray-700 cursor-pointer select-none"
              >
                Se souvenir de moi
              </label>
            </div>

            {/* Bouton de connexion */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#003D82] hover:bg-[#002952] text-white font-medium text-base shadow-lg hover:shadow-xl transition-all"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <CircleNotch className="mr-2 h-5 w-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <SignIn className="mr-2 h-5 w-5" />
                  Se connecter
                </>
              )}
            </Button>
          </form>

          {/* Lien inscription */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link
                href="/register"
                className="text-[#003D82] font-semibold hover:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>

          {/* Retour à l'accueil (desktop) */}
          <div className="hidden lg:block text-center pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à l'accueil</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
