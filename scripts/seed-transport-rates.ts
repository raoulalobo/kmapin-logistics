/**
 * Script de seed : Tarifs de transport
 *
 * Crée des tarifs exemple pour France → Afrique de l'Ouest
 *
 * Usage: npx tsx scripts/seed-transport-rates.ts
 */

import { prisma } from '../src/lib/db/client';

async function main() {
  console.log('🌱 Seed des tarifs de transport...\n');

  const rates = [
    // MARITIME
    { origin: 'FR', dest: 'BF', mode: 'SEA', kg: 0.8, m3: 150.0, notes: 'Maritime via Abidjan' },
    { origin: 'FR', dest: 'CI', mode: 'SEA', kg: 0.7, m3: 140.0, notes: 'Maritime Abidjan' },
    { origin: 'FR', dest: 'ML', mode: 'SEA', kg: 0.9, m3: 160.0, notes: 'Maritime via Dakar' },

    // AÉRIEN
    { origin: 'FR', dest: 'BF', mode: 'AIR', kg: 4.5, m3: 900.0, notes: 'Aérien Ouagadougou' },
    { origin: 'FR', dest: 'CI', mode: 'AIR', kg: 4.2, m3: 850.0, notes: 'Aérien Abidjan' },
    { origin: 'FR', dest: 'ML', mode: 'AIR', kg: 4.8, m3: 950.0, notes: 'Aérien Bamako' },
  ];

  let created = 0;

  for (const rate of rates) {
    await prisma.transportRate.upsert({
      where: {
        originCountryCode_destinationCountryCode_transportMode: {
          originCountryCode: rate.origin,
          destinationCountryCode: rate.dest,
          transportMode: rate.mode as any,
        },
      },
      create: {
        originCountryCode: rate.origin,
        destinationCountryCode: rate.dest,
        transportMode: rate.mode as any,
        ratePerKg: rate.kg,
        ratePerM3: rate.m3,
        notes: rate.notes,
        isActive: true,
      },
      update: {
        ratePerKg: rate.kg,
        ratePerM3: rate.m3,
        notes: rate.notes,
      },
    });

    console.log(`✅ ${rate.origin} → ${rate.dest} (${rate.mode}): ${rate.kg} €/kg, ${rate.m3} €/m³`);
    created++;
  }

  console.log(`\n📊 ${created} tarifs créés/mis à jour`);

  // Mettre à jour PricingConfig avec les nouveaux champs
  const existingConfig = await prisma.pricingConfig.findFirst();

  if (existingConfig) {
    await prisma.pricingConfig.update({
      where: { id: existingConfig.id },
      data: {
        defaultRatePerKg: 1.0,
        defaultRatePerM3: 200.0,
      },
    });
    console.log('✅ PricingConfig mis à jour avec defaultRates\n');
  }
}

main()
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
