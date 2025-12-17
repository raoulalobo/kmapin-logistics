/**
 * Script pour ajouter le statut READY_FOR_PICKUP à l'enum ShipmentStatus
 */

import { prisma } from '../src/lib/db/client';

async function main() {
  try {
    console.log('Ajout du statut READY_FOR_PICKUP à l\'enum ShipmentStatus...');

    // Vérifier si la valeur existe déjà
    const result = await prisma.$queryRaw`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'ShipmentStatus'
      AND enumlabel = 'READY_FOR_PICKUP';
    `;

    if (Array.isArray(result) && result.length > 0) {
      console.log('Le statut READY_FOR_PICKUP existe déjà dans l\'enum.');
      return;
    }

    // Ajouter la valeur à l'enum
    await prisma.$executeRaw`
      ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP' AFTER 'OUT_FOR_DELIVERY';
    `;

    console.log('✅ Statut READY_FOR_PICKUP ajouté avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du statut:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
