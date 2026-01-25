# 📋 Guide d'implémentation des Skeletons

Ce document liste **tous les endroits** où implémenter des Skeletons dans Faso Fret Logistics v2 pour améliorer l'expérience utilisateur.

---

## 📊 Récapitulatif

| Zone | Priorité | Fichiers concernés | Type | Statut |
|------|----------|-------------------|------|--------|
| **Pages de listes** | ⭐⭐⭐⭐⭐ | 10 pages | `loading.tsx` | ✅ Quote (fait) |
| **Pages de détails** | ⭐⭐⭐⭐⭐ | 5 pages | `loading.tsx` | ✅ Shipment (fait) |
| **Timelines** | ⭐⭐⭐⭐ | 4 composants | `TimelineSkeleton` | ✅ Composant créé |
| **Tableaux** | ⭐⭐⭐⭐ | 6+ composants | `TableSkeleton` | ✅ Composant créé |
| **Statistiques** | ⭐⭐⭐ | Dashboard | `CardGridSkeleton` | ✅ Composant créé |
| **Formulaires** | ⭐⭐⭐ | 8+ pages | `FormSkeleton` | ✅ Composant créé |
| **Modals** | ⭐⭐ | Divers | Custom | ⏳ À faire |
| **Dropdowns** | ⭐ | Selects | Custom | ⏳ À faire |

---

## 🎯 1. Pages de listes (Server Components)

### Méthode : Créer un fichier `loading.tsx` dans le même dossier que `page.tsx`

Next.js affiche automatiquement `loading.tsx` pendant le chargement de la Server Component.

### ✅ Exemple déjà implémenté

**Fichier** : `src/app/(dashboard)/dashboard/quotes/loading.tsx`

### 📝 À implémenter

Créez les fichiers `loading.tsx` suivants :

#### 1.1. Shipments
```bash
src/app/(dashboard)/dashboard/shipments/loading.tsx
```
**Contenu** : Copier la structure de `quotes/loading.tsx` en adaptant :
- Nombre de colonnes (6 au lieu de 5)
- Labels des statistiques (En cours, Livrés, etc.)

#### 1.2. Pickups (Demandes d'enlèvement)
```bash
src/app/(dashboard)/dashboard/pickups/loading.tsx
```
**Spécificités** :
- 4 cartes statistiques (Nouveau, Planifié, Complété, Annulé)
- Tableau avec 6 colonnes
- Filtres par statut (6-7 boutons)

#### 1.3. Purchases (Achats délégués)
```bash
src/app/(dashboard)/dashboard/purchases/loading.tsx
```

#### 1.4. Clients
```bash
src/app/(dashboard)/dashboard/clients/loading.tsx
```
**Spécificités** :
- 3 cartes statistiques (Total, Actifs, Inactifs)
- Tableau avec 4 colonnes (Nom, Type, Pays, Actions)

#### 1.5. Users
```bash
src/app/(dashboard)/dashboard/users/loading.tsx
```
**Spécificités** :
- 4 cartes (Total, Admins, Agents, Clients)
- Tableau avec 5 colonnes (Nom, Email, Rôle, Statut, Actions)

#### 1.6. Countries
```bash
src/app/(dashboard)/dashboard/countries/loading.tsx
```

#### 1.7. Documents
```bash
src/app/(dashboard)/dashboard/documents/loading.tsx
```

#### 1.8. Tracking
```bash
src/app/(dashboard)/dashboard/tracking/loading.tsx
```

#### 1.9. Reports
```bash
src/app/(dashboard)/dashboard/reports/loading.tsx
```

#### 1.10. Dashboard principal
```bash
src/app/(dashboard)/dashboard/loading.tsx
```
**Spécificités** :
- 4 cartes KPI (Revenus, Expéditions, Devis, Taux conversion)
- Graphique de revenus (grand rectangle)
- Graphique d'expéditions (grand rectangle)
- Liste des activités récentes

---

## 🔍 2. Pages de détails (Server Components)

### ✅ Exemple déjà implémenté

**Fichier** : `src/app/(dashboard)/dashboard/shipments/[id]/loading.tsx`

### 📝 À implémenter

#### 2.1. Quote Details
```bash
src/app/(dashboard)/dashboard/quotes/[id]/loading.tsx
```
**Structure** :
- En-tête (bouton retour + titre + actions)
- Badge statut + paiement
- 2 cartes côte-à-côte (Origine + Destination)
- Carte Détails marchandise
- Timeline historique (utiliser `TimelineSkeleton`)
- Carte Facturation

#### 2.2. Pickup Details
```bash
src/app/(dashboard)/dashboard/pickups/[id]/loading.tsx
```

#### 2.3. Purchase Details
```bash
src/app/(dashboard)/dashboard/purchases/[id]/loading.tsx
```

#### 2.4. Client Details
```bash
src/app/(dashboard)/dashboard/clients/[id]/loading.tsx
```
**Structure** :
- Informations client
- Tableau des expéditions récentes (utiliser `TableSkeleton`)
- Statistiques (utiliser `CardGridSkeleton`)

---

## ⏱️ 3. Composants Timeline (Client Components)

### ✅ Composant créé : `TimelineSkeleton`

**Import** :
```tsx
import { TimelineSkeleton } from '@/components/skeletons';
```

### 📝 À implémenter dans les composants suivants

#### 3.1. ShipmentHistoryTimeline
**Fichier** : `src/components/shipments/shipment-history-timeline.tsx`

**Modification** :
```tsx
'use client';

import { TimelineSkeleton } from '@/components/skeletons';

export function ShipmentHistoryTimeline({ logs }: Props) {
  // Si pas de logs fournis, afficher le skeleton
  if (!logs || logs.length === 0) {
    return <TimelineSkeleton count={5} />;
  }

  return (
    // ... votre code existant
  );
}
```

#### 3.2. QuoteHistoryTimeline
**Fichier** : `src/components/quotes/quote-history-timeline.tsx`

**Même pattern que 3.1**

#### 3.3. PickupHistoryTimeline
**Fichier** : `src/components/pickups/pickup-history-timeline.tsx`

#### 3.4. PurchaseHistoryTimeline
**Fichier** : `src/components/purchases/purchase-history-timeline.tsx`

---

## 📊 4. Tableaux de données (Client Components utilisant useQuery)

### ✅ Composant créé : `TableSkeleton`

### 📝 À implémenter

#### 4.1. PickupListTable
**Fichier** : `src/components/pickups/pickup-list-table.tsx`

**Actuellement** :
```tsx
if (isLoading) return <div>Chargement...</div>; // ❌
```

**Modifier en** :
```tsx
import { TableSkeleton } from '@/components/skeletons';

if (isLoading) {
  return <TableSkeleton rows={5} columns={6} />; // ✅
}
```

#### 4.2. Autres tableaux à identifier
Recherchez dans votre codebase les composants avec :
```tsx
if (isLoading) return ...
```

---

## 📈 5. Statistiques / KPI Cards

### ✅ Composant créé : `CardGridSkeleton`

### 📝 À implémenter

#### 5.1. Dashboard principal
**Fichier** : `src/app/(dashboard)/dashboard/page.tsx`

Si vous utilisez un Client Component pour les stats :
```tsx
import { CardGridSkeleton } from '@/components/skeletons';

if (isLoading) {
  return <CardGridSkeleton count={4} columns={4} />;
}
```

#### 5.2. Graphiques (ShipmentsChart, RevenueChart)
**Fichiers** :
- `src/components/dashboard/shipments-chart.tsx`
- `src/components/dashboard/revenue-chart.tsx`

**Pattern** :
```tsx
if (isLoading) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[180px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" /> {/* Graphique */}
      </CardContent>
    </Card>
  );
}
```

---

## 📝 6. Formulaires de création/édition

### ✅ Composant créé : `FormSkeleton`

### 📝 À implémenter

Si vos pages de formulaire chargent des données avant affichage (ex: liste de clients pour un select) :

#### 6.1. Nouveau devis
**Fichier** : `src/app/(dashboard)/dashboard/quotes/new/loading.tsx`

```tsx
import { FormSkeleton } from '@/components/skeletons/form-skeleton';

export default function NewQuoteLoading() {
  return <FormSkeleton fields={12} />; // 12 champs dans le formulaire
}
```

#### 6.2. Édition devis
```bash
src/app/(dashboard)/dashboard/quotes/[id]/edit/loading.tsx
```

#### 6.3. Autres formulaires
- Nouveau client : `clients/new/loading.tsx`
- Nouvelle expédition : `shipments/new/loading.tsx`
- Nouveau pickup : `pickups/new/loading.tsx`
- Nouveau purchase : `purchases/new/loading.tsx`

---

## 🎨 7. Selects et Dropdowns chargés dynamiquement

### 📝 À implémenter

#### 7.1. ClientSelect
**Fichier** : `src/components/forms/client-select.tsx`

**Actuellement** :
```tsx
if (isLoading) return <div>Chargement...</div>;
```

**Modifier en** :
```tsx
if (isLoading) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-[100px]" /> {/* Label */}
      <Skeleton className="h-10 w-full" />     {/* Select */}
    </div>
  );
}
```

#### 7.2. CountrySelect
**Fichier** : `src/components/countries/country-select.tsx`

**Même pattern**

---

## 🪟 8. Modals et Dialogs

### 📝 À implémenter selon le besoin

#### 8.1. QuoteRequestModal
**Fichier** : `src/components/quote-request/quote-request-modal.tsx`

Si le modal charge des données au moment de l'ouverture :
```tsx
if (isLoading) {
  return (
    <DialogContent>
      <DialogHeader>
        <Skeleton className="h-6 w-[200px]" />
      </DialogHeader>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </DialogContent>
  );
}
```

#### 8.2. Autres modals
- `ContactModal`
- `CancelPickupDialog`
- `UserCreateDialog`
- Etc.

---

## 🏗️ 9. Header avec données dynamiques

**Fichier** : `src/components/layouts/header.tsx`

Le composant Header charge déjà le nombre de devis en attente. Le loading est géré via `useState` et n'affiche rien pendant le chargement initial (acceptable car c'est juste un badge).

**Optionnel** : Afficher un skeleton pour le badge pendant les 30 premières ms :
```tsx
{isLoadingPendingQuotes ? (
  <Skeleton className="h-5 w-5 rounded-full" />
) : (
  pendingQuotesCount > 0 && <span>...</span>
)}
```

---

## ✅ Checklist d'implémentation

### Priorité Haute (À faire en premier) ⭐⭐⭐⭐⭐

- [ ] **Quotes list** : `dashboard/quotes/loading.tsx` ✅ FAIT
- [ ] **Shipments list** : `dashboard/shipments/loading.tsx`
- [ ] **Shipment details** : `dashboard/shipments/[id]/loading.tsx` ✅ FAIT
- [ ] **Quote details** : `dashboard/quotes/[id]/loading.tsx`
- [ ] **Dashboard principal** : `dashboard/loading.tsx`

### Priorité Moyenne ⭐⭐⭐

- [ ] **Pickups list** : `dashboard/pickups/loading.tsx`
- [ ] **Purchases list** : `dashboard/purchases/loading.tsx`
- [ ] **Clients list** : `dashboard/clients/loading.tsx`
- [ ] **Timeline components** : Ajouter `TimelineSkeleton` dans les 4 composants
- [ ] **TableSkeleton** : Remplacer dans `PickupListTable` et autres

### Priorité Basse ⭐⭐

- [ ] **Formulaires** : Ajouter `FormSkeleton` dans les pages de création/édition
- [ ] **Modals** : Ajouter des skeletons dans les dialogs qui chargent des données
- [ ] **Selects** : ClientSelect, CountrySelect

---

## 🎨 Bonnes pratiques

### ✅ À faire
1. **Matcher la structure finale** : Le skeleton doit avoir la même disposition que le contenu final
2. **Utiliser les composants réutilisables** : `TimelineSkeleton`, `TableSkeleton`, etc.
3. **Nombre réaliste** : 3-5 items pour les listes (pas besoin de 20)
4. **Durée cohérente** : Les skeletons ont du sens pour les chargements >200ms

### ❌ À éviter
1. Ne pas utiliser `<div>Chargement...</div>` ou des spinners seuls
2. Ne pas créer des skeletons trop détaillés (perte de temps de dev)
3. Ne pas afficher de skeleton pour des chargements <100ms (flash désagréable)

---

## 📚 Ressources

- **Composants Skeleton réutilisables** : `src/components/skeletons/`
- **shadcn/ui Skeleton** : `src/components/ui/skeleton.tsx`
- **Next.js Loading UI** : https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming

---

**Dernière mise à jour** : 25 janvier 2026
**Version** : 1.0.0
