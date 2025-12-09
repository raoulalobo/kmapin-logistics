/**
 * Service de stockage Backblaze B2
 *
 * Utilise l'API S3-compatible de Backblaze B2 pour upload/delete de fichiers
 * Configuration via variables d'environnement
 *
 * @module lib/storage
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Configuration du client S3 pour Backblaze B2
 */
const s3Client = new S3Client({
  endpoint: process.env.NEXT_PUBLIC_BACKBLAZE_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
  region: process.env.NEXT_PUBLIC_BACKBLAZE_REGION || 'us-east-005',
  credentials: {
    accessKeyId: process.env.BACKBLAZE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.BACKBLAZE_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_BACKBLAZE_BUCKET_NAME || 'meltinpot';
// Construire l'URL publique depuis l'endpoint et le bucket
const PUBLIC_URL = `${process.env.NEXT_PUBLIC_BACKBLAZE_ENDPOINT}/file/${BUCKET_NAME}`;

/**
 * Résultat d'un upload
 */
export interface UploadResult {
  fileUrl: string;
  fileKey: string;
}

/**
 * Upload un fichier vers Backblaze B2
 *
 * @param file - Buffer du fichier
 * @param fileName - Nom du fichier
 * @param contentType - Type MIME du fichier
 * @param folder - Dossier optionnel (documents/invoices, documents/shipments, etc.)
 * @returns URL publique et clé du fichier
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder?: string
): Promise<UploadResult> {
  try {
    // Générer un nom unique pour éviter les collisions
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = folder
      ? `${folder}/${timestamp}-${sanitizedFileName}`
      : `${timestamp}-${sanitizedFileName}`;

    // Upload vers Backblaze B2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Construire l'URL publique
    const fileUrl = `${PUBLIC_URL}/${key}`;

    return {
      fileUrl,
      fileKey: key,
    };
  } catch (error) {
    console.error('Erreur lors de l upload vers Backblaze:', error);
    throw new Error('Échec de l upload du fichier');
  }
}

/**
 * Supprime un fichier de Backblaze B2
 *
 * @param fileKey - Clé du fichier à supprimer
 */
export async function deleteFile(fileKey: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier Backblaze:', error);
    throw new Error('Échec de la suppression du fichier');
  }
}

/**
 * Valide le type de fichier
 *
 * @param mimeType - Type MIME à valider
 * @returns true si le type est autorisé
 */
export function isValidFileType(mimeType: string): boolean {
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

  return allowedTypes.includes(mimeType);
}

/**
 * Valide la taille du fichier (max 50 MB)
 *
 * @param size - Taille en octets
 * @returns true si la taille est valide
 */
export function isValidFileSize(size: number): boolean {
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
  return size > 0 && size <= MAX_SIZE;
}
