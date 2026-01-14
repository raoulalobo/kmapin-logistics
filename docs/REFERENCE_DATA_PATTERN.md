# Pattern : Gestion Centralisée des Données de Référence

Ce document explique le pattern utilisé pour centraliser les données de référence (pays, statuts, types, etc.) dans l'application.

## 🎯 Problème résolu

**AVANT** : Données hardcodées dans chaque composant
```tsx
// ❌ Duplication dans chaque formulaire
const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  // ...
];
```

**Problèmes** :
- ❌ Duplication de code
- ❌ Désynchronisation entre formulaires
- ❌ Difficile à maintenir
- ❌ Impossible d'ajouter/désactiver des pays sans redéployer

**APRÈS** : Source unique avec cache intelligent
```tsx
// ✅ Un seul hook, données depuis la DB
const { data: countries, isLoading } = useCountries();
```

## 📐 Architecture en 3 Couches

```
┌─────────────────────────────────────────┐
│  1. COMPOSANTS (Client)                 │
│     └─ useCountries() hook              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  2. CACHE (React Query)                 │
│     - staleTime: 5 min                  │
│     - gcTime: 10 min                    │
│     - refetchOnWindowFocus: false       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  3. SERVER ACTION (Prisma DB)           │
│     - listCountries(onlyActive)         │
│     - Filtre + Tri                      │
└─────────────────────────────────────────┘
```

## 🔧 Exemple d'implémentation : Module Countries

### 1. Server Action

**Fichier** : `src/modules/countries/actions/country.actions.ts`

```typescript
'use server';

import { prisma } from '@/lib/db/client';

/**
 * Récupérer les pays actifs
 *
 * Cache recommandé : 5 minutes (React Query)
 */
export async function listCountries(onlyActive = false) {
  const countries = await prisma.country.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });

  return countries;
}
```

### 2. Hook React Query

**Fichier** : `src/modules/countries/hooks/use-countries.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { listCountries } from '../actions/country.actions';

export function useCountries() {
  return useQuery({
    queryKey: ['countries', 'active'],
    queryFn: async () => {
      const countries = await listCountries(true);
      return countries;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
```

### 3. Export du module

**Fichier** : `src/modules/countries/index.ts`

```typescript
export * from './actions/country.actions';
export * from './hooks/use-countries';
export * from './schemas/country.schema';
```

### 4. Utilisation dans un composant

**Fichier** : `src/components/my-form.tsx`

```tsx
'use client';

import { useCountries } from '@/modules/countries';

export function MyForm() {
  const { data: countries, isLoading, error } = useCountries();

  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner un pays" />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Chargement des pays...
          </SelectItem>
        ) : countries && countries.length > 0 ? (
          countries.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.name}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-countries" disabled>
            Aucun pays disponible
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
```

## 🚀 Appliquer le pattern à d'autres données

### Candidats idéaux pour ce pattern :

✅ **Données de référence statiques** :
- Pays
- Statuts (expéditions, devis, factures)
- Types de transport
- Devises
- Unités de mesure
- Incoterms

✅ **Critères** :
- Changent rarement (max 1 fois par jour)
- Utilisées dans plusieurs composants
- Nécessitent tri/filtrage
- Proviennent de la base de données

❌ **Pas adapté pour** :
- Données utilisateur spécifiques
- Données qui changent fréquemment
- Données volumineuses (> 1000 items)
- Données nécessitant recherche/pagination

### Template : Créer un nouveau module

**Étape 1** : Créer la structure
```bash
mkdir -p src/modules/MY_MODULE/{actions,hooks,schemas}
```

**Étape 2** : Server Action
```typescript
// src/modules/MY_MODULE/actions/my-module.actions.ts
'use server';

import { prisma } from '@/lib/db/client';

export async function listMyData() {
  const data = await prisma.myTable.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return data;
}
```

**Étape 3** : Hook React Query
```typescript
// src/modules/MY_MODULE/hooks/use-my-data.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { listMyData } from '../actions/my-module.actions';

export function useMyData() {
  return useQuery({
    queryKey: ['my-data', 'active'],
    queryFn: async () => {
      const data = await listMyData();
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
```

**Étape 4** : Export
```typescript
// src/modules/MY_MODULE/index.ts
export * from './actions/my-module.actions';
export * from './hooks/use-my-data';
```

**Étape 5** : Utilisation
```tsx
import { useMyData } from '@/modules/MY_MODULE';

const { data, isLoading } = useMyData();
```

## ⚙️ Configuration React Query

### Configuration globale

**Fichier** : `src/app/layout.tsx` (ou providers)

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes par défaut
      gcTime: 10 * 60 * 1000,      // 10 minutes en cache
      refetchOnWindowFocus: false,  // Pas de refetch au focus
      retry: 3,                     // 3 tentatives en cas d'erreur
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

### Personnalisation par hook

Ajuster selon les besoins :

```typescript
export function useFrequentlyChangingData() {
  return useQuery({
    queryKey: ['frequent-data'],
    queryFn: fetchData,
    staleTime: 1 * 60 * 1000,  // 1 minute (données qui changent souvent)
  });
}

export function useRarelyChangingData() {
  return useQuery({
    queryKey: ['rare-data'],
    queryFn: fetchData,
    staleTime: 60 * 60 * 1000, // 1 heure (données très stables)
  });
}
```

## 🎯 Avantages du pattern

### Performance
- ⚡ **Cache intelligent** : Évite les appels DB répétés
- 🚀 **Pas de waterfalls** : Données pré-chargées au mount
- 💾 **Mémoire optimisée** : Garbage collection automatique

### Maintenabilité
- 🎯 **Source unique** : Une seule définition des données
- 🔧 **Facile à modifier** : Changement en un seul endroit
- 📝 **Lisible** : Pattern clair et documenté

### Flexibilité
- 🔄 **Mise à jour live** : Ajout de pays sans redéployer
- 🎛️ **Activation/désactivation** : Flag `isActive` en DB
- 🌍 **Multi-langue** : Ajout facile de traductions

### Developer Experience
- ✨ **Simple à utiliser** : 1 import, 1 hook
- 🛡️ **Type-safe** : TypeScript automatique
- 🐛 **Facile à debug** : React Query DevTools

## 📚 Ressources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Server Actions Next.js](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)

## 🔍 Troubleshooting

### Pays ne se chargent pas

**Vérifier** :
1. La table `Country` contient des données actives
2. Le hook est appelé dans un Client Component (`'use client'`)
3. React Query Provider est configuré dans le layout
4. Pas d'erreur dans la console navigateur

### Cache pas mis à jour

**Solutions** :
```typescript
import { useQueryClient } from '@tanstack/react-query';

// Invalider manuellement le cache
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['countries'] });

// Ou forcer un refetch
const { refetch } = useCountries();
refetch();
```

### Performance dégradée

**Optimisations** :
- Augmenter `staleTime` pour données très stables
- Utiliser `select` pour transformer uniquement les données nécessaires
- Implémenter pagination si > 1000 items
