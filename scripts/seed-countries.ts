/**
 * Script de seed pour les pays
 *
 * Insère des pays par défaut dans la base de données
 * Utile pour démarrer avec des données de test
 *
 * Usage: npx tsx scripts/seed-countries.ts
 */

import { prisma } from '../src/lib/db/client';

/**
 * Liste des pays par défaut à insérer
 *
 * Inclut les principaux pays pour le fret international
 */
const defaultCountries = [
  // Europe
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'BE', name: 'Belgique' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'CH', name: 'Suisse' },
  { code: 'PL', name: 'Pologne' },
  { code: 'PT', name: 'Portugal' },

  // Afrique
  { code: 'MA', name: 'Maroc' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'DZ', name: 'Algérie' },
  { code: 'EG', name: 'Égypte' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'ZA', name: 'Afrique du Sud' },

  // Asie
  { code: 'CN', name: 'Chine' },
  { code: 'JP', name: 'Japon' },
  { code: 'IN', name: 'Inde' },
  { code: 'TH', name: 'Thaïlande' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'SG', name: 'Singapour' },
  { code: 'AE', name: 'Émirats Arabes Unis' },
  { code: 'SA', name: 'Arabie Saoudite' },

  // Amérique du Nord
  { code: 'US', name: 'États-Unis' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexique' },

  // Amérique du Sud
  { code: 'BR', name: 'Brésil' },
  { code: 'AR', name: 'Argentine' },
  { code: 'CL', name: 'Chili' },

  // Océanie
  { code: 'AU', name: 'Australie' },
  { code: 'NZ', name: 'Nouvelle-Zélande' },
];

/**
 * Fonction principale de seed
 */
async function main() {
  console.log('🌍 Insertion des pays par défaut...\n');

  let created = 0;
  let skipped = 0;

  for (const country of defaultCountries) {
    try {
      // Vérifier si le pays existe déjà
      const existing = await prisma.country.findUnique({
        where: { code: country.code },
      });

      if (existing) {
        console.log(`⏭️  ${country.code} - ${country.name} (déjà existant)`);
        skipped++;
        continue;
      }

      // Créer le pays
      await prisma.country.create({
        data: {
          code: country.code,
          name: country.name,
          isActive: true,
        },
      });

      console.log(`✅ ${country.code} - ${country.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Erreur pour ${country.code}:`, error);
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   - ${created} pays créés`);
  console.log(`   - ${skipped} pays existants ignorés`);
  console.log(`   - ${defaultCountries.length} pays au total\n`);
}

/**
 * Exécution du script
 */
main()
  .catch((error) => {
    console.error('Erreur lors du seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
