/**
 * Template email de bienvenue après création de compte
 *
 * @module lib/email/templates/welcome
 */

/**
 * Paramètres pour le template de bienvenue
 */
export interface WelcomeEmailParams {
  /** Nom de l'utilisateur (optionnel) */
  userName?: string | null;
  /** Nombre de devis rattachés au compte */
  quoteCount: number;
}

/**
 * Génère le HTML de l'email de bienvenue
 *
 * @param params - Paramètres du template
 * @returns HTML de l'email
 */
export function generateWelcomeTemplate(params: WelcomeEmailParams): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenue sur Faso Fret Logistics</title>
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
          background: linear-gradient(135deg, #003D82 0%, #002952 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header .emoji {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .header p {
          color: #e0e0e0;
          margin: 0;
          font-size: 14px;
        }
        .content {
          padding: 30px 20px;
        }
        .success-box {
          background: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin: 20px 0;
        }
        .success-box strong {
          color: #155724;
        }
        .features {
          background: #f9f9f9;
          padding: 20px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .features h3 {
          color: #003D82;
          margin-top: 0;
        }
        .features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .features li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
        }
        .features li:before {
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
          background: #003D82;
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
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- En-tête -->
        <div class="header">
          <div class="emoji">🎉</div>
          <h1>Bienvenue sur Faso Fret Logistics !</h1>
          <p>Votre compte a été créé avec succès</p>
        </div>

        <!-- Contenu principal -->
        <div class="content">
          <p>Bonjour${params.userName ? ` ${params.userName}` : ''},</p>

          <div class="success-box">
            <p style="margin: 0;">
              <strong>Votre compte a été créé avec succès !</strong>
            </p>
          </div>

          ${
            params.quoteCount > 0
              ? `
          <p>Nous avons automatiquement rattaché ${params.quoteCount === 1 ? 'votre devis' : `vos ${params.quoteCount} devis`} à votre compte.
          Vous pouvez ${params.quoteCount === 1 ? 'le' : 'les'} consulter dans votre espace client.</p>
          `
              : ''
          }

          <div class="features">
            <h3>Vous pouvez maintenant :</h3>
            <ul>
              <li>Gérer vos devis et expéditions</li>
              <li>Suivre vos colis en temps réel avec notre système de tracking</li>
              <li>Accéder à toutes vos factures en un seul endroit</li>
              <li>Télécharger vos documents de transport</li>
              <li>Contacter notre support prioritaire</li>
              <li>Recevoir des notifications sur l'état de vos envois</li>
            </ul>
          </div>

          <p style="margin-top: 20px;">
            Notre équipe est là pour vous accompagner dans tous vos projets logistiques.
            N'hésitez pas à nous contacter si vous avez des questions.
          </p>

          <!-- Call to Action -->
          <div class="cta-container">
            <a href="${baseUrl}/dashboard" class="cta-button">
              Accéder à mon espace client
            </a>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            Merci de nous faire confiance pour vos besoins en transport international.
          </p>
        </div>

        <!-- Pied de page -->
        <div class="footer">
          <p><strong>Faso Fret Logistics</strong></p>
          <p>Transport multi-modal international</p>
          <p style="margin-top: 10px;">
            Besoin d'aide ? Répondez à cet email ou contactez-nous à support@kmapin.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
