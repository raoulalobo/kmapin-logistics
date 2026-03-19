# Plan : Corriger les incohérences tarification maritime et alignement priorités

## Contexte

L'analyse comparative entre le PDF de spécifications fonctionnelles (algorithme de cotation fret) et l'implémentation actuelle révèle 7 incohérences. Les plus critiques concernent :
- Le désalignement entre l'enum `Priority` en DB (3 niveaux) et le `PriorityType` du calculateur (4 niveaux)
- L'affichage UI qui ne distingue pas le mode maritime (Unité Payante) des autres modes
- L'absence d'indicateurs visuels (facturé au volume, unité du tarif)

## Objectif

Aligner l'implémentation sur les spécifications PDF : corriger l'enum Priority en DB, propager les données maritime (UP, factureSurVolume) jusqu'au frontend, et adapter l'affichage UI pour les 3 modes de transport.

## Plans en relation

| Plan | Relation | Description |
|------|----------|-------------|
| `witty-napping-bumblebee.md` | Dépendance | Architecture multi-colis (phases 1-7 complétées) |

## Fichiers concernés

- `schema.zmodel` — Ajouter `NORMAL` à l'enum `Priority`
- `src/modules/quotes/lib/pricing-calculator-dynamic.ts` — Validation dimensions ≤ 0
- `src/modules/quotes/schemas/quote.schema.ts` — Enrichir `QuoteEstimateMultiPackageResult` avec champs maritime
- `src/modules/quotes/actions/calculate-quote-estimate-v2.ts` — Propager les nouveaux champs vers le frontend
- `src/components/quote-calculator/quote-calculator.tsx` — Affichage UP, unité tarif, badge "facturé au volume"
- `src/app/(dashboard)/dashboard/quotes/[id]/page.tsx` — Affichage UP et unité contextuelle

## Étapes

- [x] **Étape 1 : Ajouter `NORMAL` à l'enum `Priority` dans schema.zmodel**
  Ajouter la valeur `NORMAL` entre `STANDARD` et `EXPRESS` dans l'enum `Priority`.
  Exécuter `npm run db:generate` puis `npm run db:push` pour synchroniser.
  Impact : aligne l'enum DB sur les 4 niveaux du PDF (Standard 0%, Normal +10%, Express +50%, Urgent +30%).
  > **Commit** : Pas de commit
  > **Fichiers** : `schema.zmodel`

- [x] **Étape 2 : Enrichir le type `QuoteEstimateMultiPackageResult` avec les données maritime**
  Ajouter au type dans `quote.schema.ts` :
  - `uniteMasseTaxable: 'kg' | 'UP' | 'tonne'`
  - `factureSurVolume: boolean`
  - `tarifParUnite: number`
  - `unitesTarif: string` (ex: "€/kg", "€/UP", "€/m³")
  Ajouter aussi dans chaque ligne (`lines`) :
  - `factureSurVolume: boolean`
  - `uniteMasseTaxable: string`

- [x] **Étape 3 : Propager les nouveaux champs dans la Server Action**
  Modifier `calculate-quote-estimate-v2.ts` pour mapper les champs
  `uniteMasseTaxable`, `factureSurVolume`, `tarifParUnite` depuis
  `MultiPackageResult` / `PackageLineResult.detail` vers le résultat retourné au frontend.

- [x] **Étape 4 : Adapter l'UI du calculateur public (modal résultat)**
  Dans `quote-calculator.tsx` :
  - Afficher l'unité contextuelle du poids : "kg" pour AIR/ROAD/RAIL, "UP" pour SEA
  - Afficher le tarif avec son unité : "7,25 €/kg" ou "465,00 €/UP"
  - Ajouter un badge/indicateur quand `factureSurVolume = true` ("Facturé au volume")
  - Ajouter une note explicative en maritime : "UP = Unité Payante = max(tonnes, m³)"

- [x] **Étape 5 : Adapter l'UI de la page détail devis (dashboard)**
  Dans `quotes/[id]/page.tsx` :
  - Adapter l'en-tête "Détails de la marchandise" pour afficher l'unité contextuelle
  - Afficher le poids total en "UP" si maritime
  - Ajouter une note explicative maritime si `transportMode` inclut `SEA`

- [x] **Étape 6 : Ajouter la validation bloquante sur dimensions ≤ 0**
  Dans `pricing-calculator-dynamic.ts`, si des dimensions sont fournies
  (au moins une > 0) mais qu'une autre est ≤ 0, lever une erreur explicite
  au lieu du fallback silencieux. Si aucune dimension n'est fournie (toutes à 0),
  conserver le comportement actuel (calcul au poids réel uniquement).

- [ ] **Étape 7 : Test et vérification**
  Tester manuellement les scénarios :
  - Devis aérien classique (vérifier que rien n'a régressé)
  - Devis maritime poids > volume (affiche UP, tarif en €/UP)
  - Devis maritime volume > poids (badge "facturé au volume")
  - Dimensions partielles (ex: longueur=50, largeur=0) → erreur bloquante

## Vérification

- [ ] L'enum `Priority` en DB contient bien 4 valeurs : STANDARD, NORMAL, EXPRESS, URGENT
- [ ] `npm run db:generate` et `npm run db:push` réussissent sans erreur
- [ ] Le modal résultat du calculateur affiche "UP" et "€/UP" pour le maritime
- [ ] Le badge "Facturé au volume" apparaît quand le poids volumétrique l'emporte
- [ ] La page détail devis dashboard adapte l'unité selon le mode de transport
- [ ] Les dimensions partielles (une seule à 0) lèvent une erreur explicite
- [ ] Aucune régression sur les devis aérien et routier existants
