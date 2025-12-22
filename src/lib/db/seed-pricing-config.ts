/**
 * Script de seed pour la configuration des prix
 *
 * Initialise la base de données avec les valeurs par défaut de tarification
 * qui étaient auparavant hardcodées dans quote.actions.ts
 *
 * Utilisation:
 * - Via script: npx tsx src/lib/db/seed-pricing-config.ts
 * - Via fonction: await seedPricingConfig()
 */

import { prisma } from './client';

/**
 * Données de seed pour la configuration des prix
 */
const PRICING_CONFIG_SEED = {
  baseRatePerKg: 0.5,
  transportMultipliers: {
    ROAD: 1.0,
    SEA: 0.6,
    AIR: 3.0,
    RAIL: 0.8,
  },
  cargoTypeSurcharges: {
    GENERAL: 0,
    DANGEROUS: 0.5,    // +50%
    PERISHABLE: 0.4,   // +40%
    FRAGILE: 0.3,      // +30%
    BULK: -0.1,        // -10%
    CONTAINER: 0.2,    // +20%
    PALLETIZED: 0.15,  // +15%
    OTHER: 0.1,        // +10%
  },
  prioritySurcharges: {
    STANDARD: 0,
    EXPRESS: 0.5,  // +50%
    URGENT: 1.0,   // +100%
  },
  deliverySpeedsPerMode: {
    ROAD: { min: 3, max: 7 },
    SEA: { min: 20, max: 45 },
    AIR: { min: 1, max: 3 },
    RAIL: { min: 7, max: 14 },
  },
};

/**
 * Données de seed pour les distances entre pays (codes ISO)
 * Basées sur les distances approximatives de l'ancienne table COUNTRY_DISTANCES
 */
const COUNTRY_DISTANCES_SEED = [
  // Distances intra-européennes
  { originCountry: 'FR', destinationCountry: 'DE', distanceKm: 600 },
  { originCountry: 'FR', destinationCountry: 'ES', distanceKm: 800 },
  { originCountry: 'FR', destinationCountry: 'IT', distanceKm: 900 },
  { originCountry: 'FR', destinationCountry: 'BE', distanceKm: 300 },
  { originCountry: 'FR', destinationCountry: 'NL', distanceKm: 500 },
  { originCountry: 'FR', destinationCountry: 'GB', distanceKm: 450 },
  { originCountry: 'DE', destinationCountry: 'ES', distanceKm: 1500 },
  { originCountry: 'DE', destinationCountry: 'IT', distanceKm: 1000 },
  { originCountry: 'DE', destinationCountry: 'PL', distanceKm: 600 },

  // Distances intercontinentales France
  { originCountry: 'FR', destinationCountry: 'US', distanceKm: 6500 },
  { originCountry: 'FR', destinationCountry: 'CN', distanceKm: 8200 },
  { originCountry: 'FR', destinationCountry: 'JP', distanceKm: 9700 },
  { originCountry: 'FR', destinationCountry: 'AU', distanceKm: 17000 },
  { originCountry: 'FR', destinationCountry: 'BR', distanceKm: 8500 },
  { originCountry: 'FR', destinationCountry: 'CA', distanceKm: 5500 },
  { originCountry: 'FR', destinationCountry: 'IN', distanceKm: 6800 },
  { originCountry: 'FR', destinationCountry: 'ZA', distanceKm: 8500 },
  { originCountry: 'FR', destinationCountry: 'MA', distanceKm: 2000 },
  { originCountry: 'FR', destinationCountry: 'DZ', distanceKm: 1500 },
  { originCountry: 'FR', destinationCountry: 'TN', distanceKm: 1600 },
  { originCountry: 'FR', destinationCountry: 'CI', distanceKm: 4800 },
  { originCountry: 'FR', destinationCountry: 'SN', distanceKm: 4200 },

  // Distances bidirectionnelles symétriques (exemples)
  { originCountry: 'DE', destinationCountry: 'FR', distanceKm: 600 },
  { originCountry: 'ES', destinationCountry: 'FR', distanceKm: 800 },
  { originCountry: 'IT', destinationCountry: 'FR', distanceKm: 900 },
  { originCountry: 'BE', destinationCountry: 'FR', distanceKm: 300 },
  { originCountry: 'NL', destinationCountry: 'FR', distanceKm: 500 },
  { originCountry: 'GB', destinationCountry: 'FR', distanceKm: 450 },
  { originCountry: 'US', destinationCountry: 'FR', distanceKm: 6500 },
  { originCountry: 'CN', destinationCountry: 'FR', distanceKm: 8200 },
];

/**
 * Fonction principale de seed
 *
 * @param adminUserId - ID de l'utilisateur admin qui effectue le seed (optionnel)
 */
export async function seedPricingConfig(adminUserId?: string) {
  console.log('[Seed] Début du seed de la configuration des prix...');

  try {
    // 1. Trouver un utilisateur ADMIN pour attribuer la création
    let updatedById = adminUserId;

    if (!updatedById) {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (!adminUser) {
        throw new Error(
          'Aucun utilisateur ADMIN trouvé. Veuillez créer un admin d\'abord avec `npm run create-admin`'
        );
      }

      updatedById = adminUser.id;
    }

    // 2. Vérifier si une configuration existe déjà
    const existingConfig = await prisma.pricingConfig.findFirst();

    if (existingConfig) {
      console.log('[Seed] ⚠️  Une configuration des prix existe déjà. Aucune action nécessaire.');
      console.log('[Seed] Pour réinitialiser, supprimez manuellement la configuration existante.');
    } else {
      // 3. Créer la configuration des prix
      const config = await prisma.pricingConfig.create({
        data: {
          ...PRICING_CONFIG_SEED,
          updatedById,
        },
      });

      console.log(`[Seed] ✅ Configuration des prix créée (ID: ${config.id})`);
    }

    // 4. Insérer les distances entre pays
    console.log('[Seed] Insertion des distances entre pays...');

    let insertedCount = 0;
    let skippedCount = 0;

    for (const distance of COUNTRY_DISTANCES_SEED) {
      const existing = await prisma.countryDistance.findUnique({
        where: {
          originCountry_destinationCountry: {
            originCountry: distance.originCountry,
            destinationCountry: distance.destinationCountry,
          },
        },
      });

      if (existing) {
        skippedCount++;
      } else {
        await prisma.countryDistance.create({
          data: distance,
        });
        insertedCount++;
      }
    }

    console.log(`[Seed] ✅ Distances insérées: ${insertedCount}, ignorées (déjà existantes): ${skippedCount}`);

    console.log('[Seed] ✅ Seed de la configuration des prix terminé avec succès!');
  } catch (error) {
    console.error('[Seed] ❌ Erreur lors du seed:', error);
    throw error;
  }
}

/**
 * Exécution directe du script (si appelé via tsx)
 */
if (require.main === module) {
  seedPricingConfig()
    .then(() => {
      console.log('[Seed] Terminé.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Seed] Échec:', error);
      process.exit(1);
    });
}
