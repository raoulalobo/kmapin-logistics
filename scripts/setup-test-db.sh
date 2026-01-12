#!/bin/bash

###############################################################################
# Script d'initialisation de la base de données de test
#
# Ce script configure la base de données PostgreSQL pour les tests :
# 1. Charge les variables d'environnement de test (.env.test)
# 2. Génère les clients Prisma et Zenstack
# 3. Pousse le schéma vers la base de test
# 4. (Optionnel) Seed avec des données de test
#
# Usage :
#   ./scripts/setup-test-db.sh           # Setup de base
#   ./scripts/setup-test-db.sh --seed    # Setup + seed des données
#
# Prérequis :
#   - PostgreSQL installé et accessible
#   - Fichier .env.test configuré avec DATABASE_URL_TEST
#   - Node.js et npm installés
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

# Afficher un message avec couleur
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

# Vérifier que le script est exécuté depuis la racine du projet
if [ ! -f "package.json" ]; then
  log_error "Ce script doit être exécuté depuis la racine du projet (où se trouve package.json)"
fi

# Vérifier l'existence du fichier .env.test
if [ ! -f ".env.test" ]; then
  log_error "Fichier .env.test introuvable. Créez-le d'abord avec DATABASE_URL_TEST"
fi

log_info "🚀 Initialisation de la base de données de test..."
echo ""

# 1. Charger les variables d'environnement de test
log_info "📋 Chargement des variables d'environnement de test..."
set -a  # Exporter automatiquement toutes les variables
source .env.test
set +a

# Vérifier que DATABASE_URL_TEST est défini
if [ -z "$DATABASE_URL_TEST" ]; then
  log_error "DATABASE_URL_TEST n'est pas défini dans .env.test"
fi

log_success "Variables d'environnement chargées"
echo ""

# 2. Générer les clients Prisma et Zenstack
log_info "🔧 Génération des clients Prisma et Zenstack..."
npm run db:generate

if [ $? -ne 0 ]; then
  log_error "Échec de la génération des clients"
fi

log_success "Clients générés avec succès"
echo ""

# 3. Pousser le schéma vers la base de test
log_info "📤 Push du schéma vers la base de données de test..."
log_warning "ATTENTION : Cette opération va modifier la base de données de test !"
echo ""

# Utiliser DATABASE_URL_TEST pour Prisma
DATABASE_URL="$DATABASE_URL_TEST" npx prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
  log_error "Échec du push du schéma"
fi

log_success "Schéma pushé avec succès"
echo ""

# 4. (Optionnel) Seed des données de test
if [ "$1" == "--seed" ]; then
  log_info "🌱 Seed des données de test..."

  # Vérifier que le script de seed existe
  if [ -f "scripts/seed-test-data.ts" ]; then
    DATABASE_URL="$DATABASE_URL_TEST" npx tsx scripts/seed-test-data.ts

    if [ $? -ne 0 ]; then
      log_warning "Échec du seed (non critique)"
    else
      log_success "Données de test seedées avec succès"
    fi
  else
    log_warning "Script de seed introuvable (scripts/seed-test-data.ts)"
  fi

  echo ""
fi

# 5. Résumé
log_success "🎉 Base de données de test configurée avec succès !"
echo ""
echo "Prochaines étapes :"
echo "  1. Exécuter les tests : npm run test"
echo "  2. Voir la couverture : npm run test:coverage"
echo "  3. Interface graphique : npm run test:ui"
echo ""
echo "Base de données de test :"
echo "  URL : $DATABASE_URL_TEST"
echo ""

# Afficher les statistiques de la base
log_info "📊 Statistiques de la base de données de test :"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma db execute --stdin <<EOF
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF

echo ""
log_success "✨ Setup terminé !"
