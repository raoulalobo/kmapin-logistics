/**
 * Template email pour rappel d'invitation (J-3 avant expiration)
 *
 * @module lib/email/templates/invitation
 */

/**
 * Paramètres pour le template de rappel d'invitation
 */
export interface InvitationReminderParams {
  /** Nom du prospect (optionnel) */
  prospectName?: string | null;
  /** Token d'invitation */
  invitationToken: string;
  /** Nombre de jours restants */
  daysRemaining: number;
  /** Nombre de devis du prospect */
  quoteCount: number;
}

/**
 * Génère le HTML de l'email de rappel d'invitation
 *
 * @param params - Paramètres du template
 * @returns HTML de l'email
 */
export function generateInvitationReminderTemplate(
  params: InvitationReminderParams
): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const invitationUrl = `${baseUrl}/complete-registration?token=${params.invitationToken}`;

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dernier rappel - Votre invitation expire bientôt</title>
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
          background: linear-gradient(135deg, #ff9800 0%, #ff6f00 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        .header p {
          color: #fff3cd;
          margin: 0;
          font-size: 14px;
        }
        .content {
          padding: 30px 20px;
        }
        .urgency-box {
          background: #fff3cd;
          border-left: 4px solid #ff9800;
          padding: 15px;
          margin: 20px 0;
        }
        .urgency-box strong {
          color: #ff6f00;
        }
        .benefits ul {
          list-style: none;
          padding: 0;
          margin: 15px 0;
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
          color: #003D82;
          font-weight: bold;
        }
        .cta-container {
          text-align: center;
          margin: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background: #ff9800;
          color: white;
          padding: 15px 40px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          font-size: 16px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #999;
          font-size: 12px;
          background-color: #f4f4f4;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- En-tête -->
        <div class="header">
          <h1>⚠ Dernier rappel</h1>
          <p>Votre invitation expire bientôt</p>
        </div>

        <!-- Contenu principal -->
        <div class="content">
          <p>Bonjour${params.prospectName ? ` ${params.prospectName}` : ''},</p>

          <div class="urgency-box">
            <p style="margin: 0;">
              <strong>Votre lien d'invitation expire dans ${params.daysRemaining} jour${params.daysRemaining > 1 ? 's' : ''} !</strong>
            </p>
          </div>

          <p>Vous avez demandé ${params.quoteCount} devis sur notre plateforme, mais vous n'avez pas encore finalisé votre inscription.</p>

          <div class="benefits">
            <p style="margin-bottom: 10px;"><strong>Créez votre compte maintenant pour :</strong></p>
            <ul>
              <li>Conserver l'accès à vos ${params.quoteCount} devis</li>
              <li>Suivre vos expéditions en temps réel</li>
              <li>Bénéficier de notre support client dédié</li>
              <li>Gérer vos documents et factures</li>
            </ul>
          </div>

          <p style="margin-top: 20px; color: #666;">
            Après l'expiration du lien, vous devrez redemander un nouveau devis.
            Ne perdez pas les estimations que nous avons préparées pour vous !
          </p>

          <!-- Call to Action -->
          <div class="cta-container">
            <a href="${invitationUrl}" class="cta-button">
              Finaliser mon inscription maintenant
            </a>
          </div>
        </div>

        <!-- Pied de page -->
        <div class="footer">
          <p><strong>KmapIn Logistics</strong></p>
          <p>Transport multi-modal international</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
