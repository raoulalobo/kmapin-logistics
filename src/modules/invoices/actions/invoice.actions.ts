/**
 * Server Actions : Factures (Invoices)
 *
 * Actions serveur pour la gestion CRUD des factures
 * Toutes les actions sont sécurisées avec vérification d'authentification et permissions RBAC
 *
 * @module modules/invoices/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/config';
import { requirePermission, hasPermission } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/db/enums';
import {
  invoiceSchema,
  invoiceUpdateSchema,
  invoicePaymentSchema,
  type InvoiceFormData,
  type InvoiceUpdateData,
  type InvoicePaymentData,
} from '../schemas/invoice.schema';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

/**
 * Générer un numéro de facture unique
 * Format: INV-YYYYMMDD-XXXXX (ex: INV-20250103-00001)
 */
async function generateInvoiceNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Compter le nombre de factures créées aujourd'hui
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await prisma.invoice.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Incrémenter et formater le numéro
  const sequence = String(count + 1).padStart(5, '0');
  const invoiceNumber = `INV-${datePrefix}-${sequence}`;

  // Vérifier que le numéro n'existe pas déjà (très rare)
  const existing = await prisma.invoice.findUnique({
    where: { invoiceNumber },
  });

  if (existing) {
    // Si le numéro existe déjà, régénérer avec un timestamp
    const timestamp = Date.now().toString().slice(-5);
    return `INV-${datePrefix}-${timestamp}`;
  }

  return invoiceNumber;
}

/**
 * Action : Créer une nouvelle facture
 *
 * Crée une nouvelle facture dans la base de données
 * après validation des données et vérification des permissions
 *
 * @param formData - Données du formulaire de création
 * @returns Résultat avec ID et numéro de facture créée ou erreur
 *
 * @permissions 'invoices:create' - ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER
 */
export async function createInvoiceAction(
  formData: FormData
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN, OPERATIONS_MANAGER et FINANCE_MANAGER peuvent créer des factures
     * Permission requise: 'invoices:create'
     */
    const session = await requirePermission('invoices:create');

    // Extraire et valider les données
    const rawData = {
      companyId: formData.get('companyId'),
      issueDate: formData.get('issueDate') || undefined,
      dueDate: formData.get('dueDate'),
      subtotal: Number(formData.get('subtotal')),
      taxRate: Number(formData.get('taxRate')) || 0,
      taxAmount: Number(formData.get('taxAmount')),
      discount: Number(formData.get('discount')) || 0,
      total: Number(formData.get('total')),
      currency: formData.get('currency') || 'EUR',
      status: formData.get('status') || 'DRAFT',
      paymentMethod: formData.get('paymentMethod') || null,
      paidDate: formData.get('paidDate') || null,
      quoteId: formData.get('quoteId') || null,
      notes: formData.get('notes') || null,
      items: JSON.parse(formData.get('items') as string || '[]'),
    };

    const validatedData = invoiceSchema.parse(rawData);

    // Vérifier que la compagnie existe
    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
    });

    if (!company) {
      return {
        success: false,
        error: 'Compagnie introuvable',
        field: 'companyId',
      };
    }

    // Si un devis est fourni, vérifier qu'il existe
    if (validatedData.quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: validatedData.quoteId },
      });

      if (!quote) {
        return {
          success: false,
          error: 'Devis introuvable',
          field: 'quoteId',
        };
      }
    }

    // Générer un numéro de facture unique
    const invoiceNumber = await generateInvoiceNumber();

    // Créer la facture avec ses lignes
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        companyId: validatedData.companyId,
        issueDate: validatedData.issueDate ? new Date(validatedData.issueDate) : new Date(),
        dueDate: new Date(validatedData.dueDate),
        subtotal: validatedData.subtotal,
        taxRate: validatedData.taxRate,
        taxAmount: validatedData.taxAmount,
        discount: validatedData.discount,
        total: validatedData.total,
        currency: validatedData.currency,
        status: validatedData.status || 'DRAFT',
        paymentMethod: validatedData.paymentMethod,
        paidDate: validatedData.paidDate ? new Date(validatedData.paidDate) : null,
        quoteId: validatedData.quoteId,
        notes: validatedData.notes,
        createdById: session.user.id,
        items: {
          create: validatedData.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Revalider la liste des factures
    revalidatePath('/dashboard/invoices');

    return {
      success: true,
      data: { id: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };
  } catch (error) {
    console.error('Error creating invoice:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour créer une facture',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }

      if (error.message.includes('ZodError')) {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création de la facture',
    };
  }
}

/**
 * Action : Obtenir la liste des factures
 *
 * Récupère toutes les factures avec pagination optionnelle
 * Filtre selon les permissions de l'utilisateur (les CLIENTS ne voient que leurs factures)
 *
 * @param page - Numéro de page (optionnel, défaut: 1)
 * @param limit - Nombre de résultats par page (optionnel, défaut: 10)
 * @param companyId - Filtrer par compagnie (optionnel)
 * @param status - Filtrer par statut (optionnel)
 * @param search - Terme de recherche (numéro facture, client) (optionnel)
 * @returns Liste des factures
 *
 * @permissions 'invoices:read' ou 'invoices:read:own' - Tous les rôles
 */
export async function getInvoicesAction(
  page = 1,
  limit = 10,
  companyId?: string,
  status?: string,
  search?: string
) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'invoices:read' ou 'invoices:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'invoices:read');
    const canReadOwn = hasPermission(userRole, 'invoices:read:own');

    if (!canReadAll && !canReadOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter les factures',
      };
    }

    // Calculer le skip pour la pagination
    const skip = (page - 1) * limit;

    // Construire les filtres
    const where: any = {};

    // Si l'utilisateur est CLIENT, il ne voit que ses propres factures
    if (canReadOwn && !canReadAll) {
      if (!session.user.companyId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à une compagnie',
        };
      }
      where.companyId = session.user.companyId;
    } else if (companyId) {
      // Sinon, filtrer par companyId si fourni
      where.companyId = companyId;
    }

    // Filtrer par statut si fourni
    if (status) {
      where.status = status;
    }

    // Recherche textuelle si fournie
    if (search && search.trim()) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Récupérer les factures
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      success: true,
      data: {
        invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error getting invoices:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter les factures',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération des factures',
    };
  }
}

/**
 * Action : Obtenir une facture par ID
 *
 * Récupère les détails complets d'une facture
 * Les CLIENTS ne peuvent voir que leurs propres factures
 *
 * @param id - ID de la facture
 * @returns Données de la facture ou erreur
 *
 * @permissions 'invoices:read' ou 'invoices:read:own'
 */
export async function getInvoiceAction(id: string) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'invoices:read' ou 'invoices:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'invoices:read');
    const canReadOwn = hasPermission(userRole, 'invoices:read:own');

    if (!canReadAll && !canReadOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter cette facture',
      };
    }

    // Récupérer la facture avec toutes les relations
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
        quote: true,
        shipment: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Facture introuvable',
      };
    }

    // Si l'utilisateur est CLIENT, vérifier qu'il peut accéder à cette facture
    if (canReadOwn && !canReadAll) {
      if (session.user.companyId !== invoice.companyId) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à cette facture',
        };
      }
    }

    return { success: true, data: invoice };
  } catch (error) {
    console.error('Error getting invoice:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter cette facture',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération de la facture',
    };
  }
}

/**
 * Action : Mettre à jour une facture
 *
 * Met à jour les informations d'une facture existante
 * Seules les factures en DRAFT peuvent être modifiées librement
 *
 * @param id - ID de la facture à mettre à jour
 * @param formData - Nouvelles données de la facture
 * @returns Résultat de la mise à jour
 *
 * @permissions 'invoices:update' - ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER
 */
export async function updateInvoiceAction(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN, OPERATIONS_MANAGER et FINANCE_MANAGER peuvent modifier des factures
     * Permission requise: 'invoices:update'
     */
    await requirePermission('invoices:update');

    // Vérifier que la facture existe
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingInvoice) {
      return { success: false, error: 'Facture introuvable' };
    }

    // Empêcher la modification si la facture est payée (sauf pour le statut)
    if (existingInvoice.status === 'PAID' && !formData.has('status')) {
      return {
        success: false,
        error: 'Une facture payée ne peut pas être modifiée',
      };
    }

    // Extraire les données
    const rawData: any = {};
    const simpleFields = [
      'companyId',
      'issueDate',
      'dueDate',
      'currency',
      'status',
      'paymentMethod',
      'paidDate',
      'quoteId',
      'notes',
    ];

    simpleFields.forEach((field) => {
      const value = formData.get(field);
      if (value !== null) {
        rawData[field] = value || null;
      }
    });

    // Champs numériques
    ['subtotal', 'taxRate', 'taxAmount', 'discount', 'total'].forEach((field) => {
      const value = formData.get(field);
      if (value !== null && value !== '') {
        rawData[field] = Number(value);
      }
    });

    // Lignes de facture
    const itemsData = formData.get('items');
    if (itemsData) {
      rawData.items = JSON.parse(itemsData as string);
    }

    const validatedData = invoiceUpdateSchema.parse(rawData);

    // Mettre à jour la facture
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...validatedData,
        issueDate: validatedData.issueDate
          ? new Date(validatedData.issueDate)
          : undefined,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
        paidDate: validatedData.paidDate ? new Date(validatedData.paidDate) : undefined,
        // Si les lignes sont fournies, les recréer
        ...(validatedData.items && {
          items: {
            deleteMany: {},
            create: validatedData.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })),
          },
        }),
      },
    });

    // Revalider les pages
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);

    return { success: true, data: { id: updatedInvoice.id } };
  } catch (error) {
    console.error('Error updating invoice:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour modifier cette facture',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }

      if (error.message.includes('ZodError')) {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour de la facture',
    };
  }
}

/**
 * Action : Supprimer une facture
 *
 * Supprime une facture de la base de données
 * Seules les factures en DRAFT peuvent être supprimées
 *
 * @param id - ID de la facture à supprimer
 * @returns Résultat de la suppression
 *
 * @permissions 'invoices:delete' - ADMIN, FINANCE_MANAGER
 */
export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN et FINANCE_MANAGER peuvent supprimer des factures
     * Permission requise: 'invoices:delete'
     */
    await requirePermission('invoices:delete');

    // Vérifier que la facture existe
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        shipment: true,
      },
    });

    if (!invoice) {
      return { success: false, error: 'Facture introuvable' };
    }

    // Empêcher la suppression si la facture n'est pas en DRAFT
    if (invoice.status !== 'DRAFT') {
      return {
        success: false,
        error: 'Seules les factures en brouillon peuvent être supprimées',
      };
    }

    // Supprimer la facture (les items seront supprimés en cascade)
    await prisma.invoice.delete({
      where: { id },
    });

    // Revalider la liste des factures
    revalidatePath('/dashboard/invoices');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting invoice:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour supprimer cette facture',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la suppression de la facture',
    };
  }
}

/**
 * Action : Marquer une facture comme payée
 *
 * Met à jour le statut d'une facture à PAID et enregistre les informations de paiement
 *
 * @param id - ID de la facture
 * @param paymentData - Données de paiement (méthode, date, notes)
 * @returns Résultat de la mise à jour
 *
 * @permissions 'invoices:update' - ADMIN, FINANCE_MANAGER
 */
export async function markInvoiceAsPaidAction(
  id: string,
  paymentData: InvoicePaymentData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'invoices:update'
     */
    await requirePermission('invoices:update');

    // Vérifier que la facture existe
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return { success: false, error: 'Facture introuvable' };
    }

    // Vérifier que la facture n'est pas déjà payée
    if (invoice.status === 'PAID') {
      return {
        success: false,
        error: 'Cette facture est déjà marquée comme payée',
      };
    }

    // Valider les données
    const validatedData = invoicePaymentSchema.parse(paymentData);

    // Mettre à jour la facture
    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentMethod: validatedData.paymentMethod,
        paidDate: validatedData.paidDate ? new Date(validatedData.paidDate) : new Date(),
        notes: validatedData.notes || invoice.notes,
      },
    });

    // Revalider les pages
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error('Error marking invoice as paid:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour modifier cette facture',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }

      if (error.message.includes('ZodError')) {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour du statut',
    };
  }
}
