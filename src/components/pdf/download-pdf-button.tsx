/**
 * Composant : DownloadPDFButton
 *
 * Bouton réutilisable pour télécharger des PDFs (factures, devis)
 * Gère l'état de chargement et les erreurs
 *
 * @module components/pdf
 */

'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Props du composant DownloadPDFButton
 */
interface DownloadPDFButtonProps {
  /** ID du document à télécharger */
  documentId: string;
  /** Type de document (invoice ou quote) */
  documentType: 'invoice' | 'quote';
  /** Variante du bouton */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Taille du bouton */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Texte du bouton (optionnel) */
  label?: string;
  /** Afficher uniquement l'icône */
  iconOnly?: boolean;
}

/**
 * Bouton de téléchargement de PDF
 *
 * Appelle la server action appropriée selon le type de document
 * et déclenche le téléchargement du fichier PDF
 */
export function DownloadPDFButton({
  documentId,
  documentType,
  variant = 'outline',
  size = 'sm',
  label,
  iconOnly = false,
}: DownloadPDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Télécharge le PDF via l'API Route
   */
  const handleDownload = async () => {
    try {
      setIsLoading(true);

      // Appeler l'API Route pour obtenir le PDF
      const response = await fetch(`/api/pdf/${documentType}/${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la génération du PDF');
        return;
      }

      // Obtenir le blob PDF directement depuis la réponse
      const pdfBlob = await response.blob();

      // Extraire le nom du fichier depuis les headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `${documentType}-${documentId}.pdf`;

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Nettoyer
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setIsLoading(false);
    }
  };

  // Déterminer le texte du bouton
  const buttonLabel =
    label || (documentType === 'invoice' ? 'Télécharger facture' : 'Télécharger devis');

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isLoading}
    >
      <Download className={iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
      {!iconOnly && (isLoading ? 'Génération...' : buttonLabel)}
    </Button>
  );
}
