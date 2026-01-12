/**
 * Script de Diagnostic : Rattachement des Enlèvements
 *
 * Vérifie pourquoi les enlèvements guests ne sont pas rattachés aux comptes utilisateurs
 * Affiche les données pertinentes pour le matching email/téléphone
 */

import { prisma } from '../src/lib/db/client';

async function diagnoseAttachment() {
  console.log('\n🔍 ========================================');
  console.log('   DIAGNOSTIC DE RATTACHEMENT');
  console.log('========================================\n');

  try {
    // 1. Récupérer tous les enlèvements orphelins (userId = null)
    console.log('📦 1. ENLÈVEMENTS ORPHELINS (userId = null)\n');
    const orphanedPickups = await prisma.pickupRequest.findMany({
      where: { userId: null },
      select: {
        id: true,
        trackingNumber: true,
        contactEmail: true,
        contactPhone: true,
        isAttachedToAccount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Limiter à 10 pour lisibilité
    });

    if (orphanedPickups.length === 0) {
      console.log('   ✅ Aucun enlèvement orphelin trouvé\n');
    } else {
      console.log(`   📊 ${orphanedPickups.length} enlèvement(s) orphelin(s) trouvé(s):\n`);
      orphanedPickups.forEach((pickup, index) => {
        console.log(`   ${index + 1}. ${pickup.trackingNumber}`);
        console.log(`      Email    : ${pickup.contactEmail}`);
        console.log(`      Téléphone: ${pickup.contactPhone}`);
        console.log(`      Rattaché : ${pickup.isAttachedToAccount ? 'Oui' : 'Non'}`);
        console.log(`      Créé le  : ${pickup.createdAt.toLocaleString('fr-FR')}`);
        console.log('');
      });
    }

    // 2. Récupérer tous les utilisateurs récents
    console.log('👥 2. UTILISATEURS RÉCENTS\n');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Limiter à 10 pour lisibilité
    });

    if (users.length === 0) {
      console.log('   ❌ Aucun utilisateur trouvé\n');
    } else {
      console.log(`   📊 ${users.length} utilisateur(s) récent(s):\n`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || 'Sans nom'} (${user.role})`);
        console.log(`      Email    : ${user.email}`);
        console.log(`      Téléphone: ${user.phone || 'NON RENSEIGNÉ'}`);
        console.log(`      Créé le  : ${user.createdAt.toLocaleString('fr-FR')}`);
        console.log('');
      });
    }

    // 3. Analyse de correspondance (matching)
    console.log('🔗 3. ANALYSE DE CORRESPONDANCE (MATCHING)\n');

    if (orphanedPickups.length === 0 || users.length === 0) {
      console.log('   ⚠️  Impossible d\'analyser : pas assez de données\n');
    } else {
      let matchFound = false;

      for (const pickup of orphanedPickups) {
        for (const user of users) {
          const emailMatch = pickup.contactEmail === user.email;
          const phoneMatch = user.phone && pickup.contactPhone === user.phone;

          if (emailMatch || phoneMatch) {
            matchFound = true;
            console.log('   ✅ CORRESPONDANCE TROUVÉE !');
            console.log(`      Enlèvement: ${pickup.trackingNumber}`);
            console.log(`      Utilisateur: ${user.name} (${user.email})`);

            if (emailMatch) {
              console.log(`      ✓ Email correspond: ${pickup.contactEmail}`);
            }
            if (phoneMatch) {
              console.log(`      ✓ Téléphone correspond: ${pickup.contactPhone}`);
            }
            console.log('');
          }
        }
      }

      if (!matchFound) {
        console.log('   ❌ AUCUNE CORRESPONDANCE TROUVÉE\n');
        console.log('   Raisons possibles:');
        console.log('   - Les emails ne correspondent pas exactement');
        console.log('   - Les téléphones ne correspondent pas');
        console.log('   - Le champ phone est null dans le compte utilisateur');
        console.log('');
      }
    }

    // 4. Vérification des logs de rattachement
    console.log('📝 4. LOGS DE RATTACHEMENT RÉCENTS\n');
    const recentLogs = await prisma.pickupLog.findMany({
      where: {
        eventType: 'ATTACHED_TO_ACCOUNT',
      },
      include: {
        pickup: {
          select: {
            trackingNumber: true,
          },
        },
        changedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (recentLogs.length === 0) {
      console.log('   ⚠️  Aucun log de rattachement trouvé\n');
      console.log('   Cela signifie que la fonction attachPickupToAccount');
      console.log('   n\'a jamais réussi à rattacher un enlèvement.\n');
    } else {
      console.log(`   📊 ${recentLogs.length} rattachement(s) récent(s):\n`);
      recentLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.pickup.trackingNumber}`);
        console.log(`      Par: ${log.changedBy?.name || 'Système'} (${log.changedBy?.email || 'N/A'})`);
        console.log(`      Le : ${log.createdAt.toLocaleString('fr-FR')}`);
        console.log(`      Notes: ${log.notes || 'Aucune note'}`);
        console.log('');
      });
    }

    // 4b. Vérifier tous les enlèvements des utilisateurs récents
    console.log('🔎 4b. ENLÈVEMENTS DES UTILISATEURS RÉCENTS\n');

    for (const user of users) {
      const userPickups = await prisma.pickupRequest.findMany({
        where: {
          OR: [
            { userId: user.id },
            { contactEmail: user.email },
          ],
        },
        select: {
          id: true,
          trackingNumber: true,
          contactEmail: true,
          contactPhone: true,
          userId: true,
          isAttachedToAccount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (userPickups.length > 0) {
        console.log(`   📦 ${user.name} (${user.email}): ${userPickups.length} enlèvement(s)`);
        userPickups.forEach((pickup) => {
          const status = pickup.userId ? '✅ Rattaché' : '⚠️  Orphelin';
          console.log(`      ${status} - ${pickup.trackingNumber}`);
          console.log(`         Contact: ${pickup.contactEmail} / ${pickup.contactPhone}`);
          console.log(`         Créé le: ${pickup.createdAt.toLocaleString('fr-FR')}`);
        });
        console.log('');
      }
    }

    // 5. Compter les enlèvements par statut userId
    console.log('📊 5. STATISTIQUES GLOBALES\n');
    const [totalPickups, orphanedCount, attachedCount] = await Promise.all([
      prisma.pickupRequest.count(),
      prisma.pickupRequest.count({ where: { userId: null } }),
      prisma.pickupRequest.count({ where: { userId: { not: null } } }),
    ]);

    console.log(`   Total d'enlèvements : ${totalPickups}`);
    console.log(`   Orphelins (userId=null) : ${orphanedCount} (${((orphanedCount / totalPickups) * 100).toFixed(1)}%)`);
    console.log(`   Rattachés (userId!=null): ${attachedCount} (${((attachedCount / totalPickups) * 100).toFixed(1)}%)`);
    console.log('');

    console.log('✅ ========================================');
    console.log('   DIAGNOSTIC TERMINÉ');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le diagnostic
diagnoseAttachment().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
