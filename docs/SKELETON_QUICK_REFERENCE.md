# ⚡ Skeletons - Référence Rapide

## 📦 Composants disponibles

### 1. Skeleton de base (shadcn/ui)
```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-4 w-[250px]" />
```

### 2. TimelineSkeleton
```tsx
import { TimelineSkeleton } from '@/components/skeletons';

<TimelineSkeleton count={5} compact={false} />
```

### 3. TableSkeleton
```tsx
import { TableSkeleton } from '@/components/skeletons';

<TableSkeleton rows={5} columns={5} showHeader={true} />
```

### 4. CardGridSkeleton
```tsx
import { CardGridSkeleton } from '@/components/skeletons';

<CardGridSkeleton count={4} columns={4} />
```

### 5. FormSkeleton
```tsx
import { FormSkeleton } from '@/components/skeletons';

<FormSkeleton fields={6} showActions={true} />
```

---

## 🎯 Cas d'usage rapides

### Server Component (page.tsx)
**Créer** : `loading.tsx` dans le même dossier

```tsx
// app/dashboard/quotes/loading.tsx
import { TableSkeleton, CardGridSkeleton } from '@/components/skeletons';

export default function QuotesLoading() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}
```

### Client Component avec useQuery
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { TableSkeleton } from '@/components/skeletons';

export function QuotesList() {
  const { data, isLoading } = useQuery(...);

  if (isLoading) return <TableSkeleton rows={5} columns={5} />;

  return <div>{/* Contenu */}</div>;
}
```

### Timeline Component
```tsx
'use client';

import { TimelineSkeleton } from '@/components/skeletons';

export function ShipmentHistoryTimeline({ logs }) {
  if (!logs || logs.length === 0) {
    return <TimelineSkeleton count={5} />;
  }

  return <div>{/* Timeline */}</div>;
}
```

---

## 🎨 Patterns courants

### Skeleton pour un Card
```tsx
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-[180px]" />
    <Skeleton className="h-4 w-[250px]" />
  </CardHeader>
  <CardContent className="space-y-4">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-[90%]" />
  </CardContent>
</Card>
```

### Skeleton pour un Avatar
```tsx
<Skeleton className="h-10 w-10 rounded-full" />
```

### Skeleton pour un Badge
```tsx
<Skeleton className="h-6 w-[100px] rounded-full" />
```

### Skeleton pour un Button
```tsx
<Skeleton className="h-10 w-[120px]" />
```

### Skeleton pour un Input
```tsx
<div className="space-y-2">
  <Skeleton className="h-4 w-[100px]" /> {/* Label */}
  <Skeleton className="h-10 w-full" />     {/* Input */}
</div>
```

### Skeleton pour un Select
```tsx
<div className="space-y-2">
  <Skeleton className="h-4 w-[120px]" /> {/* Label */}
  <Skeleton className="h-10 w-full" />     {/* Select */}
  <Skeleton className="h-3 w-[180px]" /> {/* Helper text */}
</div>
```

### Skeleton pour un Textarea
```tsx
<div className="space-y-2">
  <Skeleton className="h-4 w-[100px]" />
  <Skeleton className="h-24 w-full" />
</div>
```

---

## 📏 Dimensions standards

| Élément | Tailwind Class | Exemple |
|---------|---------------|---------|
| Titre H1 | `h-8` | Page title |
| Titre H2 | `h-6` | Card title |
| Titre H3 | `h-5` | Section title |
| Texte normal | `h-4` | Labels, paragraphs |
| Texte petit | `h-3` | Helper text, dates |
| Input/Button | `h-10` | Standard form elements |
| Avatar petit | `h-8 w-8` | List item |
| Avatar moyen | `h-10 w-10` | Header |
| Avatar grand | `h-16 w-16` | Profile page |
| Badge | `h-6 w-[100px]` | Status badge |

---

## 🚀 Migration rapide

### Avant (mauvais)
```tsx
if (isLoading) return <div>Chargement...</div>;
if (isLoading) return <CircularProgress />;
if (isLoading) return null;
```

### Après (bon)
```tsx
if (isLoading) return <TableSkeleton />;
if (isLoading) return <TimelineSkeleton />;
if (isLoading) return <FormSkeleton />;
```

---

## ⏱️ Quand utiliser un Skeleton ?

### ✅ OUI
- Chargement de liste (>200ms)
- Chargement de détails (>200ms)
- Chargement initial de page
- Pagination / Infinite scroll
- Recherche avec debounce

### ❌ NON
- Chargements <100ms (flash désagréable)
- Actions instantanées (toggle, like)
- Hover states
- Animations CSS pures

---

## 🎯 Checklist avant commit

- [ ] Skeleton matche la structure finale
- [ ] Utilise les composants réutilisables quand possible
- [ ] Pas de spinner seul (sauf boutons d'action)
- [ ] Nombre d'items réaliste (3-5 max)
- [ ] Testé visuellement en mode lent (Network throttling)
