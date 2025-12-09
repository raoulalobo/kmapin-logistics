/**
 * Composant : DocumentsGallery
 *
 * Galerie de visualisation des documents attachés à une entité
 * Permet la prévisualisation et la suppression des documents
 *
 * @module components/documents
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getDocumentsAction, deleteDocumentAction, type DocumentData } from '@/modules/documents';

/**
 * Props du composant
 */
interface DocumentsGalleryProps {
  entityId: string;
  entityType: 'shipment' | 'invoice' | 'quote';
  refreshTrigger?: number;
}

/**
 * Traduit le type de document
 */
function translateDocumentType(type: string): string {
  const translations: Record<string, string> = {
    INVOICE_SCAN: 'Scan de facture',
    PROOF_OF_DELIVERY: 'Preuve de livraison',
    CUSTOMS_DOCUMENT: 'Document douanier',
    PACKING_LIST: 'Liste de colisage',
    BILL_OF_LADING: 'Connaissement',
    CMR: 'Lettre de voiture CMR',
    AIRWAY_BILL: 'Lettre de transport aérien',
    CERTIFICATE: 'Certificat',
    PHOTO: 'Photo',
    OTHER: 'Autre',
  };
  return translations[type] || type;
}

/**
 * Galerie de documents
 */
export function DocumentsGallery({
  entityId,
  entityType,
  refreshTrigger,
}: DocumentsGalleryProps) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  /**
   * Charge les documents
   */
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const result = await getDocumentsAction(entityId, entityType);
      if (result.success && result.data) {
        setDocuments(result.data);
      } else {
        toast.error(result.error || 'Erreur lors du chargement des documents');
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Charge les documents au montage et au refresh
   */
  useEffect(() => {
    loadDocuments();
  }, [entityId, entityType, refreshTrigger]);

  /**
   * Supprime un document
   */
  const handleDelete = async (documentId: string) => {
    try {
      const result = await deleteDocumentAction(documentId);
      if (result.success) {
        toast.success('Document supprimé avec succès');
        loadDocuments();
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  /**
   * Détermine l'icône selon le type MIME
   */
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  /**
   * Formate la taille du fichier
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Aucun document attaché</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Utilisez le formulaire ci-dessus pour ajouter des documents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
          <CardDescription>
            Documents attachés à cet élément
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Icône et nom */}
                <div className="flex items-start gap-3 mb-3">
                  {getFileIcon(doc.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                </div>

                {/* Type et date */}
                <div className="space-y-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {translateDocumentType(doc.type)}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Uploadé le {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground italic">
                      {doc.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Par {doc.uploader.name || doc.uploader.email}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a
                      href={doc.fileUrl}
                      download={doc.name}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Télécharger
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDocumentToDelete(doc.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (documentToDelete) {
                  handleDelete(documentToDelete);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
