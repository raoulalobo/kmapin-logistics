/**
 * Composant : Formulaire de Finalisation d'Inscription Prospect
 *
 * Permet aux prospects (utilisateurs ayant demandé un devis sans compte)
 * de finaliser leur inscription en créant un compte.
 *
 * Workflow:
 * 1. Charger le prospect par token d'invitation
 * 2. Vérifier si l'email existe déjà
 * 3a. Si email nouveau → Formulaire de création de compte
 * 3b. Si email existe → Afficher AttachToAccountForm
 *
 * Le formulaire gère:
 * - Validation du token (expiration)
 * - Pré-remplissage avec les données du prospect
 * - Création du compte via Better Auth
 * - Rattachement des Quote existants au nouveau compte (modèle unifié)
 * - Redirection vers le dashboard
 *
 * @module components/registration
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleNotch, UserPlus, WarningCircle, CheckCircle, Envelope } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
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
  getProspectByTokenAction,
  getProspectByEmailAction,
  completeRegistrationAction,
  finalizeProspectConversionAction,
  completeRegistrationSchema,
  type CompleteRegistrationFormData,
} from '@/modules/prospects';
import { authClient } from '@/lib/auth/client';
import { AttachToAccountForm } from './attach-to-account-form';

/**
 * Props du composant CompleteRegistrationForm
 */
interface CompleteRegistrationFormProps {
  /** Token d'invitation du prospect (depuis URL query param) */
  token: string;
}

/**
 * État du composant
 */
type ViewState = 'loading' | 'new-user' | 'existing-user' | 'expired' | 'error';

/**
 * Formulaire de finalisation d'inscription
 *
 * Gère les deux cas: nouveau utilisateur ou utilisateur existant
 */
export function CompleteRegistrationForm({ token }: CompleteRegistrationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /**
   * États du composant
   */
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [prospectData, setProspectData] = useState<{
    id: string;
    email: string;
    phone: string | null;
    name: string | null;
    company: string | null;
    quoteCount: number;
  } | null>(null);

  /**
   * Formulaire React Hook Form avec validation Zod
   */
  const form = useForm<CompleteRegistrationFormData>({
    resolver: zodResolver(completeRegistrationSchema),
    defaultValues: {
      password: '',
      name: '',
      phone: '',
      country: '',
    },
  });

  /**
   * Charger le prospect et vérifier l'état au montage
   */
  useEffect(() => {
    loadProspectAndCheckEmail();
  }, [token]);

  /**
   * Charger les données du prospect et vérifier si l'email existe
   */
  async function loadProspectAndCheckEmail() {
    try {
      setViewState('loading');

      // 1. Récupérer le prospect par token
      const prospectResult = await getProspectByTokenAction(token);

      if (!prospectResult.success || !prospectResult.data) {
        // Token invalide ou expiré
        if (prospectResult.error?.includes('expiré')) {
          setViewState('expired');
        } else {
          setViewState('error');
        }
        return;
      }

      const prospect = prospectResult.data;

      // 2. Vérifier si un utilisateur existe avec cet email
      const emailCheckResult = await getProspectByEmailAction(prospect.email);

      if (!emailCheckResult.success) {
        setViewState('error');
        return;
      }

      // 3. Stocker les données du prospect
      // Note: Modèle unifié - utilise `quotes` au lieu de `guestQuotes`
      setProspectData({
        id: prospect.id,
        email: prospect.email,
        phone: prospect.phone,
        name: prospect.name,
        company: prospect.company,
        quoteCount: prospect.quotes?.length || 0,
      });

      // 4. Pré-remplir le formulaire
      form.setValue('name', prospect.name || '');
      form.setValue('phone', prospect.phone || '');

      // 5. Déterminer la vue à afficher
      if (emailCheckResult.data?.userExists) {
        setViewState('existing-user');
      } else {
        setViewState('new-user');
      }
    } catch (error) {
      console.error('Error loading prospect:', error);
      setViewState('error');
    }
  }

  /**
   * Soumettre le formulaire de création de compte
   */
  async function onSubmit(data: CompleteRegistrationFormData) {
    if (!prospectData) return;

    startTransition(async () => {
      try {
        // 1. Préparer la création de Company (Server Action)
        const prepResult = await completeRegistrationAction(token, data);

        if (!prepResult.success) {
          toast.error(prepResult.error || 'Erreur lors de la préparation du compte');
          return;
        }

        // 2. Créer le compte utilisateur via Better Auth
        const signUpResult = await authClient.signUp.email({
          email: prospectData.email,
          password: data.password,
          name: data.name,
        });

        if (signUpResult.error) {
          toast.error(signUpResult.error.message || 'Erreur lors de la création du compte');
          return;
        }

        // 3. Finaliser la conversion (rattacher les Quote existants au compte)
        const userId = signUpResult.data?.user?.id;
        if (!userId) {
          toast.error('Erreur: ID utilisateur manquant');
          return;
        }

        const conversionResult = await finalizeProspectConversionAction(
          prospectData.id,
          userId
        );

        if (!conversionResult.success) {
          // Le compte est créé mais la conversion a échoué
          toast.warning(
            'Compte créé avec succès, mais erreur lors du rattachement des devis'
          );
        } else {
          toast.success(
            `Bienvenue ! Votre compte a été créé et ${prospectData.quoteCount} devis ${
              prospectData.quoteCount > 1 ? 'ont été rattachés' : 'a été rattaché'
            } à votre espace.`
          );
        }

        // 4. Rediriger vers le dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('Error completing registration:', error);
        toast.error('Une erreur inattendue s\'est produite');
      }
    });
  }

  /**
   * Rendu conditionnel selon l'état
   */
  if (viewState === 'loading') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-12">
          <CircleNotch className="h-8 w-8 animate-spin text-[#003D82]" />
          <span className="ml-3 text-lg text-gray-600">Vérification de votre invitation...</span>
        </CardContent>
      </Card>
    );
  }

  if (viewState === 'expired') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Alert variant="destructive">
            <WarningCircle className="h-4 w-4" />
            <AlertTitle>Lien d'invitation expiré</AlertTitle>
            <AlertDescription>
              Votre lien d'invitation a expiré (validité: 7 jours).
              Veuillez demander un nouveau devis pour recevoir une nouvelle invitation.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-gray-600">
            Pour obtenir un nouveau devis et une nouvelle invitation, rendez-vous sur notre page d'accueil.
          </p>
          <Button asChild className="bg-[#003D82] hover:bg-[#002952] text-white">
            <a href="/">Retour à l'accueil</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (viewState === 'error') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Alert variant="destructive">
            <WarningCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Une erreur est survenue lors de la vérification de votre invitation.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button
            onClick={() => loadProspectAndCheckEmail()}
            variant="outline"
          >
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (viewState === 'existing-user' && prospectData) {
    // Cas B: Email existe déjà → Afficher AttachToAccountForm
    return (
      <AttachToAccountForm
        token={token}
        email={prospectData.email}
        prospectId={prospectData.id}
        quoteCount={prospectData.quoteCount}
      />
    );
  }

  if (viewState === 'new-user' && prospectData) {
    // Cas A: Nouveau utilisateur → Formulaire de création
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-[#003D82] to-[#002952] text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white">Finaliser mon inscription</CardTitle>
              <CardDescription className="text-blue-100">
                Créez votre compte pour accéder à vos devis
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Info prospect */}
          <Alert>
            <Envelope className="h-4 w-4" />
            <AlertTitle>Bienvenue !</AlertTitle>
            <AlertDescription>
              Vous avez {prospectData.quoteCount} devis en attente. Créez votre compte pour
              y accéder et suivre vos expéditions.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email (lecture seule) */}
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    value={prospectData.email}
                    disabled
                    className="bg-gray-50"
                  />
                </FormControl>
                <FormDescription>
                  Cet email a été utilisé pour votre demande de devis
                </FormDescription>
              </FormItem>

              {/* Mot de passe */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Mot de passe <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min 8 caractères (majuscule, minuscule, chiffre)"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Nom complet */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nom complet <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jean Dupont"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Téléphone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Téléphone <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pays */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Pays <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="France"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Pays de résidence de votre entreprise
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bouton de soumission */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 text-base bg-[#003D82] hover:bg-[#002952] text-white"
              >
                {isPending ? (
                  <>
                    <CircleNotch className="mr-2 h-5 w-5 animate-spin" />
                    Création de votre compte...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Créer mon compte
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return null;
}
