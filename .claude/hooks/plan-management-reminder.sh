#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Hook : plan-management-reminder.sh
# Événements : PreToolUse (EnterPlanMode) + PostToolUse (ExitPlanMode, Write, Edit)
#
# Rôle : Garantir l'application des règles du skill plan-management
#        à chaque interaction avec les fichiers de plan dans .claude/plans/
#
# Stratégie en 2 temps :
#   - PRE  (EnterPlanMode) : Charger les règles AVANT la planification
#     pour que Claude les applique nativement (nommage, structure, permission)
#   - POST (ExitPlanMode)  : Filet de sécurité — vérifier que les règles
#     ont bien été respectées après la création du plan
#   - POST (Write/Edit)    : Vérifier le nommage si un fichier .claude/plans/ est modifié
#
# Fonctionnement :
#   - Reçoit le contexte du tool use sur stdin (JSON avec tool_name, hook_event_name)
#   - Affiche le rappel approprié sur stdout (injecté dans le contexte de Claude)
#   - Exit 0 dans tous les cas (hook informatif, ne bloque jamais)
# ──────────────────────────────────────────────────────────────

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')

# ══════════════════════════════════════════════════════════════
# PRE : EnterPlanMode → Charger les règles en amont
# ══════════════════════════════════════════════════════════════
if [ "$TOOL_NAME" = "EnterPlanMode" ] && [ "$EVENT" = "PreToolUse" ]; then
  cat <<'REMINDER'
📋 RÈGLES PLAN-MANAGEMENT (à appliquer pendant la planification) :

1. NOMMAGE : Le fichier de plan DOIT s'appeler `plan-<objectif>.md` en kebab-case.
   Exemples : plan-fix-modal-devis-mobile.md, plan-auth-better-auth.md
   ❌ PAS de noms aléatoires (cozy-forging-hopper.md)

2. PERMISSION : TOUJOURS demander la permission à l'utilisateur AVANT de créer le plan.
   Présenter : le nom proposé + l'objectif en 1-2 phrases.

3. STRUCTURE OBLIGATOIRE du plan :
   - # Plan : <Titre>
   - ## Contexte
   - ## Objectif
   - ## Plans en relation (tableau : Plan | Relation | Description)
   - ## Architecture / Fichiers concernés
   - ## Étapes
   - ## Vérification

4. ÉCRASER vs NOUVEAU : Si un plan existant couvre le même sujet → proposer d'écraser.
   Si sujet différent → nouveau fichier.

Référence complète : .claude/skills/plan-management/regles.md et structure.md
REMINDER
  exit 0
fi

# ══════════════════════════════════════════════════════════════
# POST : ExitPlanMode → Vérifier que les règles ont été appliquées
# ══════════════════════════════════════════════════════════════
if [ "$TOOL_NAME" = "ExitPlanMode" ] && [ "$EVENT" = "PostToolUse" ]; then
  cat <<'REMINDER'
✅ VÉRIFICATION POST-PLAN : Le plan vient d'être créé. Vérifie :
1. Le fichier a un nom descriptif (plan-<objectif>.md), pas un nom aléatoire
2. La structure obligatoire est respectée (Contexte, Objectif, Plans en relation, etc.)
3. L'utilisateur a donné sa permission pour le nom et l'objectif
Si le nom est aléatoire, renomme-le MAINTENANT avant de continuer.
REMINDER
  exit 0
fi

# ══════════════════════════════════════════════════════════════
# POST : Write/Edit sur .claude/plans/ → Vérifier le nommage
# ══════════════════════════════════════════════════════════════
if [ "$EVENT" = "PostToolUse" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

  if [ -n "$FILE_PATH" ] && echo "$FILE_PATH" | grep -q '\.claude/plans/'; then
    FILENAME=$(basename "$FILE_PATH")

    # Vérifier si le nom respecte le format plan-<objectif>.md
    if ! echo "$FILENAME" | grep -qE '^plan-.+\.md$'; then
      cat <<REMINDER
⚠️ NOMMAGE INCORRECT : Le fichier "$FILENAME" ne respecte pas le format obligatoire.
Format attendu : plan-<objectif>.md (ex: plan-fix-modal-devis-mobile.md)
Renomme le fichier et demande permission à l'utilisateur.
REMINDER
    fi
    exit 0
  fi
fi

# ── Aucun rapport avec les plans → ne rien faire
exit 0
