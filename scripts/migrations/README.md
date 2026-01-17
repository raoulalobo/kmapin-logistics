# Guide de Migration : Company → Client (Modèle Unifié)

## 📋 Vue d'ensemble

Cette migration transforme le modèle **Company** en modèle **Client** unifié supportant à la fois :
- **Entreprises (B2B)** : type = `COMPANY`
- **Particuliers (B2C)** : type = `INDIVIDUAL`

## ⚠️ Pré-requis CRITIQUES

### 1. Sauvegarde de la base de données

```bash
# PostgreSQL dump
pg_dump -U username -d database_name -F c -f backup_before_client_migration.dump

# OU avec connexion string
pg_dump "$DATABASE_URL" -F c -f backup_before_client_migration.dump
```

### 2. Environnement de test

**NE JAMAIS exécuter cette migration directement en production !**

1. Créer une base de test avec copie des données de production
2. Tester la migration complète sur la base de test
3. Vérifier que l'application fonctionne correctement
4. Planifier une fenêtre de maintenance pour la production

### 3. Downtime requis

Cette migration nécessite un **arrêt complet de l'application** pendant 5-10 minutes :
- Modifications de schéma incompatibles avec l'ancien code
- Renommage de colonnes et tables
- Contraintes de clé étrangère

## 🔍 Vérifications pré-migration

### Vérifier les shipments orphelins

Certains shipments peuvent avoir un `userId` mais pas de `companyId`. Il faut créer des Clients INDIVIDUAL pour ces utilisateurs avant la migration.

```sql
-- Identifier les shipments orphelins
SELECT
  s.id,
  s."userId",
  s."companyId",
  u.email,
  u.name
FROM "Shipment" s
LEFT JOIN "user" u ON s."userId" = u.id
WHERE s."userId" IS NOT NULL AND s."companyId" IS NULL;

-- Si des résultats : créer des Clients INDIVIDUAL pour ces users
-- Voir script de préparation ci-dessous
```

### Script de préparation (si nécessaire)

```sql
-- Créer des Clients INDIVIDUAL pour les users sans company
INSERT INTO "Company" (
  id,
  name,
  email,
  phone,
  address,
  city,
  "postalCode",
  country,
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  COALESCE(u.name, 'Client ' || u.email),
  u.email,
  NULL,
  '',
  '',
  NULL,
  'FR',
  u."createdAt",
  NOW()
FROM "user" u
WHERE u."companyId" IS NULL
  AND u.role = 'CLIENT'
  AND EXISTS (
    SELECT 1 FROM "Shipment" s
    WHERE s."userId" = u.id AND s."companyId" IS NULL
  );

-- Ensuite, lier ces shipments au nouveau Client
UPDATE "Shipment" s
SET "companyId" = c.id
FROM "user" u
JOIN "Company" c ON c.email = u.email
WHERE s."userId" = u.id
  AND s."companyId" IS NULL;
```

## 🚀 Exécution de la migration

### Étape 1 : Arrêter l'application

```bash
# Vercel : mettre en mode maintenance
# Ou simplement arrêter le serveur local

# Empêcher les nouvelles connexions
# (optionnel, selon votre setup)
```

### Étape 2 : Exécuter la migration

```bash
# Avec psql
psql "$DATABASE_URL" -f scripts/migrations/001-company-to-client-unified-model.sql

# OU avec connexion interactive
psql -h hostname -U username -d database_name -f scripts/migrations/001-company-to-client-unified-model.sql
```

### Étape 3 : Vérifier la migration

```sql
-- Vérifier que la table Client existe
SELECT COUNT(*) FROM "Client";

-- Vérifier que tous les clients ont type = COMPANY
SELECT type, COUNT(*) FROM "Client" GROUP BY type;

-- Vérifier que tous les Shipments ont un clientId
SELECT COUNT(*) FROM "Shipment" WHERE "clientId" IS NULL;

-- Vérifier que tous les Invoices ont un clientId
SELECT COUNT(*) FROM "Invoice" WHERE "clientId" IS NULL;

-- Vérifier que les FK fonctionnent
SELECT
  c.name,
  COUNT(s.id) as shipment_count
FROM "Client" c
LEFT JOIN "Shipment" s ON s."clientId" = c.id
GROUP BY c.id, c.name
ORDER BY shipment_count DESC
LIMIT 10;
```

### Étape 4 : Mettre à jour le code

```bash
# Générer les nouveaux clients Prisma et Zenstack
npm run db:generate

# Vérifier que la compilation passe
npm run build
```

### Étape 5 : Redémarrer l'application

```bash
# Vercel : désactiver le mode maintenance
# Ou redémarrer le serveur local

npm run start
```

## 🧪 Tests post-migration

### Tests fonctionnels

1. **Connexion utilisateur**
   - Se connecter avec un compte CLIENT
   - Vérifier que le dashboard s'affiche correctement

2. **Création de devis**
   - Créer un nouveau devis
   - Vérifier que le client est bien sélectionnable
   - Vérifier que le devis est bien lié au clientId

3. **Création d'expédition**
   - Créer une nouvelle expédition
   - Vérifier que le client est bien sélectionnable
   - Vérifier que l'expédition est bien liée au clientId

4. **Historique**
   - Vérifier que les anciennes expéditions s'affichent correctement
   - Vérifier que les anciennes factures s'affichent correctement

5. **Permissions RBAC**
   - Vérifier qu'un CLIENT ne voit que ses propres données
   - Vérifier qu'un ADMIN voit toutes les données

### Tests de régression

```bash
# Si vous avez des tests automatisés
npm run test

# Tests E2E (si configurés)
npm run test:e2e
```

## 🔄 Rollback (en cas d'erreur critique)

**ATTENTION** : Le rollback est complexe et peut entraîner une perte de données si des opérations ont été effectuées après la migration.

```sql
BEGIN;

-- Renommer Client → Company
ALTER TABLE "Client" RENAME TO "Company";

-- Supprimer les colonnes ajoutées
ALTER TABLE "Company" DROP COLUMN "type";
ALTER TABLE "Company" DROP COLUMN "firstName";
ALTER TABLE "Company" DROP COLUMN "lastName";
DROP TYPE "ClientType";

-- Renommer clientId → companyId dans toutes les tables
-- (répéter pour chaque table)
ALTER TABLE "user" RENAME COLUMN "clientId" TO "companyId";
-- ... etc

COMMIT;
```

**Mieux** : Restaurer depuis la sauvegarde

```bash
# Restaurer le dump
pg_restore -U username -d database_name -c backup_before_client_migration.dump
```

## 📝 Checklist post-migration

- [ ] Sauvegarde de la base créée
- [ ] Migration testée sur environnement de test
- [ ] Script de migration exécuté avec succès
- [ ] Vérifications SQL passées (0 NULL dans clientId pour Shipment/Invoice)
- [ ] Code généré (`npm run db:generate`)
- [ ] Application compilée (`npm run build`)
- [ ] Tests fonctionnels passés
- [ ] Application redémarrée en production
- [ ] Monitoring des erreurs activé (vérifier logs pendant 24h)
- [ ] Sauvegarde post-migration créée

## 🆘 Support

En cas de problème pendant la migration :

1. **NE PAS PANIQUER** - La sauvegarde est là pour ça
2. Noter l'erreur exacte
3. Vérifier les logs PostgreSQL
4. Restaurer depuis la sauvegarde si nécessaire
5. Analyser le problème avant de retenter

## 📚 Ressources

- Documentation Prisma : https://www.prisma.io/docs/guides/migrate
- Documentation Zenstack : https://zenstack.dev/docs/guides/migration
- PostgreSQL ALTER TABLE : https://www.postgresql.org/docs/current/sql-altertable.html
