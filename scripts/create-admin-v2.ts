/**
 * Script de création d'un utilisateur administrateur (Version Simple)
 *
 * Ce script crée un utilisateur admin en utilisant directement Prisma
 * et fournit un mot de passe temporaire qui peut être changé après la première connexion.
 *
 * Usage:
 *   npm run create-admin
 *
 * Note: Ce script nécessite que vous ayez déjà configuré votre base de données
 */

import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcrypt';

// Configuration
const ADMIN_EMAIL = process.env.EMAIL || 'admin@kmapin.com';
const ADMIN_PASSWORD = process.env.PASSWORD || 'Admin123!';
const ADMIN_NAME = process.env.NAME || 'Administrateur';
const COMPANY_NAME = 'Faso Fret Admin';
const BCRYPT_ROUNDS = 10;

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Création de l\'utilisateur administrateur...\n');

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingUser) {
      console.log(`❌ Un utilisateur avec l'email ${ADMIN_EMAIL} existe déjà.`);
      console.log(`\n💡 Pour vous connecter, utilisez:`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Mot de passe: [votre mot de passe actuel]`);
      console.log(`\n🔗 http://localhost:3000/login\n`);
      process.exit(0);
    }

    // Étape 1: Créer ou récupérer l'entreprise
    console.log(`📦 Création de l'entreprise...`);
    const company = await prisma.company.upsert({
      where: {
        taxId: 'ADMIN001',
      },
      create: {
        name: COMPANY_NAME,
        legalName: COMPANY_NAME,
        email: ADMIN_EMAIL,
        phone: '+33 1 23 45 67 89',
        address: '1 Avenue des Champs-Élysées',
        city: 'Paris',
        postalCode: '75008',
        country: 'France',
        taxId: 'ADMIN001',
      },
      update: {},
    });
    console.log(`✅ Entreprise: ${company.name} (ID: ${company.id})\n`);

    // Étape 2: Créer l'utilisateur
    console.log(`👤 Création de l'utilisateur ${ADMIN_NAME}...`);
    const user = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'ADMIN',
        companyId: company.id,
        emailVerified: true, // Email vérifié automatiquement
      },
    });
    console.log(`✅ Utilisateur créé (ID: ${user.id})\n`);

    // Étape 3: Hasher le mot de passe
    console.log(`🔐 Hashage du mot de passe...`);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    // Étape 4: Insérer le mot de passe dans la structure Better Auth
    // Better Auth v1.4 utilise une table dédiée ou stocke dans Account
    console.log(`🔑 Configuration de l'authentification...`);

    // Essayer de créer directement dans Account avec le bon format
    try {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.email, // Better Auth utilise l'email comme accountId
          providerId: 'credential', // Provider pour authentification par email/password
          password: hashedPassword, // Mot de passe hashé stocké dans le champ password
        },
      });
      console.log(`✅ Authentification configurée\n`);
    } catch (error: any) {
      console.log(`⚠️  Impossible de créer le compte d'authentification automatiquement`);
      console.log(`   Erreur: ${error.message}\n`);

      // Afficher des instructions de repli
      console.log(`📝 INSTRUCTIONS ALTERNATIVES:`);
      console.log(`   1. Allez sur http://localhost:3000/login`);
      console.log(`   2. Cliquez sur "Mot de passe oublié"`);
      console.log(`   3. Entrez: ${ADMIN_EMAIL}`);
      console.log(`   4. Suivez le lien de réinitialisation dans votre console`);
      console.log(`   5. Définissez votre mot de passe\n`);
    }

    // Résumé final
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ UTILISATEUR ADMINISTRATEUR CRÉÉ !');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📧 Email:         ', ADMIN_EMAIL);
    console.log('🔑 Mot de passe:  ', ADMIN_PASSWORD);
    console.log('👤 Nom:           ', ADMIN_NAME);
    console.log('🏢 Entreprise:    ', COMPANY_NAME);
    console.log('🎭 Rôle:          ', 'ADMIN');
    console.log('');
    console.log('🌐 Connexion:     ', 'http://localhost:3000/login');
    console.log('');
    console.log('⚠️  IMPORTANT:');
    console.log('   - Essayez de vous connecter avec ces identifiants');
    console.log('   - Si cela ne fonctionne pas, utilisez "Mot de passe oublié"');
    console.log('   - Changez le mot de passe après la première connexion');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
