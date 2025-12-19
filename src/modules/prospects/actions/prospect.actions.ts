/**
 * Server Actions pour la gestion des prospects
 *
 * IMPORTANT : Ces actions utilisent le client Prisma STANDARD (pas enhanced)
 * car elles sont publiques et n'ont pas de session utilisateur.
 *
 * @module modules/prospects/actions
 */

'use server';

import { prisma } from '@/lib/db/client';
import {
  prospectSchema,
  completeRegistrationSchema,
  attachToAccountSchema,
  type ProspectFormData,
  type CompleteRegistrationFormData,
  type AttachToAccountFormData,
} from '../schemas/prospect.schema';
import { sendEmail } from '@/lib/email/resend';
import { generateGuestQuotePDF } from '@/lib/pdf/guest-quote-pdf';
import { generateQuoteEmailTemplate } from '@/lib/email/templates/quote-pdf';
import { inngest } from '@/lib/inngest/client';

/**
 * Générer un numéro de GuestQuote unique
 * Format : GQTE-YYYYMMDD-XXXXX
 *
 * @returns Numéro unique de GuestQuote
 */
async function generateGuestQuoteNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Compter les GuestQuotes créés aujourd'hui
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await prisma.guestQuote.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(count + 1).padStart(5, '0');
  const quoteNumber = `GQTE-${datePrefix}-${sequence}`;

  // Vérifier l'unicité (rare mais possible en cas de race condition)
  const existing = await prisma.guestQuote.findUnique({
    where: { quoteNumber },
  });

  if (existing) {
    // Fallback : utiliser timestamp
    const timestamp = Date.now().toString().slice(-5);
    return `GQTE-${datePrefix}-${timestamp}`;
  }

  return quoteNumber;
}

/**
 * Créer un prospect et envoyer le devis par email
 *
 * Workflow :
 * 1. Valider les données
 * 2. Créer ou réutiliser le prospect (si EXPIRED)
 * 3. Créer le GuestQuote avec numéro unique
 * 4. Générer le PDF du devis
 * 5. Envoyer l'email avec PDF + lien d'invitation
 *
 * @param data - Données du formulaire (email, phone, name?, company?, quoteData)
 * @returns Résultat avec prospectId, guestQuoteId, quoteNumber
 */
export async function createProspectAndSendQuoteAction(data: unknown) {
  try {
    // 1. Valider les données
    const validated = prospectSchema.parse(data);

    // 2. Vérifier si le prospect existe déjà
    let prospect = await prisma.prospect.findUnique({
      where: { email: validated.email },
    });

    // Si le prospect existe et est EXPIRED, le réactiver avec nouveau token
    if (prospect && prospect.status === 'EXPIRED') {
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // 7 jours

      prospect = await prisma.prospect.update({
        where: { id: prospect.id },
        data: {
          phone: validated.phone || prospect.phone,
          name: validated.name || prospect.name,
          company: validated.company || prospect.company,
          status: 'PENDING',
          invitationExpiresAt,
          // Le token est régénéré automatiquement via @default(cuid())
        },
      });
    }
    // Si le prospect n'existe pas, le créer
    else if (!prospect) {
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // 7 jours

      prospect = await prisma.prospect.create({
        data: {
          email: validated.email,
          phone: validated.phone,
          name: validated.name,
          company: validated.company,
          invitationExpiresAt,
          status: 'PENDING',
        },
      });
    }

    // 3. Créer le GuestQuote
    const quoteNumber = await generateGuestQuoteNumber();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // Devis valide 30 jours

    const guestQuote = await prisma.guestQuote.create({
      data: {
        quoteNumber,
        prospectId: prospect.id,
        originCountry: validated.quoteData.originCountry,
        destinationCountry: validated.quoteData.destinationCountry,
        transportMode: validated.quoteData.transportMode,
        cargoType: validated.quoteData.cargoType,
        weight: validated.quoteData.weight,
        volume: validated.quoteData.volume,
        estimatedCost: validated.quoteData.estimatedCost,
        currency: validated.quoteData.currency || 'EUR',
        validUntil,
      },
    });

    // 4. Générer le PDF
    const pdfBuffer = generateGuestQuotePDF({
      quoteNumber: guestQuote.quoteNumber,
      createdAt: guestQuote.createdAt,
      validUntil: guestQuote.validUntil,
      prospect: {
        email: prospect.email,
        phone: prospect.phone,
        name: prospect.name,
        company: prospect.company,
      },
      originCountry: guestQuote.originCountry,
      destinationCountry: guestQuote.destinationCountry,
      transportMode: guestQuote.transportMode,
      cargoType: guestQuote.cargoType,
      weight: guestQuote.weight,
      volume: guestQuote.volume,
      estimatedCost: guestQuote.estimatedCost,
      currency: guestQuote.currency,
    });

    // 5. Envoyer l'email
    const emailHtml = generateQuoteEmailTemplate({
      prospectName: prospect.name,
      quoteNumber: guestQuote.quoteNumber,
      estimatedCost: guestQuote.estimatedCost,
      currency: guestQuote.currency,
      invitationToken: prospect.invitationToken,
      invitationExpiresAt: prospect.invitationExpiresAt,
    });

    const emailResult = await sendEmail({
      to: prospect.email,
      subject: `Votre devis KmapIn Logistics - ${guestQuote.quoteNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: `devis-${guestQuote.quoteNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (!emailResult.success) {
      console.error('Erreur envoi email:', emailResult.error);
      // Ne pas bloquer si l'email échoue, l'utilisateur peut réessayer
    }

    return {
      success: true,
      data: {
        prospectId: prospect.id,
        guestQuoteId: guestQuote.id,
        quoteNumber: guestQuote.quoteNumber,
      },
    };
  } catch (error: any) {
    console.error('Erreur createProspectAndSendQuoteAction:', error);
    return {
      success: false,
      error: error.message || 'Une erreur est survenue lors de la création du devis',
    };
  }
}

/**
 * Récupérer un prospect par son token d'invitation
 *
 * @param token - Token d'invitation unique
 * @returns Prospect avec ses GuestQuotes ou null si non trouvé/expiré
 */
export async function getProspectByTokenAction(token: string) {
  try {
    const prospect = await prisma.prospect.findUnique({
      where: { invitationToken: token },
      include: {
        guestQuotes: true,
      },
    });

    if (!prospect) {
      return {
        success: false,
        error: 'Token d\'invitation invalide',
      };
    }

    // Vérifier l'expiration
    if (new Date() > prospect.invitationExpiresAt) {
      return {
        success: false,
        error: 'Le lien d\'invitation a expiré (7 jours). Veuillez demander un nouveau devis.',
      };
    }

    // Vérifier le statut
    if (prospect.status !== 'PENDING') {
      return {
        success: false,
        error: 'Ce lien d\'invitation a déjà été utilisé',
      };
    }

    return {
      success: true,
      data: prospect,
    };
  } catch (error: any) {
    console.error('Erreur getProspectByTokenAction:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération du prospect',
    };
  }
}

/**
 * Vérifier si un email existe déjà en tant qu'utilisateur
 *
 * @param email - Email à vérifier
 * @returns { userExists: boolean, userId?: string }
 */
export async function getProspectByEmailAction(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return {
      success: true,
      userExists: !!user,
      userId: user?.id,
    };
  } catch (error: any) {
    console.error('Erreur getProspectByEmailAction:', error);
    return {
      success: false,
      error: 'Erreur lors de la vérification de l\'email',
    };
  }
}

/**
 * Préparer la finalisation d'inscription d'un prospect
 *
 * Crée une Company par défaut pour le prospect.
 * Le User sera créé côté client via Better Auth.
 *
 * @param token - Token d'invitation
 * @param formData - Données du formulaire (password, name, phone, country)
 * @returns Company créée et données pour Better Auth
 */
export async function completeRegistrationAction(
  token: string,
  formData: unknown
) {
  try {
    // 1. Valider les données
    const validated = completeRegistrationSchema.parse(formData);

    // 2. Récupérer le prospect
    const prospectResult = await getProspectByTokenAction(token);
    if (!prospectResult.success) {
      return prospectResult;
    }

    const prospect = prospectResult.data!;

    // 3. Vérifier que l'email n'existe pas déjà
    const emailCheck = await getProspectByEmailAction(prospect.email);
    if (emailCheck.userExists) {
      return {
        success: false,
        error: 'Un compte existe déjà avec cet email. Veuillez vous connecter.',
      };
    }

    // 4. Créer une Company par défaut
    const company = await prisma.company.create({
      data: {
        name: prospect.company || `${validated.name} - Entreprise`,
        legalName: prospect.company,
        email: prospect.email,
        phone: validated.phone,
        address: 'À compléter',
        city: 'À compléter',
        postalCode: '',
        country: validated.country,
      },
    });

    return {
      success: true,
      data: {
        prospectId: prospect.id,
        companyId: company.id,
        email: prospect.email,
        name: validated.name,
        phone: validated.phone,
        country: validated.country,
      },
    };
  } catch (error: any) {
    console.error('Erreur completeRegistrationAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la préparation de l\'inscription',
    };
  }
}

/**
 * Finaliser la conversion d'un prospect en utilisateur
 *
 * Convertit tous les GuestQuotes en Quotes et met à jour le statut du Prospect.
 * Déclenche l'événement Inngest prospect/converted.
 *
 * @param prospectId - ID du prospect
 * @param userId - ID de l'utilisateur créé
 * @returns Résultat de la conversion
 */
export async function finalizeProspectConversionAction(
  prospectId: string,
  userId: string
) {
  try {
    // 1. Récupérer le prospect avec ses guest quotes
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        guestQuotes: true,
      },
    });

    if (!prospect) {
      return {
        success: false,
        error: 'Prospect introuvable',
      };
    }

    // 2. Récupérer le user et sa company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user || !user.companyId) {
      return {
        success: false,
        error: 'Utilisateur ou entreprise introuvable',
      };
    }

    // 3. Convertir les GuestQuotes en Quotes
    const convertedQuotes = [];

    for (const guestQuote of prospect.guestQuotes) {
      // Générer un numéro de Quote standard
      const quoteNumber = await generateStandardQuoteNumber();

      // Créer le Quote
      const quote = await prisma.quote.create({
        data: {
          quoteNumber,
          companyId: user.companyId,
          originCountry: guestQuote.originCountry,
          destinationCountry: guestQuote.destinationCountry,
          transportMode: guestQuote.transportMode,
          cargoType: guestQuote.cargoType,
          weight: guestQuote.weight,
          volume: guestQuote.volume,
          estimatedCost: guestQuote.estimatedCost,
          currency: guestQuote.currency,
          validUntil: guestQuote.validUntil,
          status: 'DRAFT',
        },
      });

      // Marquer le GuestQuote comme converti
      await prisma.guestQuote.update({
        where: { id: guestQuote.id },
        data: { convertedToQuoteId: quote.id },
      });

      convertedQuotes.push(quote);
    }

    // 4. Mettre à jour le Prospect
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status: 'CONVERTED',
        userId,
      },
    });

    // 5. Déclencher l'événement Inngest
    await inngest.send({
      name: 'prospect/converted',
      data: {
        prospectId,
        userId,
      },
    });

    return {
      success: true,
      data: {
        convertedQuotesCount: convertedQuotes.length,
        quoteIds: convertedQuotes.map(q => q.id),
      },
    };
  } catch (error: any) {
    console.error('Erreur finalizeProspectConversionAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la conversion du prospect',
    };
  }
}

/**
 * Générer un numéro de Quote standard
 * Format : QTE-YYYYMMDD-XXXXX
 *
 * @returns Numéro unique de Quote
 */
async function generateStandardQuoteNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await prisma.quote.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(count + 1).padStart(5, '0');
  return `QTE-${datePrefix}-${sequence}`;
}

/**
 * Valider le rattachement d'un prospect à un compte existant
 *
 * @param token - Token d'invitation
 * @param password - Mot de passe (pour vérification côté client)
 * @returns Données du prospect pour authentification
 */
export async function attachProspectToExistingUserAction(
  token: string,
  password: string
) {
  try {
    // 1. Valider les données
    attachToAccountSchema.parse({ password });

    // 2. Récupérer le prospect
    const prospectResult = await getProspectByTokenAction(token);
    if (!prospectResult.success) {
      return prospectResult;
    }

    const prospect = prospectResult.data!;

    // 3. Vérifier que le User existe
    const user = await prisma.user.findUnique({
      where: { email: prospect.email },
      select: { id: true, companyId: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'Aucun compte trouvé avec cet email',
      };
    }

    // 4. Si le user n'a pas de company, en créer une
    if (!user.companyId) {
      const company = await prisma.company.create({
        data: {
          name: prospect.company || `${prospect.name || 'Entreprise'}`,
          email: prospect.email,
          phone: prospect.phone || '',
          address: 'À compléter',
          city: 'À compléter',
          country: 'France',
        },
      });

      // Lier le user à la company
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId: company.id },
      });
    }

    return {
      success: true,
      data: {
        prospectId: prospect.id,
        userId: user.id,
        email: prospect.email,
      },
    };
  } catch (error: any) {
    console.error('Erreur attachProspectToExistingUserAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors du rattachement au compte',
    };
  }
}
