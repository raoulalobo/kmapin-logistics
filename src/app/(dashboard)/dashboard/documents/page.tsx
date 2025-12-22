/**
 * Page Documents
 *
 * Centralise tous les documents de l'entreprise en un seul endroit.
 * Permet de :
 * - Visualiser tous les documents (factures, CMR, douanes, etc.)
 * - Filtrer par type de document
 * - Rechercher dans les noms et descriptions
 * - Télécharger les documents
 * - Voir les métadonnées (uploader, date, entité liée)
 *
 * Réutilise le module documents existant avec getAllDocumentsAction
 */

import Link from 'next/link';
import { FileText, Download, Eye, MagnifyingGlass, Funnel, File, Package, Receipt } from '@phosphor-icons/react/dist/ssr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getAllDocumentsAction, type DocumentType } from '@/modules/documents';

/**
 * Obtenir l'icône appropriée selon le type de document
 */
function getDocumentIcon(type: string) {
  switch (type) {
    case 'INVOICE_SCAN':
      return <Receipt className="h-8 w-8 text-blue-500" />;
    case 'PROOF_OF_DELIVERY':
      return <Package className="h-8 w-8 text-green-500" />;
    case 'CUSTOMS_DOCUMENT':
      return <FileText className="h-8 w-8 text-purple-500" />;
    case 'PACKING_LIST':
      return <FileText className="h-8 w-8 text-orange-500" />;
    case 'BILL_OF_LADING':
    case 'CMR':
    case 'AIRWAY_BILL':
      return <FileText className="h-8 w-8 text-indigo-500" />;
    case 'CERTIFICATE':
      return <File className="h-8 w-8 text-yellow-500" />;
    case 'PHOTO':
      return <File className="h-8 w-8 text-pink-500" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
}

/**
 * Obtenir le label français du type de document
 */
function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
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
  return labels[type] || type;
}

/**
 * Formater la taille de fichier en format lisible
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: DocumentType; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const result = await getAllDocumentsAction({
    page,
    type: params.type,
    search: params.search,
  });

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Tous vos documents en un seul endroit
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">Erreur lors du chargement des documents</p>
        </Card>
      </div>
    );
  }

  const { documents, total } = result.data;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Tous vos documents en un seul endroit
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            {total} document{total > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Barre de recherche et filtres */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un document..."
            className="pl-10"
            defaultValue={params.search}
          />
        </div>
        <Button variant="outline" size="icon">
          <Funnel className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtres rapides par type */}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/documents">
          <Badge variant={!params.type ? 'default' : 'outline'}>
            Tous
          </Badge>
        </Link>
        <Link href="/dashboard/documents?type=INVOICE_SCAN">
          <Badge variant={params.type === 'INVOICE_SCAN' ? 'default' : 'outline'}>
            Factures
          </Badge>
        </Link>
        <Link href="/dashboard/documents?type=CMR">
          <Badge variant={params.type === 'CMR' ? 'default' : 'outline'}>
            CMR
          </Badge>
        </Link>
        <Link href="/dashboard/documents?type=CUSTOMS_DOCUMENT">
          <Badge variant={params.type === 'CUSTOMS_DOCUMENT' ? 'default' : 'outline'}>
            Douanes
          </Badge>
        </Link>
        <Link href="/dashboard/documents?type=PROOF_OF_DELIVERY">
          <Badge variant={params.type === 'PROOF_OF_DELIVERY' ? 'default' : 'outline'}>
            Preuves de livraison
          </Badge>
        </Link>
        <Link href="/dashboard/documents?type=OTHER">
          <Badge variant={params.type === 'OTHER' ? 'default' : 'outline'}>
            Autres
          </Badge>
        </Link>
      </div>

      {/* Liste des documents */}
      {documents.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun document trouvé</h3>
            <p className="text-sm text-muted-foreground">
              {params.search || params.type
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par uploader des documents dans vos expéditions, factures ou devis'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                {/* Icône et infos du document */}
                <div className="flex items-center gap-4 flex-1">
                  {getDocumentIcon(doc.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{doc.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {getDocumentTypeLabel(doc.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>
                        Uploadé par {doc.uploader.name || doc.uploader.email}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(doc.uploadedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {/* Afficher l'entité liée si disponible */}
                      {(doc as any).shipment && (
                        <>
                          <span>•</span>
                          <Link
                            href={`/dashboard/shipments/${(doc as any).shipment.id}`}
                            className="text-primary hover:underline"
                          >
                            {(doc as any).shipment.trackingNumber}
                          </Link>
                        </>
                      )}
                      {(doc as any).invoice && (
                        <>
                          <span>•</span>
                          <Link
                            href={`/dashboard/invoices/${(doc as any).invoice.id}`}
                            className="text-primary hover:underline"
                          >
                            {(doc as any).invoice.invoiceNumber}
                          </Link>
                        </>
                      )}
                      {(doc as any).quote && (
                        <>
                          <span>•</span>
                          <Link
                            href={`/dashboard/quotes/${(doc as any).quote.id}`}
                            className="text-primary hover:underline"
                          >
                            {(doc as any).quote.quoteNumber}
                          </Link>
                        </>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.fileUrl} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages} • {total} document{total > 1 ? 's' : ''} au total
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/documents?page=${page - 1}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}>
                  Précédent
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/documents?page=${page + 1}${params.type ? `&type=${params.type}` : ''}${params.search ? `&search=${params.search}` : ''}`}>
                  Suivant
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
