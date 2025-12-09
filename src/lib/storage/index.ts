/**
 * Exports centralisés pour le stockage de fichiers
 *
 * @module lib/storage
 */

export {
  b2Client,
  uploadFile,
  uploadFileFromFile,
  downloadFile,
  getSignedDownloadUrl,
  deleteFile,
  fileExists,
  listFiles,
  copyFile,
  moveFile,
  generateFileKey,
  getPublicUrl,
  type UploadOptions,
  type UploadResult,
} from './backblaze';

/**
 * Guide d'utilisation :
 *
 * 1. Upload d'un fichier :
 *    ```ts
 *    import { uploadFile } from '@/lib/storage';
 *
 *    const buffer = Buffer.from(await file.arrayBuffer());
 *    const result = await uploadFile(
 *      'documents/shipment-123/bl.pdf',
 *      buffer,
 *      { contentType: 'application/pdf' }
 *    );
 *    console.log('Uploaded:', result.url);
 *    ```
 *
 * 2. Upload depuis un formulaire :
 *    ```ts
 *    import { uploadFileFromFile, generateFileKey } from '@/lib/storage';
 *
 *    export async function uploadAction(formData: FormData) {
 *      const file = formData.get('file') as File;
 *      const key = generateFileKey('documents', file.name);
 *
 *      const result = await uploadFileFromFile(key, file);
 *      return result;
 *    }
 *    ```
 *
 * 3. Télécharger un fichier :
 *    ```ts
 *    import { downloadFile } from '@/lib/storage';
 *
 *    const buffer = await downloadFile('invoices/2025/01/INV-001.pdf');
 *    return new Response(buffer, {
 *      headers: { 'Content-Type': 'application/pdf' }
 *    });
 *    ```
 *
 * 4. URL signée temporaire :
 *    ```ts
 *    import { getSignedDownloadUrl } from '@/lib/storage';
 *
 *    // URL valide 15 minutes
 *    const url = await getSignedDownloadUrl('private/document.pdf', 900);
 *    ```
 */
