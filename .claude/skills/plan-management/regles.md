# Regles de gestion des plans

## 1. Nommage descriptif obligatoire

- Le nom du fichier doit decrire l'objectif du plan en kebab-case
- Format : `plan-<objectif>.md`
- Le nom doit etre lisible et comprehensible sans ouvrir le fichier

### Exemples

| Bon                                | Mauvais                        |
| ---------------------------------- | ------------------------------ |
| `plan-image-crop-upload.md`        | `indexed-humming-milner.md`    |
| `plan-auth-better-auth.md`        | `vivid-sniffing-glacier.md`    |
| `plan-recherche-carte-leaflet.md` | `iterative-beaming-pillow.md`  |
| `plan-stripe-connect-paiement.md` | `plan-2024-01-15.md`           |

## 2. Permission obligatoire avant toute action

**REGLE ABSOLUE** : Toujours demander la permission a l'utilisateur avant :
- Creer un nouveau fichier de plan
- Ecraser un fichier de plan existant
- Supprimer un fichier de plan

Aucune exception. Meme si la tache semble evidente, demander confirmation.

### Comment demander

Presenter a l'utilisateur :
- Le **nom propose** pour le fichier
- L'**objectif** du plan en 1-2 phrases
- Si c'est une **mise a jour** d'un plan existant : preciser lequel et pourquoi
- Si c'est un **nouveau plan** : preciser qu'aucun plan existant ne couvre ce sujet

Attendre une reponse affirmative avant de proceder.

## 3. Ecraser vs Creer un nouveau fichier

### Meme objectif → Ecraser (apres permission)

Si le nouveau plan concerne **le meme sujet** qu'un plan existant (mise a jour,
correction, evolution), proposer d'ecraser l'ancien fichier.

Exemple : `plan-image-crop-upload.md` existe deja et on veut ajouter le support
du crop carre → proposer d'ecraser ce fichier.

### Objectif different → Nouveau fichier (apres permission)

Si le plan concerne un **sujet different**, toujours creer un nouveau fichier.
Ne jamais ajouter un plan sans rapport dans un fichier existant.

Exemple : un plan sur le paiement Stripe n'a rien a voir avec le plan d'upload
d'images → creer `plan-stripe-connect-paiement.md`.

## 4. Emplacement

Tous les fichiers de plan sont stockes dans :

```
.claude/plans/
```

Ne pas creer de sous-dossiers. Tous les plans sont au meme niveau.
