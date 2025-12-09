/**
 * Script : Assigner une compagnie à un utilisateur
 *
 * Ce script permet d'assigner une compagnie existante à un utilisateur
 * Utile pour les utilisateurs CLIENT qui doivent être associés à une compagnie
 *
 * Usage:
 * npx tsx scripts/assign-company-to-user.ts <user-email> <company-id-optional>
 *
 * Exemples:
 * npx tsx scripts/assign-company-to-user.ts test@kmapin.com
 * npx tsx scripts/assign-company-to-user.ts test@kmapin.com cm123456789
 */

import { prisma } from '../src/lib/db/client';

/**
 * Fonction principale du script
 * Assigne une compagnie à un utilisateur spécifié
 */
async function assignCompanyToUser() {
  try {
    // Récupérer l'email de l'utilisateur depuis les arguments
    const userEmail = process.argv[2];
    const companyIdArg = process.argv[3];

    if (!userEmail) {
      console.error('❌ Erreur : Email utilisateur requis');
      console.log('\nUsage: npx tsx scripts/assign-company-to-user.ts <user-email> <company-id-optional>');
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📦 ASSIGNER UNE COMPAGNIE À UN UTILISATEUR');
    console.log('═══════════════════════════════════════════════════════\n');

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { company: true },
    });

    if (!user) {
      console.error(`❌ Utilisateur introuvable : ${userEmail}`);
      process.exit(1);
    }

    console.log('👤 Utilisateur trouvé :');
    console.log(`   Email:       ${user.email}`);
    console.log(`   Nom:         ${user.name || 'N/A'}`);
    console.log(`   Rôle:        ${user.role}`);
    console.log(`   Compagnie:   ${user.company?.name || 'AUCUNE'}\n`);

    // Si l'utilisateur a déjà une compagnie
    if (user.companyId && !companyIdArg) {
      console.log('⚠️  Cet utilisateur est déjà associé à une compagnie.');
      console.log('   Pour changer de compagnie, spécifiez un nouvel ID de compagnie.\n');
      process.exit(0);
    }

    let companyId = companyIdArg;

    // Si aucun ID de compagnie n'est fourni, lister les compagnies disponibles
    if (!companyId) {
      console.log('📋 Compagnies disponibles :\n');

      const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              users: true,
              shipments: true,
            },
          },
        },
      });

      if (companies.length === 0) {
        console.error('❌ Aucune compagnie trouvée dans la base de données');
        console.log('   Créez d\'abord une compagnie avant d\'assigner un utilisateur.\n');
        process.exit(1);
      }

      companies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID:           ${company.id}`);
        console.log(`   Email:        ${company.email}`);
        console.log(`   Utilisateurs: ${company._count.users}`);
        console.log(`   Expéditions:  ${company._count.shipments}`);
        console.log('');
      });

      // Utiliser la première compagnie par défaut
      companyId = companies[0].id;
      console.log(`✨ Sélection automatique de la première compagnie : ${companies[0].name}\n`);
    }

    // Vérifier que la compagnie existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      console.error(`❌ Compagnie introuvable : ${companyId}`);
      process.exit(1);
    }

    // Assigner la compagnie à l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
      include: { company: true },
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ COMPAGNIE ASSIGNÉE AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('👤 Utilisateur mis à jour :');
    console.log(`   Email:     ${updatedUser.email}`);
    console.log(`   Nom:       ${updatedUser.name || 'N/A'}`);
    console.log(`   Rôle:      ${updatedUser.role}`);
    console.log(`   Compagnie: ${updatedUser.company?.name || 'N/A'}`);
    console.log(`   ID Compagnie: ${updatedUser.companyId}\n`);

    console.log('🎉 L\'utilisateur peut maintenant accéder aux expéditions de sa compagnie.\n');
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'assignation de la compagnie :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
assignCompanyToUser();
