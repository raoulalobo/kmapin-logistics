/**
 * Exports centralisés pour l'accès à la base de données
 *
 * @module lib/db
 */

// Client Prisma standard (sans access control)
export { prisma, db } from './client';

// Client Prisma enhanced avec Zenstack (avec access control)
export {
  getEnhancedPrisma,
  getEnhancedPrismaFromSession,
  type AuthContext,
  type EnhancedPrismaClient,
} from './enhanced-client';

/**
 * Guide d'utilisation :
 *
 * 1. Pour les opérations système (migrations, jobs background) :
 *    ```ts
 *    import { prisma } from '@/lib/db';
 *    const allUsers = await prisma.user.findMany();
 *    ```
 *
 * 2. Pour les opérations utilisateur avec access control :
 *    ```ts
 *    import { getEnhancedPrisma } from '@/lib/db';
 *    const db = getEnhancedPrisma(session.user);
 *    const myShipments = await db.shipment.findMany(); // Filtré automatiquement
 *    ```
 *
 * 3. Avec session Better Auth :
 *    ```ts
 *    import { auth } from '@/lib/auth/config';
 *    import { getEnhancedPrismaFromSession } from '@/lib/db';
 *
 *    const session = await auth();
 *    const db = getEnhancedPrismaFromSession(session);
 *    const data = await db.shipment.findMany();
 *    ```
 */
