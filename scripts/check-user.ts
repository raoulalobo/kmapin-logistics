import { prisma } from '../src/lib/db/client';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'jean@mos.com' },
    select: { id: true, email: true, name: true, role: true, clientId: true }
  });
  console.log('Utilisateur jean@mos.com:', JSON.stringify(user, null, 2));

  if (user && !user.clientId) {
    console.log('\n⚠️  Cet utilisateur n\'a PAS de clientId !');
    console.log('C\'est la cause de l\'erreur "ID de compagnie invalide".');
  } else if (user && user.clientId) {
    console.log('\n✅ L\'utilisateur a bien un clientId:', user.clientId);
  } else {
    console.log('\n❌ Utilisateur non trouvé !');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
