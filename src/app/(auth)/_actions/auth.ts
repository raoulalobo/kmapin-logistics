/**
 * Server Actions - Authentification
 *
 * Actions pour login, register, et logout
 */

'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

/**
 * Schéma de validation pour le login
 */
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

/**
 * Schéma de validation pour le register
 */
const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

/**
 * Type pour les erreurs d'authentification
 */
export type AuthError = {
  error: string;
  field?: string;
};

/**
 * Type pour le résultat de succès
 */
export type AuthSuccess = {
  success: true;
  redirectTo?: string;
};

/**
 * Action : Se connecter
 *
 * @param formData - Données du formulaire
 * @returns Résultat avec succès ou erreur
 */
export async function loginAction(
  formData: FormData
): Promise<AuthSuccess | AuthError> {
  try {
    // Valider les données
    const rawData = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    const validatedData = loginSchema.parse(rawData);

    // SOLUTION TEMPORAIRE: Utiliser l'API endpoint directement au lieu de auth.api
    // Cela permet à Better Auth de gérer les cookies correctement
    const response = await fetch(`${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: validatedData.email,
        password: validatedData.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Login error:', error);
      return { error: 'Email ou mot de passe incorrect' };
    }

    const result = await response.json();
    console.log('Login successful for user:', validatedData.email);

    // Rediriger vers le dashboard
    return { success: true, redirectTo: '/dashboard' };
  } catch (error) {
    // Gestion des erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      if (firstError) {
        return {
          error: firstError.message,
          field: firstError.path[0] as string,
        };
      }
      return { error: 'Données de formulaire invalides' };
    }

    // Gestion des erreurs Better Auth (APIError)
    console.error('Login error:', error);

    // Retourner un message générique pour ne pas révéler si l'email existe
    return { error: 'Email ou mot de passe incorrect' };
  }
}

/**
 * Action : S'inscrire
 *
 * @param formData - Données du formulaire
 * @returns Résultat avec succès ou erreur
 */
export async function registerAction(
  formData: FormData
): Promise<AuthSuccess | AuthError> {
  try {
    // Valider les données
    const rawData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    };

    const validatedData = registerSchema.parse(rawData);

    // Appeler Better Auth pour créer le compte
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: validatedData.name,
          email: validatedData.email,
          password: validatedData.password,
        },
      });

      if (!result) {
        return { error: 'Impossible de créer le compte' };
      }

      // Rediriger vers la page de connexion
      return {
        success: true,
        redirectTo: '/login',
      };
    } catch (authError: any) {
      // Gérer les erreurs de Better Auth (email déjà existant, etc.)
      if (authError.message?.includes('already exists') || authError.message?.includes('duplicate')) {
        return { error: 'Un compte avec cet email existe déjà' };
      }
      console.error('Better Auth signup error:', authError);
      return { error: authError.message || 'Erreur lors de la création du compte' };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Vérifier que error.issues existe et contient au moins un élément
      const firstError = error.issues?.[0];
      if (firstError) {
        return {
          error: firstError.message,
          field: firstError.path[0] as string,
        };
      }
      return { error: 'Données de formulaire invalides' };
    }

    console.error('Register error:', error);
    return { error: 'Une erreur est survenue lors de la création du compte' };
  }
}

/**
 * Action : Se déconnecter
 *
 * Déconnecte l'utilisateur en invalidant sa session Better Auth.
 * Les headers sont nécessaires pour que Better Auth puisse lire
 * le cookie de session et identifier quelle session supprimer.
 *
 * Note: Ne fait pas de redirect() ici car cela crée un conflit
 * avec le router.push() côté client. Le composant Header gère la redirection.
 */
export async function logoutAction() {
  const { headers } = await import('next/headers');
  const headersList = await headers();

  await auth.api.signOut({
    headers: headersList,
  });
}

/**
 * Action : Connexion OAuth (Google, Microsoft)
 *
 * @param provider - Provider OAuth (google, microsoft)
 */
export async function oauthSignIn(provider: 'google' | 'microsoft') {
  const callbackUrl = `${process.env.BETTER_AUTH_URL}/api/auth/callback/${provider}`;
  redirect(callbackUrl);
}

/**
 * Schéma de validation pour la réinitialisation de mot de passe
 */
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

/**
 * Action : Réinitialiser le mot de passe
 *
 * Utilise l'API native Better Auth pour réinitialiser le mot de passe.
 * Better Auth gère automatiquement :
 * - La validation du token
 * - Le hashage du mot de passe avec le bon algorithme
 * - La mise à jour du compte
 * - La suppression du token utilisé
 *
 * @param formData - Données du formulaire (token + nouveau mot de passe)
 * @returns Résultat avec succès ou erreur
 */
export async function resetPasswordAction(
  formData: FormData
): Promise<AuthSuccess | AuthError> {
  try {
    // Valider les données
    const rawData = {
      token: formData.get('token'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    };

    const validatedData = resetPasswordSchema.parse(rawData);

    // Utiliser l'API native Better Auth pour réinitialiser le mot de passe
    // NOTE: resetPassword lance une APIError en cas d'échec (token invalide, expiré, etc.)
    const result = await auth.api.resetPassword({
      body: {
        newPassword: validatedData.password,
        token: validatedData.token,
      },
    });

    // Si on arrive ici, la réinitialisation a réussi
    console.log('Password reset successful');

    return {
      success: true,
      redirectTo: '/login?reset=success',
    };
  } catch (error) {
    // Gestion des erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      if (firstError) {
        return {
          error: firstError.message,
          field: firstError.path[0] as string,
        };
      }
      return { error: 'Données de formulaire invalides' };
    }

    // Gestion des erreurs Better Auth (APIError)
    console.error('Reset password error:', error);

    // Retourner un message utilisateur
    return { error: 'Token invalide ou expiré' };
  }
}

/**
 * Action : Demander une réinitialisation de mot de passe
 *
 * Permet à un utilisateur de demander un lien de réinitialisation de mot de passe.
 * Better Auth génère automatiquement le token et envoie l'email via le callback configuré.
 *
 * NOTE SÉCURITÉ : Cette action retourne toujours succès même si l'email n'existe pas,
 * pour éviter l'énumération des utilisateurs (empêcher de découvrir quels emails sont enregistrés).
 *
 * @param formData - Email de l'utilisateur
 * @returns Résultat avec succès (toujours pour la sécurité)
 */
export async function requestPasswordResetAction(
  formData: FormData
): Promise<AuthSuccess | AuthError> {
  try {
    const email = formData.get('email');

    // Validation basique
    if (!email || typeof email !== 'string') {
      return { error: 'Email requis' };
    }

    // Validation format email
    const emailSchema = z.string().email('Email invalide');
    const validatedEmail = emailSchema.parse(email);

    // Demander la réinitialisation via Better Auth
    // Better Auth génère le token, l'enregistre en DB, et appelle sendResetPassword
    await auth.api.requestPasswordReset({
      body: {
        email: validatedEmail,
        redirectTo: '/reset-password', // Page de réinitialisation
      },
    });

    // IMPORTANT : Toujours retourner succès pour éviter l'énumération d'utilisateurs
    // Même si l'email n'existe pas, on retourne succès
    return {
      success: true,
      redirectTo: '/login?reset=requested',
    };
  } catch (error) {
    console.error('Request password reset error:', error);

    // IMPORTANT : Toujours retourner succès pour la sécurité
    // Ne jamais révéler si l'email existe ou non
    return {
      success: true,
      redirectTo: '/login?reset=requested',
    };
  }
}
