/**
 * Page de Configuration de la Plateforme (Admin uniquement)
 *
 * Permet aux administrateurs de personnaliser l'identité de la plateforme :
 * - Identité (nom, nom complet, slogan)
 * - Contact (email, téléphone)
 * - Branding (logo, favicon, couleurs)
 * - Adresse du siège social
 * - Réseaux sociaux
 * - Mentions légales
 *
 * Les modifications sont persistées en base de données et
 * propagées immédiatement via invalidation du cache (revalidateTag).
 *
 * @module app/(dashboard)/dashboard/settings/platform
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  BuildingOffice,
  Envelope,
  Globe,
  Palette,
  Gavel,
  FloppyDisk,
  ArrowCounterClockwise,
  CircleNotch,
  FacebookLogo,
  LinkedinLogo,
  TwitterLogo,
  InstagramLogo,
  Phone,
  MapPin,
  IdentificationCard,
  Image as ImageIcon,
  Plus,
  Trash,
  PencilSimple,
} from '@phosphor-icons/react';

import { listDepots, createDepot, updateDepot, deleteDepot } from '@/modules/depots';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  getSystemConfigAction,
  updateSystemConfigAction,
  resetSystemConfigAction,
  type UpdateSystemConfigInput,
} from '@/modules/system-config';
import { DEFAULT_SYSTEM_CONFIG } from '@/modules/system-config/lib/get-system-config';
import { updateSystemConfigSchema } from '@/modules/system-config/schemas/system-config.schema';

/**
 * Page de configuration de la plateforme
 *
 * Interface à onglets pour gérer tous les aspects de la personnalisation :
 * - Identité : Nom de la plateforme, nom complet, slogan
 * - Contact : Email et téléphone de contact
 * - Branding : Logo, favicon, couleurs de marque
 * - Adresse : Siège social complet
 * - Réseaux : URLs des réseaux sociaux
 * - Légal : Mentions légales, SIREN, TVA, copyright
 */
export default function PlatformConfigPage() {
  // === ÉTATS ===

  // État de chargement initial des données
  const [isFetching, setIsFetching] = useState(true);

  // État de sauvegarde en cours
  const [isLoading, setIsLoading] = useState(false);

  // ID de la config existante (null si nouvelle)
  const [configId, setConfigId] = useState<string | null>(null);

  // === ÉTATS ADRESSES ===
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  // null = aucune édition, objet = édition de l'adresse existante
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  // true = formulaire d'ajout visible
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '', address: '', city: '', country: 'Burkina Faso', phone: '', email: '',
  });

  // === FORMULAIRE ===

  // Configuration du formulaire avec React Hook Form + Zod
  const form = useForm<UpdateSystemConfigInput>({
    resolver: zodResolver(updateSystemConfigSchema),
    defaultValues: {
      platformName: DEFAULT_SYSTEM_CONFIG.platformName,
      platformFullName: DEFAULT_SYSTEM_CONFIG.platformFullName,
      platformSlogan: DEFAULT_SYSTEM_CONFIG.platformSlogan,
      contactEmail: DEFAULT_SYSTEM_CONFIG.contactEmail,
      contactPhone: DEFAULT_SYSTEM_CONFIG.contactPhone,
      logoUrl: DEFAULT_SYSTEM_CONFIG.logoUrl,
      faviconUrl: DEFAULT_SYSTEM_CONFIG.faviconUrl,
      primaryColor: DEFAULT_SYSTEM_CONFIG.primaryColor,
      secondaryColor: DEFAULT_SYSTEM_CONFIG.secondaryColor,
      companyAddress: DEFAULT_SYSTEM_CONFIG.companyAddress,
      companyCity: DEFAULT_SYSTEM_CONFIG.companyCity,
      companyCountry: DEFAULT_SYSTEM_CONFIG.companyCountry,
      companyPostalCode: DEFAULT_SYSTEM_CONFIG.companyPostalCode,
      facebookUrl: DEFAULT_SYSTEM_CONFIG.facebookUrl,
      linkedinUrl: DEFAULT_SYSTEM_CONFIG.linkedinUrl,
      twitterUrl: DEFAULT_SYSTEM_CONFIG.twitterUrl,
      instagramUrl: DEFAULT_SYSTEM_CONFIG.instagramUrl,
      companyLegalName: DEFAULT_SYSTEM_CONFIG.companyLegalName,
      companyRegistration: DEFAULT_SYSTEM_CONFIG.companyRegistration,
      vatNumber: DEFAULT_SYSTEM_CONFIG.vatNumber,
      copyrightYear: DEFAULT_SYSTEM_CONFIG.copyrightYear,
    },
  });

  // === CHARGEMENT INITIAL ===

  useEffect(() => {
    loadConfiguration();
    loadAddresses();
  }, []);

  /**
   * Charge la configuration actuelle depuis la base de données
   * Si aucune config n'existe, les valeurs par défaut sont utilisées
   */
  async function loadConfiguration() {
    setIsFetching(true);
    try {
      const result = await getSystemConfigAction();

      if (result.success && result.data) {
        // Configuration existante trouvée
        setConfigId(result.data.id);
        form.reset({
          platformName: result.data.platformName,
          platformFullName: result.data.platformFullName,
          platformSlogan: result.data.platformSlogan,
          contactEmail: result.data.contactEmail,
          contactPhone: result.data.contactPhone,
          logoUrl: result.data.logoUrl,
          faviconUrl: result.data.faviconUrl,
          primaryColor: result.data.primaryColor,
          secondaryColor: result.data.secondaryColor,
          companyAddress: result.data.companyAddress,
          companyCity: result.data.companyCity,
          companyCountry: result.data.companyCountry,
          companyPostalCode: result.data.companyPostalCode,
          facebookUrl: result.data.facebookUrl,
          linkedinUrl: result.data.linkedinUrl,
          twitterUrl: result.data.twitterUrl,
          instagramUrl: result.data.instagramUrl,
          companyLegalName: result.data.companyLegalName,
          companyRegistration: result.data.companyRegistration,
          vatNumber: result.data.vatNumber,
          copyrightYear: result.data.copyrightYear,
        });
      } else if (!result.success) {
        toast.error(result.error || 'Erreur lors du chargement');
      }
      // Si result.data est null, on garde les valeurs par défaut
    } catch {
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setIsFetching(false);
    }
  }

  // === ACTIONS ===

  /**
   * Sauvegarde la configuration en base de données
   * Gère à la fois la création (si nouvelle) et la mise à jour
   */
  async function handleSaveConfig() {
    setIsLoading(true);
    try {
      const values = form.getValues();
      const result = await updateSystemConfigAction(values);

      if (result.success) {
        setConfigId(result.data.id);
        toast.success('Configuration sauvegardée avec succès');
      } else {
        toast.error(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      toast.error('Erreur inattendue lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Réinitialise la configuration aux valeurs par défaut
   * Demande confirmation avant d'écraser toutes les personnalisations
   */
  // === HANDLERS ADRESSES ===

  /** Charge les adresses des agences depuis la table Depot */
  async function loadAddresses() {
    // listDepots() retourne le tableau directement (pas { success, data })
    const depots = await listDepots();
    setAddresses(depots ?? []);
  }

  /** Ouvre le formulaire d'édition prérempli avec les données de l'adresse */
  function handleEditAddress(addr: any) {
    setEditingAddress(addr);
    setAddressForm({
      name: addr.name,
      address: addr.address,
      city: addr.city,
      country: addr.country,
      phone: addr.phone ?? '',
      email: addr.email ?? '',
    });
    setShowAddressForm(true);
  }

  /** Réinitialise et ferme le formulaire d'adresse */
  function handleCancelAddress() {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressForm({ name: '', address: '', city: '', country: 'Burkina Faso', phone: '', email: '' });
  }

  /** Crée ou met à jour une adresse selon l'état editingAddress */
  async function handleSaveAddress() {
    if (!addressForm.name || !addressForm.address || !addressForm.city) {
      toast.error('Libellé, rue et ville sont obligatoires');
      return;
    }
    setIsAddressLoading(true);
    try {
      if (editingAddress) {
        // Mise à jour — updateDepot() retourne le dépôt directement et throw en cas d'erreur
        await updateDepot(editingAddress.id, {
          name: addressForm.name,
          address: addressForm.address,
          city: addressForm.city,
          country: addressForm.country,
          phone: addressForm.phone || undefined,
          email: addressForm.email || undefined,
        });
        toast.success('Adresse mise à jour');
      } else {
        // Création — createDepot() retourne le dépôt directement et throw en cas d'erreur
        await createDepot({
          name: addressForm.name,
          code: `ADDR-${Date.now()}`,
          address: addressForm.address,
          city: addressForm.city,
          country: addressForm.country,
          phone: addressForm.phone || undefined,
          email: addressForm.email || undefined,
          isDefault: addresses.length === 0, // première adresse = défaut
          isActive: true,
        });
        toast.success('Adresse ajoutée');
      }
      handleCancelAddress();
      await loadAddresses();
    } catch (error) {
      // Les actions throw une Error avec message lisible (ex: code déjà existant)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsAddressLoading(false);
    }
  }

  /** Supprime une adresse après confirmation */
  async function handleDeleteAddress(id: string) {
    if (!confirm('Supprimer cette adresse ?')) return;
    setIsAddressLoading(true);
    try {
      // deleteDepot() throw en cas d'erreur (ex: dernier dépôt actif)
      await deleteDepot(id);
      toast.success('Adresse supprimée');
      await loadAddresses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setIsAddressLoading(false);
    }
  }

  async function handleResetConfig() {
    setIsLoading(true);
    try {
      const result = await resetSystemConfigAction();

      if (result.success) {
        // Recharger le formulaire avec les valeurs par défaut
        form.reset(DEFAULT_SYSTEM_CONFIG);
        toast.success('Configuration réinitialisée aux valeurs par défaut');
      } else {
        toast.error(result.error || 'Erreur lors de la réinitialisation');
      }
    } catch {
      toast.error('Erreur inattendue lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  }

  // === RENDU ===

  // Affichage pendant le chargement initial
  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <CircleNotch className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ════════════════════════════════════════════
          EN-TÊTE
      ════════════════════════════════════════════ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Configuration Plateforme</h1>
          <p className="text-muted-foreground">
            Personnalisez l'identité visuelle et les informations de votre plateforme
          </p>
        </div>

        {/* Bouton de réinitialisation avec confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" className="gap-2">
              <ArrowCounterClockwise className="h-5 w-5" />
              Réinitialiser
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Réinitialiser la configuration ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action va rétablir toutes les valeurs par défaut de la plateforme.
                Toutes vos personnalisations seront perdues. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetConfig}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Separator />

      {/* ════════════════════════════════════════════
          ONGLETS DE CONFIGURATION
      ════════════════════════════════════════════ */}
      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="identity" className="gap-2">
            <BuildingOffice className="h-4 w-4" />
            <span className="hidden md:inline">Identité</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Envelope className="h-4 w-4" />
            <span className="hidden md:inline">Contact</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden md:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden md:inline">Adresse</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden md:inline">Réseaux</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Gavel className="h-4 w-4" />
            <span className="hidden md:inline">Légal</span>
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════
            ONGLET 1 : IDENTITÉ
        ════════════════════════════════════════════ */}
        <TabsContent value="identity">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BuildingOffice className="h-5 w-5 text-primary" />
                Identité de la Plateforme
              </CardTitle>
              <CardDescription>
                Nom et description de votre plateforme affichés dans l'interface et les documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Nom court */}
                <div className="space-y-2">
                  <Label htmlFor="platformName">Nom de la plateforme *</Label>
                  <Input
                    id="platformName"
                    placeholder="Faso Fret"
                    {...form.register('platformName')}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nom court affiché dans le header et la sidebar (max 50 caractères)
                  </p>
                  {form.formState.errors.platformName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.platformName.message}
                    </p>
                  )}
                </div>

                {/* Nom complet */}
                <div className="space-y-2">
                  <Label htmlFor="platformFullName">Nom complet *</Label>
                  <Input
                    id="platformFullName"
                    placeholder="Faso Fret Logistics"
                    {...form.register('platformFullName')}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nom officiel pour les documents (PDF, emails, mentions légales)
                  </p>
                  {form.formState.errors.platformFullName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.platformFullName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Slogan */}
              <div className="space-y-2">
                <Label htmlFor="platformSlogan">Slogan / Accroche</Label>
                <Textarea
                  id="platformSlogan"
                  placeholder="Transport multi-modal international"
                  rows={2}
                  {...form.register('platformSlogan')}
                />
                <p className="text-sm text-muted-foreground">
                  Phrase d'accroche affichée sur la page d'accueil (max 200 caractères)
                </p>
              </div>

              {/* Prévisualisation */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">Prévisualisation :</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                    {(form.watch('platformName') || 'FF')[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{form.watch('platformName') || 'Faso Fret'}</p>
                    <p className="text-sm text-muted-foreground">
                      {form.watch('platformSlogan') || 'Transport multi-modal international'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════
            ONGLET 2 : CONTACT
        ════════════════════════════════════════════ */}
        <TabsContent value="contact">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Envelope className="h-5 w-5 text-primary" />
                Coordonnées de Contact
              </CardTitle>
              <CardDescription>
                Informations de contact affichées sur le site et dans les emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de contact *</Label>
                  <div className="relative">
                    <Envelope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="support@example.com"
                      className="pl-10"
                      {...form.register('contactEmail')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Email principal pour le support et les formulaires de contact
                  </p>
                  {form.formState.errors.contactEmail && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.contactEmail.message}
                    </p>
                  )}
                </div>

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="+226 XX XX XX XX"
                      className="pl-10"
                      {...form.register('contactPhone')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Numéro au format international (optionnel)
                  </p>
                </div>
              </div>

              {/* Info box */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Info :</strong> Ces coordonnées seront affichées dans le footer du site,
                  sur la page de contact, et dans les templates d'emails automatiques.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════
            ONGLET 3 : BRANDING
        ════════════════════════════════════════════ */}
        <TabsContent value="branding">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Identité Visuelle
              </CardTitle>
              <CardDescription>
                Logo, favicon et couleurs de votre marque
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo et Favicon */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Logo */}
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL du Logo</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="logoUrl"
                      type="url"
                      placeholder="https://storage.example.com/logo.png"
                      className="pl-10"
                      {...form.register('logoUrl')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    URL du logo (PNG ou SVG, min 200x50px). Uploadez sur Backblaze B2.
                  </p>
                </div>

                {/* Favicon */}
                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">URL du Favicon</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="faviconUrl"
                      type="url"
                      placeholder="https://storage.example.com/favicon.ico"
                      className="pl-10"
                      {...form.register('faviconUrl')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    URL du favicon (ICO ou PNG 32x32px)
                  </p>
                </div>
              </div>

              <Separator />

              {/* Couleurs */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Couleur primaire */}
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Couleur Primaire *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="text"
                      placeholder="#003D82"
                      {...form.register('primaryColor')}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={form.watch('primaryColor') || '#003D82'}
                      onChange={(e) => form.setValue('primaryColor', e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Couleur principale (boutons, liens, accents)
                  </p>
                  {form.formState.errors.primaryColor && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.primaryColor.message}
                    </p>
                  )}
                </div>

                {/* Couleur secondaire */}
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Couleur Secondaire</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="text"
                      placeholder="#10B981"
                      {...form.register('secondaryColor')}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={form.watch('secondaryColor') || '#10B981'}
                      onChange={(e) => form.setValue('secondaryColor', e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Couleur d'accentuation secondaire
                  </p>
                </div>
              </div>

              {/* Prévisualisation des couleurs */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-3">Prévisualisation :</p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: form.watch('primaryColor') || '#003D82' }}
                  >
                    Bouton Primaire
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: form.watch('secondaryColor') || '#10B981' }}
                  >
                    Bouton Secondaire
                  </button>
                  <span
                    className="px-4 py-2 font-medium"
                    style={{ color: form.watch('primaryColor') || '#003D82' }}
                  >
                    Lien coloré
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════
            ONGLET 4 : ADRESSES
        ════════════════════════════════════════════ */}
        <TabsContent value="address">
          <Card className="dashboard-card">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Adresses de la Société
                </CardTitle>
                <CardDescription className="mt-1">
                  Ces adresses apparaissent dans l'en-tête des PDF (devis et factures)
                </CardDescription>
              </div>
              {/* Bouton d'ajout — masqué si le formulaire est déjà ouvert */}
              {!showAddressForm && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddressForm(true)}
                  className="shrink-0"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">

              {/* ── Liste des adresses existantes ── */}
              {addresses.length === 0 && !showAddressForm && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucune adresse enregistrée. Cliquez sur "Ajouter" pour en créer une.
                </p>
              )}

              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between rounded-lg border p-4 gap-4"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-sm">{addr.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {addr.address}, {addr.city}
                      {addr.country && addr.country !== 'Burkina Faso' ? ` — ${addr.country}` : ''}
                    </p>
                    {(addr.phone || addr.email) && (
                      <p className="text-xs text-muted-foreground">
                        {[addr.phone, addr.email].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAddress(addr)}
                    >
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteAddress(addr.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* ── Formulaire d'ajout / édition inline ── */}
              {showAddressForm && (
                <div className="rounded-lg border border-dashed p-4 space-y-4 bg-muted/30">
                  <p className="text-sm font-medium">
                    {editingAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Libellé */}
                    <div className="space-y-1 md:col-span-2">
                      <Label>Libellé *</Label>
                      <Input
                        placeholder="Ex : Siège social, Agence Bobo-Dioulasso…"
                        value={addressForm.name}
                        onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                      />
                    </div>

                    {/* Rue */}
                    <div className="space-y-1 md:col-span-2">
                      <Label>Rue / Adresse *</Label>
                      <Input
                        placeholder="123 Avenue du Commerce"
                        value={addressForm.address}
                        onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                      />
                    </div>

                    {/* Ville */}
                    <div className="space-y-1">
                      <Label>Ville *</Label>
                      <Input
                        placeholder="Ouagadougou"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      />
                    </div>

                    {/* Pays */}
                    <div className="space-y-1">
                      <Label>Pays</Label>
                      <Input
                        placeholder="Burkina Faso"
                        value={addressForm.country}
                        onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                      />
                    </div>

                    {/* Téléphone */}
                    <div className="space-y-1">
                      <Label>Téléphone</Label>
                      <Input
                        placeholder="+226 25 00 00 00"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="contact@exemple.com"
                        value={addressForm.email}
                        onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleCancelAddress}>
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveAddress}
                      disabled={isAddressLoading}
                    >
                      {isAddressLoading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════
            ONGLET 5 : RÉSEAUX SOCIAUX
        ════════════════════════════════════════════ */}
        <TabsContent value="social">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Réseaux Sociaux
              </CardTitle>
              <CardDescription>
                Liens vers vos pages sur les réseaux sociaux (affichés dans le footer)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Facebook */}
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                    <FacebookLogo className="h-4 w-4 text-[#1877F2]" weight="fill" />
                    Facebook
                  </Label>
                  <Input
                    id="facebookUrl"
                    type="url"
                    placeholder="https://facebook.com/votre-page"
                    {...form.register('facebookUrl')}
                  />
                </div>

                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                    <LinkedinLogo className="h-4 w-4 text-[#0A66C2]" weight="fill" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/company/votre-entreprise"
                    {...form.register('linkedinUrl')}
                  />
                </div>

                {/* Twitter / X */}
                <div className="space-y-2">
                  <Label htmlFor="twitterUrl" className="flex items-center gap-2">
                    <TwitterLogo className="h-4 w-4 text-[#1DA1F2]" weight="fill" />
                    Twitter / X
                  </Label>
                  <Input
                    id="twitterUrl"
                    type="url"
                    placeholder="https://twitter.com/votre-compte"
                    {...form.register('twitterUrl')}
                  />
                </div>

                {/* Instagram */}
                <div className="space-y-2">
                  <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                    <InstagramLogo className="h-4 w-4 text-[#E4405F]" weight="fill" />
                    Instagram
                  </Label>
                  <Input
                    id="instagramUrl"
                    type="url"
                    placeholder="https://instagram.com/votre-compte"
                    {...form.register('instagramUrl')}
                  />
                </div>
              </div>

              {/* Info box */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Conseil :</strong> Seuls les réseaux avec une URL renseignée seront
                  affichés dans le footer. Laissez vide si vous n'avez pas de présence sur un réseau.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════
            ONGLET 6 : MENTIONS LÉGALES
        ════════════════════════════════════════════ */}
        <TabsContent value="legal">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                Mentions Légales
              </CardTitle>
              <CardDescription>
                Informations légales de l'entreprise pour les CGV et mentions obligatoires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Raison sociale */}
                <div className="space-y-2">
                  <Label htmlFor="companyLegalName">Raison Sociale</Label>
                  <div className="relative">
                    <IdentificationCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyLegalName"
                      placeholder="Faso Fret Logistics SAS"
                      className="pl-10"
                      {...form.register('companyLegalName')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dénomination légale complète de l'entreprise
                  </p>
                </div>

                {/* Numéro d'immatriculation */}
                <div className="space-y-2">
                  <Label htmlFor="companyRegistration">N° d'Immatriculation</Label>
                  <Input
                    id="companyRegistration"
                    placeholder="SIREN/SIRET ou équivalent"
                    {...form.register('companyRegistration')}
                  />
                  <p className="text-sm text-muted-foreground">
                    SIREN, SIRET, RCCM ou numéro local équivalent
                  </p>
                </div>

                {/* Numéro de TVA */}
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">N° de TVA</Label>
                  <Input
                    id="vatNumber"
                    placeholder="FR12345678901"
                    {...form.register('vatNumber')}
                  />
                  <p className="text-sm text-muted-foreground">
                    Numéro de TVA intracommunautaire (si applicable)
                  </p>
                </div>

                {/* Année de copyright */}
                <div className="space-y-2">
                  <Label htmlFor="copyrightYear">Année de Copyright</Label>
                  <Input
                    id="copyrightYear"
                    type="number"
                    min={2000}
                    max={2100}
                    {...form.register('copyrightYear', { valueAsNumber: true })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Année affichée dans le footer (© 2025 Nom de la plateforme)
                  </p>
                  {form.formState.errors.copyrightYear && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.copyrightYear.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Info box */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Important :</strong> Ces informations sont utilisées dans les mentions
                  légales, les conditions générales de vente et les documents officiels (factures, devis).
                  Assurez-vous qu'elles sont exactes et à jour.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════
          BOUTON DE SAUVEGARDE FLOTTANT (STICKY)

          Ce bouton reste visible en bas de l'écran
          quelle que soit la position du scroll.
          Il permet de sauvegarder toutes les modifications
          de tous les onglets en un seul clic.
      ════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-end gap-4 py-4">
          <p className="text-sm text-muted-foreground hidden md:block">
            Les modifications sont appliquées à tous les onglets
          </p>
          <Button
            onClick={handleSaveConfig}
            disabled={isLoading}
            size="lg"
            className="gap-2 min-w-[200px]"
          >
            {isLoading ? (
              <CircleNotch className="h-5 w-5 animate-spin" />
            ) : (
              <FloppyDisk className="h-5 w-5" weight="fill" />
            )}
            {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      </div>
    </div>
  );
}
