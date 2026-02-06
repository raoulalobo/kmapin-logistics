# Plan : Afficher les prix unitaires (unitPrice) dans les tableaux de colis

## Contexte

Maintenant que `unitPrice` est correctement calculé par le moteur de pricing serveur (via `calculerPrixMultiPackages()`), les pages de détail des **devis** et **expéditions** n'affichent toujours pas ces prix. Les tableaux de colis montrent uniquement les poids et dimensions, mais pas les colonnes **Prix unit.** et **Montant**.

L'objectif est d'ajouter 2 colonnes (`Prix unit.` et `Montant`) aux 3 tableaux de colis existants, avec une ligne de total affichant le montant global.

## Prérequis vérifiés

- `unitPrice` (`Float?`) existe déjà sur `QuotePackage` et `ShipmentPackage` en DB
- `getQuoteAction()` et `getShipmentAction()` chargent `packages` sans `select` → `unitPrice` est **déjà disponible** côté client
- La devise (`currency`) est accessible via `quote.currency` / `shipment.currency` dans chaque page
- Aucune modification serveur nécessaire

---

## Modifications (3 fichiers)

### 1. Page détail Quote (dashboard)

**Fichier** : `src/app/(dashboard)/dashboard/quotes/[id]/page.tsx`
**Lignes** : 560-616 (tableau des packages)

**Changements** :
- Ajouter 2 colonnes au `<thead>` après "Poids total" :
  - `Prix unit.` (text-right)
  - `Montant` (text-right)
- Dans le `<tbody>`, ajouter 2 `<td>` par ligne :
  - `pkg.unitPrice != null ? pkg.unitPrice.toFixed(2) + ' ' + quote.currency : '—'`
  - `pkg.unitPrice != null ? (pkg.unitPrice * pkg.quantity).toFixed(2) + ' ' + quote.currency : '—'`
- Dans le `<tfoot>`, ajouter une cellule "Total montant" :
  - Somme : `quote.packages.reduce((sum, p) => sum + (p.unitPrice ?? 0) * p.quantity, 0).toFixed(2) + ' ' + quote.currency`
- Ajuster le `colSpan` des cellules vides du footer pour accommoder les 2 nouvelles colonnes
- Le type inline de `pkg` (lignes 572-582) inclut déjà `unitPrice: number | null` — OK

### 2. Page détail Quote (publique/client)

**Fichier** : `src/app/(dashboard)/quotes/[id]/page.tsx`
**Lignes** : 322-379 (tableau des packages)

**Changements identiques** au point 1, avec ces différences :
- Ajouter `unitPrice: number | null` dans le type inline du `.map()` (ligne 335-343, il manque actuellement)
- Même pattern d'affichage conditionnel (`unitPrice != null`)
- Devise via `quote.currency`

### 3. Page détail Shipment

**Fichier** : `src/app/(dashboard)/dashboard/shipments/[id]/page.tsx`
**Lignes** : 360-402 (tableau des packages)

**Changements identiques**, avec :
- Devise via `shipment.currency`
- Pas de type inline à modifier (TypeScript infère depuis Prisma)

---

## Pattern d'affichage (commun aux 3 fichiers)

```tsx
{/* En-tête — ajouter après "Poids total" */}
<th className="... text-right">Prix unit.</th>
<th className="... text-right">Montant</th>

{/* Corps — ajouter après le <td> "Poids total" */}
<td className="... text-right">
  {pkg.unitPrice != null
    ? `${pkg.unitPrice.toFixed(2)} ${currency}`
    : '—'}
</td>
<td className="... text-right font-medium">
  {pkg.unitPrice != null
    ? `${(pkg.unitPrice * pkg.quantity).toFixed(2)} ${currency}`
    : '—'}
</td>

{/* Pied de tableau — ajouter la somme des montants */}
<td className="... text-right">
  {packages.reduce((s, p) => s + (p.unitPrice ?? 0) * p.quantity, 0).toFixed(2)} {currency}
</td>
```

**Note** : Si `unitPrice` est `null` (anciens devis sans calcul), on affiche `—` au lieu de `0.00`.

---

## Fichiers modifiés (résumé)

| # | Fichier | Changement |
|---|---------|-----------|
| 1 | `src/app/(dashboard)/dashboard/quotes/[id]/page.tsx` | +2 colonnes Prix unit. / Montant + total footer |
| 2 | `src/app/(dashboard)/quotes/[id]/page.tsx` | Idem + ajouter `unitPrice` au type inline |
| 3 | `src/app/(dashboard)/dashboard/shipments/[id]/page.tsx` | +2 colonnes Prix unit. / Montant + total footer |

## Aucune modification serveur

- `getQuoteAction()` : charge déjà `packages` avec tous les champs (dont `unitPrice`)
- `getShipmentAction()` : idem
- Pas de nouvelle requête Prisma nécessaire

---

## Vérification

1. Ouvrir un devis multi-colis (avec FRAGILE + GENERAL) → vérifier que les prix unitaires sont différenciés dans le tableau
2. Vérifier qu'un ancien devis (sans `unitPrice`) affiche `—` dans les colonnes prix
3. Vérifier que le total montant en footer correspond à `estimatedCost` (ou proche, hors surcharge priorité)
4. Ouvrir la page publique du même devis → vérifier les mêmes colonnes
5. Ouvrir une expédition créée depuis un devis → vérifier que les prix unitaires sont copiés et affichés
