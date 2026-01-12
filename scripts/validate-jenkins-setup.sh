#!/bin/bash

###############################################################################
# Script de validation de la configuration Jenkins
#
# Ce script vérifie que tout est correctement configuré pour la pipeline CI/CD :
# 1. Accessibilité de Jenkins
# 2. Présence des plugins requis
# 3. Configuration des credentials
# 4. Existence du job Pipeline
# 5. Webhook Git fonctionnel
#
# Usage :
#   ./scripts/validate-jenkins-setup.sh
#
# Variables d'environnement requises :
#   JENKINS_URL      - URL de Jenkins (ex: http://localhost:8080)
#   JENKINS_USER     - Nom d'utilisateur Jenkins (ex: admin)
#   JENKINS_TOKEN    - API Token Jenkins
#
# Prérequis :
#   - Jenkins démarré et accessible
#   - API Token créé (Jenkins → User → Configure → API Token)
#   - curl et jq installés
#
# @author Faso Fret Logistics DevOps Team
# @date 2026-01-09
###############################################################################

set -e  # Exit si une commande échoue

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Fonctions d'affichage
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
  ((CHECKS_PASSED++))
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((CHECKS_WARNING++))
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
  ((CHECKS_FAILED++))
}

# Vérifier les prérequis
check_prerequisites() {
  log_info "Vérification des prérequis..."
  echo ""

  # Vérifier curl
  if ! command -v curl &> /dev/null; then
    log_error "curl n'est pas installé. Installez-le avec : sudo apt install curl"
    exit 1
  fi

  # Vérifier jq (optionnel mais recommandé)
  if ! command -v jq &> /dev/null; then
    log_warning "jq n'est pas installé (optionnel). Installez-le avec : sudo apt install jq"
  fi

  log_success "Prérequis vérifiés"
  echo ""
}

# Charger les variables d'environnement
load_env_vars() {
  log_info "Chargement des variables d'environnement..."
  echo ""

  # Charger depuis .env.jenkins si existe
  if [ -f ".env.jenkins" ]; then
    set -a
    source .env.jenkins
    set +a
    log_success "Variables chargées depuis .env.jenkins"
  else
    log_warning "Fichier .env.jenkins introuvable"
  fi

  # Vérifier que les variables sont définies
  if [ -z "$JENKINS_URL" ]; then
    echo -n "URL de Jenkins (ex: http://localhost:8080): "
    read JENKINS_URL
  fi

  if [ -z "$JENKINS_USER" ]; then
    echo -n "Nom d'utilisateur Jenkins: "
    read JENKINS_USER
  fi

  if [ -z "$JENKINS_TOKEN" ]; then
    echo -n "API Token Jenkins: "
    read -s JENKINS_TOKEN
    echo ""
  fi

  # Valider les variables
  if [ -z "$JENKINS_URL" ] || [ -z "$JENKINS_USER" ] || [ -z "$JENKINS_TOKEN" ]; then
    log_error "Variables d'environnement manquantes"
    exit 1
  fi

  log_success "Variables d'environnement chargées"
  echo ""
}

# Vérifier l'accessibilité de Jenkins
check_jenkins_accessibility() {
  log_info "1️⃣  Vérification de l'accessibilité de Jenkins..."
  echo ""

  # Tester la connexion
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$JENKINS_URL" || echo "000")

  if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "403" ]; then
    log_success "Jenkins est accessible à $JENKINS_URL (HTTP $HTTP_CODE)"
  else
    log_error "Jenkins n'est pas accessible (HTTP $HTTP_CODE)"
    log_error "Vérifiez que Jenkins est démarré : sudo systemctl status jenkins"
    return 1
  fi

  # Tester l'authentification
  AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "$JENKINS_USER:$JENKINS_TOKEN" \
    "$JENKINS_URL/api/json" || echo "000")

  if [ "$AUTH_CODE" == "200" ]; then
    log_success "Authentification Jenkins réussie"
  else
    log_error "Authentification échouée (HTTP $AUTH_CODE)"
    log_error "Vérifiez votre API Token : Jenkins → User → Configure → API Token"
    return 1
  fi

  echo ""
}

# Vérifier les plugins installés
check_plugins() {
  log_info "2️⃣  Vérification des plugins Jenkins..."
  echo ""

  # Liste des plugins requis
  REQUIRED_PLUGINS=(
    "git"
    "github"
    "workflow-aggregator"
    "nodejs"
  )

  OPTIONAL_PLUGINS=(
    "slack"
    "email-ext"
    "junit"
    "htmlpublisher"
  )

  # Récupérer la liste des plugins installés
  INSTALLED_PLUGINS=$(curl -s -u "$JENKINS_USER:$JENKINS_TOKEN" \
    "$JENKINS_URL/pluginManager/api/json?depth=1" | \
    grep -oP '"shortName":"\K[^"]+' 2>/dev/null || echo "")

  # Vérifier les plugins requis
  for plugin in "${REQUIRED_PLUGINS[@]}"; do
    if echo "$INSTALLED_PLUGINS" | grep -q "^$plugin$"; then
      log_success "Plugin requis installé : $plugin"
    else
      log_error "Plugin requis manquant : $plugin"
    fi
  done

  # Vérifier les plugins optionnels
  for plugin in "${OPTIONAL_PLUGINS[@]}"; do
    if echo "$INSTALLED_PLUGINS" | grep -q "^$plugin$"; then
      log_success "Plugin optionnel installé : $plugin"
    else
      log_warning "Plugin optionnel manquant : $plugin (recommandé)"
    fi
  done

  echo ""
}

# Vérifier les credentials
check_credentials() {
  log_info "3️⃣  Vérification des credentials..."
  echo ""

  # Récupérer la liste des credentials (sans les valeurs sensibles)
  CREDS=$(curl -s -u "$JENKINS_USER:$JENKINS_TOKEN" \
    "$JENKINS_URL/credentials/store/system/domain/_/api/json" 2>/dev/null || echo "")

  # Vérifier DATABASE_URL_TEST
  if echo "$CREDS" | grep -q "DATABASE_URL_TEST"; then
    log_success "Credential trouvé : DATABASE_URL_TEST"
  else
    log_error "Credential manquant : DATABASE_URL_TEST"
  fi

  # Vérifier BETTER_AUTH_SECRET_TEST
  if echo "$CREDS" | grep -q "BETTER_AUTH_SECRET_TEST"; then
    log_success "Credential trouvé : BETTER_AUTH_SECRET_TEST"
  else
    log_error "Credential manquant : BETTER_AUTH_SECRET_TEST"
  fi

  # Vérifier SLACK_WEBHOOK_URL (optionnel)
  if echo "$CREDS" | grep -q "SLACK_WEBHOOK_URL"; then
    log_success "Credential trouvé : SLACK_WEBHOOK_URL (optionnel)"
  else
    log_warning "Credential manquant : SLACK_WEBHOOK_URL (optionnel)"
  fi

  echo ""
}

# Vérifier l'existence du job Pipeline
check_pipeline_job() {
  log_info "4️⃣  Vérification du job Pipeline..."
  echo ""

  JOB_NAME="kmapin-logistics-v2-pipeline"

  # Vérifier si le job existe
  JOB_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "$JENKINS_USER:$JENKINS_TOKEN" \
    "$JENKINS_URL/job/$JOB_NAME/api/json" || echo "000")

  if [ "$JOB_CODE" == "200" ]; then
    log_success "Job Pipeline trouvé : $JOB_NAME"

    # Récupérer les détails du job
    JOB_INFO=$(curl -s -u "$JENKINS_USER:$JENKINS_TOKEN" \
      "$JENKINS_URL/job/$JOB_NAME/api/json")

    # Vérifier les triggers
    if echo "$JOB_INFO" | grep -q "GitHubPushTrigger\|GitLabPushTrigger"; then
      log_success "Trigger Git configuré"
    else
      log_warning "Trigger Git non configuré (le build ne sera pas automatique)"
    fi

    # Afficher le dernier build
    LAST_BUILD=$(echo "$JOB_INFO" | grep -oP '"lastBuild":{"number":\K[0-9]+' || echo "0")
    LAST_RESULT=$(echo "$JOB_INFO" | grep -oP '"lastBuild":.+?"result":"\K[^"]+' || echo "N/A")

    if [ "$LAST_BUILD" != "0" ]; then
      log_info "Dernier build : #$LAST_BUILD - Résultat : $LAST_RESULT"
    else
      log_warning "Aucun build exécuté"
    fi

  else
    log_error "Job Pipeline introuvable : $JOB_NAME (HTTP $JOB_CODE)"
    log_error "Créez le job dans Jenkins Dashboard"
  fi

  echo ""
}

# Vérifier la configuration Git
check_git_config() {
  log_info "5️⃣  Vérification de la configuration Git..."
  echo ""

  # Vérifier que le repository local a une remote
  if git remote -v &> /dev/null; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

    if [ -n "$REMOTE_URL" ]; then
      log_success "Repository Git configuré : $REMOTE_URL"
    else
      log_warning "Pas de remote 'origin' configurée"
    fi
  else
    log_warning "Pas de repository Git trouvé"
  fi

  # Vérifier la branche actuelle
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    log_info "Branche actuelle : $CURRENT_BRANCH"
  fi

  echo ""
}

# Tester le webhook (simulation)
test_webhook() {
  log_info "6️⃣  Test du webhook Git..."
  echo ""

  log_warning "Test automatique du webhook non implémenté"
  log_info "Pour tester manuellement :"
  echo ""
  echo "  1. Faire un commit et push :"
  echo "     git add ."
  echo "     git commit -m 'test: Trigger Jenkins'"
  echo "     git push origin main"
  echo ""
  echo "  2. Vérifier dans Jenkins Dashboard qu'un build démarre automatiquement"
  echo ""
  echo "  3. Vérifier les Recent Deliveries dans GitHub/GitLab Settings → Webhooks"
  echo ""
}

# Afficher le résumé
display_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  log_info "📊 Résumé de la validation"
  echo ""

  echo -e "${GREEN}✅ Vérifications réussies : $CHECKS_PASSED${NC}"
  echo -e "${YELLOW}⚠️  Avertissements : $CHECKS_WARNING${NC}"
  echo -e "${RED}❌ Erreurs : $CHECKS_FAILED${NC}"

  echo ""

  if [ $CHECKS_FAILED -eq 0 ]; then
    log_success "🎉 Configuration Jenkins validée avec succès !"
    echo ""
    echo "Prochaines étapes :"
    echo "  1. Faire un push Git pour tester le webhook"
    echo "  2. Vérifier que le build démarre automatiquement"
    echo "  3. Consulter les rapports de tests et de couverture"
    exit 0
  else
    log_error "🚨 Des erreurs ont été détectées"
    echo ""
    echo "Veuillez corriger les erreurs avant de continuer."
    echo "Consultez le guide : docs/JENKINS_SETUP.md"
    exit 1
  fi
}

# Fonction principale
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  🔍 Validation de la configuration Jenkins"
  echo "  Faso Fret Logistics v2 - CI/CD Pipeline"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  check_prerequisites
  load_env_vars
  check_jenkins_accessibility || true
  check_plugins || true
  check_credentials || true
  check_pipeline_job || true
  check_git_config || true
  test_webhook || true
  display_summary
}

# Exécuter
main
