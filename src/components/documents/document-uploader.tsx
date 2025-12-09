/**
 * Composant : DocumentUploader
 *
 * Composant d'upload de fichiers avec drag & drop
 * Gère la validation, prévisualisation et upload vers Backblaze
 *
 * @module components/documents
 */

'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { uploadDocumentAction, type DocumentType } from '@/modules/documents';

/**
 * Props du composant
 */
interface DocumentUploaderProps {
  entityId: string;
  entityType: 'shipment' | 'invoice' | 'quote';
  onUploadComplete?: () => void;
}

/**
 * Types de documents disponibles
 */
const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'INVOICE_SCAN', label: 'Scan de facture' },
  { value: 'PROOF_OF_DELIVERY', label: 'Preuve de livraison' },
  { value: 'CUSTOMS_DOCUMENT', label: 'Document douanier' },
  { value: 'PACKING_LIST', label: 'Liste de colisage' },
  { value: 'BILL_OF_LADING', label: 'Connaissement' },
  { value: 'CMR', label: 'Lettre de voiture CMR' },
  { value: 'AIRWAY_BILL', label: 'Lettre de transport aérien' },
  { value: 'CERTIFICATE', label: 'Certificat' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Autre' },
];

/**
 * Composant d'upload de documents
 */
export function DocumentUploader({
  entityId,
  entityType,
  onUploadComplete,
}: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('OTHER');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Gère la sélection d'un fichier
   */
  const handleFileSelect = (file: File) => {
    // Validation taille (50 MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 50 MB)');
      return;
    }

    // Validation type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non autorisé');
      return;
    }

    setSelectedFile(file);
  };

  /**
   * Gère le drag & drop
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Upload le fichier
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Convertir le fichier en base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);

      reader.onload = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1]; // Enlever le préfixe data:...

        // Construire les données selon le type d'entité
        const uploadData: any = {
          name: selectedFile.name,
          fileBase64: base64Data,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          type: documentType,
          description: description || undefined,
        };

        if (entityType === 'shipment') uploadData.shipmentId = entityId;
        else if (entityType === 'invoice') uploadData.invoiceId = entityId;
        else if (entityType === 'quote') uploadData.quoteId = entityId;

        // Upload via server action
        const result = await uploadDocumentAction(uploadData);

        if (result.success) {
          toast.success('Document uploadé avec succès');
          setSelectedFile(null);
          setDescription('');
          setDocumentType('OTHER');
          onUploadComplete?.();
        } else {
          toast.error(result.error || 'Erreur lors de l\'upload');
        }
      };

      reader.onerror = () => {
        toast.error('Erreur lors de la lecture du fichier');
      };
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Détermine l'icône selon le type MIME
   */
  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-12 w-12" />;
    if (selectedFile.type.startsWith('image/')) return <ImageIcon className="h-12 w-12" />;
    return <FileText className="h-12 w-12" />;
  };

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${selectedFile ? 'bg-gray-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              handleFileSelect(files[0]);
            }
          }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
        />

        <div className="flex flex-col items-center gap-2">
          {getFileIcon()}

          {selectedFile ? (
            <>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                Cliquez ou glissez un fichier ici
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, images, documents Office (max 50 MB)
              </p>
            </>
          )}
        </div>
      </div>

      {selectedFile && (
        <>
          {/* Type de document */}
          <div className="space-y-2">
            <Label htmlFor="document-type">Type de document</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as DocumentType)}
            >
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Input
              id="description"
              placeholder="Ajouter une description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Bouton upload */}
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? 'Upload en cours...' : 'Uploader le document'}
          </Button>
        </>
      )}
    </div>
  );
}
