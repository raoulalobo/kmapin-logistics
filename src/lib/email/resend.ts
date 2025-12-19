/**
 * Configuration Resend pour l'envoi d'emails
 *
 * Gère l'envoi d'emails en mode développement (console) et production (Resend)
 *
 * @module lib/email/resend
 */

import { Resend } from 'resend';

/**
 * Instance Resend (initialisée uniquement si la clé API est présente)
 */
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Configuration des emails
 */
export const EMAIL_CONFIG = {
  from: 'KmapIn Logistics <noreply@kmapin.com>',
  replyTo: 'support@kmapin.com',
};

/**
 * Interface pour les paramètres d'envoi d'email
 */
export interface EmailParams {
  /** Adresse email du destinataire */
  to: string;
  /** Sujet de l'email */
  subject: string;
  /** Contenu HTML de l'email */
  html: string;
  /** Pièces jointes optionnelles */
  attachments?: Array<{
    /** Nom du fichier */
    filename: string;
    /** Contenu du fichier en Buffer */
    content: Buffer;
  }>;
}

/**
 * Interface pour le résultat d'envoi d'email
 */
export interface EmailResult {
  /** Indique si l'envoi a réussi */
  success: boolean;
  /** Données retournées par Resend (si succès) */
  data?: any;
  /** Message d'erreur (si échec) */
  error?: string;
}

/**
 * Envoyer un email via Resend ou en mode console
 *
 * En mode développement (EMAIL_PROVIDER=console), les emails sont affichés dans la console
 * En mode production (EMAIL_PROVIDER=resend), les emails sont envoyés via Resend
 *
 * @param params - Paramètres de l'email
 * @returns Résultat de l'envoi
 *
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   to: 'client@example.com',
 *   subject: 'Votre devis KmapIn',
 *   html: '<h1>Devis</h1><p>Votre devis est prêt</p>',
 *   attachments: [{
 *     filename: 'devis.pdf',
 *     content: pdfBuffer,
 *   }],
 * });
 *
 * if (result.success) {
 *   console.log('Email envoyé avec succès');
 * }
 * ```
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  const emailProvider = process.env.EMAIL_PROVIDER || 'console';

  // Mode développement : afficher dans la console
  if (emailProvider === 'console') {
    console.log('\n📧 ========== EMAIL SIMULÉ ==========');
    console.log('De:', EMAIL_CONFIG.from);
    console.log('À:', params.to);
    console.log('Sujet:', params.subject);
    console.log('Pièces jointes:', params.attachments?.map(a => a.filename).join(', ') || 'Aucune');
    console.log('Contenu HTML:', params.html.substring(0, 200) + '...');
    console.log('=====================================\n');

    return { success: true, data: { id: 'console-' + Date.now() } };
  }

  // Mode production : envoyer via Resend
  if (emailProvider === 'resend') {
    if (!resend) {
      const errorMessage = 'RESEND_API_KEY n\'est pas définie';
      console.error('❌ Erreur email:', errorMessage);
      return { success: false, error: errorMessage };
    }

    try {
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });

      console.log('✅ Email envoyé avec succès:', result);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de l\'envoi'
      };
    }
  }

  // Provider inconnu
  const errorMessage = `EMAIL_PROVIDER invalide: ${emailProvider}. Utilisez "console" ou "resend"`;
  console.error('❌', errorMessage);
  return { success: false, error: errorMessage };
}
