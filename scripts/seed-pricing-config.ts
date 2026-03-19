/**
 * Script de Seed : Configuration des Prix (PricingConfig)
 *
 * Initialise ou met à jour la table `pricing_config` avec les valeurs
 * basées sur les spécifications du document "calculs.pdf".
 *
 * Ce script crée une configuration singleton avec :
 * - Ratios de poids volumétrique (AIR: 167, ROAD: 333, SEA: 1)
 * - Activation du poids volumétrique par mode
 * - Surcharges de priorité (STANDARD: 0%, NORMAL: +10%, URGENT: +30%)
 * - Surcharges de type de cargo
 * - Multiplicateurs de transport
 * - Délais de livraison par mode
 *
 * Usage:
 *   npx tsx scripts/seed-pricing-config.ts
 *
 * Note: Un seul enregistrement PricingConfig doit exister (singleton)
 */

import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

/**
 * Configuration des prix basée sur les spécifications du PDF
 */
const PRICING_CONFIG_SEED = {
  // === Tarifs par Défaut (Fallback) ===
  baseRatePerKg: 0.5,          // ANCIEN (conservé pour compatibilité)
  defaultRatePerKg: 1.0,       // €/kg - Utilisé si route non configurée
  defaultRatePerM3: 200.0,     // €/m³ - Utilisé si route non configurée

  // === Ratios de Poids Volumétrique ===
  // Définit combien de kg équivaut 1 m³ pour chaque mode
  // Basés sur le PDF :
  // - AIR:  167 kg/m³ (ratio 1/6 = 6000)
  // - ROAD: 333 kg/m³ (ratio 1/3 = 5000)
  // - SEA:  1 kg/m³   (ratio 1/1 = 1000)
  volumetricWeightRatios: {
    AIR: 167,
    ROAD: 333,
    SEA: 1,
  },

  // === Activation du Poids Volumétrique par Mode ===
  // Maritime (SEA) n'utilise PAS le poids volumétrique car il utilise
  // le système "Poids ou Mesure" (Unité Payante) selon le PDF
  useVolumetricWeightPerMode: {
    AIR: true,
    ROAD: true,
    SEA: false,  // Maritime utilise "Poids ou Mesure" (Unité Payante)
  },

  // === Multiplicateurs par Mode de Transport ===
  // Appliqués aux tarifs par défaut si route non configurée
  transportMultipliers: {
    ROAD: 1.0,
    SEA: 0.6,    // Maritime moins cher
    AIR: 3.0,    // Aérien plus cher
  },

  // === Surcharges par Type de Marchandise ===
  // Coefficients multiplicateurs (ex: 0.5 = +50%)
  cargoTypeSurcharges: {
    GENERAL: 0,        // Aucune surcharge
    DANGEROUS: 0.5,    // +50% (matières dangereuses)
    PERISHABLE: 0.4,   // +40% (périssable)
    FRAGILE: 0.3,      // +30% (fragile)
    BULK: -0.1,        // -10% (vrac)
    CONTAINER: 0.2,    // +20% (conteneur)
    PALLETIZED: 0.15,  // +15% (palettisé)
    OTHER: 0.1,        // +10% (autre)
  },

  // === Surcharges par Priorité ===
  // Coefficients multiplicateurs selon le PDF :
  // - STANDARD : 0%   (coefficient 1.0)
  // - NORMAL   : +10% (coefficient 1.1)
  // - URGENT   : +30% (coefficient 1.3)
  prioritySurcharges: {
    STANDARD: 0,    // +0%
    NORMAL: 0.1,    // +10%
    URGENT: 0.3,    // +30%
  },

  // === Délais de Livraison par Mode (en jours) ===
  deliverySpeedsPerMode: {
    ROAD: { min: 3, max: 7 },
    SEA: { min: 20, max: 45 },
    AIR: { min: 1, max: 3 },
  },
};

/**
 * Fonction principale de seed
 */
async function seedPricingConfig() {
  console.log('🌱 Seed : Configuration des Prix (PricingConfig)');
  console.log('===============================================\n');

  try {
    // === Étape 1 : Vérifier s'il existe déjà une configuration ===
    const existingConfig = await prisma.pricingConfig.findFirst();

    if (existingConfig) {
      console.log('⚠️  Une configuration existe déjà :');
      console.log(`   ID: ${existingConfig.id}`);
      console.log(`   Dernière mise à jour: ${existingConfig.updatedAt}`);
      console.log('\n🔄 Mise à jour de la configuration existante...\n');

      // Mettre à jour la configuration existante
      const updated = await prisma.pricingConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...PRICING_CONFIG_SEED,
          updatedAt: new Date(),
        },
      });

      console.log('✅ Configuration mise à jour avec succès !');
      console.log(`   ID: ${updated.id}`);
      console.log(`   Mise à jour: ${updated.updatedAt}\n`);
    } else {
      console.log('ℹ️  Aucune configuration trouvée. Création...\n');

      // === Étape 2 : Trouver ou créer un utilisateur admin ===
      let adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (!adminUser) {
        console.log('⚠️  Aucun utilisateur ADMIN trouvé !');
        console.log('   Vous devez d\'abord créer un admin avec : npm run create-admin');
        console.log('   Ou modifier ce script pour créer un admin temporaire.\n');
        process.exit(1);
      }

      console.log(`✅ Utilisateur ADMIN trouvé : ${adminUser.email}`);
      console.log(`   ID: ${adminUser.id}\n`);

      // === Étape 3 : Créer la configuration ===
      const created = await prisma.pricingConfig.create({
        data: {
          ...PRICING_CONFIG_SEED,
          updatedById: adminUser.id,
        },
      });

      console.log('✅ Configuration créée avec succès !');
      console.log(`   ID: ${created.id}`);
      console.log(`   Créée par: ${adminUser.email}`);
      console.log(`   Date: ${created.createdAt}\n`);
    }

    // === Étape 4 : Afficher le résumé de la configuration ===
    const finalConfig = await prisma.pricingConfig.findFirst();

    if (finalConfig) {
      console.log('📊 Résumé de la Configuration');
      console.log('─────────────────────────────');
      console.log(`✓ Tarif par défaut (kg)  : ${finalConfig.defaultRatePerKg} EUR/kg`);
      console.log(`✓ Tarif par défaut (m³)  : ${finalConfig.defaultRatePerM3} EUR/m³`);
      console.log(`✓ Ratios volumétriques   : AIR=${(finalConfig.volumetricWeightRatios as any).AIR}, ROAD=${(finalConfig.volumetricWeightRatios as any).ROAD}, SEA=${(finalConfig.volumetricWeightRatios as any).SEA}`);
      console.log(`✓ Poids vol. activé      : AIR=${(finalConfig.useVolumetricWeightPerMode as any).AIR}, ROAD=${(finalConfig.useVolumetricWeightPerMode as any).ROAD}, SEA=${(finalConfig.useVolumetricWeightPerMode as any).SEA}`);
      console.log(`✓ Surcharges priorité    : STANDARD=${(finalConfig.prioritySurcharges as any).STANDARD}, NORMAL=${(finalConfig.prioritySurcharges as any).NORMAL}, URGENT=${(finalConfig.prioritySurcharges as any).URGENT}`);
      console.log('');
    }

    console.log('🎉 Seed terminé avec succès !');
    console.log('');
    console.log('📝 Prochaines étapes :');
    console.log('   1. Vérifier la configuration dans Prisma Studio : npm run db:studio');
    console.log('   2. Seeder les tarifs de transport : npx tsx scripts/seed-transport-rates.ts');
    console.log('   3. Tester le calculateur de devis');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors du seed :', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le seed
seedPricingConfig()
  .catch((error) => {
    console.error('💥 Erreur fatale :', error);
    process.exit(1);
  });
