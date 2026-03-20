---
name: plan-management
description: Gestion des fichiers de planification dans .claude/plans/. Utiliser ce skill quand on doit (1) creer un nouveau plan pour une feature, bugfix ou refactoring, (2) mettre a jour le statut ou les etapes d'un plan existant, (3) archiver un plan termine, (4) verifier les dependances entre plans, ou (5) lister/nettoyer les plans existants. Se declenche aussi quand l'utilisateur mentionne "plan", "planifier", "etapes", ou demande d'organiser un travail en phases.
---

# Plan Management

Appliquer ces regles **a chaque fois** qu'un fichier `.md` est cree, modifie, archive ou supprime dans `.claude/plans/`.

## Workflow principal

1. **Creer ou modifier un plan ?**
   - Nouveau sujet → Creer un nouveau fichier (apres permission)
   - Meme sujet qu'un plan existant → Ecraser l'ancien (apres permission)
   - Mise a jour de statut/etapes → Modifier en place (sans permission si plan deja en cours)

2. **Appliquer les regles** → Voir [regles.md](./regles.md)
   - Nommage descriptif obligatoire
   - Permission utilisateur avant creation/ecrasement/suppression
   - Logique ecraser vs nouveau fichier
   - Archivage automatique des plans termines

3. **Respecter la structure** → Voir [structure.md](./structure.md)
   - Template unique pour tout type (feature, bugfix, refactoring)
   - Checkboxes pour le suivi de statut des etapes
   - Tracking code (fichiers modifies + commit + description) par etape
   - Section "Plans en relation" obligatoire

## Archivage automatique

Quand toutes les etapes d'un plan sont cochees `[x]` :
1. Deplacer le fichier vers `.claude/plans/archive/`
2. Creer le dossier `archive/` s'il n'existe pas
3. Informer l'utilisateur du deplacement
