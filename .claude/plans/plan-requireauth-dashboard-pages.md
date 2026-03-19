# Plan : Ajouter requireAuth() explicite sur les pages dashboard Server Components

## Contexte

L'audit de sécurité révèle que 22 pages du dashboard n'appellent pas `requireAuth()` explicitement. Le layout `(dashboard)/layout.tsx` les protège via `getSession() + redirect('/login')`, et les Server Actions font le RBAC via Zenstack. Cependant, les pages Server Components devraient vérifier l'authentification explicitement (défense en profondeur).

## Objectif

Ajouter `const session = await requireAuth();` au début des 13 pages Server Components non protégées du dashboard. Les 9 Client Components ne sont pas concernés (pas de code async serveur).

## Plans en relation

| Plan | Relation | Description |
|------|----------|-------------|
| `plan-fix-incoherences-tarification-maritime.md` | Parallèle | Corrections tarification en cours |

## Fichiers concernés

**Server Components à protéger (13 fichiers) :**
- `src/app/(dashboard)/clients/page.tsx`
- `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/clients/page.tsx`
- `src/app/(dashboard)/dashboard/countries/page.tsx`
- `src/app/(dashboard)/dashboard/documents/page.tsx`
- `src/app/(dashboard)/dashboard/quotes/page.tsx`
- `src/app/(dashboard)/dashboard/reports/page.tsx`
- `src/app/(dashboard)/dashboard/shipments/page.tsx`
- `src/app/(dashboard)/dashboard/tracking/page.tsx`
- `src/app/(dashboard)/dashboard/users/page.tsx`
- `src/app/(dashboard)/quotes/[id]/page.tsx`
- `src/app/(dashboard)/quotes/page.tsx`

**Client Components NON concernés (9 fichiers) — protégés par layout + Server Actions RBAC**

## Étapes

- [ ] **Étape 1 : Ajouter requireAuth() sur les 13 Server Components**
  Pour chaque fichier : ajouter `import { requireAuth } from '@/lib/auth/config';` et `const session = await requireAuth();` au début de la fonction.

- [ ] **Étape 2 : Vérification TypeScript + push**

## Vérification

- [ ] 0 erreur TypeScript
- [ ] Toutes les pages Server Components du dashboard appellent requireAuth()
