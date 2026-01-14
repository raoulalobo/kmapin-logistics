/**
 * Page : Modifier une facture
 *
 * Formulaire de modification de facture avec :
 * - Pré-remplissage des données existantes
 * - Sélection du client
 * - Dates (émission, échéance)
 * - Lignes de facture (produits/services)
 * - Calcul automatique des totaux
 * - Restrictions : seules les factures DRAFT peuvent être modifiées
 *
 * @route /dashboard/invoices/[id]/edit
 */

'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, FileText, CircleNotch, Plus, Trash, CurrencyEur } from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClientSelect } from '@/components/forms/client-select';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { useFormValidation } from '@/hooks/use-form-validation';

import {
  getInvoiceAction,
  updateInvoiceAction,
  invoiceUpdateSchema,
  type InvoiceItemData,
  calculateItemAmount,
  calculateSubtotal,
  calculateTaxAmount,
  calculateTotal,
} from '@/modules/invoices';

/**
 * Props de la page
 */
interface EditInvoicePageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Page de modification de facture
 */
export default function EditInvoicePage({ params }: EditInvoicePageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<InvoiceItemData[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);
  const [invoiceStatus, setInvoiceStatus] = useState<string>('DRAFT');
  const [invoiceId, setInvoiceId] = useState<string>('');

  // Calculer les totaux
  const subtotal = calculateSubtotal(items);
  const [taxRate, setTaxRate] = useState(0.2); // 20% TVA par défaut
  const taxAmount = calculateTaxAmount(subtotal, taxRate);
  const discount = 0;
  const total = calculateTotal(subtotal, taxAmount, discount);

  // Initialiser le formulaire
  const form = useForm({
    resolver: zodResolver(invoiceUpdateSchema),
    defaultValues: {
      currency: 'EUR',
      taxRate,
      discount: 0,
    },
  });

  /**
   * Hook de validation améliorée (toast + scroll + focus)
   */
  const { onSubmitWithValidation, errorMessages } = useFormValidation(form, {
    toastTitle: 'Formulaire incomplet',
    fieldLabels: {
      companyId: 'Client',
      dueDate: 'Date d\'échéance',
      currency: 'Devise',
      taxRate: 'Taux de TVA',
      discount: 'Remise',
      notes: 'Notes',
      items: 'Lignes de facture',
    },
  });

  /**
   * Charger les données de la facture au montage du composant
   */
  useEffect(() => {
    async function loadInvoice() {
      try {
        const { id } = await params;
        setInvoiceId(id);
        const result = await getInvoiceAction(id);

        if (!result.success || !result.data) {
          toast.error(result.error || 'Facture introuvable');
          router.push('/dashboard/invoices');
          return;
        }

        const invoice = result.data;

        // Vérifier que la facture peut être modifiée
        if (invoice.status !== 'DRAFT') {
          toast.error('Seules les factures en brouillon peuvent être modifiées');
          router.push(`/dashboard/invoices/${id}`);
          return;
        }

        // Pré-remplir le formulaire
        form.reset({
          companyId: invoice.companyId,
          dueDate: new Date(invoice.dueDate).toISOString().slice(0, 16),
          currency: invoice.currency,
          taxRate: invoice.taxRate,
          discount: invoice.discount,
          notes: invoice.notes || '',
        });

        // Pré-remplir les lignes de facture
        setItems(
          invoice.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          }))
        );

        setTaxRate(invoice.taxRate);
        setInvoiceStatus(invoice.status);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading invoice:', error);
        toast.error('Erreur lors du chargement de la facture');
        router.push('/dashboard/invoices');
      }
    }

    loadInvoice();
  }, [params, router, form]);

  /**
   * Ajouter une ligne de facture
   */
  function addItem() {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  }

  /**
   * Supprimer une ligne de facture
   */
  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  /**
   * Mettre à jour une ligne de facture
   */
  function updateItem(index: number, field: keyof InvoiceItemData, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculer le montant si quantité ou prix unitaire change
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = calculateItemAmount(
        newItems[index].quantity,
        newItems[index].unitPrice
      );
    }

    setItems(newItems);
  }

  /**
   * Handler pour la soumission du formulaire
   */
  async function onSubmit(data: any) {
    startTransition(async () => {
      const formData = new FormData();

      // Ajouter tous les champs simples
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'items') {
          formData.append(key, value.toString());
        }
      });

      // Ajouter les montants calculés
      formData.append('subtotal', subtotal.toString());
      formData.append('taxAmount', taxAmount.toString());
      formData.append('total', total.toString());

      // Ajouter les items en JSON
      formData.append('items', JSON.stringify(items));

      const result = await updateInvoiceAction(invoiceId, formData);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la mise à jour de la facture');
      } else {
        toast.success('Facture mise à jour avec succès !');
        router.push(`/dashboard/invoices/${invoiceId}`);
      }
    });
  }

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <CircleNotch className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/invoices/${invoiceId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Modifier la facture</h1>
          <p className="text-muted-foreground">
            Modifiez les informations de la facture
          </p>
        </div>
      </div>

      {/* Avertissement si la facture n'est pas en DRAFT */}
      {invoiceStatus !== 'DRAFT' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-sm text-orange-800">
              ⚠️ Attention : Seules les factures en brouillon peuvent être modifiées.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={onSubmitWithValidation(onSubmit)} className="space-y-6">
          {/* Bannière de résumé des erreurs */}
          <FormErrorSummary
            errors={errorMessages}
            title="Veuillez corriger les erreurs suivantes"
            className="mb-6"
          />

          {/* Informations client et dates */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations de base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <FormControl>
                      <ClientSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Sélectionnez un client..."
                      />
                    </FormControl>
                    <FormDescription>
                      Recherchez et sélectionnez le client pour cette facture
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'échéance *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise *</FormLabel>
                      <FormControl>
                        <Input placeholder="EUR" maxLength={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lignes de facture */}
          <Card className="dashboard-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lignes de facture</CardTitle>
                  <CardDescription>
                    Ajoutez les produits ou services facturés
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="w-[15%]">Quantité</TableHead>
                    <TableHead className="w-[20%]">Prix unitaire</TableHead>
                    <TableHead className="w-[20%]">Montant</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="Description du produit/service"
                          value={item.description}
                          onChange={e => updateItem(index, 'description', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={e =>
                            updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={e =>
                            updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.amount.toFixed(2)} €</div>
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              {/* Totaux */}
              <div className="space-y-2 max-w-md ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA (20%)</span>
                  <span className="font-medium">{taxAmount.toFixed(2)} €</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{total.toFixed(2)} €</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Notes (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Notes ou conditions de paiement"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || items.length === 0}>
              {isPending ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour en cours...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Mettre à jour la facture
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
