/**
 * Script : Assigner un client à un utilisateur
 *
 * Ce script permet d'assigner un Client (COMPANY ou INDIVIDUAL) à un utilisateur.
 * Utile pour les utilisateurs CLIENT qui doivent être associés à un client.
 *
 * Dans le nouveau modèle unifié :
 * - Client type COMPANY = Entreprise (B2B)
 * - Client type INDIVIDUAL = Particulier (B2C)
 *
 * Usage:
 * npx tsx scripts/assign-company-to-user.ts <user-email> <client-id-optional>
 *
 * Exemples:
 * npx tsx scripts/assign-company-to-user.ts test@kmapin.com
 * npx tsx scripts/assign-company-to-user.ts test@kmapin.com cm123456789
 */

import { prisma } from '../src/lib/db/client';

/**
 * Fonction principale du script
 * Assigne un Client (COMPANY ou INDIVIDUAL) à un utilisateur spécifié
 */
async function assignClientToUser() {
  try {
    // Récupérer l'email de l'utilisateur depuis les arguments
    const userEmail = process.argv[2];
    const clientIdArg = process.argv[3];

    if (!userEmail) {
      console.error('❌ Erreur : Email utilisateur requis');
      console.log('\nUsage: npx tsx scripts/assign-company-to-user.ts <user-email> <client-id-optional>');
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📦 ASSIGNER UN CLIENT À UN UTILISATEUR');
    console.log('═══════════════════════════════════════════════════════\n');

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { client: true },
    });

    if (!user) {
      console.error(`❌ Utilisateur introuvable : ${userEmail}`);
      process.exit(1);
    }

    console.log('👤 Utilisateur trouvé :');
    console.log(`   Email:       ${user.email}`);
    console.log(`   Nom:         ${user.name || 'N/A'}`);
    console.log(`   Rôle:        ${user.role}`);
    console.log(`   Client:      ${user.client?.name || 'AUCUN'} ${user.client ? `(type: ${user.client.type})` : ''}\n`);

    // Si l'utilisateur a déjà un client
    if (user.clientId && !clientIdArg) {
      console.log('⚠️  Cet utilisateur est déjà associé à un client.');
      console.log('   Pour changer de client, spécifiez un nouvel ID de client.\n');
      process.exit(0);
    }

    let clientId = clientIdArg;

    // Si aucun ID de client n'est fourni, lister les clients disponibles
    if (!clientId) {
      console.log('📋 Clients disponibles :\n');

      const clients = await prisma.client.findMany({
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

      if (clients.length === 0) {
        console.error('❌ Aucun client trouvé dans la base de données');
        console.log('   Créez d\'abord un client avant d\'assigner un utilisateur.\n');
        process.exit(1);
      }

      clients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.name}`);
        console.log(`   ID:           ${client.id}`);
        console.log(`   Type:         ${client.type}`);  // COMPANY ou INDIVIDUAL
        console.log(`   Email:        ${client.email}`);
        console.log(`   Utilisateurs: ${client._count.users}`);
        console.log(`   Expéditions:  ${client._count.shipments}`);
        console.log('');
      });

      // Utiliser le premier client par défaut
      clientId = clients[0].id;
      console.log(`✨ Sélection automatique du premier client : ${clients[0].name} (type: ${clients[0].type})\n`);
    }

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      console.error(`❌ Client introuvable : ${clientId}`);
      process.exit(1);
    }

    // Assigner le client à l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { clientId: client.id },
      include: { client: true },
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CLIENT ASSIGNÉ AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('👤 Utilisateur mis à jour :');
    console.log(`   Email:     ${updatedUser.email}`);
    console.log(`   Nom:       ${updatedUser.name || 'N/A'}`);
    console.log(`   Rôle:      ${updatedUser.role}`);
    console.log(`   Client:    ${updatedUser.client?.name || 'N/A'} (type: ${updatedUser.client?.type})`);
    console.log(`   ID Client: ${updatedUser.clientId}\n`);

    console.log('🎉 L\'utilisateur peut maintenant accéder aux données de son client.\n');
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'assignation du client :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
assignClientToUser();
