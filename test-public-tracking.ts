/**
 * Script de Test : Public Tracking Actions
 *
 * Test des Server Actions publiques pour vérifier :
 * 1. La récupération des données publiques
 * 2. Le filtrage des données sensibles
 * 3. La validation du format
 *
 * Usage : npx tsx test-public-tracking.ts
 */

import { prisma } from './src/lib/db/client';
import { getPublicTracking, checkTrackingNumberExists } from './src/modules/tracking';

async function main() {
  console.log('🧪 TEST DES SERVER ACTIONS - PUBLIC TRACKING\n');
  console.log('='.repeat(60));

  // =========================================================================
  // TEST 1 : Récupérer un shipment existant pour test
  // =========================================================================
  console.log('\n📦 TEST 1 : Recherche d\'un shipment disponible...\n');

  const availableShipment = await prisma.shipment.findFirst({
    where: {
      status: {
        not: 'DRAFT', // Exclure les DRAFT
      },
    },
    select: {
      trackingNumber: true,
      status: true,
      originCity: true,
      destinationCity: true,
      estimatedCost: true, // Pour vérifier le filtrage
      actualCost: true, // Pour vérifier le filtrage
    },
  });

  if (!availableShipment) {
    console.log('❌ ERREUR : Aucun shipment disponible dans la base');
    console.log('   Créez au moins un shipment avec status != DRAFT pour tester\n');
    process.exit(1);
  }

  console.log('✅ Shipment trouvé :');
  console.log(`   Tracking Number : ${availableShipment.trackingNumber}`);
  console.log(`   Statut          : ${availableShipment.status}`);
  console.log(`   Origine         : ${availableShipment.originCity}`);
  console.log(`   Destination     : ${availableShipment.destinationCity}`);
  console.log(`   Coût estimé     : ${availableShipment.estimatedCost || 'N/A'} (SENSIBLE)`);
  console.log(`   Coût réel       : ${availableShipment.actualCost || 'N/A'} (SENSIBLE)\n`);

  // =========================================================================
  // TEST 2 : Tester getPublicTracking()
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🔍 TEST 2 : getPublicTracking() avec numéro valide...\n');

  const publicTracking = await getPublicTracking(availableShipment.trackingNumber);

  if (!publicTracking) {
    console.log('❌ ERREUR : getPublicTracking() a retourné null');
    console.log('   Le shipment devrait être accessible publiquement\n');
    process.exit(1);
  }

  console.log('✅ Données publiques récupérées :');
  console.log(`   Tracking Number    : ${publicTracking.trackingNumber}`);
  console.log(`   Statut             : ${publicTracking.status}`);
  console.log(`   Statut (FR)        : ${publicTracking.statusLabel}`);
  console.log(`   Origine            : ${publicTracking.originCity}, ${publicTracking.originCountry}`);
  console.log(`   Destination        : ${publicTracking.destinationCity}, ${publicTracking.destinationCountry}`);
  console.log(`   Poids              : ${publicTracking.weight} kg`);
  console.log(`   Nombre de colis    : ${publicTracking.packageCount}`);
  console.log(`   Type marchandise   : ${publicTracking.cargoType}`);
  console.log(`   Company            : ${publicTracking.companyName}`);
  console.log(`   Events de tracking : ${publicTracking.trackingEvents.length} événements\n`);

  // =========================================================================
  // TEST 3 : VÉRIFIER LE FILTRAGE DES DONNÉES SENSIBLES (CRITIQUE !)
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🔒 TEST 3 : VÉRIFICATION FILTRAGE DONNÉES SENSIBLES...\n');

  const publicData = publicTracking as any; // Type any pour inspecter les propriétés
  let securityIssues = 0;

  // Liste des champs INTERDITS dans la réponse publique
  const forbiddenFields = [
    'estimatedCost',
    'actualCost',
    'notes',
    'specialInstructions',
    'invoiceId',
    'createdById',
  ];

  console.log('Vérification des champs interdits :\n');

  forbiddenFields.forEach((field) => {
    if (publicData[field] !== undefined) {
      console.log(`   ❌ FAILLE SÉCURITÉ : "${field}" est présent (valeur: ${publicData[field]})`);
      securityIssues++;
    } else {
      console.log(`   ✅ "${field}" : ABSENT (OK)`);
    }
  });

  // Vérifier que les events n'ont pas de GPS
  console.log('\nVérification des coordonnées GPS dans trackingEvents :\n');

  publicTracking.trackingEvents.forEach((event, index) => {
    const eventData = event as any;
    if (eventData.latitude !== undefined || eventData.longitude !== undefined) {
      console.log(`   ❌ FAILLE SÉCURITÉ : Event ${index} contient des coordonnées GPS`);
      securityIssues++;
    } else {
      console.log(`   ✅ Event ${index} : Pas de GPS (OK)`);
    }
  });

  if (securityIssues > 0) {
    console.log(`\n❌ ÉCHEC SÉCURITÉ : ${securityIssues} faille(s) détectée(s)`);
    console.log('   Les données sensibles ne sont PAS correctement filtrées !\n');
    process.exit(1);
  } else {
    console.log('\n✅ SUCCÈS SÉCURITÉ : Toutes les données sensibles sont filtrées correctement\n');
  }

  // =========================================================================
  // TEST 4 : Tester checkTrackingNumberExists()
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🔎 TEST 4 : checkTrackingNumberExists()...\n');

  const exists = await checkTrackingNumberExists(availableShipment.trackingNumber);
  console.log(`   Résultat : ${exists ? '✅ TRUE (existe)' : '❌ FALSE (inexistant)'}\n`);

  if (!exists) {
    console.log('❌ ERREUR : Le numéro devrait exister');
    process.exit(1);
  }

  // =========================================================================
  // TEST 5 : Format invalide
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🚫 TEST 5 : Format invalide (devrait retourner null)...\n');

  const invalidResult = await getPublicTracking('INVALID-FORMAT');
  if (invalidResult === null) {
    console.log('   ✅ SUCCÈS : Format invalide rejeté (null retourné)\n');
  } else {
    console.log('   ❌ ERREUR : Format invalide accepté (ne devrait pas)\n');
    process.exit(1);
  }

  // =========================================================================
  // TEST 6 : Numéro inexistant
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🔍 TEST 6 : Numéro inexistant (devrait retourner null)...\n');

  const notFoundResult = await getPublicTracking('SHP-99999999-ZZZZZ');
  if (notFoundResult === null) {
    console.log('   ✅ SUCCÈS : Numéro inexistant retourne null\n');
  } else {
    console.log('   ❌ ERREUR : Numéro inexistant retourne des données (ne devrait pas)\n');
    process.exit(1);
  }

  // =========================================================================
  // TEST 7 : Vérifier shipment DRAFT (s'il existe)
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n📝 TEST 7 : Shipment DRAFT (devrait être bloqué)...\n');

  const draftShipment = await prisma.shipment.findFirst({
    where: {
      status: 'DRAFT',
    },
    select: {
      trackingNumber: true,
    },
  });

  if (draftShipment) {
    console.log(`   Shipment DRAFT trouvé : ${draftShipment.trackingNumber}`);
    const draftResult = await getPublicTracking(draftShipment.trackingNumber);

    if (draftResult === null) {
      console.log('   ✅ SUCCÈS : Accès DRAFT bloqué (null retourné)\n');
    } else {
      console.log('   ❌ ERREUR : Accès DRAFT autorisé (FAILLE SÉCURITÉ !)\n');
      process.exit(1);
    }
  } else {
    console.log('   ⚠️  Aucun shipment DRAFT trouvé (test ignoré)\n');
  }

  // =========================================================================
  // RÉSUMÉ FINAL
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !\n');
  console.log('✅ Récupération des données publiques : OK');
  console.log('✅ Filtrage des données sensibles     : OK');
  console.log('✅ Validation du format                : OK');
  console.log('✅ Gestion des erreurs                 : OK');
  console.log('✅ Blocage des DRAFT                   : OK\n');

  console.log('🚀 Les Server Actions sont prêtes pour la production !\n');
  console.log('📝 Prochaine étape : Tester l\'interface utilisateur dans le navigateur\n');
}

main()
  .catch((error) => {
    console.error('\n❌ ERREUR FATALE DURANT LES TESTS :\n');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
