/**
 * Jobs Inngest pour la gestion des prospects
 *
 * - Marquage des prospects expirés (cron quotidien)
 * - Envoi de rappels avant expiration (cron quotidien)
 * - Gestion de la conversion prospect → user (event)
 *
 * @module lib/inngest/functions/prospects
 */

import { inngest } from '../client';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/resend';
import {
  generateInvitationReminderTemplate,
  type InvitationReminderParams,
} from '@/lib/email/templates/invitation';
import {
  generateWelcomeTemplate,
  type WelcomeEmailParams,
} from '@/lib/email/templates/welcome';

/**
 * Job quotidien : Marquer les prospects expirés
 *
 * Cron : Tous les jours à 2h00 du matin
 * Action : Met à jour le statut des prospects dont le token d'invitation est expiré
 */
export const markExpiredProspects = inngest.createFunction(
  {
    id: 'mark-expired-prospects',
    name: 'Marquer les prospects expirés',
  },
  { cron: '0 2 * * *' }, // 2h00 quotidien
  async ({ step }) => {
    const expiredProspects = await step.run('find-expired-prospects', async () => {
      const now = new Date();
      return prisma.prospect.findMany({
        where: {
          status: 'PENDING',
          invitationExpiresAt: { lt: now },
        },
      });
    });

    if (expiredProspects.length === 0) {
      return { message: 'Aucun prospect expiré trouvé', count: 0 };
    }

    await step.run('update-prospect-statuses', async () => {
      const prospectIds = expiredProspects.map((p) => p.id);
      await prisma.prospect.updateMany({
        where: { id: { in: prospectIds } },
        data: { status: 'EXPIRED' },
      });
    });

    return {
      success: true,
      count: expiredProspects.length,
      emails: expiredProspects.map((p) => p.email),
    };
  }
);

/**
 * Job quotidien : Envoyer des rappels aux prospects
 *
 * Cron : Tous les jours à 10h00 du matin
 * Action : Envoie un email de rappel aux prospects dont le token expire dans 3 jours
 */
export const sendProspectReminders = inngest.createFunction(
  {
    id: 'send-prospect-reminders',
    name: 'Envoyer rappels prospects',
  },
  { cron: '0 10 * * *' }, // 10h00 quotidien
  async ({ step }) => {
    const prospectsToRemind = await step.run('find-prospects-to-remind', async () => {
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      return prisma.prospect.findMany({
        where: {
          status: 'PENDING',
          invitationExpiresAt: {
            gte: now,
            lte: threeDaysLater,
          },
        },
        include: { guestQuotes: true },
      });
    });

    if (prospectsToRemind.length === 0) {
      return { message: 'Aucun prospect à relancer', count: 0 };
    }

    await step.run('send-reminder-emails', async () => {
      for (const prospect of prospectsToRemind) {
        const daysRemaining = Math.ceil(
          (prospect.invitationExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const params: InvitationReminderParams = {
          prospectName: prospect.name,
          invitationToken: prospect.invitationToken,
          daysRemaining,
          quoteCount: prospect.guestQuotes.length,
        };

        const html = generateInvitationReminderTemplate(params);

        await sendEmail({
          to: prospect.email,
          subject: `⚠ Dernier rappel - Votre devis expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`,
          html,
        });
      }
    });

    return {
      success: true,
      count: prospectsToRemind.length,
    };
  }
);

/**
 * Événement : Prospect converti en User
 *
 * Déclenché par finalizeProspectConversionAction
 * Action : Envoie un email de bienvenue avec le nombre de devis rattachés
 */
export const onProspectConverted = inngest.createFunction(
  {
    id: 'on-prospect-converted',
    name: 'Gérer la conversion d\'un prospect',
  },
  { event: 'prospect/converted' },
  async ({ event, step }) => {
    const { prospectId, userId } = event.data;

    const [prospect, user] = await step.run('get-prospect-and-user', async () => {
      return Promise.all([
        prisma.prospect.findUnique({
          where: { id: prospectId },
          include: { guestQuotes: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
        }),
      ]);
    });

    if (!prospect || !user) {
      throw new Error('Prospect ou User introuvable');
    }

    await step.run('send-welcome-email', async () => {
      const params: WelcomeEmailParams = {
        userName: user.name,
        quoteCount: prospect.guestQuotes.length,
      };

      const html = generateWelcomeTemplate(params);

      await sendEmail({
        to: user.email,
        subject: 'Bienvenue sur Faso Fret Logistics ! 🎉',
        html,
      });
    });

    return { success: true };
  }
);
