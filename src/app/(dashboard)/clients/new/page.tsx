/**
 * Page : Créer un nouveau client
 *
 * Formulaire de création d'un client avec :
 * - Validation côté client et serveur (Zod)
 * - Gestion des erreurs
 * - Redirection après succès
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { createClientAction } from '@/modules/clients';

/**
 * Composant : Formulaire de création de client
 *
 * Utilise React Server Actions pour soumettre le formulaire
 * Gère les états de chargement et les erreurs
 */
export default function NewClientPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Handler de soumission du formulaire
   *
   * @param e - Événement de soumission
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createClientAction(formData);

      if (!result.success) {
        // Afficher l'erreur
        setError(result.error);

        // Si l'erreur concerne un champ spécifique
        if (result.field) {
          setFieldErrors({ [result.field]: result.error });
        }
      } else {
        // Succès : rediriger vers la page du client
        router.push(`/dashboard/clients/${result.data.id}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau client</h1>
          <p className="text-muted-foreground">
            Créez une nouvelle entreprise cliente
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations du client
            </CardTitle>
            <CardDescription>
              Renseignez les informations de l'entreprise cliente
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Message d'erreur global */}
            {error && !Object.keys(fieldErrors).length && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Informations de base */}
            <div className="space-y-4">
              <div className="font-semibold text-sm">
                Informations de base
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Nom commercial */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nom commercial <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Acme Corp"
                    required
                    disabled={isPending}
                  />
                  {fieldErrors.name && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Raison sociale */}
                <div className="space-y-2">
                  <Label htmlFor="legalName">Raison sociale</Label>
                  <Input
                    id="legalName"
                    name="legalName"
                    placeholder="Acme Corporation SAS"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* SIRET / TVA */}
              <div className="space-y-2">
                <Label htmlFor="taxId">Numéro SIRET / TVA</Label>
                <Input
                  id="taxId"
                  name="taxId"
                  placeholder="FR12345678901"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Coordonnées */}
            <div className="space-y-4">
              <div className="font-semibold text-sm">Coordonnées</div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="contact@acme.com"
                    required
                    disabled={isPending}
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+33 1 23 45 67 89"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Site web */}
              <div className="space-y-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="https://www.acme.com"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <div className="font-semibold text-sm">Adresse</div>

              {/* Rue */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Adresse <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Rue de la Paix"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {/* Code postal */}
                <div className="space-y-2">
                  <Label htmlFor="postalCode">
                    Code postal <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    placeholder="75001"
                    required
                    disabled={isPending}
                  />
                </div>

                {/* Ville */}
                <div className="space-y-2">
                  <Label htmlFor="city">
                    Ville <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Paris"
                    required
                    disabled={isPending}
                  />
                </div>

                {/* Pays */}
                <div className="space-y-2">
                  <Label htmlFor="country">
                    Pays <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="country"
                    name="country"
                    placeholder="FR"
                    defaultValue="FR"
                    maxLength={2}
                    required
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Code ISO à 2 lettres (FR, US, DE...)
                  </p>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Créer le client
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isPending}
              >
                <Link href="/dashboard/clients">Annuler</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
