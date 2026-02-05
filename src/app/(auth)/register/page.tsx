/**
 * Page : Inscription
 *
 * Formulaire d'inscription avec validation complète
 * Design moderne split-screen cohérent avec /login
 */

'use client';

import { useTransition, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Envelope,
  Lock,
  User as UserIcon,
  CircleNotch,
  ArrowLeft,
  Package,
  CheckCircle,
  ShieldCheck,
  Rocket,
  Users
} from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { registerAction } from '../_actions/auth';
import { useSystemConfig } from '@/components/providers/system-config-provider';

export default function RegisterPage() {
  // Récupérer la configuration système depuis le Context (fourni par AuthLayout)
  // Permet d'afficher le nom de la plateforme de manière dynamique
  const { platformFullName } = useSystemConfig();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  /**
   * Calculer la force du mot de passe
   */
  useEffect(() => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 4) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [password]);

  /**
   * Vérifier si les mots de passe correspondent
   */
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  /**
   * Handler pour la soumission du formulaire
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!acceptTerms) {
      toast.error('Conditions requises', {
        description: 'Vous devez accepter les conditions d\'utilisation',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Erreur', {
        description: 'Les mots de passe ne correspondent pas',
      });
      return;
    }

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await registerAction(formData);

      if ('error' in result) {
        toast.error('Erreur lors de l\'inscription', {
          description: result.error,
        });
      } else {
        toast.success('Compte créé avec succès !', {
          description: 'Vous pouvez maintenant vous connecter avec vos identifiants.',
          duration: 5000,
        });
        // Succès : rediriger vers la page de connexion
        router.push(result.redirectTo || '/login');
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
              <span className="text-2xl font-bold">{platformFullName}</span>
            </Link>

            <div className="space-y-6 max-w-md">
              <h1 className="text-4xl font-bold leading-tight">
                Rejoignez des milliers d'entreprises
              </h1>
              <p className="text-lg text-blue-100">
                Simplifiez la gestion de vos expéditions internationales avec notre plateforme tout-en-un.
              </p>
            </div>
          </div>

          {/* Avantages de l'inscription */}
          <div className="space-y-4 max-w-md">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <Rocket className="h-5 w-5 text-blue-200" weight="fill" />
              </div>
              <div>
                <h3 className="font-semibold">Démarrage immédiat</h3>
                <p className="text-sm text-blue-100">Créez votre compte en 2 minutes</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <ShieldCheck className="h-5 w-5 text-blue-200" weight="fill" />
              </div>
              <div>
                <h3 className="font-semibold">Sécurité garantie</h3>
                <p className="text-sm text-blue-100">Vos données protégées et chiffrées</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <Users className="h-5 w-5 text-blue-200" weight="fill" />
              </div>
              <div>
                <h3 className="font-semibold">Support expert</h3>
                <p className="text-sm text-blue-100">Une équipe dédiée pour vous accompagner</p>
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

            <h2 className="text-3xl font-bold text-gray-900">Créer un compte</h2>
            <p className="mt-2 text-gray-600">
              Commencez à gérer vos expéditions dès aujourd'hui
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom complet */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-900">
                Nom complet
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Jean Dupont"
                  required
                  disabled={isPending}
                  className="pl-11 h-12 border-gray-300 focus:border-[#003D82] focus:ring-[#003D82]"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Adresse email professionnelle
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
              <p className="text-xs text-gray-500">
                Vous recevrez un email de vérification
              </p>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 border-gray-300 focus:border-[#003D82] focus:ring-[#003D82]"
                />
              </div>
              {/* Indicateur de force du mot de passe */}
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <div className={`h-1 flex-1 rounded ${passwordStrength ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 flex-1 rounded ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Minimum 8 caractères, majuscules, minuscules et chiffres
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-11 h-12 border-gray-300 focus:border-[#003D82] focus:ring-[#003D82] ${
                    confirmPassword && !passwordsMatch ? 'border-red-500' : ''
                  }`}
                />
                {confirmPassword && passwordsMatch && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" weight="fill" />
                )}
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-600">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            {/* Conditions d'utilisation */}
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-700 leading-relaxed cursor-pointer select-none"
              >
                J'accepte les{' '}
                <Link
                  href="/terms"
                  className="text-[#003D82] font-medium hover:underline"
                  target="_blank"
                >
                  conditions d'utilisation
                </Link>{' '}
                et la{' '}
                <Link
                  href="/privacy"
                  className="text-[#003D82] font-medium hover:underline"
                  target="_blank"
                >
                  politique de confidentialité
                </Link>
              </label>
            </div>

            {/* Bouton d'inscription */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#003D82] hover:bg-[#002952] text-white font-medium text-base shadow-lg hover:shadow-xl transition-all"
              disabled={isPending || !acceptTerms || !passwordsMatch}
            >
              {isPending ? (
                <>
                  <CircleNotch className="mr-2 h-5 w-5 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Créer mon compte
                </>
              )}
            </Button>
          </form>

          {/* Lien connexion */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="text-[#003D82] font-semibold hover:underline"
              >
                Se connecter
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
