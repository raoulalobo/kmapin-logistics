/**
 * Page Paramètres
 *
 * Permet aux utilisateurs de gérer leurs préférences et leur compte.
 * Interface client avec formulaires pour :
 * - Profil utilisateur (nom, email, téléphone)
 * - Sécurité (changement de mot de passe)
 * - Informations entreprise
 * - Préférences de notifications
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Buildings, Bell, Lock, FloppyDisk } from '@phosphor-icons/react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos préférences et votre compte
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        {/* Section Profil utilisateur */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Profil utilisateur</CardTitle>
            </div>
            <CardDescription>
              Modifiez vos informations personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  placeholder="Jean Dupont"
                  defaultValue=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@example.com"
                  defaultValue=""
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 1 23 45 67 89"
                defaultValue=""
              />
            </div>
            <Button className="gap-2">
              <FloppyDisk className="h-4 w-4" />
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>

        {/* Section Sécurité */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            <CardDescription>
              Gérez votre mot de passe et la sécurité du compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Le mot de passe doit contenir au moins 8 caractères, une majuscule,
                une minuscule et un chiffre.
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Lock className="h-4 w-4" />
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>

        {/* Section Informations entreprise */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Buildings className="h-5 w-5 text-primary" />
              <CardTitle>Informations entreprise</CardTitle>
            </div>
            <CardDescription>
              Détails de votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nom de l&apos;entreprise</Label>
              <Input
                id="company-name"
                placeholder="Ma Société"
                defaultValue=""
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tax-id">Numéro de TVA</Label>
                <Input
                  id="tax-id"
                  placeholder="FR12345678901"
                  defaultValue=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Téléphone entreprise</Label>
                <Input
                  id="company-phone"
                  type="tel"
                  placeholder="+33 1 23 45 67 89"
                  defaultValue=""
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Adresse</Label>
              <Input
                id="company-address"
                placeholder="123 Rue de la Paix"
                defaultValue=""
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Paris"
                  defaultValue=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal-code">Code postal</Label>
                <Input
                  id="postal-code"
                  placeholder="75001"
                  defaultValue=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  placeholder="France"
                  defaultValue=""
                />
              </div>
            </div>
            <Button className="gap-2">
              <FloppyDisk className="h-4 w-4" />
              Mettre à jour
            </Button>
          </CardContent>
        </Card>

        {/* Section Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Notifications par email</p>
                <p className="text-sm text-muted-foreground">
                  Recevoir des emails pour les mises à jour importantes
                </p>
              </div>
              <Button variant="outline" size="sm">
                Activer
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Notifications d&apos;expédition</p>
                <p className="text-sm text-muted-foreground">
                  Être notifié à chaque changement de statut d&apos;expédition
                </p>
              </div>
              <Button variant="outline" size="sm">
                Activer
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Notifications de facturation</p>
                <p className="text-sm text-muted-foreground">
                  Recevoir des alertes pour les factures en attente ou en retard
                </p>
              </div>
              <Button variant="outline" size="sm">
                Activer
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Alertes douanières</p>
                <p className="text-sm text-muted-foreground">
                  Notifications pour les événements douaniers
                </p>
              </div>
              <Button variant="outline" size="sm">
                Activer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
            <CardDescription>
              Actions irréversibles sur votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Supprimer le compte</p>
                <p className="text-sm text-muted-foreground">
                  Supprimer définitivement votre compte et toutes vos données
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Supprimer le compte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
