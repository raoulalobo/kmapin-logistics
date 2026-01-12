/**
 * Script de Test : Enhanced Client avec Zenstack
 *
 * Teste si l'enhanced client Zenstack applique correctement les permissions
 * pour un utilisateur CLIENT
 */

import { prisma } from '../src/lib/db/client';
import { getEnhancedPrisma } from '../src/lib/db/enhanced-client';
import { UserRole } from '../src/lib/db/enums';

async function testEnhancedClient() {
  console.log('\n🧪 ========================================');
  console.log('   TEST ENHANCED CLIENT');
  console.log('========================================\n');

  try {
    // 1. Récupérer l'utilisateur de test
    console.log('👤 1. RÉCUPÉRATION UTILISATEUR\n');
    const user = await prisma.user.findUnique({
      where: { email: 'nathanaelalobo@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    if (!user) {
      console.log('   ❌ Utilisateur introuvable\n');
      return;
    }

    console.log(`   Utilisateur : ${user.name}`);
    console.log(`   ID          : ${user.id}`);
    console.log(`   Rôle        : ${user.role}`);
    console.log(`   CompanyId   : ${user.companyId || 'NULL'}\n`);

    // 2. Test avec enhanced client
    console.log('🔐 2. TEST AVEC ENHANCED CLIENT\n');

    // Créer le contexte utilisateur comme le ferait getEnhancedPrismaFromSession
    const roleString = user.role as string;
    const roleEnum = UserRole[roleString as keyof typeof UserRole];

    console.log('   DEBUG : Conversion du rôle:');
    console.log(`   - roleString = ${roleString} (type: ${typeof roleString})`);
    console.log(`   - roleEnum   = ${roleEnum} (type: ${typeof roleEnum})`);
    console.log(`   - UserRole enum = ${JSON.stringify(UserRole, null, 2)}\n`);

    const authContext = {
      id: user.id,
      role: roleEnum,
      companyId: user.companyId,
    };

    console.log('   Contexte auth() passé à Zenstack:');
    console.log(`   - auth().id       = ${authContext.id}`);
    console.log(`   - auth().role     = ${authContext.role}`);
    console.log(`   - auth().companyId= ${authContext.companyId || 'NULL'}\n`);

    // Créer l'enhanced client
    const enhancedDb = getEnhancedPrisma(authContext);

    // Tenter de récupérer les pickups
    console.log('   📦 Tentative de récupération des pickups...\n');

    const pickups = await enhancedDb.pickupRequest.findMany({
      select: {
        id: true,
        trackingNumber: true,
        userId: true,
        companyId: true,
        status: true,
        contactEmail: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`   ✅ Résultat : ${pickups.length} pickup(s) récupéré(s)\n`);

    if (pickups.length > 0) {
      pickups.forEach((pickup, index) => {
        console.log(`   ${index + 1}. ${pickup.trackingNumber}`);
        console.log(`      userId   : ${pickup.userId}`);
        console.log(`      companyId: ${pickup.companyId || 'NULL'}`);
        console.log(`      status   : ${pickup.status}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  AUCUN PICKUP TROUVÉ\n');
      console.log('   Cela confirme que Zenstack BLOQUE l\'accès !\n');
    }

    // 3. Test avec client standard (pour comparaison)
    console.log('🔓 3. TEST AVEC CLIENT STANDARD (sans Zenstack)\n');

    const standardPickups = await prisma.pickupRequest.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        trackingNumber: true,
        userId: true,
        companyId: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`   ✅ Résultat : ${standardPickups.length} pickup(s) récupéré(s)\n`);

    if (standardPickups.length > 0) {
      standardPickups.forEach((pickup, index) => {
        console.log(`   ${index + 1}. ${pickup.trackingNumber}`);
        console.log(`      userId   : ${pickup.userId}`);
        console.log(`      companyId: ${pickup.companyId || 'NULL'}`);
        console.log('');
      });
    }

    // 4. Analyse de la différence
    console.log('📊 4. ANALYSE\n');

    const diff = standardPickups.length - pickups.length;

    if (diff > 0) {
      console.log(`   🚨 PROBLÈME CONFIRMÉ !`);
      console.log(`   ${diff} pickup(s) bloqué(s) par Zenstack\n`);
      console.log('   Raisons possibles:');
      console.log('   1. La règle auth().id == userId ne fonctionne pas');
      console.log('   2. Le contexte auth() n\'est pas correctement passé');
      console.log('   3. Les pickups ont un status bloquant (EFFECTUE/ANNULE)\n');

      // Vérifier les status
      const blockedStatuses = standardPickups.filter(
        p => p.status === 'EFFECTUE' || p.status === 'ANNULE'
      );

      if (blockedStatuses.length > 0) {
        console.log(`   ⚠️  ${blockedStatuses.length} pickup(s) avec status terminé`);
        console.log('   Ces pickups sont normalement bloqués par la règle Zenstack\n');
      }

      // Vérifier les userId
      const missingUserId = standardPickups.filter(p => p.userId !== user.id);
      if (missingUserId.length > 0) {
        console.log(`   ⚠️  ${missingUserId.length} pickup(s) avec userId différent`);
        console.log('   Ces pickups ne devraient pas correspondre\n');
      }

      // Si aucun des cas ci-dessus, c'est un problème Zenstack
      if (blockedStatuses.length === 0 && missingUserId.length === 0) {
        console.log('   🔴 PROBLÈME ZENSTACK CONFIRMÉ !');
        console.log('   Les pickups devraient être accessibles mais sont bloqués.\n');
        console.log('   Vérifier:');
        console.log('   1. Le contexte auth() dans schema.zmodel');
        console.log('   2. La génération du client Zenstack');
        console.log('   3. Les logs Zenstack pour plus de détails\n');
      }
    } else if (diff === 0 && pickups.length > 0) {
      console.log('   ✅ PAS DE PROBLÈME !');
      console.log('   Zenstack autorise correctement l\'accès aux pickups.\n');
      console.log('   Le problème se situe AILLEURS:');
      console.log('   - Peut-être un filtre supplémentaire dans l\'UI');
      console.log('   - Peut-être un problème de rendu côté client');
      console.log('   - Vérifier les composants React\n');
    } else {
      console.log('   ⚠️  AUCUN PICKUP DANS LA BDD');
      console.log('   Même le client standard ne trouve rien.\n');
    }

    console.log('✅ ========================================');
    console.log('   TEST TERMINÉ');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testEnhancedClient().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
