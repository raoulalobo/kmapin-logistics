/**
 * Script pour vérifier manuellement l'email d'un utilisateur
 * Usage: npx tsx scripts/verify-email.ts
 */

import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

async function verifyEmail() {
  try {
    const email = 'test@kmapin.com';

    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true }
    });

    console.log('✅ Email vérifié avec succès !');
    console.log('   Email:', user.email);
    console.log('   Nom:', user.name);
    console.log('   ID:', user.id);
    console.log('   Rôle:', user.role);
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEmail();
