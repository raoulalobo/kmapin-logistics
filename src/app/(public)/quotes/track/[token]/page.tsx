/**
 * Page : Suivi Public d'un Devis par Token
 *
 * Permet de suivre un devis sans authentification via un token unique.
 * Le token est valide pendant 72 heures après la création du devis.
 *
 * Affichage :
 * - Informations du devis (origine, destination, poids, transport)
 * - Statut actuel avec badge
 * - Coût estimé
 * - Date de validité
 * - Coordonnées de contact pour questions
 *
 * IMPORTANT : Utilise le client Prisma standard (pas Zenstack) car pas d'authentification
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db/client'; // Client Prisma standard, pas enhanced
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Home,
  MapPin,
  Truck,
  Calendar,
  Euro,
  FileText,
  ArrowRight,
  XCircle,
} from 'lucide-react';
import { CargoType, TransportMode, QuoteStatus } from '@/lib/db/enums';

// ============================================
// TYPES
// ============================================

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

// ============================================
// CONSTANTES
// ============================================

/**
 * Traductions françaises pour les types de marchandise
 */
const cargoTypeLabels: Record<CargoType, string> = {
  GENERAL: 'Marchandise générale',
  DANGEROUS: 'Matières dangereuses',
  PERISHABLE: 'Périssable',
  FRAGILE: 'Fragile',
  BULK: 'Vrac',
  CONTAINER: 'Conteneur',
  PALLETIZED: 'Palettisé',
  OTHER: 'Autre',
};

/**
 * Traductions françaises pour les modes de transport
 */
const transportModeLabels: Record<TransportMode, string> = {
  ROAD: 'Routier',
  SEA: 'Maritime',
  AIR: 'Aérien',
  RAIL: 'Ferroviaire',
};

/**
 * Configuration des badges de statut de devis
 */
const quoteStatusConfig: Record<
  QuoteStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  DRAFT: { label: 'Brouillon', variant: 'secondary', icon: Clock },
  SENT: { label: 'Envoyé', variant: 'default', icon: Mail },
  IN_TREATMENT: { label: 'En traitement', variant: 'default', icon: Clock },
  VALIDATED: { label: 'Validé', variant: 'default', icon: CheckCircle },
  ACCEPTED: { label: 'Accepté', variant: 'default', icon: CheckCircle },
  REJECTED: { label: 'Refusé', variant: 'destructive', icon: XCircle },
  EXPIRED: { label: 'Expiré', variant: 'secondary', icon: Clock },
  CANCELLED: { label: 'Annulé', variant: 'destructive', icon: XCircle },
};

// ============================================
// COMPOSANTS
// ============================================

/**
 * Badge de statut du devis avec icône
 */
function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = quoteStatusConfig[status] || {
    label: status,
    variant: 'secondary' as const,
    icon: Clock,
  };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
      <Icon className="h-4 w-4" />
      {config.label}
    </Badge>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================

/**
 * Page de suivi public de devis par token
 */
export default async function PublicQuoteTrackingPage({ params }: PageProps) {
  // Await params (Next.js 15+ requirement)
  const { token } = await params;

  // Charger le devis via le token (client Prisma standard)
  const quote = await prisma.quote.findUnique({
    where: { trackingToken: token },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          name: true,
        },
      },
    },
  });

  // Token invalide ou devis supprimé
  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Lien invalide</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Ce lien de suivi est invalide ou a expiré. Vérifiez que vous avez
              bien copié le lien complet depuis votre email.
            </p>

            <div className="pt-4 space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/#calculateur">
                  <FileText className="h-4 w-4 mr-2" />
                  Demander un nouveau devis
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l&apos;accueil
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier si le token a expiré (72h)
  const isTokenExpired = new Date() > new Date(quote.tokenExpiresAt);

  // Vérifier si le devis lui-même est expiré (validité commerciale)
  const isQuoteExpired = new Date() > new Date(quote.validUntil);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Suivi de votre devis</h1>
          </div>
          <p className="text-muted-foreground">
            Numéro de devis : <span className="font-mono font-medium">{quote.quoteNumber}</span>
          </p>
        </div>

        {/* Alerte token expiré */}
        {isTokenExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lien de suivi expiré</AlertTitle>
            <AlertDescription>
              Ce lien de suivi a expiré (validité : 72h après création). Pour
              continuer à suivre votre devis, veuillez créer un compte gratuit
              ou nous contacter.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerte devis expiré */}
        {isQuoteExpired && !isTokenExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Devis expiré</AlertTitle>
            <AlertDescription>
              Ce devis a expiré le {new Date(quote.validUntil).toLocaleDateString('fr-FR')}.
              Les tarifs peuvent avoir changé. N&apos;hésitez pas à demander un nouveau devis.
            </AlertDescription>
          </Alert>
        )}

        {/* Carte principale - Statut et prix */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-2xl">Récapitulatif du devis</CardTitle>
              <QuoteStatusBadge status={quote.status as QuoteStatus} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estimation de prix */}
              <div className="bg-[#003D82] rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="h-5 w-5" />
                  <span className="text-blue-100">Prix estimé</span>
                </div>
                <p className="text-4xl font-bold">
                  {quote.estimatedCost.toLocaleString('fr-FR')} €
                </p>
                <p className="text-sm text-blue-200 mt-1">
                  {quote.currency || 'EUR'} - Estimation indicative
                </p>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date de création</p>
                    <p className="font-medium">
                      {new Date(quote.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className={`h-5 w-5 mt-0.5 ${isQuoteExpired ? 'text-red-500' : 'text-green-500'}`} />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isQuoteExpired ? 'Expiré le' : 'Valable jusqu\'au'}
                    </p>
                    <p className={`font-medium ${isQuoteExpired ? 'text-red-600' : 'text-green-600'}`}>
                      {new Date(quote.validUntil).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails de l'expédition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#003D82]" />
              Détails de l&apos;expédition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Route */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Origine</p>
                  <p className="font-medium text-lg">{quote.originCountry}</p>
                </div>
                <div className="flex items-center">
                  <ArrowRight className="h-5 w-5 text-[#003D82]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Destination</p>
                  <p className="font-medium text-lg">{quote.destinationCountry}</p>
                </div>
              </div>

              {/* Marchandise */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Type de marchandise</p>
                    <p className="font-medium">{cargoTypeLabels[quote.cargoType as CargoType] || quote.cargoType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Poids</p>
                    <p className="font-medium">{quote.weight.toLocaleString('fr-FR')} kg</p>
                  </div>
                </div>
                {(quote.length && quote.width && quote.height) && (
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dimensions</p>
                      <p className="font-medium">{quote.length} × {quote.width} × {quote.height} cm</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mode de transport */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#003D82]" />
              Mode de transport
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quote.transportMode.map((mode) => (
                <Badge key={mode} variant="secondary" className="px-4 py-2 text-sm">
                  {transportModeLabels[mode as TransportMode] || mode}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Informations de contact */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm">Besoin d&apos;aide ?</CardTitle>
            <CardDescription>
              Notre équipe est à votre disposition pour toute question concernant votre devis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-blue-600" />
              <a
                href="mailto:devis@fasofret.com"
                className="text-blue-600 hover:underline"
              >
                devis@fasofret.com
              </a>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-blue-600" />
              <a
                href="tel:+33612345678"
                className="text-blue-600 hover:underline"
              >
                +33 6 12 34 56 78
              </a>
            </div>
          </CardContent>
        </Card>

        {/* CTA création de compte */}
        {!quote.isAttachedToAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Suivez tous vos devis en un seul endroit</CardTitle>
              <CardDescription>
                Créez un compte gratuit pour accéder à un tableau de bord complet et retrouver
                tous vos devis automatiquement
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1 bg-[#003D82] hover:bg-[#002952]">
                <Link href="/register">
                  Créer un compte gratuit
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/#calculateur">
                  <FileText className="h-4 w-4 mr-2" />
                  Demander un autre devis
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>
            © {new Date().getFullYear()} Faso Fret Logistics. Tous droits réservés.
          </p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
            <span>•</span>
            <Link href="/#calculateur" className="hover:underline">
              Nouveau devis
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Métadonnées de la page
 */
export const metadata = {
  title: 'Suivi de votre devis | Faso Fret Logistics',
  description: 'Suivez l\'état de votre demande de devis en temps réel',
};
