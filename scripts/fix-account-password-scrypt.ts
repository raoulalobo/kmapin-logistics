/**
 * Script de correction du mot de passe avec Scrypt (format Better Auth v1.4.5)
 *
 * Ce script corrige les mots de passe qui ont été créés avec bcrypt
 * en les remplaçant par le format Scrypt attendu par Better Auth.
 *
 * Usage:
 *   EMAIL=admin3@kmapin.com PASSWORD=Admin123! npx tsx scripts/fix-account-password-scrypt.ts
 *
 * Ou avec les valeurs par défaut:
 *   npx tsx scripts/fix-account-password-scrypt.ts
 */

import { PrismaClient } from '@/generated/prisma';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import crypto from 'crypto';

/**
 * Configuration Scrypt utilisée par Better Auth v1.4.5
 * Source: /node_modules/better-auth/dist/crypto-CFUhAR9W.mjs
 */
const SCRYPT_CONFIG = {
  N: 16384,  // CPU/memory cost parameter (2^14)
  r: 16,     // Block size parameter
  p: 1,      // Parallelization parameter
  dkLen: 64  // Derived key length (64 bytes)
};

/**
 * Fonction principale
 */
async function fixAccountPassword() {
  const prisma = new PrismaClient();

  try {
    // Récupérer les paramètres (ou utiliser les valeurs par défaut)
    const email = process.env.EMAIL || 'admin3@kmapin.com';
    const password = process.env.PASSWORD || 'Admin123!';

    console.log('🔧 Correction du mot de passe avec Scrypt...\n');
    console.log('📧 Email:', email);
    console.log('');

    // 1. Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });

    if (!user) {
      console.log(`❌ Utilisateur ${email} introuvable.`);
      console.log('💡 Vérifiez que l\'email est correct.\n');
      process.exit(1);
    }

    console.log('✅ Utilisateur trouvé:', user.name);
    console.log('🎭 Rôle:', user.role);
    console.log('');

    // 2. Vérifier qu'un Account credential existe
    const credentialAccount = user.accounts.find(
      acc => acc.providerId === 'credential'
    );

    if (!credentialAccount) {
      console.log('❌ Aucun compte credential trouvé pour cet utilisateur.');
      console.log('💡 Utilisez le script create-admin pour créer un compte.\n');
      process.exit(1);
    }

    console.log('✅ Account credential trouvé');
    console.log('📝 ID Account:', credentialAccount.id);
    console.log('');

    // Afficher l'ancien format
    const oldPassword = credentialAccount.password;
    if (oldPassword?.startsWith('$2b$') || oldPassword?.startsWith('$2a$')) {
      console.log('🔍 Format actuel: BCRYPT (incompatible Better Auth v1.4.5)');
      console.log('   Hash:', oldPassword.substring(0, 40) + '...');
    } else if (oldPassword?.includes(':')) {
      console.log('🔍 Format actuel: SCRYPT (déjà correct)');
      console.log('   Hash:', oldPassword.substring(0, 40) + '...');
      console.log('');
      console.log('⚠️  Le mot de passe est déjà au bon format.');
      console.log('   Voulez-vous quand même le remplacer ? (Ctrl+C pour annuler)\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log('');

    // 3. Générer le salt (16 bytes random en hexadécimal)
    console.log('🔐 Génération du hash Scrypt...');
    const saltBytes = crypto.randomBytes(16);
    const salt = saltBytes.toString('hex');

    // 4. Dériver la clé avec Scrypt
    const key = await scryptAsync(password, salt, SCRYPT_CONFIG);

    // 5. Format Better Auth: "salt:hexKey"
    const hashedPassword = `${salt}:${Buffer.from(key).toString('hex')}`;

    console.log('✅ Hash généré au format Scrypt\n');

    // 6. Mettre à jour l'Account
    console.log('💾 Mise à jour du mot de passe en base de données...');
    await prisma.account.update({
      where: {
        id: credentialAccount.id
      },
      data: {
        password: hashedPassword,
      },
    });

    console.log('✅ Mot de passe mis à jour avec succès !\n');

    // 7. Résumé final
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CORRECTION TERMINÉE !');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('👤 Utilisateur:', user.name);
    console.log('📧 Email:      ', email);
    console.log('🔑 Mot de passe:', password);
    console.log('');
    console.log('🔐 Format hash:  Scrypt (compatible Better Auth v1.4.5)');
    console.log('📊 Config:       N=16384, r=16, p=1, dkLen=64');
    console.log('');
    console.log('🌐 Vous pouvez maintenant vous connecter:');
    console.log('   URL: http://localhost:3000/login');
    console.log('   Email: ' + email);
    console.log('   Mot de passe: ' + password);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
fixAccountPassword();
