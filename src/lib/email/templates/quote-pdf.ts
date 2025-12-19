/**
 * Template email pour l'envoi de devis prospect avec PDF
 *
 * @module lib/email/templates/quote-pdf
 */

/**
 * Paramètres pour le template email de devis
 */
export interface QuoteEmailParams {
  /** Nom du prospect (optionnel) */
  prospectName?: string | null;
  /** Numéro du devis */
  quoteNumber: string;
  /** Coût estimé */
  estimatedCost: number;
  /** Devise */
  currency: string;
  /** Token d'invitation */
  invitationToken: string;
  /** Date d'expiration de l'invitation */
  invitationExpiresAt: Date;
}

/**
 * Génère le HTML de l'email pour l'envoi de devis prospect
 *
 * @param params - Paramètres du template
 * @returns HTML de l'email
 */
export function generateQuoteEmailTemplate(params: QuoteEmailParams): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const invitationUrl = `${baseUrl}/complete-registration?token=${params.invitationToken}`;

  const daysRemaining = Math.ceil(
    (params.invitationExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Votre devis KmapIn Logistics</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #0033FF 0%, #0029CC 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          color: #e0e0e0;
          margin: 0;
          font-size: 14px;
        }
        .content {
          padding: 30px 20px;
          background-color: #f9f9f9;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
        }
        .quote-summary {
          background: white;
          padding: 20px;
          border-left: 4px solid #0033FF;
          margin: 20px 0;
        }
        .quote-summary .label {
          color: #666;
          font-size: 12px;
          margin: 0;
          text-transform: uppercase;
        }
        .quote-summary .value {
          color: #0033FF;
          font-size: 32px;
          font-weight: bold;
          margin: 5px 0 0 0;
        }
        .benefits {
          background: white;
          padding: 20px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .benefits h3 {
          color: #0033FF;
          margin-top: 0;
        }
        .benefits ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .benefits li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
        }
        .benefits li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #0033FF;
          font-weight: bold;
        }
        .cta-container {
          text-align: center;
          margin: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background: #0033FF;
          color: white;
          padding: 15px 40px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          font-size: 16px;
        }
        .cta-button:hover {
          background: #0029CC;
        }
        .expiry-notice {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 15px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #999;
          font-size: 12px;
          background-color: #f4f4f4;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- En-tête -->
        <div class="header">
          <h1>KmapIn Logistics</h1>
          <p>Votre partenaire en logistique multi-modale</p>
        </div>

        <!-- Contenu principal -->
        <div class="content">
          <div class="greeting">
            <p>Bonjour${params.prospectName ? ` ${params.prospectName}` : ''},</p>
          </div>

          <p>Merci d'avoir utilisé notre calculateur de devis. Veuillez trouver ci-joint votre estimation détaillée.</p>

          <!-- Résumé du devis -->
          <div class="quote-summary">
            <p class="label">Devis n° ${params.quoteNumber}</p>
            <p class="value">${params.estimatedCost.toLocaleString('fr-FR')} ${params.currency}</p>
          </div>

          <!-- Avantages de créer un compte -->
          <div class="benefits">
            <h3>Créez votre compte gratuit et bénéficiez de :</h3>
            <ul>
              <li>Accès à l'historique de tous vos devis</li>
              <li>Suivi en temps réel de vos expéditions</li>
              <li>Gestion centralisée de vos factures</li>
              <li>Support client prioritaire</li>
              <li>Notifications automatiques sur vos envois</li>
            </ul>
          </div>

          <!-- Call to Action -->
          <div class="cta-container">
            <a href="${invitationUrl}" class="cta-button">
              Créer mon compte gratuitement
            </a>
            <p class="expiry-notice">
              Ce lien est valide pendant ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}
              (jusqu'au ${params.invitationExpiresAt.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })})
            </p>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            En créant votre compte, vous pourrez finaliser cette estimation et la transformer en demande de transport officielle.
            Notre équipe se fera un plaisir de vous accompagner dans votre projet logistique.
          </p>

          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Vous avez des questions ? N'hésitez pas à répondre à cet email, nous sommes là pour vous aider.
          </p>
        </div>

        <!-- Pied de page -->
        <div class="footer">
          <p><strong>KmapIn Logistics</strong></p>
          <p>Transport multi-modal international</p>
          <p style="margin-top: 10px;">
            Cet email a été envoyé automatiquement suite à votre demande de devis sur notre plateforme.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
