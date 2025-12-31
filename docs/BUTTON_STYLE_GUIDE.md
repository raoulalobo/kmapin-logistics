# Guide de Style : Boutons du Dashboard

Guide de référence pour assurer une cohérence visuelle et une meilleure UX dans toute l'application.

## Système de Couleurs par Type d'Action

### 1. Actions de Création / Ajout
**Couleur** : Bleu vif (`bg-blue-600 hover:bg-blue-700`)
**Icône** : `Plus`, `FloppyDisk` (filled)
**Taille** : `lg` pour les actions principales
**Exemple** :
```tsx
<Button
  type="submit"
  size="lg"
  className="gap-2 bg-blue-600 hover:bg-blue-700"
>
  <FloppyDisk className="h-5 w-5" weight="fill" />
  Créer le devis
</Button>

<Button className="gap-2 bg-blue-600 hover:bg-blue-700">
  <Plus className="h-4 w-4 mr-2" />
  Ajouter
</Button>
```

### 2. Actions de Validation / Confirmation
**Couleur** : Vert (`bg-green-600 hover:bg-green-700`)
**Icône** : `Check`, `CheckCircle`
**Taille** : `default` ou `lg`
**Exemple** :
```tsx
<Button
  size="lg"
  className="gap-2 bg-green-600 hover:bg-green-700"
>
  <Check className="h-5 w-5" weight="bold" />
  Valider
</Button>
```

### 3. Actions d'Annulation / Retour
**Variant** : `outline`
**Couleur** : Gris (par défaut avec outline)
**Icône** : `ArrowLeft`, `X`
**Taille** : `default` ou `lg`
**Exemple** :
```tsx
<Button
  variant="outline"
  size="lg"
  onClick={() => router.back()}
  className="gap-2"
>
  <ArrowLeft className="h-4 w-4" />
  Annuler
</Button>
```

### 4. Actions de Suppression
**Variant** : `destructive`
**Couleur** : Rouge (automatique avec variant destructive)
**Icône** : `Trash`, `TrashSimple`
**Taille** : `default` ou `sm`
**Exemple** :
```tsx
<Button
  variant="destructive"
  size="sm"
  onClick={handleDelete}
>
  <Trash className="h-4 w-4 mr-2" />
  Supprimer
</Button>
```

### 5. Actions Secondaires / Tertiaires
**Variant** : `ghost` ou `outline`
**Couleur** : Gris clair
**Icône** : Selon le contexte
**Taille** : `sm` ou `default`
**Exemple** :
```tsx
<Button variant="ghost" size="sm">
  <Eye className="h-4 w-4 mr-2" />
  Voir détails
</Button>
```

### 6. Actions d'Édition
**Variant** : `ghost`
**Couleur** : Bleu (via icône)
**Icône** : `PencilSimple`, `FloppyDisk`
**Taille** : `sm`
**Exemple** :
```tsx
<Button variant="ghost" size="sm">
  <FloppyDisk className="h-4 w-4 text-blue-600" />
</Button>
```

## Règles de Hiérarchie Visuelle

### Bouton Principal (Call-to-Action)
- **Taille** : `size="lg"`
- **Couleur** : Bleu vif (création) ou Vert (validation)
- **Position** : En évidence (en haut à droite ou en bas à gauche)
- **Exemple** : "Créer le devis", "Enregistrer"

### Boutons Secondaires
- **Taille** : `size="default"`
- **Variant** : `outline`
- **Couleur** : Gris
- **Position** : À côté du bouton principal
- **Exemple** : "Annuler", "Retour"

### Boutons Tertiaires
- **Taille** : `size="sm"`
- **Variant** : `ghost`
- **Couleur** : Gris clair
- **Position** : Dans les tableaux, menus, etc.
- **Exemple** : "Voir", "Éditer", "Options"

## Bonnes Pratiques

### ✅ À Faire
- Toujours inclure une icône pour les actions principales
- Utiliser `weight="fill"` ou `weight="bold"` pour les icônes importantes
- Espacer les boutons avec `gap-2` ou `gap-4`
- Utiliser des tailles cohérentes (`lg` pour principal, `default` pour secondaire, `sm` pour tertiaire)
- Ajouter `disabled` lors du chargement avec message "En cours..."

### ❌ À Éviter
- Plusieurs boutons bleus au même niveau (confusion)
- Boutons destructifs sans confirmation
- Icônes trop petites (< 16px)
- Boutons sans espacement
- Trop de boutons de même couleur côte à côte

## Exemples Complets par Page

### Page de Création (/dashboard/quotes/new)
```tsx
{/* Bouton principal - Création */}
<Button
  type="submit"
  size="lg"
  disabled={form.formState.isSubmitting}
  className="gap-2 bg-blue-600 hover:bg-blue-700"
>
  <FloppyDisk className="h-5 w-5" weight="fill" />
  {form.formState.isSubmitting ? 'Création en cours...' : 'Créer le devis'}
</Button>

{/* Bouton secondaire - Annulation */}
<Button
  type="button"
  variant="outline"
  size="lg"
  onClick={() => router.back()}
  className="gap-2"
>
  <ArrowLeft className="h-4 w-4" />
  Annuler
</Button>
```

### Page de Liste avec Actions (/dashboard/quotes)
```tsx
{/* Bouton principal - Nouvelle création */}
<Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
  <Link href="/dashboard/quotes/new">
    <Plus className="h-5 w-5" weight="fill" />
    Nouveau devis
  </Link>
</Button>

{/* Actions dans tableau - Éditer */}
<Button variant="ghost" size="sm">
  <FloppyDisk className="h-4 w-4 text-blue-600" />
</Button>

{/* Actions dans tableau - Supprimer */}
<Button variant="ghost" size="sm">
  <Trash className="h-4 w-4 text-red-600" />
</Button>
```

### Modal de Confirmation
```tsx
{/* Annuler */}
<Button variant="outline" onClick={onClose}>
  Annuler
</Button>

{/* Confirmer suppression */}
<Button variant="destructive">
  <Trash className="h-4 w-4 mr-2" />
  Supprimer
</Button>

{/* Confirmer validation */}
<Button className="bg-green-600 hover:bg-green-700">
  <Check className="h-4 w-4 mr-2" />
  Valider
</Button>
```

## Accessibilité

- **Tooltips** : Ajouter `title` pour les boutons icône seul
- **ARIA labels** : Utiliser `aria-label` pour les lecteurs d'écran
- **Contraste** : Respecter WCAG 2.1 AA (ratio 4.5:1 minimum)
- **Taille minimale** : 44x44px pour mobile (respecté avec `size="default"` minimum)

## Migration Progressive

Pour migrer progressivement :
1. Commencer par les pages principales (création, liste)
2. Standardiser les modals et dialogs
3. Mettre à jour les tableaux et cartes
4. Finaliser avec les pages de paramètres

---

**Dernière mise à jour** : 2025-01-01
**Maintenu par** : Équipe Dev KmapIn Logistics
