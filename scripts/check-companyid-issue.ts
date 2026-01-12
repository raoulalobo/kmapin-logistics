/**
 * Script : Vérifier le problème de companyId
 *
 * Vérifie si les utilisateurs et les pickups ont des companyId
 * pour comprendre pourquoi les permissions Zenstack bloquent l'accès
 */

import { prisma } from '../src/lib/db/client';

async function checkCompanyIdIssue() {
  console.log('\n🔍 ========================================');
  console.log('   VÉRIFICATION COMPANYID');
  console.log('========================================\n');

  try {
    // 1. Vérifier l'utilisateur "Alobo Tsimi Franklin"
    console.log('👤 1. UTILISATEUR: Alobo Tsimi Franklin\n');
    const user = await prisma.user.findUnique({
      where: { email: 'nathanaelalobo@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      console.log('   ❌ Utilisateur introuvable\n');
      return;
    }

    console.log(`   Nom      : ${user.name}`);
    console.log(`   Email    : ${user.email}`);
    console.log(`   Rôle     : ${user.role}`);
    console.log(`   CompanyId: ${user.companyId || 'NULL ⚠️'}`);
    if (user.company) {
      console.log(`   Company  : ${user.company.name}`);
    } else {
      console.log(`   Company  : AUCUNE ⚠️`);
    }
    console.log('');

    // 2. Vérifier les pickups de cet utilisateur
    console.log('📦 2. PICKUPS DE CET UTILISATEUR\n');
    const pickups = await prisma.pickupRequest.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        trackingNumber: true,
        userId: true,
        companyId: true,
        status: true,
        contactEmail: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pickups.length === 0) {
      console.log('   ❌ Aucun pickup trouvé pour cet utilisateur\n');
    } else {
      console.log(`   ${pickups.length} pickup(s) trouvé(s):\n`);
      pickups.forEach((pickup, index) => {
        console.log(`   ${index + 1}. ${pickup.trackingNumber}`);
        console.log(`      userId   : ${pickup.userId}`);
        console.log(`      companyId: ${pickup.companyId || 'NULL ⚠️'}`);
        console.log(`      status   : ${pickup.status}`);
        if (pickup.company) {
          console.log(`      Company  : ${pickup.company.name}`);
        } else {
          console.log(`      Company  : AUCUNE ⚠️`);
        }
        console.log('');
      });
    }

    // 3. Analyse des permissions Zenstack
    console.log('🔐 3. ANALYSE DES PERMISSIONS ZENSTACK\n');
    console.log('   Règles de permissions pour PickupRequest:\n');
    console.log('   ✓ @@allow("all", auth().role == ADMIN)');
    console.log('   ✓ @@allow("all", auth().role == OPERATIONS_MANAGER)');
    console.log('   ✓ @@allow("read", auth().role == FINANCE_MANAGER)');
    console.log('   ✓ @@allow("read,update", auth().id == userId && status != EFFECTUE && status != ANNULE)');
    console.log('   ✓ @@allow("read", auth().companyId == companyId && auth().role == CLIENT)');
    console.log('');

    // 4. Vérifier quelles règles s'appliquent
    console.log('🎯 4. RÈGLES APPLICABLES POUR CET UTILISATEUR\n');

    const isAdmin = user.role === 'ADMIN';
    const isOpsManager = user.role === 'OPERATIONS_MANAGER';
    const isFinanceManager = user.role === 'FINANCE_MANAGER';
    const isClient = user.role === 'CLIENT';

    if (isAdmin) {
      console.log('   ✅ Règle ADMIN: Accès complet\n');
    } else if (isOpsManager) {
      console.log('   ✅ Règle OPERATIONS_MANAGER: Accès complet\n');
    } else if (isFinanceManager) {
      console.log('   ✅ Règle FINANCE_MANAGER: Lecture seule\n');
    } else if (isClient) {
      console.log('   📋 Rôle CLIENT détecté. Vérification des règles:\n');

      // Règle 1: auth().id == userId
      console.log('   Règle 1: auth().id == userId');
      pickups.forEach((pickup) => {
        const match = user.id === pickup.userId;
        const statusOk = pickup.status !== 'EFFECTUE' && pickup.status !== 'ANNULE';
        if (match && statusOk) {
          console.log(`      ✅ ${pickup.trackingNumber}: userId correspond ET status OK`);
        } else if (match && !statusOk) {
          console.log(`      ⚠️  ${pickup.trackingNumber}: userId correspond MAIS status terminé`);
        } else {
          console.log(`      ❌ ${pickup.trackingNumber}: userId ne correspond pas`);
        }
      });
      console.log('');

      // Règle 2: auth().companyId == companyId
      console.log('   Règle 2: auth().companyId == companyId');
      console.log(`      auth().companyId = ${user.companyId || 'NULL'}`);
      pickups.forEach((pickup) => {
        console.log(`      ${pickup.trackingNumber}: companyId = ${pickup.companyId || 'NULL'}`);
        const match = user.companyId && pickup.companyId && user.companyId === pickup.companyId;
        if (match) {
          console.log(`         ✅ CompanyId correspond`);
        } else if (!user.companyId || !pickup.companyId) {
          console.log(`         ❌ L'un des companyId est NULL - règle ne s'applique PAS`);
        } else {
          console.log(`         ❌ CompanyId ne correspond pas`);
        }
      });
      console.log('');
    }

    // 5. Conclusion et recommandations
    console.log('💡 5. CONCLUSION\n');

    if (!user.companyId) {
      console.log('   🚨 PROBLÈME IDENTIFIÉ:');
      console.log('   L\'utilisateur n\'a PAS de companyId assigné\n');
      console.log('   📌 SOLUTION:');
      console.log('   - Créer une Company pour cet utilisateur');
      console.log('   - OU modifier les permissions Zenstack pour permettre');
      console.log('     aux CLIENTs sans company de voir leurs pickups\n');
    }

    const pickupsWithoutCompany = pickups.filter(p => !p.companyId);
    if (pickupsWithoutCompany.length > 0) {
      console.log(`   🚨 ${pickupsWithoutCompany.length} pickup(s) sans companyId`);
      console.log('   Ces pickups ne seront visibles que via la règle userId\n');
    }

    // Vérifier si la règle userId devrait fonctionner
    const accessiblePickups = pickups.filter(p =>
      p.userId === user.id &&
      p.status !== 'EFFECTUE' &&
      p.status !== 'ANNULE'
    );

    console.log(`   📊 RÉSULTAT ATTENDU:`);
    console.log(`   ${accessiblePickups.length} pickup(s) devraient être visibles`);
    console.log(`   via la règle: auth().id == userId\n`);

    if (accessiblePickups.length > 0 && user.role === 'CLIENT') {
      console.log('   ✅ Les pickups DEVRAIENT être visibles !');
      console.log('   Si ce n\'est pas le cas, vérifier:');
      console.log('   1. Le enhanced client est bien utilisé dans le dashboard');
      console.log('   2. La session contient bien auth().id');
      console.log('   3. Les requêtes n\'appliquent pas de filtres supplémentaires\n');
    }

    console.log('✅ ========================================');
    console.log('   VÉRIFICATION TERMINÉE');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCompanyIdIssue().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
