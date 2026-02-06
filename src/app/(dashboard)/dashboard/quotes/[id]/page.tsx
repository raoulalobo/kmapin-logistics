/**
 * Page Détail Devis
 *
 * Affiche toutes les informations détaillées d'un devis :
 * - Numéro de devis et statut
 * - Informations client
 * - Expéditeur (adresse origine + contact)
 * - Destinataire (adresse destination + contact)
 * - Validité et conditions de paiement
 * - Détails de la marchandise
 * - Tarification
 * - Boutons d'actions (modifier, supprimer, accepter, rejeter)
 * - Historique sur le côté (même layout que Purchase et Pickup)
 *
 * Layout :
 * ┌────────────────────────────────────────────────────────────┐
 * │ En-tête (titre, badges, navigation)                        │
 * ├─────────────────────────────────┬──────────────────────────┤
 * │ Colonne gauche (2/3)            │ Colonne droite (1/3)     │
 * │ - Client                        │ - Historique Timeline    │
 * │ - Expéditeur / Destinataire     │                          │
 * │ - Validité / Paiement           │                          │
 * │ - Marchandise                   │                          │
 * │ - Tarification                  │                          │
 * │ - Actions (Agent/Client)        │                          │
 * └─────────────────────────────────┴──────────────────────────┘
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Calendar,
  CurrencyEur,
  PencilSimple,
  Buildings,
  Scales,
  Cube,
  Package,
  CheckCircle,
  XCircle,
  WarningCircle,
  Clock,
  CreditCard,
  User,
  Phone,
  Envelope,
  MapTrifold,
  NavigationArrow,
  Flag,
} from '@phosphor-icons/react/dist/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getQuoteAction } from '@/modules/quotes';
import { QuoteStatus } from '@/lib/db/enums';
import { getSession } from '@/lib/auth/config';
import {
  QuoteAgentActions,
  QuotePaymentActions,
  QuoteHistoryTimeline,
  QuoteActions,
  QuoteDeleteButton,
  QuoteSubmitButton,
} from '@/components/quotes';

// ════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formate le statut en français
 * Inclut les nouveaux statuts du workflow agent et le statut SUBMITTED
 */
function formatStatus(status: QuoteStatus): string {
  const statusMap: Record<QuoteStatus, string> = {
    DRAFT: 'Brouillon',
    SUBMITTED: 'Soumis',       // Nouveau : soumis par le client, en attente d'offre
    SENT: 'Offre envoyée',     // Renommé : offre formelle envoyée par l'agent
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    EXPIRED: 'Expiré',
    IN_TREATMENT: 'En traitement',
    VALIDATED: 'Validé',
    CANCELLED: 'Annulé',
  };

  return statusMap[status] || status;
}

/**
 * Obtient la variante du badge selon le statut
 */
function getStatusVariant(status: QuoteStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'ACCEPTED' || status === 'VALIDATED') return 'default';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'destructive';
  if (status === 'DRAFT' || status === 'EXPIRED') return 'secondary';
  if (status === 'SUBMITTED') return 'outline';  // Nouveau : en attente d'offre
  if (status === 'IN_TREATMENT') return 'outline';
  return 'outline';
}

/**
 * Formate le type de cargo en français
 */
function formatCargoType(type: string): string {
  const cargoMap: Record<string, string> = {
    GENERAL: 'Marchandise générale',
    FOOD: 'Alimentaire',
    ELECTRONICS: 'Électronique',
    PHARMACEUTICALS: 'Pharmaceutique',
    CHEMICALS: 'Produits chimiques',
    CONSTRUCTION: 'Construction',
    TEXTILES: 'Textiles',
    AUTOMOTIVE: 'Automobile',
    MACHINERY: 'Machines',
    PERISHABLE: 'Périssable',
    HAZARDOUS: 'Dangereux',
  };

  return cargoMap[type] || type;
}

/**
 * Formate le mode de transport en français
 */
function formatTransportMode(mode: string): string {
  const modeMap: Record<string, string> = {
    ROAD: 'Routier',
    SEA: 'Maritime',
    AIR: 'Aérien',
    RAIL: 'Ferroviaire',
  };

  return modeMap[mode] || mode;
}

/**
 * Formate la priorité en français avec le supplément
 */
function formatPriority(priority: string | null | undefined): string {
  if (!priority) return 'Standard';

  const priorityMap: Record<string, string> = {
    STANDARD: 'Standard',
    NORMAL: 'Normal (+10%)',
    EXPRESS: 'Express (+50%)',
    URGENT: 'Urgent (+30%)',
  };

  return priorityMap[priority] || priority;
}

/**
 * Obtient la couleur du badge selon la priorité
 */
function getPriorityVariant(priority: string | null | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!priority || priority === 'STANDARD') return 'secondary';
  if (priority === 'URGENT' || priority === 'EXPRESS') return 'destructive';
  return 'outline';
}

/**
 * Formate le mode de paiement en français
 * Affiche le libellé correspondant à la méthode de paiement choisie
 */
function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Non défini';

  const methodMap: Record<string, string> = {
    CASH: 'Comptant',
    ON_DELIVERY: 'À la livraison',
    BANK_TRANSFER: 'Virement bancaire',
  };

  return methodMap[method] || method;
}

/**
 * Obtient l'icône selon le statut
 */
function getStatusIcon(status: QuoteStatus) {
  switch (status) {
    case 'ACCEPTED':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'VALIDATED':
      return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    case 'REJECTED':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'CANCELLED':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'EXPIRED':
      return <WarningCircle className="h-5 w-5 text-orange-600" />;
    case 'SUBMITTED':
      return <Clock className="h-5 w-5 text-amber-600" />; // Nouveau : en attente
    case 'SENT':
      return <Clock className="h-5 w-5 text-blue-600" />;
    case 'IN_TREATMENT':
      return <Clock className="h-5 w-5 text-primary" />;
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Récupérer le devis et la session en parallèle
  const [result, session] = await Promise.all([
    getQuoteAction(id),
    getSession(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  const quote = result.data;
  const userRole = session?.user?.role || 'CLIENT';

  // Vérifier si le devis est expiré
  const isExpired = new Date(quote.validUntil) < new Date();

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* EN-TÊTE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/quotes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(quote.status)}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{quote.quoteNumber}</h1>
              <p className="text-muted-foreground mt-1">
                {quote.originCountry} → {quote.destinationCountry}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(quote.status)} className="text-base px-4 py-2">
              {formatStatus(quote.status)}
            </Badge>
            {isExpired && quote.status === 'SENT' && (
              <Badge variant="secondary" className="text-base px-4 py-2">
                Expiré
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Alerte si expiré */}
      {isExpired && quote.status === 'SENT' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <WarningCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Devis expiré</p>
                <p className="text-sm text-orange-700">
                  Ce devis a expiré le {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* GRID À 3 COLONNES - Layout similaire à Purchase et Pickup */}
      {/* Colonne gauche (2/3) : Détails */}
      {/* Colonne droite (1/3) : Historique */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ──────────────────────────────────────────────────────────────── */}
        {/* COLONNE GAUCHE : Détails du devis */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Buildings className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-lg">{quote.client?.name || quote.contactName || 'Non assigné'}</p>
                  <p className="text-sm text-muted-foreground">{quote.client?.email || quote.contactEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* EXPÉDITEUR ET DESTINATAIRE (grid 2 colonnes) */}
          {/* Affiche les adresses complètes et contacts pour l'origine et la destination */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* ──────────────────────────────────────────────────────────────── */}
            {/* EXPÉDITEUR (Origine) */}
            {/* Adresse de départ de la marchandise avec contact sur place */}
            {/* ──────────────────────────────────────────────────────────────── */}
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NavigationArrow className="h-5 w-5 text-blue-600" />
                  Expéditeur
                </CardTitle>
                <CardDescription>Point de départ de l&apos;expédition</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pays d'origine (toujours affiché) */}
                <div className="flex items-start gap-3">
                  <Flag className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pays</p>
                    <p className="text-sm text-muted-foreground">{quote.originCountry}</p>
                  </div>
                </div>

                {/* Adresse complète (si renseignée) */}
                {(quote.originAddress || quote.originCity || quote.originPostalCode) && (
                  <div className="flex items-start gap-3">
                    <MapTrifold className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Adresse</p>
                      <div className="text-sm text-muted-foreground">
                        {quote.originAddress && <p>{quote.originAddress}</p>}
                        {(quote.originPostalCode || quote.originCity) && (
                          <p>
                            {quote.originPostalCode && `${quote.originPostalCode} `}
                            {quote.originCity}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact expéditeur (si renseigné) */}
                {(quote.originContactName || quote.originContactPhone || quote.originContactEmail) && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Contact sur place
                    </p>

                    {quote.originContactName && (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{quote.originContactName}</p>
                      </div>
                    )}

                    {quote.originContactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{quote.originContactPhone}</p>
                      </div>
                    )}

                    {quote.originContactEmail && (
                      <div className="flex items-center gap-3">
                        <Envelope className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{quote.originContactEmail}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Message si aucune adresse détaillée */}
                {!quote.originAddress && !quote.originCity && !quote.originContactName && (
                  <p className="text-sm text-muted-foreground italic">
                    Adresse détaillée non renseignée
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* DESTINATAIRE (Destination) */}
            {/* Adresse d'arrivée de la marchandise avec contact sur place */}
            {/* ──────────────────────────────────────────────────────────────── */}
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Destinataire
                </CardTitle>
                <CardDescription>Point d&apos;arrivée de l&apos;expédition</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pays de destination (toujours affiché) */}
                <div className="flex items-start gap-3">
                  <Flag className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pays</p>
                    <p className="text-sm text-muted-foreground">{quote.destinationCountry}</p>
                  </div>
                </div>

                {/* Adresse complète (si renseignée) */}
                {(quote.destinationAddress || quote.destinationCity || quote.destinationPostalCode) && (
                  <div className="flex items-start gap-3">
                    <MapTrifold className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Adresse</p>
                      <div className="text-sm text-muted-foreground">
                        {quote.destinationAddress && <p>{quote.destinationAddress}</p>}
                        {(quote.destinationPostalCode || quote.destinationCity) && (
                          <p>
                            {quote.destinationPostalCode && `${quote.destinationPostalCode} `}
                            {quote.destinationCity}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact destinataire (si renseigné) */}
                {(quote.destinationContactName || quote.destinationContactPhone || quote.destinationContactEmail) && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Contact sur place
                    </p>

                    {quote.destinationContactName && (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{quote.destinationContactName}</p>
                      </div>
                    )}

                    {quote.destinationContactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{quote.destinationContactPhone}</p>
                      </div>
                    )}

                    {quote.destinationContactEmail && (
                      <div className="flex items-center gap-3">
                        <Envelope className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{quote.destinationContactEmail}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Message si aucune adresse détaillée */}
                {!quote.destinationAddress && !quote.destinationCity && !quote.destinationContactName && (
                  <p className="text-sm text-muted-foreground italic">
                    Adresse détaillée non renseignée
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* VALIDITÉ ET PAIEMENT */}
          {/* Informations sur la période de validité du devis et mode de paiement */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Validité et Paiement</CardTitle>
              <CardDescription>Période de validité du devis et conditions de paiement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Date de création */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Créé le</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Date de validité */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Valide jusqu&apos;au</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quote.validUntil).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Mode de paiement */}
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Mode de paiement</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPaymentMethod(quote.paymentMethod)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Détails des colis */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Détails de la marchandise</CardTitle>
              <CardDescription>
                {quote.packages && quote.packages.length > 0
                  ? `${quote.packages.reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0)} colis — ${quote.weight} kg au total`
                  : 'Informations sur le contenu à transporter'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tableau des colis détaillés (si packages disponibles) */}
              {quote.packages && quote.packages.length > 0 ? (
                <div className="space-y-4">
                  {/* Tableau responsive */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">#</th>
                          <th className="pb-2 pr-4 font-medium">Description</th>
                          <th className="pb-2 pr-4 font-medium text-center">Qté</th>
                          <th className="pb-2 pr-4 font-medium">Type</th>
                          <th className="pb-2 pr-4 font-medium text-right">Poids unit.</th>
                          <th className="pb-2 pr-4 font-medium">Dimensions</th>
                          <th className="pb-2 font-medium text-right">Poids total</th>
                          <th className="pb-2 pr-4 font-medium text-right">Prix unit.</th>
                          <th className="pb-2 font-medium text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.packages.map((pkg: {
                          id: string;
                          description: string | null;
                          quantity: number;
                          cargoType: string;
                          weight: number;
                          length: number | null;
                          width: number | null;
                          height: number | null;
                          unitPrice: number | null;
                        }, index: number) => (
                          <tr key={pkg.id} className="border-b last:border-0">
                            <td className="py-2 pr-4 text-muted-foreground">{index + 1}</td>
                            <td className="py-2 pr-4">
                              {pkg.description || <span className="text-muted-foreground italic">—</span>}
                            </td>
                            <td className="py-2 pr-4 text-center font-medium">{pkg.quantity}</td>
                            <td className="py-2 pr-4">
                              <Badge variant="secondary" className="text-xs">
                                {formatCargoType(pkg.cargoType)}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4 text-right">{pkg.weight} kg</td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {pkg.length != null && pkg.width != null && pkg.height != null
                                ? `${pkg.length} × ${pkg.width} × ${pkg.height} cm`
                                : '—'}
                            </td>
                            <td className="py-2 text-right font-medium">
                              {(pkg.weight * pkg.quantity).toFixed(1)} kg
                            </td>
                            {/* Prix unitaire calculé par le moteur de pricing */}
                            <td className="py-2 pr-4 text-right">
                              {pkg.unitPrice != null
                                ? `${pkg.unitPrice.toFixed(2)} ${quote.currency}`
                                : '—'}
                            </td>
                            {/* Montant = prix unitaire × quantité */}
                            <td className="py-2 text-right font-medium">
                              {pkg.unitPrice != null
                                ? `${(pkg.unitPrice * pkg.quantity).toFixed(2)} ${quote.currency}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Pied de tableau : totaux */}
                      <tfoot>
                        <tr className="border-t font-semibold">
                          <td className="pt-2" colSpan={2}>Total</td>
                          <td className="pt-2 text-center">
                            {quote.packages.reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0)}
                          </td>
                          <td className="pt-2" colSpan={3}></td>
                          <td className="pt-2 text-right">{quote.weight} kg</td>
                          {/* Cellule vide sous "Prix unit." */}
                          <td className="pt-2"></td>
                          {/* Somme des montants de tous les colis */}
                          <td className="pt-2 text-right">
                            {quote.packages.reduce((sum: number, p: { unitPrice: number | null; quantity: number }) => sum + (p.unitPrice ?? 0) * p.quantity, 0).toFixed(2)} {quote.currency}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                /* Fallback : affichage des champs plats (anciens devis sans packages) */
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCargoType(quote.cargoType)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Scales className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Poids</p>
                      <p className="text-sm text-muted-foreground">{quote.weight} kg</p>
                    </div>
                  </div>

                  {(quote.length != null || quote.width != null || quote.height != null) && (
                    <div className="flex items-center gap-3">
                      <Cube className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Dimensions (L × l × H)</p>
                        <p className="text-sm text-muted-foreground">
                          {quote.length ?? '—'} × {quote.width ?? '—'} × {quote.height ?? '—'} cm
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modes de transport et priorité */}
              <div className="mt-4 flex flex-wrap gap-6">
                {quote.transportMode && quote.transportMode.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Modes de transport</p>
                    <div className="flex gap-2">
                      {quote.transportMode.map((mode) => (
                        <Badge key={mode} variant="secondary">
                          {formatTransportMode(mode)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Priorité de livraison</p>
                  <Badge variant={getPriorityVariant(quote.priority)}>
                    {formatPriority(quote.priority)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarification */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Tarification</CardTitle>
              <CardDescription>Montant du devis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CurrencyEur className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Coût estimé</p>
                  <p className="text-4xl font-bold">
                    {quote.estimatedCost.toFixed(2)} {quote.currency}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ACTIONS WORKFLOW AGENT */}
          {/* Visible pour ADMIN et OPERATIONS_MANAGER */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {(userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER') && (
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle>Actions Agent</CardTitle>
                <CardDescription>Traitement et gestion du devis</CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteAgentActions
                  quoteId={quote.id}
                  quoteNumber={quote.quoteNumber}
                  quoteStatus={quote.status}
                  estimatedCost={quote.estimatedCost}
                  currency={quote.currency}
                  originCountry={quote.originCountry}
                  destinationCountry={quote.destinationCountry}
                  userRole={userRole}
                />
              </CardContent>
            </Card>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* SOUMISSION DU DEVIS (DRAFT → SUBMITTED) */}
          {/* Visible pour le CLIENT quand le devis est DRAFT */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {userRole === 'CLIENT' && quote.status === 'DRAFT' && (
            <Card className="dashboard-card border-amber-100 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Soumettre votre devis
                </CardTitle>
                <CardDescription>
                  Votre devis est encore un brouillon. Soumettez-le pour qu&apos;un agent
                  puisse vous envoyer une offre formelle.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Une fois soumis, un agent analysera votre demande et vous enverra
                  une offre avec les tarifs et conditions de transport.
                </p>
                <QuoteSubmitButton
                  quoteId={quote.id}
                  quoteNumber={quote.quoteNumber}
                />
              </CardContent>
            </Card>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STATUT EN ATTENTE D'OFFRE (SUBMITTED) */}
          {/* Message adapté selon le rôle : client ou agent */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {quote.status === 'SUBMITTED' && userRole === 'CLIENT' && (
            <Card className="dashboard-card border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  En attente d&apos;offre
                </CardTitle>
                <CardDescription>
                  Votre devis a été soumis et est en cours d&apos;analyse par nos agents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Prochaine étape :</strong> Un agent vous enverra une offre
                    formelle avec les tarifs et conditions de transport.
                  </p>
                  <p>
                    Vous serez notifié dès que l&apos;offre sera disponible et pourrez
                    alors l&apos;accepter ou la refuser.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message agent : devis soumis par le client, prêt à être traité */}
          {quote.status === 'SUBMITTED' && (userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER') && (
            <Card className="dashboard-card border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Devis soumis par le client
                </CardTitle>
                <CardDescription>
                  Ce devis a été soumis par le client et attend votre traitement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Actions possibles :</strong> Vérifiez les informations, ajustez
                    les tarifs et conditions si nécessaire, puis envoyez l&apos;offre au client.
                  </p>
                  <p>
                    Utilisez le bouton <strong>Modifier</strong> pour ajuster le devis,
                    puis <strong>Envoyer au client</strong> pour transmettre l&apos;offre.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ACTIONS CLIENT */}
          {/* Visible pour les clients quand le devis est SENT (offre reçue) */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {userRole === 'CLIENT' && quote.status === 'SENT' && !isExpired && (
            <Card className="dashboard-card border-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  Votre décision
                </CardTitle>
                <CardDescription>
                  Vous avez reçu une offre. Acceptez-la pour lancer l&apos;expédition ou rejetez-la si les conditions ne vous conviennent pas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteActions
                  quoteId={quote.id}
                  quoteStatus={quote.status}
                  isExpired={isExpired}
                />
              </CardContent>
            </Card>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ACTIONS PAIEMENT ET FACTURATION */}
          {/* Visible quand le devis est VALIDATED */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {(quote.status === 'VALIDATED' || quote.paymentReceivedAt) && (
            <Card className="dashboard-card border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CurrencyEur className="h-5 w-5 text-green-600" />
                  Paiement et Facturation
                </CardTitle>
                <CardDescription>
                  Confirmation du paiement et génération de facture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuotePaymentActions
                  quoteId={quote.id}
                  quoteNumber={quote.quoteNumber}
                  quoteStatus={quote.status}
                  paymentReceivedAt={quote.paymentReceivedAt}
                  paymentReceivedByName={quote.paymentReceivedBy?.name}
                  estimatedCost={Number(quote.estimatedCost)}
                  currency={quote.currency}
                  userRole={userRole}
                />
              </CardContent>
            </Card>
          )}

          {/* Informations système */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Informations système</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date de création</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Dernière modification</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quote.updatedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {quote.user && (
                  <div className="flex items-center gap-3">
                    <Buildings className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Créé par</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.user.name || quote.user.email}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions générales */}
          <div className="flex gap-2 flex-wrap">
            {/* Modifier - CLIENT sur DRAFT ou Agent (ADMIN/OPERATIONS_MANAGER) sur SUBMITTED */}
            {/* Le CLIENT peut modifier son brouillon avant soumission */}
            {/* L'agent peut modifier le devis soumis (prix, routes, cargo) avant de l'envoyer au client */}
            {((userRole === 'CLIENT' && quote.status === 'DRAFT') ||
              ((userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER') && quote.status === 'SUBMITTED')) && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/quotes/${quote.id}/edit`}>
                  <PencilSimple className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </Button>
            )}

            {/* Supprimer - visible uniquement pour CLIENT avec devis DRAFT */}
            {/* Utilise un Client Component avec AlertDialog de confirmation */}
            {userRole === 'CLIENT' && quote.status === 'DRAFT' && (
              <QuoteDeleteButton quoteId={quote.id} quoteNumber={quote.quoteNumber} />
            )}

            {/* Voir l'expédition - visible si une expédition est liée */}
            {quote.shipment && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/shipments/${quote.shipment.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Voir l'expédition ({quote.shipment.trackingNumber})
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* COLONNE DROITE : Historique */}
        {/* Timeline identique à Purchase et Pickup (icônes Lucide, badges) */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <QuoteHistoryTimeline logs={quote.logs || []} />
        </div>
      </div>
    </div>
  );
}
