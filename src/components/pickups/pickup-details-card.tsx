/**
 * Composant Card de Détails pour les Demandes d'Enlèvement
 *
 * Affiche toutes les informations d'une demande de manière organisée
 * avec des sections conditionnelles selon les données disponibles
 *
 * User Stories US-1.2, US-2.3, US-3.1 : Affichage détails
 */

'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PickupStatus, PickupTimeSlot, UserRole } from '@/lib/db/enums';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Calendar,
  Package,
  Truck,
  Phone,
  Mail,
  User,
  Clock,
  FileText,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  Building,
  Hash,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PickupStatusBadgeWithIcon } from './pickup-status-badge';

// ============================================
// TYPES
// ============================================

/**
 * Demande d'enlèvement avec relations
 */
interface PickupRequestWithRelations {
  id: string;
  trackingNumber: string;
  trackingToken: string;
  tokenExpiresAt: Date;

  userId: string | null;
  user: { name: string | null; email: string } | null;
  isAttachedToAccount: boolean;

  contactEmail: string;
  contactPhone: string;
  contactName: string | null;

  pickupAddress: string;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;

  requestedDate: Date;
  scheduledDate: Date | null;
  actualPickupDate: Date | null;
  timeSlot: PickupTimeSlot;
  pickupTime: string | null;

  cargoType: string | null;
  estimatedWeight: number | null;
  estimatedVolume: number | null;
  packageCount: number | null;
  description: string | null;

  specialInstructions: string | null;
  accessInstructions: string | null;
  internalNotes: string | null;

  status: PickupStatus;
  cancellationReason: string | null;

  // Informations chauffeur (on ne gère plus les transporteurs comme entité)
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  completionNotes: string | null;

  shipmentId: string | null;
  shipment: { trackingNumber: string } | null;

  companyId: string | null;
  company: { name: string } | null;

  createdAt: Date;
  updatedAt: Date;
}

interface PickupDetailsCardProps {
  pickup: PickupRequestWithRelations;
  userRole?: UserRole; // Pour afficher les notes internes seulement aux agents
  showInternalInfo?: boolean; // Afficher token, notes internes, etc.
  className?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formatte une date
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  return format(date, 'dd/MM/yyyy', { locale: fr });
}

/**
 * Formatte une date avec heure
 */
function formatDateTime(date: Date | null | undefined): string {
  if (!date) return '-';
  return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
}

/**
 * Traduction des créneaux horaires
 */
const TIME_SLOT_LABELS: Record<PickupTimeSlot, string> = {
  [PickupTimeSlot.MORNING]: 'Matin (8h-12h)',
  [PickupTimeSlot.AFTERNOON]: 'Après-midi (14h-18h)',
  [PickupTimeSlot.SPECIFIC_TIME]: 'Heure précise',
  [PickupTimeSlot.FLEXIBLE]: 'Flexible',
};

/**
 * Vérifie si l'utilisateur est agent
 */
function isAgent(role?: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.OPERATIONS_MANAGER ||
    role === UserRole.FINANCE_MANAGER
  );
}

// ============================================
// COMPOSANTS DE SECTION
// ============================================

/**
 * Section générique avec icône et titre
 */
function DetailSection({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center space-x-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
      </div>
      <div className="ml-7 space-y-2">{children}</div>
    </div>
  );
}

/**
 * Ligne de détail (label + valeur)
 */
function DetailRow({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string | number | null;
  badge?: React.ReactNode;
}) {
  if (!value && !badge) return null;

  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? (
        badge
      ) : (
        <span className="text-sm font-medium text-gray-900">{value}</span>
      )}
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Card affichant tous les détails d'une demande d'enlèvement
 *
 * @param pickup - Demande avec relations chargées
 * @param userRole - Rôle de l'utilisateur courant (pour afficher notes internes)
 * @param showInternalInfo - Afficher infos sensibles (token, notes internes)
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * <PickupDetailsCard
 *   pickup={pickupData}
 *   userRole={session.user.role}
 *   showInternalInfo={true}
 * />
 * ```
 */
export function PickupDetailsCard({
  pickup,
  userRole,
  showInternalInfo = false,
  className,
}: PickupDetailsCardProps) {
  const isAgentUser = isAgent(userRole);
  const isTokenExpired = new Date() > new Date(pickup.tokenExpiresAt);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Demande d&apos;enlèvement</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Créée le {formatDateTime(pickup.createdAt)}
            </CardDescription>
          </div>
          <PickupStatusBadgeWithIcon status={pickup.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tracking et identification */}
        <DetailSection icon={Hash} title="Identification">
          <DetailRow label="Numéro de suivi" value={pickup.trackingNumber} />

          {showInternalInfo && isAgentUser && (
            <>
              <DetailRow
                label="Token de suivi"
                badge={
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {pickup.trackingToken}
                    </code>
                    {isTokenExpired ? (
                      <Badge variant="destructive" className="text-xs">
                        Expiré
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Valide
                      </Badge>
                    )}
                  </div>
                }
              />
              <DetailRow
                label="Expiration token"
                value={formatDateTime(pickup.tokenExpiresAt)}
              />
            </>
          )}

          {pickup.shipmentId && pickup.shipment && (
            <DetailRow
              label="Expédition liée"
              badge={
                <Badge variant="outline">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  {pickup.shipment.trackingNumber}
                </Badge>
              }
            />
          )}
        </DetailSection>

        <Separator />

        {/* Contact et compte */}
        <DetailSection icon={User} title="Contact">
          {pickup.contactName && (
            <DetailRow label="Nom" value={pickup.contactName} />
          )}
          <DetailRow label="Email" value={pickup.contactEmail} />
          <DetailRow label="Téléphone" value={pickup.contactPhone} />

          {pickup.isAttachedToAccount && pickup.user && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Rattaché au compte
                </span>
              </div>
              <p className="text-xs text-green-700">
                {pickup.user.name || pickup.user.email}
              </p>
            </div>
          )}

          {!pickup.isAttachedToAccount && !pickup.userId && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Demande invité (non rattachée)
                </span>
              </div>
            </div>
          )}

          {pickup.company && (
            <DetailRow
              label="Entreprise"
              badge={
                <Badge variant="outline">
                  <Building className="h-3 w-3 mr-1" />
                  {pickup.company.name}
                </Badge>
              }
            />
          )}
        </DetailSection>

        <Separator />

        {/* Adresse d'enlèvement */}
        <DetailSection icon={MapPin} title="Adresse d'enlèvement">
          <div className="text-sm">
            <p className="font-medium text-gray-900">{pickup.pickupAddress}</p>
            <p className="text-muted-foreground">
              {pickup.pickupPostalCode} {pickup.pickupCity}
            </p>
            <p className="text-muted-foreground">{pickup.pickupCountry}</p>
          </div>

          {pickup.accessInstructions && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="font-medium text-blue-900 mb-1">
                Instructions d&apos;accès :
              </p>
              <p className="text-blue-700">{pickup.accessInstructions}</p>
            </div>
          )}
        </DetailSection>

        <Separator />

        {/* Planification */}
        <DetailSection icon={Calendar} title="Planification">
          <DetailRow
            label="Date souhaitée"
            value={formatDate(pickup.requestedDate)}
          />
          <DetailRow
            label="Créneau horaire"
            value={TIME_SLOT_LABELS[pickup.timeSlot]}
          />
          {pickup.pickupTime && pickup.timeSlot === PickupTimeSlot.SPECIFIC_TIME && (
            <DetailRow label="Heure précise" value={pickup.pickupTime} />
          )}

          {pickup.scheduledDate && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs font-medium text-green-900 mb-1">
                <Clock className="h-3 w-3 inline mr-1" />
                Date confirmée :
              </p>
              <p className="text-sm font-medium text-green-700">
                {formatDate(pickup.scheduledDate)}
              </p>
            </div>
          )}

          {pickup.actualPickupDate && (
            <DetailRow
              label="Enlèvement effectué le"
              value={formatDateTime(pickup.actualPickupDate)}
            />
          )}
        </DetailSection>

        <Separator />

        {/* Détails marchandise */}
        <DetailSection icon={Package} title="Marchandise">
          {pickup.cargoType && <DetailRow label="Type" value={pickup.cargoType} />}
          {pickup.packageCount && (
            <DetailRow label="Nombre de colis" value={pickup.packageCount} />
          )}
          {pickup.estimatedWeight && (
            <DetailRow
              label="Poids estimé"
              value={`${pickup.estimatedWeight} kg`}
            />
          )}
          {pickup.estimatedVolume && (
            <DetailRow
              label="Volume estimé"
              value={`${pickup.estimatedVolume} m³`}
            />
          )}
          {pickup.description && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Description :</p>
              <p className="text-sm text-gray-700">{pickup.description}</p>
            </div>
          )}

          {pickup.specialInstructions && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-medium text-yellow-900 mb-1">
                Instructions spéciales :
              </p>
              <p className="text-yellow-700">{pickup.specialInstructions}</p>
            </div>
          )}
        </DetailSection>

        {/* Chauffeur (si assigné) */}
        {pickup.driverName && (
          <>
            <Separator />
            <DetailSection icon={Truck} title="Chauffeur">
              <DetailRow label="Nom" value={pickup.driverName} />
              {pickup.driverPhone && (
                <DetailRow
                  label="Téléphone"
                  badge={
                    <a
                      href={`tel:${pickup.driverPhone}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      <Phone className="h-3 w-3 inline mr-1" />
                      {pickup.driverPhone}
                    </a>
                  }
                />
              )}
              {pickup.vehiclePlate && (
                <DetailRow label="Plaque" value={pickup.vehiclePlate} />
              )}

              {pickup.completionNotes && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <p className="font-medium text-green-900 mb-1">
                    Notes de réalisation :
                  </p>
                  <p className="text-green-700">{pickup.completionNotes}</p>
                </div>
              )}
            </DetailSection>
          </>
        )}

        {/* Annulation */}
        {pickup.status === PickupStatus.ANNULE && pickup.cancellationReason && (
          <>
            <Separator />
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Raison de l&apos;annulation
                  </h4>
                  <p className="text-sm text-red-700">
                    {pickup.cancellationReason}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Notes internes (agents uniquement) */}
        {showInternalInfo && isAgentUser && pickup.internalNotes && (
          <>
            <Separator />
            <DetailSection icon={FileText} title="Notes internes">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                <p className="text-gray-700">{pickup.internalNotes}</p>
              </div>
            </DetailSection>
          </>
        )}

        {/* Horodatage */}
        <Separator />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Créée le {formatDateTime(pickup.createdAt)}</p>
          <p>Dernière modification le {formatDateTime(pickup.updatedAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Variante compacte de la card (moins de sections)
 */
export function PickupDetailsCardCompact({
  pickup,
  className,
}: Omit<PickupDetailsCardProps, 'userRole' | 'showInternalInfo'>) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{pickup.trackingNumber}</CardTitle>
          <PickupStatusBadgeWithIcon status={pickup.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact */}
        <div>
          <p className="text-sm font-medium text-gray-900">
            {pickup.contactName || 'Contact'}
          </p>
          <p className="text-xs text-muted-foreground">{pickup.contactEmail}</p>
          <p className="text-xs text-muted-foreground">{pickup.contactPhone}</p>
        </div>

        {/* Adresse */}
        <div>
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">{pickup.pickupAddress}</p>
              <p className="text-xs text-muted-foreground">
                {pickup.pickupPostalCode} {pickup.pickupCity}
              </p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDate(pickup.scheduledDate || pickup.requestedDate)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
