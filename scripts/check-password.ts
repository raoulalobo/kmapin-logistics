import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

async function checkPassword() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@kmapin.com' },
    include: { accounts: true }
  });

  if (!user) {
    console.log('❌ Utilisateur introuvable');
    await prisma.$disconnect();
    return;
  }

  const account = user.accounts.find(a => a.providerId === 'credential');

  console.log('📧 Email:', user.email);
  console.log('👤 Nom:', user.name);
  console.log('🎭 Rôle:', user.role);
  console.log('✅ Email vérifié:', user.emailVerified ? 'Oui' : 'Non');
  console.log('');
  console.log('🔐 Hash du mot de passe:');
  console.log('   Longueur:', account?.password?.length || 0);
  console.log('   Début:', account?.password?.substring(0, 80));
  console.log('');
  console.log('✅ Provider ID:', account?.providerId);
  console.log('📝 Account ID:', account?.accountId);

  await prisma.$disconnect();
}

checkPassword();
