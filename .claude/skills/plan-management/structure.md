# Structure d'un fichier de plan

## Template obligatoire

Chaque fichier de plan doit suivre cette structure :

```markdown
# Plan : <Titre descriptif du plan>

## Contexte

<Pourquoi ce plan existe. Quel probleme il resout ou quelle fonctionnalite il ajoute.>

## Objectif

<Ce que le plan doit accomplir, en 2-3 phrases maximum.>

## Plans en relation

| Plan                              | Relation     | Description de l'interaction                          |
| --------------------------------- | ------------ | ----------------------------------------------------- |
| `plan-xxx.md`                     | Prerequis    | Ce plan doit etre termine avant de commencer celui-ci  |
| `plan-yyy.md`                     | Dependance   | Ce plan utilise des elements crees par plan-yyy        |
| `plan-zzz.md`                     | Suite        | Ce plan sera suivi par plan-zzz                        |

> Si aucun plan n'est en relation, ecrire : "Aucun plan en relation."

## Architecture / Fichiers concernes

<Details techniques : fichiers a creer/modifier, decisions d'architecture.>

## Etapes

<Liste numerotee des etapes d'implementation.>

## Verification

<Checklist pour valider que le plan est correctement implemente.>
```

## Section "Plans en relation"

Cette section est **obligatoire** dans chaque plan. Elle permet de :
- Comprendre les dependances entre plans
- Savoir dans quel ordre les plans doivent etre executes
- Identifier les impacts quand un plan est modifie

### Types de relations

| Type         | Signification                                                      |
| ------------ | ------------------------------------------------------------------ |
| Prerequis    | L'autre plan doit etre **termine** avant de commencer celui-ci      |
| Dependance   | Ce plan **utilise** des elements (code, schema, config) d'un autre |
| Suite        | Ce plan **sera suivi** par un autre plan                            |
| Parallele    | Ce plan peut etre execute **en meme temps** qu'un autre             |
| Remplace     | Ce plan **remplace** un ancien plan (qui devient obsolete)          |

### Exemples concrets

```markdown
## Plans en relation

| Plan                                | Relation   | Description de l'interaction                                         |
| ----------------------------------- | ---------- | -------------------------------------------------------------------- |
| `plan-auth-better-auth.md`          | Prerequis  | L'authentification doit etre en place pour verifier les roles admin   |
| `plan-supabase-storage-buckets.md`  | Dependance | Utilise le bucket "categories" cree dans ce plan                     |
| `plan-stripe-connect-paiement.md`   | Suite      | Le paiement sera implemente apres le catalogue de prestations        |
```
