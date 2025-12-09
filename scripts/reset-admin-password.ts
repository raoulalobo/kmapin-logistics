/**
 * Script pour générer un lien de réinitialisation de mot de passe pour l'admin
 *
 * Usage: npm run reset-admin-password
 */

import { PrismaClient } from '@/generated/prisma';
import crypto from 'crypto';

const ADMIN_EMAIL = 'admin@kmapin.com';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔐 Génération du lien de réinitialisation de mot de passe...\n');

    // Trouver l'utilisateur admin
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (!user) {
      console.log(`❌ Utilisateur ${ADMIN_EMAIL} non trouvé.`);
      console.log('💡 Exécutez d\'abord: npm run create-admin\n');
      process.exit(1);
    }

    // Générer un token de réinitialisation (format Better Auth)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure (cohérent avec Better Auth)

    // Créer le token de vérification avec le format Better Auth
    // Better Auth stocke les tokens de reset avec:
    // - identifier: "reset-password:{token}"
    // - value: userId
    await prisma.verification.create({
      data: {
        identifier: `reset-password:${token}`,
        value: user.id,
        expiresAt,
      },
    });

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ LIEN DE RÉINITIALISATION GÉNÉRÉ !');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('👤 Utilisateur:', user.name);
    console.log('📧 Email:      ', user.email);
    console.log('🎭 Rôle:       ', user.role);
    console.log('');
    console.log('🔗 Lien de réinitialisation:');
    console.log('   ', resetLink);
    console.log('');
    console.log('⏰ Valide jusqu\'au:', expiresAt.toLocaleString('fr-FR'));
    console.log('');
    console.log('📝 INSTRUCTIONS:');
    console.log('   1. Ouvrez ce lien dans votre navigateur');
    console.log('   2. Définissez votre nouveau mot de passe');
    console.log('   3. Connectez-vous à http://localhost:3000/login');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
