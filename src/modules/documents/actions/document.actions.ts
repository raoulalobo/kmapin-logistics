/**
 * Server Actions pour la gestion documentaire
 *
 * Fournit des actions sécurisées pour upload, suppression et liste de documents
 * Intégration avec Backblaze B2 pour le stockage cloud
 *
 * @module modules/documents/actions
 */

'use server';

import { requireAuth } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { uploadFile, deleteFile, isValidFileType, isValidFileSize } from '@/lib/storage/backblaze';
import type { ActionResponse } from '@/types';

/**
 * Type de document
 */
export type DocumentType =
  | 'INVOICE_SCAN'
  | 'PROOF_OF_DELIVERY'
  | 'CUSTOMS_DOCUMENT'
  | 'PACKING_LIST'
  | 'BILL_OF_LADING'
  | 'CMR'
  | 'AIRWAY_BILL'
  | 'CERTIFICATE'
  | 'PHOTO'
  | 'OTHER';

/**
 * Données d'upload de document
 */
interface UploadDocumentData {
  name: string;
  fileBase64: string;
  mimeType: string;
  fileSize: number;
  type: DocumentType;
  description?: string;
  shipmentId?: string;
  invoiceId?: string;
  quoteId?: string;
}

/**
 * Données de document retournées
 */
export interface DocumentData {
  id: string;
  name: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  type: string;
  description: string | null;
  uploadedAt: Date;
  uploader: {
    id: string;
    name: string | null;
    email: string;
  };
}

/**
 * Upload un document
 *
 * @param data - Données du document à uploader
 * @returns Document créé
 */
export async function uploadDocumentAction(
  data: UploadDocumentData
): Promise<ActionResponse<DocumentData>> {
  try {
    const session = await requireAuth();

    // Validation
    if (!data.shipmentId && !data.invoiceId && !data.quoteId) {
      return {
        success: false,
        error: 'Le document doit être associé à une expédition, facture ou devis',
      };
    }

    if (!isValidFileType(data.mimeType)) {
      return {
        success: false,
        error: 'Type de fichier non autorisé. Utilisez PDF, images ou documents Office.',
      };
    }

    if (!isValidFileSize(data.fileSize)) {
      return {
        success: false,
        error: 'La taille du fichier doit être inférieure à 50 MB',
      };
    }

    // Déterminer le dossier de stockage
    let folder = 'documents';
    if (data.shipmentId) folder = 'documents/shipments';
    else if (data.invoiceId) folder = 'documents/invoices';
    else if (data.quoteId) folder = 'documents/quotes';

    // Convertir base64 en Buffer
    const fileBuffer = Buffer.from(data.fileBase64, 'base64');

    // Upload vers Backblaze
    const { fileUrl, fileKey } = await uploadFile(
      fileBuffer,
      data.name,
      data.mimeType,
      folder
    );

    // Créer l'entrée en base de données
    const document = await prisma.document.create({
      data: {
        name: data.name,
        fileUrl,
        fileKey,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        type: data.type,
        description: data.description,
        companyId: session.user.companyId!,
        uploadedBy: session.user.id,
        shipmentId: data.shipmentId,
        invoiceId: data.invoiceId,
        quoteId: data.quoteId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: document,
    };
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'upload du document',
    };
  }
}

/**
 * Supprime un document
 *
 * @param documentId - ID du document à supprimer
 * @returns Succès ou erreur
 */
export async function deleteDocumentAction(
  documentId: string
): Promise<ActionResponse<void>> {
  try {
    const session = await requireAuth();

    // Récupérer le document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return {
        success: false,
        error: 'Document introuvable',
      };
    }

    // Vérifier les permissions RBAC
    const isAdmin = session.user.role === 'ADMIN';
    const isOperationsManager = session.user.role === 'OPERATIONS_MANAGER';
    const isOwner = document.uploadedBy === session.user.id;
    const isSameCompany = document.companyId === session.user.companyId;

    if (!isAdmin && !isOperationsManager && (!isOwner || !isSameCompany)) {
      return {
        success: false,
        error: 'Accès non autorisé à ce document',
      };
    }

    // Supprimer de Backblaze
    await deleteFile(document.fileKey);

    // Supprimer de la base de données
    await prisma.document.delete({
      where: { id: documentId },
    });

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error);
    return {
      success: false,
      error: 'Erreur lors de la suppression du document',
    };
  }
}

/**
 * Récupère tous les documents de la compagnie
 *
 * @param params - Paramètres de filtrage et pagination
 * @returns Liste des documents
 */
export async function getAllDocumentsAction(params?: {
  page?: number;
  limit?: number;
  type?: DocumentType;
  search?: string;
}): Promise<ActionResponse<{ documents: DocumentData[]; total: number }>> {
  try {
    const session = await requireAuth();
    const { page = 1, limit = 20, type, search } = params || {};
    const skip = (page - 1) * limit;

    // Construire les conditions de filtrage
    const where: any = {
      companyId: session.user.companyId,
    };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Récupérer les documents avec pagination
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shipment: {
            select: {
              id: true,
              trackingNumber: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
            },
          },
        },
        orderBy: {
          uploadedAt: 'desc',
        },
      }),
      prisma.document.count({ where }),
    ]);

    return {
      success: true,
      data: { documents, total },
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de tous les documents:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération des documents',
    };
  }
}

/**
 * Récupère les documents d'une entité
 *
 * @param entityId - ID de l'entité (shipment, invoice ou quote)
 * @param entityType - Type d'entité
 * @returns Liste des documents
 */
export async function getDocumentsAction(
  entityId: string,
  entityType: 'shipment' | 'invoice' | 'quote'
): Promise<ActionResponse<DocumentData[]>> {
  try {
    const session = await requireAuth();

    // Construire la condition where selon le type
    const whereCondition: any = {};
    if (entityType === 'shipment') whereCondition.shipmentId = entityId;
    else if (entityType === 'invoice') whereCondition.invoiceId = entityId;
    else if (entityType === 'quote') whereCondition.quoteId = entityId;

    // Récupérer les documents
    const documents = await prisma.document.findMany({
      where: whereCondition,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    // Vérifier les permissions pour chaque document
    const filteredDocuments = documents.filter((doc) => {
      const isAdmin = session.user.role === 'ADMIN';
      const isManager =
        session.user.role === 'OPERATIONS_MANAGER' ||
        session.user.role === 'FINANCE_MANAGER';
      const isSameCompany = doc.companyId === session.user.companyId;

      return isAdmin || isManager || isSameCompany;
    });

    return {
      success: true,
      data: filteredDocuments,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération des documents',
    };
  }
}
