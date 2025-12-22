/**
 * Composant : Formulaire de Rattachement à un Compte Existant
 *
 * Permet aux prospects dont l'email correspond à un utilisateur existant
 * de se connecter et de rattacher leurs devis à leur compte.
 *
 * Workflow:
 * 1. Afficher un formulaire de connexion (email pré-rempli + password)
 * 2. Authentification via Better Auth
 * 3. Rattachement des GuestQuotes du prospect au compte
 * 4. Redirection vers le dashboard
 *
 * @module components/registration
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn, AlertCircle, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

import {
  finalizeProspectConversionAction,
  attachToAccountSchema,
  type AttachToAccountFormData,
} from '@/modules/prospects';
import { authClient } from '@/lib/auth/client';

/**
 * Props du composant AttachToAccountForm
 */
interface AttachToAccountFormProps {
  /** Token d'invitation */
  token: string;
  /** Email du prospect (pré-rempli) */
  email: string;
  /** ID du prospect pour la conversion */
  prospectId: string;
  /** Nombre de devis à rattacher */
  quoteCount: number;
}

/**
 * Formulaire de rattachement à un compte existant
 *
 * Authentifie l'utilisateur et rattache les devis du prospect
 */
export function AttachToAccountForm({
  token,
  email,
  prospectId,
  quoteCount,
}: AttachToAccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /**
   * Formulaire React Hook Form avec validation Zod
   */
  const form = useForm<AttachToAccountFormData>({
    resolver: zodResolver(attachToAccountSchema),
    defaultValues: {
      password: '',
    },
  });

  /**
   * Soumettre le formulaire de connexion et rattachement
   */
  async function onSubmit(data: AttachToAccountFormData) {
    startTransition(async () => {
      try {
        // 1. Authentifier l'utilisateur via Better Auth
        const signInResult = await authClient.signIn.email({
          email,
          password: data.password,
        });

        if (signInResult.error) {
          toast.error(signInResult.error.message || 'Mot de passe incorrect');
          form.setError('password', {
            message: 'Mot de passe incorrect',
          });
          return;
        }

        // 2. Récupérer l'ID utilisateur
        const userId = signInResult.data?.user?.id;
        if (!userId) {
          toast.error('Erreur: Impossible de récupérer l\'ID utilisateur');
          return;
        }

        // 3. Finaliser la conversion (rattacher les GuestQuotes)
        const conversionResult = await finalizeProspectConversionAction(
          prospectId,
          userId
        );

        if (!conversionResult.success) {
          toast.error(
            conversionResult.error || 'Erreur lors du rattachement des devis'
          );
          return;
        }

        // 4. Succès : afficher message et rediriger
        toast.success(
          `Bienvenue ! ${quoteCount} devis ${
            quoteCount > 1 ? 'ont été rattachés' : 'a été rattaché'
          } à votre compte.`
        );

        router.push('/dashboard');
      } catch (error) {
        console.error('Error attaching to account:', error);
        toast.error('Une erreur inattendue s\'est produite');
      }
    });
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-white">Vous avez déjà un compte !</CardTitle>
            <CardDescription className="text-green-100">
              Connectez-vous pour rattacher vos devis
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Alerte d'information */}
        <Alert className="border-blue-200 bg-blue-50">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Compte existant détecté</AlertTitle>
          <AlertDescription className="text-blue-800">
            Un compte existe déjà avec l'email <strong>{email}</strong>.
            Connectez-vous pour rattacher {quoteCount === 1 ? 'votre devis' : `vos ${quoteCount} devis`} à votre espace client.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email (lecture seule) */}
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                Email
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
              </FormControl>
            </FormItem>

            {/* Mot de passe */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                    Mot de passe <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Entrez votre mot de passe"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lien mot de passe oublié */}
            <div className="flex justify-end">
              <Link
                href="/reset-password"
                className="text-sm text-[#003D82] hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton de soumission */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Se connecter et rattacher mes devis
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Note supplémentaire */}
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 text-center">
            Si vous n'êtes pas propriétaire de ce compte, veuillez utiliser
            une autre adresse email pour créer un nouveau compte.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
