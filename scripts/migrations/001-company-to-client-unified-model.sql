-- =============================================
-- MIGRATION : Company → Client (Modèle Unifié)
-- =============================================
--
-- Cette migration transforme le modèle Company en modèle Client unifié
-- supportant à la fois les entreprises (B2B) et les particuliers (B2C).
--
-- IMPORTANT :
-- - Faire une sauvegarde complète de la base avant d'exécuter ce script
-- - Tester d'abord sur un environnement de développement
-- - Exécuter pendant une fenêtre de maintenance (downtime requis)
--
-- Durée estimée : 2-5 minutes selon la taille des données
--
-- =============================================

BEGIN;

-- =============================================
-- ÉTAPE 1 : Renommer la table Company → Client
-- =============================================

ALTER TABLE "Company" RENAME TO "Client";

-- =============================================
-- ÉTAPE 2 : Ajouter la colonne type (discriminant)
-- =============================================

-- Créer l'enum ClientType
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- Ajouter la colonne type avec valeur par défaut COMPANY pour les données existantes
ALTER TABLE "Client"
  ADD COLUMN "type" "ClientType" NOT NULL DEFAULT 'COMPANY';

-- =============================================
-- ÉTAPE 3 : Ajouter colonnes pour particuliers
-- =============================================

-- Colonnes pour les particuliers (INDIVIDUAL)
ALTER TABLE "Client"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT;

-- Les colonnes legalName, taxId, website deviennent nullable pour les particuliers
-- (déjà nullable dans le schéma actuel, donc pas de modification nécessaire)

-- =============================================
-- ÉTAPE 4 : Renommer companyId → clientId dans User
-- =============================================

ALTER TABLE "user"
  RENAME COLUMN "companyId" TO "clientId";

-- Mettre à jour la contrainte de clé étrangère
ALTER TABLE "user"
  DROP CONSTRAINT IF EXISTS "user_companyId_fkey",
  ADD CONSTRAINT "user_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Renommer l'index
DROP INDEX IF EXISTS "user_companyId_idx";
CREATE INDEX "user_clientId_idx" ON "user"("clientId");

-- =============================================
-- ÉTAPE 5 : Renommer companyId → clientId dans Shipment
-- =============================================

-- Supprimer l'ancienne colonne userId (logique hybride obsolète)
-- ATTENTION : Vérifier s'il y a des shipments avec userId mais sans companyId
-- Si oui, il faut d'abord créer des Clients INDIVIDUAL pour ces users

-- Identifier les shipments orphelins (userId != null && companyId == null)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "Shipment"
  WHERE "userId" IS NOT NULL AND "companyId" IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'ATTENTION: % shipments ont un userId mais pas de companyId. Migration impossible sans résolution manuelle.', orphan_count;
  END IF;
END $$;

-- Renommer companyId → clientId
ALTER TABLE "Shipment"
  RENAME COLUMN "companyId" TO "clientId";

-- Rendre clientId NOT NULL (tous les shipments doivent avoir un client)
ALTER TABLE "Shipment"
  ALTER COLUMN "clientId" SET NOT NULL;

-- Supprimer la colonne userId (logique hybride obsolète)
ALTER TABLE "Shipment"
  DROP COLUMN "userId";

-- Mettre à jour la contrainte de clé étrangère
ALTER TABLE "Shipment"
  DROP CONSTRAINT IF EXISTS "Shipment_companyId_fkey",
  ADD CONSTRAINT "Shipment_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Renommer l'index
DROP INDEX IF EXISTS "Shipment_companyId_idx";
CREATE INDEX "Shipment_clientId_idx" ON "Shipment"("clientId");

-- =============================================
-- ÉTAPE 6 : Renommer companyId → clientId dans Invoice
-- =============================================

-- Même logique que Shipment
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "Invoice"
  WHERE "userId" IS NOT NULL AND "companyId" IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'ATTENTION: % invoices ont un userId mais pas de companyId. Migration impossible sans résolution manuelle.', orphan_count;
  END IF;
END $$;

ALTER TABLE "Invoice"
  RENAME COLUMN "companyId" TO "clientId";

ALTER TABLE "Invoice"
  ALTER COLUMN "clientId" SET NOT NULL;

ALTER TABLE "Invoice"
  DROP COLUMN "userId";

ALTER TABLE "Invoice"
  DROP CONSTRAINT IF EXISTS "Invoice_companyId_fkey",
  ADD CONSTRAINT "Invoice_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Invoice_companyId_idx";
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- =============================================
-- ÉTAPE 7 : Renommer companyId → clientId dans Quote
-- =============================================

-- Quote peut avoir clientId NULL (devis guest avec trackingToken)
ALTER TABLE "Quote"
  RENAME COLUMN "companyId" TO "clientId";

ALTER TABLE "Quote"
  DROP CONSTRAINT IF EXISTS "Quote_companyId_fkey",
  ADD CONSTRAINT "Quote_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Quote_companyId_idx";
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- =============================================
-- ÉTAPE 8 : Renommer companyId → clientId dans PickupRequest
-- =============================================

-- PickupRequest peut avoir clientId NULL (guest avec trackingToken)
ALTER TABLE "pickup_request"
  RENAME COLUMN "companyId" TO "clientId";

ALTER TABLE "pickup_request"
  DROP CONSTRAINT IF EXISTS "pickup_request_companyId_fkey",
  ADD CONSTRAINT "pickup_request_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "pickup_request_companyId_idx";
CREATE INDEX "pickup_request_clientId_idx" ON "pickup_request"("clientId");

-- =============================================
-- ÉTAPE 9 : Renommer companyId → clientId dans PurchaseRequest
-- =============================================

-- PurchaseRequest peut avoir clientId NULL (guest avec trackingToken)
ALTER TABLE "purchase_request"
  RENAME COLUMN "companyId" TO "clientId";

ALTER TABLE "purchase_request"
  DROP CONSTRAINT IF EXISTS "purchase_request_companyId_fkey",
  ADD CONSTRAINT "purchase_request_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "purchase_request_companyId_idx";
CREATE INDEX "purchase_request_clientId_idx" ON "purchase_request"("clientId");

-- =============================================
-- ÉTAPE 10 : Renommer companyId → clientId dans Document
-- =============================================

ALTER TABLE "Document"
  RENAME COLUMN "companyId" TO "clientId";

ALTER TABLE "Document"
  DROP CONSTRAINT IF EXISTS "Document_companyId_fkey",
  ADD CONSTRAINT "Document_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Document_companyId_idx";
CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");

-- =============================================
-- ÉTAPE 11 : Renommer companyId → clientId dans Transporter
-- =============================================

ALTER TABLE "Transporter"
  RENAME COLUMN "companyId" TO "clientId";

ALTER TABLE "Transporter"
  DROP CONSTRAINT IF EXISTS "Transporter_companyId_fkey",
  ADD CONSTRAINT "Transporter_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Transporter_companyId_idx";
CREATE INDEX "Transporter_clientId_idx" ON "Transporter"("clientId");

-- =============================================
-- ÉTAPE 12 : Ajouter index sur la colonne type
-- =============================================

CREATE INDEX "Client_type_idx" ON "Client"("type");

-- =============================================
-- ÉTAPE 13 : Vérifications post-migration
-- =============================================

-- Vérifier que tous les Shipments ont un clientId
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM "Shipment"
  WHERE "clientId" IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'ERREUR: % shipments n''ont pas de clientId après migration!', null_count;
  END IF;
END $$;

-- Vérifier que tous les Invoices ont un clientId
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM "Invoice"
  WHERE "clientId" IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'ERREUR: % invoices n''ont pas de clientId après migration!', null_count;
  END IF;
END $$;

-- Vérifier que tous les Clients existants ont type = COMPANY
DO $$
DECLARE
  wrong_type_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO wrong_type_count
  FROM "Client"
  WHERE "type" != 'COMPANY';

  IF wrong_type_count > 0 THEN
    RAISE WARNING 'ATTENTION: % clients n''ont pas le type COMPANY (normal si vous avez déjà créé des particuliers)', wrong_type_count;
  END IF;
END $$;

-- =============================================
-- FIN DE LA MIGRATION
-- =============================================

COMMIT;

-- =============================================
-- ROLLBACK (à exécuter UNIQUEMENT en cas d'erreur)
-- =============================================

-- BEGIN;
-- ALTER TABLE "Client" RENAME TO "Company";
-- ALTER TABLE "Company" DROP COLUMN "type";
-- ALTER TABLE "Company" DROP COLUMN "firstName";
-- ALTER TABLE "Company" DROP COLUMN "lastName";
-- DROP TYPE "ClientType";
-- -- ... (inverser toutes les modifications)
-- COMMIT;
