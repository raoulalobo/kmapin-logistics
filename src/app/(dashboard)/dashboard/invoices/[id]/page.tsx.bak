/**
 * Page : Détails d'une facture
 *
 * Affiche toutes les informations d'une facture :
 * - Informations générales (numéro, client, statut)
 * - Dates (émission, échéance, paiement)
 * - Lignes de facture (produits/services)
 * - Totaux (sous-total, TVA, remise, total)
 * - Devis/Expédition associés
 *
 * @route /dashboard/invoices/[id]
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Euro,
  User,
  Package,
  CheckCircle,
  Building,
  Edit,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getInvoiceAction } from '@/modules/invoices';
import { InvoicePaymentAction } from '@/components/invoices/invoice-payment-action';
import { InvoiceDeleteAction } from '@/components/invoices/invoice-delete-action';
import { DocumentsSection } from '@/components/documents';

/**
 * Mapper les statuts de facture vers des variantes de badge
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'PAID':
      return 'default';
    case 'SENT':
    case 'VIEWED':
      return 'secondary';
    case 'OVERDUE':
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Traduire les statuts en français
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyée',
    VIEWED: 'Vue',
    PAID: 'Payée',
    OVERDUE: 'En retard',
    CANCELLED: 'Annulée',
  };
  return translations[status] || status;
}

/**
 * Composant serveur : Détails d'une facture
 */
export default async function InvoiceDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  // Récupérer la facture
  const result = await getInvoiceAction(params.id);

  // Gérer les erreurs
  if (!result.success || !result.data) {
    notFound();
  }

  const invoice = result.data;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-muted-foreground">
              Détails de la facture
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(invoice.status)} className="text-lg px-4 py-2">
            {translateStatus(invoice.status)}
          </Badge>
          {invoice.status === 'DRAFT' && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </Button>
              <InvoiceDeleteAction
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                invoiceStatus={invoice.status}
                size="sm"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client</p>
              <p className="text-lg font-semibold">{invoice.company.name}</p>
              <p className="text-sm text-muted-foreground">{invoice.company.email}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Créée par</p>
              <p className="font-medium">{invoice.createdBy.name}</p>
              <p className="text-sm text-muted-foreground">{invoice.createdBy.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dates importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date d'émission</span>
              <span className="font-medium">
                {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date d'échéance</span>
              <span className="font-medium">
                {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
            {invoice.paidDate && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date de paiement</span>
                  <span className="font-medium text-green-600">
                    {new Date(invoice.paidDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Créée le</span>
              <span className="font-medium">
                {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lignes de facture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lignes de facture
          </CardTitle>
          <CardDescription>
            {invoice.items.length} ligne{invoice.items.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.unitPrice.toFixed(2)} {invoice.currency}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.amount.toFixed(2)} {invoice.currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-6" />

          {/* Totaux */}
          <div className="space-y-3 max-w-md ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium">
                {invoice.subtotal.toFixed(2)} {invoice.currency}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remise</span>
                <span className="font-medium text-orange-600">
                  -{invoice.discount.toFixed(2)} {invoice.currency}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                TVA ({(invoice.taxRate * 100).toFixed(0)}%)
              </span>
              <span className="font-medium">
                {invoice.taxAmount.toFixed(2)} {invoice.currency}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">
                {invoice.total.toFixed(2)} {invoice.currency}
              </span>
            </div>

            {invoice.status === 'PAID' && invoice.paymentMethod && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md mt-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">Facture payée</p>
                  <p className="text-xs text-green-700">
                    Méthode : {invoice.paymentMethod}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action de paiement */}
      <InvoicePaymentAction
        invoiceId={invoice.id}
        invoiceStatus={invoice.status}
        invoiceTotal={invoice.total}
        currency={invoice.currency}
      />

      {/* Liens avec devis et expédition */}
      {(invoice.quote || invoice.shipment) && (
        <Card>
          <CardHeader>
            <CardTitle>Documents associés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.quote && (
              <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-md">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Devis associé</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.quote.quoteNumber}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/quotes/${invoice.quote.id}`}>
                    Voir le devis
                  </Link>
                </Button>
              </div>
            )}

            {invoice.shipment && (
              <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-md">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Expédition associée</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.shipment.trackingNumber}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/shipments/${invoice.shipment.id}`}>
                    Voir l'expédition
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gestion documentaire */}
      <DocumentsSection entityId={params.id} entityType="invoice" />
    </div>
  );
}
