/**
 * Script de Seed : Données de Test pour Tracking Public
 *
 * Génère des shipments avec tracking events pour tester la fonctionnalité
 * de tracking public sans authentification.
 *
 * Features :
 * - Crée 5 shipments avec différents statuts
 * - Génère des tracking events réalistes
 * - Inclut des dates et localisations variées
 *
 * Usage : npx tsx scripts/seed-tracking-test-data.ts
 *
 * @module scripts/seed-tracking-test-data
 */

import { prisma } from '../src/lib/db/client';
import { ShipmentStatus, TransportMode, CargoType } from '../src/generated/prisma';

/**
 * Générer un numéro de tracking unique
 * Format : SHP-YYYYMMDD-XXXXX
 */
function generateTrackingNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `SHP-${year}${month}${day}-${random}`;
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 SEED : Données de test pour tracking public\n');
  console.log('='.repeat(60));

  // =========================================================================
  // ÉTAPE 1 : Vérifier/Créer une company de test
  // =========================================================================
  console.log('\n📦 ÉTAPE 1 : Vérification de la company de test...\n');

  let testCompany = await prisma.company.findFirst({
    where: {
      email: 'test@fasofret.com',
    },
  });

  if (!testCompany) {
    console.log('   Création d\'une company de test...');
    testCompany = await prisma.company.create({
      data: {
        name: 'Faso Fret Test Company',
        email: 'test@fasofret.com',
        phone: '+226 XX XX XX XX',
        address: '123 Avenue Test',
        city: 'Ouagadougou',
        country: 'Burkina Faso',
      },
    });
    console.log(`   ✅ Company créée : ${testCompany.name} (ID: ${testCompany.id})\n`);
  } else {
    console.log(`   ✅ Company existante trouvée : ${testCompany.name} (ID: ${testCompany.id})\n`);
  }

  // =========================================================================
  // ÉTAPE 2 : Vérifier/Créer un utilisateur de test
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n👤 ÉTAPE 2 : Vérification de l\'utilisateur de test...\n');

  let testUser = await prisma.user.findFirst({
    where: {
      email: 'test@fasofret.com',
    },
  });

  if (!testUser) {
    console.log('   Création d\'un utilisateur de test...');
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@fasofret.com',
        role: 'OPERATIONS_MANAGER',
        companyId: testCompany.id,
        emailVerified: true,
      },
    });
    console.log(`   ✅ Utilisateur créé : ${testUser.name} (ID: ${testUser.id})\n`);
  } else {
    console.log(`   ✅ Utilisateur existant trouvé : ${testUser.name} (ID: ${testUser.id})\n`);
  }

  // =========================================================================
  // ÉTAPE 3 : Créer des shipments de test avec différents statuts
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🚢 ÉTAPE 3 : Création des shipments de test...\n');

  const shipmentsData = [
    {
      status: ShipmentStatus.IN_TRANSIT,
      originCity: 'Ouagadougou',
      originCountry: 'Burkina Faso',
      destinationCity: 'Abidjan',
      destinationCountry: 'Côte d\'Ivoire',
      weight: 250,
      packageCount: 5,
      cargoType: CargoType.GENERAL,
      description: 'Électronique - Ordinateurs et accessoires',
      transportMode: [TransportMode.ROAD],
      estimatedCost: 125000,
      events: [
        {
          status: ShipmentStatus.APPROVED,
          location: 'Ouagadougou, Burkina Faso',
          description: 'Expédition approuvée et prête pour collecte',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Il y a 3 jours
        },
        {
          status: ShipmentStatus.PICKED_UP,
          location: 'Ouagadougou, Burkina Faso',
          description: 'Colis collecté au dépôt',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Il y a 2 jours
        },
        {
          status: ShipmentStatus.IN_TRANSIT,
          location: 'Bobo-Dioulasso, Burkina Faso',
          description: 'En transit vers la frontière',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Il y a 1 jour
        },
      ],
    },
    {
      status: ShipmentStatus.DELIVERED,
      originCity: 'Lomé',
      originCountry: 'Togo',
      destinationCity: 'Ouagadougou',
      destinationCountry: 'Burkina Faso',
      weight: 150,
      packageCount: 3,
      cargoType: CargoType.GENERAL,
      description: 'Textiles - Tissu wax et vêtements',
      transportMode: [TransportMode.ROAD],
      estimatedCost: 85000,
      actualCost: 82000,
      actualDeliveryDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // Il y a 12h
      events: [
        {
          status: ShipmentStatus.APPROVED,
          location: 'Lomé, Togo',
          description: 'Expédition validée',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.PICKED_UP,
          location: 'Lomé, Togo',
          description: 'Collecté chez l\'expéditeur',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.IN_TRANSIT,
          location: 'Atakpamé, Togo',
          description: 'En route vers Burkina Faso',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.AT_CUSTOMS,
          location: 'Frontière Togo-Burkina',
          description: 'Contrôle douanier en cours',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.CUSTOMS_CLEARED,
          location: 'Frontière Togo-Burkina',
          description: 'Dédouané avec succès',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.OUT_FOR_DELIVERY,
          location: 'Ouagadougou, Burkina Faso',
          description: 'En cours de livraison finale',
          timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.DELIVERED,
          location: 'Ouagadougou, Burkina Faso',
          description: 'Livré au destinataire - Signature reçue',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      ],
    },
    {
      status: ShipmentStatus.AT_CUSTOMS,
      originCity: 'Paris',
      originCountry: 'France',
      destinationCity: 'Ouagadougou',
      destinationCountry: 'Burkina Faso',
      weight: 500,
      packageCount: 10,
      cargoType: CargoType.FRAGILE,
      description: 'Matériel médical - Équipements hospitaliers',
      transportMode: [TransportMode.AIR, TransportMode.ROAD],
      estimatedCost: 450000,
      events: [
        {
          status: ShipmentStatus.APPROVED,
          location: 'Paris, France',
          description: 'Expédition internationale approuvée',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.PICKED_UP,
          location: 'Paris, France',
          description: 'Collecté et acheminé vers l\'aéroport',
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.IN_TRANSIT,
          location: 'Aéroport Charles de Gaulle, France',
          description: 'Chargement sur vol AF1234',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.IN_TRANSIT,
          location: 'Aéroport d\'Abidjan, Côte d\'Ivoire',
          description: 'Escale technique',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.IN_TRANSIT,
          location: 'Aéroport de Ouagadougou, Burkina Faso',
          description: 'Arrivée à destination',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.AT_CUSTOMS,
          location: 'Douane Aéroport Ouagadougou',
          description: 'Inspection douanière en cours - Documents en vérification',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      status: ShipmentStatus.ON_HOLD,
      originCity: 'Accra',
      originCountry: 'Ghana',
      destinationCity: 'Ouagadougou',
      destinationCountry: 'Burkina Faso',
      weight: 180,
      packageCount: 4,
      cargoType: CargoType.GENERAL,
      description: 'Pièces automobiles - Moteurs et accessoires',
      transportMode: [TransportMode.ROAD],
      estimatedCost: 95000,
      events: [
        {
          status: ShipmentStatus.APPROVED,
          location: 'Accra, Ghana',
          description: 'Expédition approuvée',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.PICKED_UP,
          location: 'Accra, Ghana',
          description: 'Collecté',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          status: ShipmentStatus.ON_HOLD,
          location: 'Accra, Ghana',
          description: 'Mise en attente - Vérification documentation nécessaire',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      status: ShipmentStatus.DRAFT,
      originCity: 'Ouagadougou',
      originCountry: 'Burkina Faso',
      destinationCity: 'Niamey',
      destinationCountry: 'Niger',
      weight: 100,
      packageCount: 2,
      cargoType: CargoType.GENERAL,
      description: 'Documents administratifs urgents',
      transportMode: [TransportMode.ROAD],
      estimatedCost: 45000,
      events: [], // Pas d'événements pour un DRAFT
    },
  ];

  const createdShipments: any[] = [];

  for (const data of shipmentsData) {
    const trackingNumber = generateTrackingNumber();
    const estimatedDeliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Dans 7 jours

    console.log(`   Création du shipment : ${trackingNumber}`);
    console.log(`   └─ Statut     : ${data.status}`);
    console.log(`   └─ Origine    : ${data.originCity}, ${data.originCountry}`);
    console.log(`   └─ Destination: ${data.destinationCity}, ${data.destinationCountry}`);
    console.log(`   └─ Events     : ${data.events.length}`);

    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber,
        status: data.status,
        companyId: testCompany.id,
        createdById: testUser.id,

        // Origine/Destination
        originAddress: `123 Rue Test, ${data.originCity}`,
        originCity: data.originCity,
        originPostalCode: '00000',
        originCountry: data.originCountry,
        destinationAddress: `456 Avenue Destination, ${data.destinationCity}`,
        destinationCity: data.destinationCity,
        destinationPostalCode: '00000',
        destinationCountry: data.destinationCountry,

        // Transport
        cargoType: data.cargoType,
        description: data.description,
        weight: data.weight,
        packageCount: data.packageCount,
        transportMode: data.transportMode,

        // Dates
        estimatedDeliveryDate,
        actualDeliveryDate: data.actualDeliveryDate || null,
        requestedPickupDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),

        // Coûts
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost || null,

        // Tracking events
        trackingEvents: {
          create: data.events.map((event) => ({
            status: event.status,
            location: event.location,
            description: event.description,
            timestamp: event.timestamp,
          })),
        },
      },
      include: {
        trackingEvents: true,
      },
    });

    createdShipments.push(shipment);
    console.log(`   ✅ Créé avec succès\n`);
  }

  // =========================================================================
  // RÉSUMÉ
  // =========================================================================
  console.log('='.repeat(60));
  console.log('\n🎉 SEED TERMINÉ AVEC SUCCÈS !\n');
  console.log(`✅ ${createdShipments.length} shipments créés\n`);

  console.log('📋 LISTE DES NUMÉROS DE TRACKING GÉNÉRÉS :\n');
  createdShipments.forEach((shipment, index) => {
    console.log(`   ${index + 1}. ${shipment.trackingNumber}`);
    console.log(`      Statut : ${shipment.status}`);
    console.log(`      Events : ${shipment.trackingEvents.length}`);
    console.log(`      Public : ${shipment.status !== ShipmentStatus.DRAFT ? '✅ OUI' : '❌ NON (DRAFT)'}\n`);
  });

  console.log('🧪 PROCHAINES ÉTAPES :\n');
  console.log('   1. Tester les Server Actions :');
  console.log('      npx tsx test-public-tracking.ts\n');
  console.log('   2. Tester dans le navigateur :');
  console.log('      http://localhost:3001/tracking\n');
  console.log('   3. Utiliser un des numéros ci-dessus pour rechercher\n');
}

main()
  .catch((error) => {
    console.error('\n❌ ERREUR DURANT LE SEED :\n');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
