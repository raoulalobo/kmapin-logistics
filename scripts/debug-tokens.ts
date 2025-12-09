/**
 * Script pour débugger les tokens de vérification
 */

import { PrismaClient } from '@/generated/prisma';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Derniers tokens de vérification:\n');

    const tokens = await prisma.verification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (tokens.length === 0) {
      console.log('❌ Aucun token trouvé dans la table verification');
      return;
    }

    tokens.forEach((token, index) => {
      const now = new Date();
      const expired = now > token.expiresAt;

      console.log(`\n${index + 1}. Token ${expired ? '❌ EXPIRÉ' : '✅ VALIDE'}`);
      console.log('   ID:         ', token.id);
      console.log('   Email:      ', token.identifier);
      console.log('   Token:      ', token.value);
      console.log('   Créé:       ', token.createdAt.toLocaleString('fr-FR'));
      console.log('   Expire:     ', token.expiresAt.toLocaleString('fr-FR'));

      if (!expired) {
        const minutesLeft = Math.floor((token.expiresAt.getTime() - now.getTime()) / 60000);
        console.log('   Reste:      ', minutesLeft, 'minutes');
      }
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
