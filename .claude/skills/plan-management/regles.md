# Regles de gestion des plans

## 1. Nommage descriptif obligatoire

- Format : `plan-<objectif>.md` en kebab-case
- Le nom doit decrire l'objectif sans ouvrir le fichier

| Bon | Mauvais |
|-----|---------|
| `plan-image-crop-upload.md` | `indexed-humming-milner.md` |
| `plan-auth-better-auth.md` | `vivid-sniffing-glacier.md` |
| `plan-fix-modal-mobile-overflow.md` | `plan-2024-01-15.md` |
| `plan-migration-react-email.md` | `todo.md` |

## 2. Permission obligatoire

**REGLE ABSOLUE** : Demander la permission a l'utilisateur avant :
- Creer un nouveau fichier de plan
- Ecraser un fichier de plan existant
- Supprimer un fichier de plan

**Exception** : La mise a jour de statut (cocher `[x]`, ajouter un commit hash, mettre a jour les fichiers modifies) d'un plan **deja en cours** ne necessite PAS de permission. C'est du tracking, pas une decision.

### Comment demander

Presenter :
- Le **nom propose** pour le fichier
- L'**objectif** en 1-2 phrases
- Si **mise a jour** : preciser quel plan et pourquoi
- Si **nouveau** : confirmer qu'aucun plan existant ne couvre ce sujet

## 3. Ecraser vs Creer

### Meme objectif → Ecraser (apres permission)

Le nouveau plan concerne le meme sujet qu'un plan existant (mise a jour, correction, evolution).

### Objectif different → Nouveau fichier (apres permission)

Le plan concerne un sujet different. Ne jamais melanger des sujets dans un meme fichier.

## 4. Emplacement

```
.claude/plans/          # Plans actifs
.claude/plans/archive/  # Plans termines (toutes les etapes [x])
```

Pas de sous-dossiers autres que `archive/`.

## 5. Archivage automatique

Quand toutes les checkboxes d'un plan sont cochees `[x]` :

1. Creer `.claude/plans/archive/` si inexistant
2. Deplacer le fichier dans `archive/`
3. Informer l'utilisateur : "Plan `plan-xxx.md` archive (toutes les etapes terminees)"

Un plan archive peut etre restaure manuellement si besoin.

## 6. Mise a jour du tracking code

Apres chaque etape implementee, mettre a jour le plan avec :
- Cocher la checkbox `[x]`
- Ajouter les fichiers modifies/crees
- Ajouter le hash du commit (si commit effectue)
- Ajouter une description courte du changement

Cette mise a jour se fait **sans demander permission** (cf. regle 2, exception).
