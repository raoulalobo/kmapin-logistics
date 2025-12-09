/**
 * Composant : DocumentsSection
 *
 * Section complète de gestion documentaire
 * Combine l'uploader et la galerie de documents
 *
 * @module components/documents
 */

'use client';

import { useState } from 'react';
import { DocumentUploader } from './document-uploader';
import { DocumentsGallery } from './documents-gallery';

/**
 * Props du composant
 */
interface DocumentsSectionProps {
  entityId: string;
  entityType: 'shipment' | 'invoice' | 'quote';
}

/**
 * Section de gestion documentaire complète
 */
export function DocumentsSection({ entityId, entityType }: DocumentsSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /**
   * Rafraîchit la galerie après un upload
   */
  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Ajouter un document</h3>
        <DocumentUploader
          entityId={entityId}
          entityType={entityType}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      {/* Galerie */}
      <DocumentsGallery
        entityId={entityId}
        entityType={entityType}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
