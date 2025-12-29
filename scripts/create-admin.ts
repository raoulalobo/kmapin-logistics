/**
 * Script de création d'un utilisateur administrateur
 *
 * Ce script crée :
 * - Une entreprise "Faso Fret Admin"
 * - Un utilisateur avec le rôle ADMIN
 * - Un mot de passe hashé de manière sécurisée
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts
 *
 * Ou avec des paramètres personnalisés :
 *   EMAIL=admin@kmapin.com PASSWORD=MonMotDePasse123! NAME="Admin Principal" npx tsx scripts/create-admin.ts
 */

import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcrypt';

// Configuration par défaut (peut être surchargée via variables d'environnement)
const DEFAULT_EMAIL = 'admin@kmapin.com';
const DEFAULT_PASSWORD = 'Admin123!';
const DEFAULT_NAME = 'Administrateur';
const DEFAULT_COMPANY_NAME = 'Faso Fret Admin';

// Nombre de rounds pour bcrypt (10 est le standard, plus = plus sécurisé mais plus lent)
const BCRYPT_ROUNDS = 10;

/**
 * Fonction principale de création de l'admin
 */
async function createAdmin() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Création de l\'utilisateur administrateur...\n');

    // Récupérer les paramètres (env ou défauts)
    const email = process.env.EMAIL || DEFAULT_EMAIL;
    const password = process.env.PASSWORD || DEFAULT_PASSWORD;
    const name = process.env.NAME || DEFAULT_NAME;
    const companyName = process.env.COMPANY_NAME || DEFAULT_COMPANY_NAME;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`❌ Un utilisateur avec l'email ${email} existe déjà.`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Nom: ${existingUser.name}`);
      console.log(`   Rôle: ${existingUser.role}`);
      console.log('\n💡 Utilisez un autre email ou supprimez l\'utilisateur existant.\n');
      process.exit(1);
    }

    // Étape 1: Créer une entreprise pour l'admin
    console.log(`📦 Création de l'entreprise "${companyName}"...`);
    const company = await prisma.company.create({
      data: {
        name: companyName,
        legalName: companyName,
        email: email,
        phone: '+33 1 23 45 67 89',
        address: '123 Avenue de la Logistique',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        taxId: 'FR12345678901',
        website: 'https://kmapin.com',
      },
    });
    console.log(`✅ Entreprise créée avec l'ID: ${company.id}\n`);

    // Étape 2: Hasher le mot de passe
    console.log('🔐 Hashage du mot de passe...');
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    console.log('✅ Mot de passe hashé avec succès\n');

    // Étape 3: Créer l'utilisateur admin
    console.log(`👤 Création de l'utilisateur "${name}"...`);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: 'ADMIN',
        companyId: company.id,
        emailVerified: true, // Vérifier l'email automatiquement pour l'admin
      },
    });
    console.log(`✅ Utilisateur créé avec l'ID: ${user.id}\n`);

    // Étape 4: Créer un Account pour l'authentification email/password
    // Note: Better Auth v1.4+ gère le stockage des mots de passe en interne
    // Nous devons utiliser leur API pour créer l'authentification
    console.log('🔑 Configuration de l\'authentification...');

    // Créer le hash du mot de passe dans une structure compatible Better Auth
    // Better Auth utilise une structure spécifique pour stocker les credentials
    await prisma.$executeRaw`
      INSERT INTO "Account" ("id", "userId", "type", "provider", "providerAccountId", "access_token")
      VALUES (gen_random_uuid(), ${user.id}, 'email', 'credential', ${user.id}, ${hashedPassword})
    `;

    console.log('✅ Authentification configurée\n');

    // Résumé final
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ UTILISATEUR ADMINISTRATEUR CRÉÉ AVEC SUCCÈS !');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📧 Email:        ', email);
    console.log('🔑 Mot de passe: ', password);
    console.log('👤 Nom:          ', name);
    console.log('🏢 Entreprise:   ', companyName);
    console.log('🎭 Rôle:         ', 'ADMIN');
    console.log('');
    console.log('🌐 Connexion:    http://localhost:3000/login');
    console.log('');
    console.log('⚠️  IMPORTANT: Changez ce mot de passe après la première connexion !');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
createAdmin();
