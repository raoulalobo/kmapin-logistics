# Plan : Simplifier le fallback tarifaire — tarifs directs par mode + suppression champs obsolètes

## Contexte
Suppression de 3 champs obsolètes de `PricingConfig` (`baseRatePerKg`, `defaultRatePerKg`, `defaultRatePerM3`) et simplification du fallback : `transportMultipliers[mode]` devient le tarif direct.

## Objectif
- Bug AIR=900€ supprimé : 5kg × 15 = 75€
- Interface admin nettoyée (onglet "Taux de Base" supprimé)
- Tests unitaires mis à jour

## Plans en relation
- `.claude/plans/plan-tests-poids-volumetrique.md`

## Fichiers impactés
- `schema.zmodel`
- `src/modules/pricing-config/lib/get-pricing-config.ts`
- `src/modules/pricing-config/schemas/pricing-config.schema.ts`
- `src/modules/quotes/lib/pricing-calculator-dynamic.ts`
- `src/app/(dashboard)/dashboard/settings/pricing/page.tsx`
- `src/modules/quotes/lib/__tests__/pricing-calculator-dynamic.test.ts`

## Étapes

- [x] **Étape 1** — `schema.zmodel` : supprimer les 3 champs obsolètes + db:generate + db:push
- [x] **Étape 2** — `get-pricing-config.ts` : nettoyer DEFAULT_PRICING_CONFIG et PricingConfigData
- [x] **Étape 3** — `pricing-config.schema.ts` : nettoyer schéma Zod + max(10000) pour SEA
- [x] **Étape 4** — `pricing-calculator-dynamic.ts` : simplifier fallback (tarif direct)
- [x] **Étape 5** — `pricing/page.tsx` : supprimer onglet "Taux de Base" + renommer section Transport
- [x] **Étape 6** — Tests : mettre à jour mock DEFAULT_CONFIG + test fallback (28/28 ✓)

## Vérification
```bash
npm run db:generate && npm run db:push
npm run test -- --dir=src/modules/quotes
```
