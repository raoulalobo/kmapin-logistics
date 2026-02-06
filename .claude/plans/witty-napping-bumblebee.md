# Plan : Gestion Multi-Colis pour les Devis et Expeditions

## Probleme

Un devis ne peut contenir qu'**un seul jeu** de poids/dimensions (`weight`, `length`, `width`, `height`, `cargoType`). En realite, un envoi contient souvent **plusieurs colis heterogenes** (ex: 1 tablette fragile + 3 ordinateurs). Le calcul du poids volumetrique est individuel par colis, donc le prix doit etre calcule **par colis puis somme**.

## Decisions confirmees

- Type de marchandise **par colis** (chaque colis a son propre cargoType)
- **Quote + Shipment** : les deux modeles gerent les colis detailles
- Champ **quantite** par ligne (ex: "3 cartons identiques de 15kg")
- Les champs plats `weight`/`cargoType` sur Quote deviennent des **agregats calcules** automatiquement, conserves pour retrocompatibilite (listes, filtres, tri)

---

## Phase 1 : Modele de donnees (`schema.zmodel`) — FAIT

### 1.1 Nouveau modele `QuotePackage` — FAIT

```zmodel
model QuotePackage {
  id          String    @id @default(cuid())
  quoteId     String
  quote       Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  description String?           // Ex: "Tablette Samsung", "Cartons vetements"
  quantity    Int       @default(1)  // Nombre de colis identiques
  cargoType   CargoType         // Type specifique a ce colis
  weight      Float             // Poids unitaire en kg
  length      Float?            // Longueur en cm
  width       Float?            // Largeur en cm
  height      Float?            // Hauteur en cm
  unitPrice   Float?            // Prix unitaire calcule (snapshot)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Access policies — heritees du Quote parent
  @@allow('create', true)
  @@allow('all', auth().role == ADMIN)
  @@allow('create', auth().role == OPERATIONS_MANAGER)
  @@allow('read,update', auth().role == OPERATIONS_MANAGER && (quote.status != DRAFT || quote.createdById == auth().id))
  @@allow('read', auth().role == FINANCE_MANAGER && quote.status != DRAFT)
  @@allow('read,create,update,delete', quote.clientId != null && auth().clientId == quote.clientId && auth().role == CLIENT)
  @@allow('read,update,delete', quote.userId != null && auth().id == quote.userId)
  @@deny('all', true)
  @@index([quoteId])
}
```

### 1.2 Nouveau modele `ShipmentPackage` — FAIT

```zmodel
model ShipmentPackage {
  id          String    @id @default(cuid())
  shipmentId  String
  shipment    Shipment  @relation(fields: [shipmentId], references: [id], onDelete: Cascade)

  description String?
  quantity    Int       @default(1)
  cargoType   CargoType
  weight      Float
  length      Float?
  width       Float?
  height      Float?
  unitPrice   Float?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@allow('all', auth().role == ADMIN)
  @@allow('create,read,update', auth().role == OPERATIONS_MANAGER)
  @@allow('read', auth().role == FINANCE_MANAGER)
  @@allow('read', shipment.clientId != null && auth().clientId == shipment.clientId && auth().role == CLIENT)
  @@deny('all', true)
  @@index([shipmentId])
}
```

### 1.3 Relations inverses — FAIT

- Dans `Quote` : `packages QuotePackage[]`
- Dans `Shipment` : `packages ShipmentPackage[]`

### 1.4 Commandes — FAIT

```bash
npm run db:generate && npm run db:push
```

---

## Phase 2 : Schema Zod (`src/modules/quotes/schemas/quote.schema.ts`) — FAIT

### 2.1 Nouveau `packageSchema` — FAIT
### 2.2 Modifier `quoteSchema` — FAIT
### 2.3 Modifier `quoteValidateTreatmentSchema` — FAIT

- `packageCount` change de `.default(1)` a `.optional()` (calcule automatiquement cote serveur)

---

## Phase 3 : Calcul de prix (`src/modules/quotes/lib/pricing-calculator-dynamic.ts`) — FAIT

### 3.1 Nouvelle fonction `calculerPrixMultiPackages()` — FAIT

---

## Phase 4 : Server Actions (`src/modules/quotes/actions/quote.actions.ts`) — FAIT

### 4.1 `createQuoteAction()` — FAIT

- Extraction packages depuis FormData (JSON serialise)
- Validation avec `packagesArraySchema`
- Appel `calculerPrixMultiPackages()` pour le prix total
- Creation avec `packages: { create: [...] }` (Prisma nested create)
- Calcul des agregats : `weight` = somme(weight x quantity), `cargoType` = type dominant ou GENERAL

### 4.2 `updateQuoteAction()` — FAIT

- Pattern Delete+Recreate dans `$transaction` (deleteMany + createMany)
- Recalcul prix total et agregats
- Ajout `'packages'` dans changedFields pour les logs

### 4.3 `getQuoteAction()` — FAIT

- `packages: { orderBy: { createdAt: 'asc' } }` dans le `include`

### 4.4 `validateQuoteTreatmentAction()` — FAIT

- Chargement `quote.packages` dans findUnique
- Calcul auto `packageCount` via `packages.reduce(sum, pkg.quantity)`
- Copie `QuotePackage` vers `ShipmentPackage` via `tx.shipmentPackage.createMany()`
- Fallback a `1` pour anciens devis sans packages

### 4.5 `createGuestQuoteAction()` — FAIT

- Creation d'un `QuotePackage` unique a partir des champs plats

---

## Phase 5 : Composant formulaire dynamique — FAIT

### 5.1 `src/components/quotes/package-field-array.tsx` — FAIT

- Composant `useFieldArray` avec description, quantite, cargoType, poids, dimensions
- Boutons Ajouter/Supprimer par ligne
- Ligne de total en bas

### 5.2 Formulaire de creation (`quotes/new/page.tsx`) — FAIT

- Remplacement section poids/dimensions/cargoType par `<PackageFieldArray />`
- Serialisation JSON packages dans FormData
- Calcul de prix iteratif sur les packages

### 5.3 Formulaire d'edition (`quotes/[id]/edit/page.tsx`) — FAIT

- Pre-remplissage depuis `quoteData.packages` avec fallback champs plats
- Meme logique de serialisation et calcul

---

## Phase 6 : Pages d'affichage — FAIT

### 6.1 Page detail dashboard devis (`dashboard/quotes/[id]/page.tsx`) — FAIT

- Tableau des colis : #, Description, Qte, Type, Poids unit., Dimensions, Poids total
- Pied de tableau avec totaux
- Fallback champs plats si `packages` vide

### 6.2 Page detail client devis (`quotes/[id]/page.tsx`) — FAIT

- Meme tableau adapte au layout client

### 6.3 Page liste devis (`dashboard/quotes/page.tsx`) — FAIT

- Affichage "X colis — Y kg" via `_count: { select: { packages: true } }`

### 6.4 Page detail expedition (`dashboard/shipments/[id]/page.tsx`) — FAIT

- Ajout `packages` dans l'`include` de `getShipmentAction()`
- Tableau detaille des `ShipmentPackage` : #, Description, Qte, Type, Poids unit., Dimensions, Poids total
- Resume global (poids total, nombre de colis, volume, valeur, priorite)
- Fallback pour anciennes expeditions sans packages

### 6.5 Modal de validation agent (`quote-agent-actions.tsx`) — FAIT

- Suppression du champ manuel "Nombre de colis" (packageCount)
- Suppression de l'etat `packageCount` et de l'import `Input`
- packageCount calcule automatiquement cote serveur

---

## Phase 7 : PDF et autres — FAIT

### 7.1 Generation PDF devis (`src/lib/pdf/quote-pdf.ts`) — FAIT

- Ajout `PackagePDFData` interface + `packages` optionnel dans `QuotePDFData`
- Import `autoTable` pour le tableau multi-colis
- Si packages > 1 : tableau detaille (colonnes : #, Description, Qte, Type, Poids unit., Dimensions, Poids total) avec pied de totaux
- Sinon : affichage simple (retrocompatibilite)

### 7.2 Generation PDF facture (`src/lib/pdf/invoice-pdf.ts`) — FAIT

- Import `PackagePDFData` depuis quote-pdf
- Ajout `packages` optionnel dans `QuoteInvoicePDFData`
- Si multi-colis : une ligne par type de colis avec prix unitaire et montant dans le tableau des prestations
- Sinon : ligne unique globale (retrocompatibilite)

### 7.3 Route API PDF (`src/app/api/pdf/[type]/[id]/route.ts`) — FAIT

- `packages: { orderBy: { createdAt: 'asc' } }` dans les includes des 3 fonctions (quote, quote-invoice, shipment-invoice)
- Mapping des packages en `PackagePDFData[]` passe aux fonctions de generation

### 7.4 Prospect actions (`src/modules/prospects/actions/prospect.actions.ts`)

- **Analyse** : Non bloquant, le fallback gere deja les devis sans packages
- Sera couvert par la Phase 8 (migration) plutot qu'ici

---

## Phase 7bis : Logs et Historiques — FAIT

> Adaptation du systeme d'audit trail pour refleter la structure multi-colis

### 7bis.1 QuoteHistoryTimeline — Traduction champ `packages` — FAIT

- `packages: 'Colis'` ajoute dans `fieldLabels`

### 7bis.2 Enrichir metadata `CREATED` pour les devis — FAIT

- `logQuoteCreated()` accepte `packageCount` et `packagesSummary` optionnels
- `createQuoteAction()` calcule et passe ces valeurs

### 7bis.3 Enrichir metadata `TREATMENT_VALIDATED` — FAIT

- `logQuoteTreatmentValidated()` accepte `packageCount` optionnel
- `validateQuoteTreatmentAction()` passe `calculatedPackageCount`

### 7bis.4 Enrichir metadata `CREATED` pour les expeditions — FAIT

- `logShipmentCreated()` accepte `packageCount` dans metadata
- `validateQuoteTreatmentAction()` passe `calculatedPackageCount`

### 7bis.5 QuoteHistoryTimeline — Affichage metadata enrichies — FAIT

- Case CREATED ajoute dans `renderMetadata()` : source + packageCount + packagesSummary
- Case TREATMENT_VALIDATED enrichi : packageCount affiche

### 7bis.6 ShipmentHistoryTimeline — Affichage metadata enrichies — FAIT

- Case CREATED enrichi : packageCount affiche ("X colis transferes depuis le devis")

---

## Phase 8 : Migration des donnees existantes — A FAIRE

Script de migration a executer apres le db:push :
1. Pour chaque Quote existant sans packages : creer un `QuotePackage` unique avec les valeurs actuelles
2. Pour chaque Shipment existant : creer un `ShipmentPackage` unique
3. Les champs plats restent inchanges (retrocompatibilite)

---

## Fichiers a modifier (par ordre)

| # | Fichier | Type de changement | Statut |
|---|---------|-------------------|--------|
| 1 | `schema.zmodel` | Ajouter QuotePackage, ShipmentPackage + relations | FAIT |
| 2 | `src/modules/quotes/schemas/quote.schema.ts` | packageSchema + modifier quoteSchema + validateTreatment | FAIT |
| 3 | `src/modules/quotes/lib/pricing-calculator-dynamic.ts` | calculerPrixMultiPackages() | FAIT |
| 4 | `src/modules/quotes/actions/quote.actions.ts` | create, update, get, validate, guest | FAIT |
| 5 | `src/components/quotes/package-field-array.tsx` | NOUVEAU composant useFieldArray | FAIT |
| 6 | `src/app/(dashboard)/dashboard/quotes/new/page.tsx` | Formulaire creation | FAIT |
| 7 | `src/app/(dashboard)/dashboard/quotes/[id]/edit/page.tsx` | Formulaire edition | FAIT |
| 8 | `src/app/(dashboard)/dashboard/quotes/[id]/page.tsx` | Affichage detail dashboard | FAIT |
| 9 | `src/app/(dashboard)/quotes/[id]/page.tsx` | Affichage detail client | FAIT |
| 10 | `src/app/(dashboard)/dashboard/quotes/page.tsx` | Liste devis (resume colis) | FAIT |
| 11 | `src/components/quotes/quote-agent-actions.tsx` | Retrait packageCount manuel du modal | FAIT |
| 12 | `src/modules/shipments/actions/shipment.actions.ts` | Ajout packages dans getShipmentAction | FAIT |
| 13 | `src/app/(dashboard)/dashboard/shipments/[id]/page.tsx` | Tableau colis dans detail expedition | FAIT |
| 14 | `src/components/quotes/quote-history-timeline.tsx` | Traduction `packages` + case CREATED + TREATMENT_VALIDATED enrichis | FAIT |
| 15 | `src/modules/quotes/lib/quote-log-helper.ts` | Enrichir metadata CREATED + TREATMENT_VALIDATED | FAIT |
| 16 | `src/modules/shipments/lib/shipment-log-helper.ts` | Enrichir metadata CREATED | FAIT |
| 17 | `src/components/shipments/shipment-history-timeline.tsx` | Afficher packageCount dans metadata CREATED | FAIT |
| 18 | `src/lib/pdf/quote-pdf.ts` | PDF devis multi-colis avec tableau detaille | FAIT |
| 19 | `src/lib/pdf/invoice-pdf.ts` | PDF facture multi-colis avec lignes detaillees | FAIT |
| 20 | `src/app/api/pdf/[type]/[id]/route.ts` | Charger packages dans 3 routes PDF | FAIT |
| 21 | Script de migration | Creer QuotePackage/ShipmentPackage pour donnees existantes | A FAIRE |

## Approche incrementale — test utilisateur a chaque etape

> **IMPORTANT** : Chaque etape est implementee, testee par l'utilisateur, puis validee avant de passer a la suivante.

### Etape 1 → Modele de donnees — FAIT
### Etape 2 → Schemas Zod + Calcul de prix — FAIT
### Etape 3 → Server Actions (create + get + guest) — FAIT
### Etape 4 → Formulaire creation avec multi-colis — FAIT
### Etape 5 → Formulaire edition + updateQuoteAction — FAIT
### Etape 6 → Pages d'affichage (devis + expeditions) — FAIT

### Etape 7 → Logs/Historiques + PDF + Prospect — FAIT
- Phase 7bis (logs/historiques) + Phase 7 (PDF) implementes
- **Sous-etapes completes** :
  1. Traduction `packages: 'Colis'` dans QuoteHistoryTimeline fieldLabels
  2. Enrichissement metadata logQuoteCreated (packageCount + packagesSummary)
  3. Enrichissement metadata logQuoteTreatmentValidated + logShipmentCreated (packageCount)
  4. Affichage packageCount dans QuoteHistoryTimeline (CREATED + TREATMENT_VALIDATED)
  5. Affichage packageCount dans ShipmentHistoryTimeline (CREATED)
  6. PDF devis multi-colis avec tableau detaille (autoTable) si packages > 1
  7. PDF facture multi-colis avec lignes detaillees par colis si packages > 1
  8. Route API PDF : chargement packages dans 3 fonctions (quote, quote-invoice, shipment-invoice)
- **Vous testez** : Creer un devis multi-colis → verifier timeline, valider → verifier PDF correct

### Etape 8 → Migration donnees existantes — A FAIRE
- Implementer : Phase 8 (script de migration)
- **Vous testez** : Verifier que les anciens devis ont un QuotePackage unique cree
