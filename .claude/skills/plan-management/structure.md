# Structure d'un fichier de plan

## Template obligatoire

Utiliser ce template pour **tout type** de plan (feature, bugfix, refactoring).

```markdown
# Plan : <Titre descriptif du plan>

## Contexte

<Pourquoi ce plan existe. Quel probleme il resout ou quelle fonctionnalite il ajoute.>

## Objectif

<Ce que le plan doit accomplir, en 2-3 phrases maximum.>

## Plans en relation

| Plan | Relation | Description |
|------|----------|-------------|
| `plan-xxx.md` | Prerequis | Ce plan doit etre termine avant celui-ci |

> Si aucun plan en relation : "Aucun plan en relation."

## Fichiers concernes

<Liste des fichiers a creer ou modifier, decisions d'architecture.>

## Etapes

- [ ] **Etape 1 : <Titre>**
  <Description de ce qui doit etre fait>

- [ ] **Etape 2 : <Titre>**
  <Description de ce qui doit etre fait>

## Verification

<Checklist pour valider que le plan est correctement implemente.>
```

## Suivi de statut avec checkboxes

Chaque etape utilise une checkbox markdown :
- `- [ ]` : A faire
- `- [x]` : Fait

Quand une etape est terminee, cocher la checkbox ET ajouter le bloc de tracking :

```markdown
- [x] **Etape 1 : Creer le schema Zod**
  Ajouter les schemas de validation pour les colis.
  > **Commit** : `a1b2c3d` — Ajout schemas Zod multi-colis
  > **Fichiers** : `src/modules/quotes/schemas/quote.schema.ts`, `src/modules/quotes/schemas/package.schema.ts`
```

## Bloc de tracking code

Apres chaque etape implementee, ajouter sous la description :

```markdown
> **Commit** : `<hash-court>` — <description courte du changement>
> **Fichiers** : `<chemin/fichier1>`, `<chemin/fichier2>`
```

- **Commit** : Hash court (7 chars) + description du commit. Ecrire "Pas de commit" si les changements ne sont pas encore commites.
- **Fichiers** : Liste des fichiers crees ou modifies dans cette etape.

### Exemple complet d'un plan en cours

```markdown
# Plan : Corriger l'overflow du modal devis sur mobile

## Contexte

Le modal de resultat du calculateur de devis deborde a droite sur mobile (~375px).
Les montants et le symbole euro sont tronques.

## Objectif

Rendre le modal entierement lisible sur mobile sans perte d'information.

## Plans en relation

| Plan | Relation | Description |
|------|----------|-------------|
| `plan-multi-colis.md` | Dependance | Le tableau "Detail par colis" vient de ce plan |

## Fichiers concernes

- `src/components/quote-calculator/quote-calculator.tsx` (section Dialog, lignes 1096-1284)
- `src/components/ui/dialog.tsx` (classes de base DialogContent)

## Etapes

- [x] **Etape 1 : Empecher le debordement horizontal du Dialog**
  Ajouter `overflow-x-hidden` et `min-w-0` sur les enfants grid du DialogContent.
  > **Commit** : `f4e5d6c` — fix: empecher overflow horizontal dialog mobile
  > **Fichiers** : `src/components/quote-calculator/quote-calculator.tsx`

- [x] **Etape 2 : Proteger les montants monetaires**
  Ajouter `whitespace-nowrap` sur les cellules de montants et `gap-4` sur les lignes de totaux.
  > **Commit** : `f4e5d6c` — (meme commit que etape 1)
  > **Fichiers** : `src/components/quote-calculator/quote-calculator.tsx`

- [ ] **Etape 3 : Tester sur mobile reel**
  Verifier sur un appareil 375px que tous les montants sont visibles.

## Verification

- [ ] Le tableau scrolle horizontalement sans deborder du dialog
- [ ] Les montants "90,00 €" sont visibles en entier (sous-total, total)
- [ ] Le bouton "Creer un compte" affiche le texte court sur mobile
- [ ] Aucune regression sur desktop (>=640px)
```

## Section "Plans en relation"

Section **obligatoire** dans chaque plan.

### Types de relations

| Type | Signification |
|------|---------------|
| Prerequis | L'autre plan doit etre **termine** avant celui-ci |
| Dependance | Ce plan **utilise** des elements d'un autre plan |
| Suite | Ce plan **sera suivi** par un autre plan |
| Parallele | Peut etre execute **en meme temps** qu'un autre |
| Remplace | Ce plan **remplace** un ancien plan (obsolete) |
