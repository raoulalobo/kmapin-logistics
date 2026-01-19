/**
 * Server Actions pour la gestion des prospects
 *
 * IMPORTANT : Ces actions utilisent le client Prisma STANDARD (pas enhanced)
 * car elles sont publiques et n'ont pas de session utilisateur.
 *
 * Architecture unifiée Quote/Prospect :
 * - Les visiteurs (prospects) créent des Quote avec prospectId renseigné
 * - Les Quote de prospects ont status DRAFT et userId/clientId NULL
 * - Lors de la conversion, on met à jour les Quote existants (userId, clientId)
 *
 * @module modules/prospects/actions
 */

'use server';

import { prisma } from '@/lib/db/client';
import {
  prospectSchema,
  completeRegistrationSchema,
  attachToAccountSchema,
  contactFormSchema,
  type ProspectFormData,
  type CompleteRegistrationFormData,
  type AttachToAccountFormData,
  type ContactFormData,
} from '../schemas/prospect.schema';
import { sendEmail } from '@/lib/email/resend';
import { generateQuotePDF, type QuotePDFData } from '@/lib/pdf/quote-pdf';
import { generateQuoteEmailTemplate } from '@/lib/email/templates/quote-pdf';
import { inngest } from '@/lib/inngest/client';

/**
 * Créer un prospect et envoyer le devis par email
 *
 * Workflow unifié (modèle Quote unique) :
 * 1. Valider les données
 * 2. Créer ou réutiliser le prospect (si EXPIRED)
 * 3. Créer le Quote avec prospectId (status DRAFT, userId/clientId NULL)
 * 4. Générer le PDF du devis
 * 5. Envoyer l'email avec PDF + lien d'invitation
 *
 * @param data - Données du formulaire (email, phone, name?, company?, quoteData)
 * @returns Résultat avec prospectId, quoteId, quoteNumber
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

    // 3. Créer le Quote (modèle unifié avec prospectId)
    // Note : Utilise le format standard QTE-YYYYMMDD-XXXXX
    const quoteNumber = await generateStandardQuoteNumber();

    // Date de validité : 30 jours
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // Date d'expiration du token de suivi : 72h
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 72);

    // Créer le Quote avec prospectId (userId et clientId sont NULL car visiteur)
    const quote = await prisma.quote.create({
      data: {
        // Identifiant
        quoteNumber,

        // Token de suivi (obligatoire dans le schéma)
        // trackingToken est généré automatiquement par @default(cuid())
        tokenExpiresAt,

        // Contact (données du prospect pour matching futur)
        contactEmail: prospect.email,
        contactPhone: prospect.phone,
        contactName: prospect.name,

        // Lien avec le prospect (NOUVEAU : modèle unifié)
        prospectId: prospect.id,

        // userId et clientId restent NULL (visiteur sans compte)
        // Seront remplis lors de la conversion prospect → utilisateur

        // Route (pays origine/destination)
        originCountry: validated.quoteData.originCountry,
        destinationCountry: validated.quoteData.destinationCountry,

        // Marchandise
        cargoType: validated.quoteData.cargoType,
        weight: validated.quoteData.weight,
        // volume n'existe plus dans Quote, on utilise length/width/height si fournis

        // Transport
        transportMode: validated.quoteData.transportMode,

        // Financier
        estimatedCost: validated.quoteData.estimatedCost,
        currency: validated.quoteData.currency || 'EUR',
        validUntil,

        // Statut : DRAFT car créé depuis le calculateur public
        status: 'DRAFT',
      },
    });

    // 4. Générer le PDF
    // Adapter les données prospect vers le format company attendu par le PDF
    const pdfData: QuotePDFData = {
      quoteNumber: quote.quoteNumber,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      company: {
        // Utiliser les données du prospect comme "pseudo-company"
        name: prospect.company || prospect.name || 'Demandeur',
        legalName: prospect.company,
        address: 'À compléter',
        city: 'À compléter',
        postalCode: '',
        country: 'France',
        email: prospect.email,
        phone: prospect.phone,
      },
      originCountry: quote.originCountry,
      destinationCountry: quote.destinationCountry,
      transportMode: quote.transportMode,
      cargoType: quote.cargoType,
      weight: quote.weight,
      volume: null, // Volume calculé à partir de length/width/height si fournis
      estimatedCost: quote.estimatedCost,
      currency: quote.currency,
      status: quote.status,
    };

    const pdfBuffer = generateQuotePDF(pdfData);

    // 5. Envoyer l'email
    const emailHtml = generateQuoteEmailTemplate({
      prospectName: prospect.name,
      quoteNumber: quote.quoteNumber,
      estimatedCost: quote.estimatedCost,
      currency: quote.currency,
      invitationToken: prospect.invitationToken,
      invitationExpiresAt: prospect.invitationExpiresAt,
    });

    const emailResult = await sendEmail({
      to: prospect.email,
      subject: `Votre devis Faso Fret Logistics - ${quote.quoteNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: `devis-${quote.quoteNumber}.pdf`,
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
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
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
 * Modèle unifié : inclut les Quote liés au prospect (au lieu de GuestQuotes)
 *
 * @param token - Token d'invitation unique
 * @returns Prospect avec ses quotes ou null si non trouvé/expiré
 */
export async function getProspectByTokenAction(token: string) {
  try {
    // Modèle unifié : utiliser `quotes` au lieu de `guestQuotes`
    const prospect = await prisma.prospect.findUnique({
      where: { invitationToken: token },
      include: {
        quotes: true, // CHANGEMENT : quotes au lieu de guestQuotes
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
    const company = await prisma.client.create({
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
        clientId: company.id,
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
 * MODÈLE UNIFIÉ : Au lieu de convertir GuestQuotes → Quotes, on met simplement
 * à jour les Quote existants avec clientId et userId.
 *
 * Workflow simplifié :
 * 1. Récupérer le prospect avec ses quotes (modèle unifié)
 * 2. Mettre à jour les quotes existants (clientId, userId, isAttachedToAccount)
 * 3. Convertir les GuestPickupRequests (inchangé)
 * 4. Mettre à jour le statut du Prospect
 * 5. Déclencher l'événement Inngest
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
    // 1. Récupérer le prospect avec ses quotes (modèle unifié) et guest pickups
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        quotes: true, // CHANGEMENT : quotes au lieu de guestQuotes
        guestPickupRequests: true,
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
      select: { clientId: true },
    });

    if (!user || !user.clientId) {
      return {
        success: false,
        error: 'Utilisateur ou entreprise introuvable',
      };
    }

    // 3. SIMPLIFIÉ : Mettre à jour les Quote existants (au lieu de créer de nouveaux)
    // Les quotes ont déjà été créés lors de la demande de devis, on les rattache au compte
    const attachedQuotes = [];

    for (const quote of prospect.quotes) {
      // Mettre à jour le quote avec les infos du nouveau compte
      const updatedQuote = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          // Rattacher au client et à l'utilisateur
          clientId: user.clientId,
          userId: userId,

          // Marquer comme rattaché à un compte
          isAttachedToAccount: true,
        },
      });

      attachedQuotes.push(updatedQuote);
    }

    // 4. Convertir les GuestPickupRequests en PickupRequests (inchangé)
    const convertedPickups = [];

    for (const guestPickup of prospect.guestPickupRequests) {
      // Créer PickupRequest authentifié
      const pickup = await prisma.pickupRequest.create({
        data: {
          // Lien company et user
          clientId: user.clientId,
          createdById: userId,

          // Adresse
          pickupAddress: guestPickup.pickupAddress,
          pickupCity: guestPickup.pickupCity,
          pickupPostalCode: guestPickup.pickupPostalCode,
          pickupCountry: guestPickup.pickupCountry,

          // Contact
          pickupContact: guestPickup.pickupContact,
          pickupPhone: guestPickup.pickupPhone,

          // Planification
          requestedDate: guestPickup.requestedDate,
          timeSlot: guestPickup.timeSlot,
          pickupTime: guestPickup.pickupTime,

          // Marchandise - Stockée dans specialInstructions pour compatibilité
          specialInstructions: `Type: ${guestPickup.cargoType || 'Non spécifié'}
Poids estimé: ${guestPickup.estimatedWeight || 'N/A'} kg
Volume estimé: ${guestPickup.estimatedVolume || 'N/A'} m³
Description: ${guestPickup.description || 'N/A'}

${guestPickup.specialInstructions || ''}`.trim(),

          accessInstructions: guestPickup.accessInstructions,

          // Statut (conserver le statut actuel)
          status: guestPickup.status,

          // Pas de shipmentId (sera lié plus tard si nécessaire)
          shipmentId: null,
        },
      });

      // Marquer comme converti
      await prisma.guestPickupRequest.update({
        where: { id: guestPickup.id },
        data: {
          convertedToPickupId: pickup.id,
          convertedAt: new Date(),
        },
      });

      convertedPickups.push(pickup);
    }

    // 5. Mettre à jour le Prospect
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status: 'CONVERTED',
        userId,
      },
    });

    // 6. Déclencher l'événement Inngest
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
        // CHANGEMENT : "attached" au lieu de "converted" car les quotes existaient déjà
        attachedQuotesCount: attachedQuotes.length,
        quoteIds: attachedQuotes.map(q => q.id),
        convertedPickupsCount: convertedPickups.length,
        pickupIds: convertedPickups.map(p => p.id),
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
      select: { id: true, clientId: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'Aucun compte trouvé avec cet email',
      };
    }

    // 4. Si le user n'a pas de company, en créer une
    if (!user.clientId) {
      const company = await prisma.client.create({
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
        data: { clientId: company.id },
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

/**
 * Créer un prospect depuis le formulaire de contact simple
 *
 * Workflow :
 * 1. Valider les données (nom, email, téléphone, objet)
 * 2. Créer ou mettre à jour le prospect
 * 3. Envoyer une notification email à l'équipe
 *
 * @param data - Données du formulaire de contact
 * @returns Résultat avec prospectId
 */
export async function createContactProspectAction(data: unknown) {
  try {
    // 1. Valider les données
    const validated = contactFormSchema.parse(data);

    // 2. Vérifier si le prospect existe déjà
    let prospect = await prisma.prospect.findUnique({
      where: { email: validated.email },
    });

    // Si le prospect existe, le mettre à jour avec les nouvelles infos
    if (prospect) {
      prospect = await prisma.prospect.update({
        where: { id: prospect.id },
        data: {
          phone: validated.phone,
          name: validated.name,
          subject: validated.subject,
          // Réinitialiser l'expiration si le prospect était expiré
          invitationExpiresAt: prospect.status === 'EXPIRED'
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 jours
            : prospect.invitationExpiresAt,
          status: prospect.status === 'EXPIRED' ? 'PENDING' : prospect.status,
        },
      });
    }
    // Sinon, créer un nouveau prospect
    else {
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // 7 jours

      prospect = await prisma.prospect.create({
        data: {
          email: validated.email,
          phone: validated.phone,
          name: validated.name,
          subject: validated.subject,
          invitationExpiresAt,
          status: 'PENDING',
        },
      });
    }

    // 3. Envoyer une notification email à l'équipe (optionnel)
    // Vous pouvez ajouter ici l'envoi d'un email de notification à l'équipe commerciale
    // Par exemple : sendEmail({ to: 'commercial@fasofret.fr', ... })

    return {
      success: true,
      data: {
        prospectId: prospect.id,
        email: prospect.email,
      },
    };
  } catch (error: any) {
    console.error('Erreur createContactProspectAction:', error);

    // Gérer les erreurs de validation Zod
    if (error.name === 'ZodError') {
      return {
        success: false,
        error: error.errors[0]?.message || 'Données invalides',
      };
    }

    // Gérer les erreurs de contrainte unique (email déjà utilisé)
    if (error.code === 'P2002') {
      return {
        success: false,
        error: 'Un problème est survenu avec cet email',
      };
    }

    return {
      success: false,
      error: error.message || 'Erreur lors de l\'enregistrement de votre demande',
    };
  }
}
