#!/bin/bash

# Script de configuration des variables d'environnement Vercel
# Pour Faso Fret Logistics - Déploiement Production

echo "🚀 Configuration des variables d'environnement Vercel"
echo "=================================================="
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour ajouter une variable d'environnement
add_env_var() {
    local var_name=$1
    local var_value=$2
    local env_scope=$3  # production, preview, development

    echo -e "${YELLOW}Ajout de ${var_name} pour ${env_scope}...${NC}"
    echo "$var_value" | vercel env add "$var_name" "$env_scope" --yes

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${var_name} ajouté avec succès${NC}"
    else
        echo -e "${RED}✗ Erreur lors de l'ajout de ${var_name}${NC}"
    fi
    echo ""
}

# Lire les variables depuis .env
if [ ! -f .env ]; then
    echo -e "${RED}Erreur: Fichier .env introuvable${NC}"
    exit 1
fi

# Extraire les valeurs depuis .env
source .env

# URL de production Vercel
PRODUCTION_URL="https://v2-n0r1u5umf-nathanaelalobo-4808s-projects.vercel.app"

echo "📋 Variables à configurer :"
echo "  - DATABASE_URL (Neon)"
echo "  - BETTER_AUTH_SECRET"
echo "  - BETTER_AUTH_URL"
echo "  - BACKBLAZE_KEY_ID"
echo "  - BACKBLAZE_APPLICATION_KEY"
echo "  - BACKBLAZE_BUCKET_NAME"
echo "  - BACKBLAZE_REGION"
echo "  - BACKBLAZE_ENDPOINT"
echo ""

read -p "Continuer ? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Abandon."
    exit 0
fi

echo ""
echo "🔐 Ajout des variables d'environnement..."
echo ""

# DATABASE_URL - NEON (Production uniquement)
if [ -n "$DATABASE_URL" ]; then
    add_env_var "DATABASE_URL" "$DATABASE_URL" "production"
else
    echo -e "${RED}⚠️  DATABASE_URL manquant dans .env${NC}"
fi

# BETTER_AUTH_SECRET (tous les environnements)
if [ -n "$BETTER_AUTH_SECRET" ]; then
    add_env_var "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET" "production"
    add_env_var "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET" "preview"
    add_env_var "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET" "development"
else
    echo -e "${RED}⚠️  BETTER_AUTH_SECRET manquant dans .env${NC}"
fi

# BETTER_AUTH_URL (Production uniquement - URL Vercel)
add_env_var "BETTER_AUTH_URL" "$PRODUCTION_URL" "production"

# Variables BACKBLAZE (tous les environnements)
if [ -n "$BACKBLAZE_KEY_ID" ]; then
    add_env_var "BACKBLAZE_KEY_ID" "$BACKBLAZE_KEY_ID" "production"
    add_env_var "BACKBLAZE_KEY_ID" "$BACKBLAZE_KEY_ID" "preview"
    add_env_var "BACKBLAZE_KEY_ID" "$BACKBLAZE_KEY_ID" "development"
else
    echo -e "${YELLOW}⚠️  BACKBLAZE_KEY_ID non configuré (optionnel)${NC}"
fi

if [ -n "$BACKBLAZE_APPLICATION_KEY" ]; then
    add_env_var "BACKBLAZE_APPLICATION_KEY" "$BACKBLAZE_APPLICATION_KEY" "production"
    add_env_var "BACKBLAZE_APPLICATION_KEY" "$BACKBLAZE_APPLICATION_KEY" "preview"
    add_env_var "BACKBLAZE_APPLICATION_KEY" "$BACKBLAZE_APPLICATION_KEY" "development"
else
    echo -e "${YELLOW}⚠️  BACKBLAZE_APPLICATION_KEY non configuré (optionnel)${NC}"
fi

if [ -n "$BACKBLAZE_BUCKET_NAME" ]; then
    add_env_var "BACKBLAZE_BUCKET_NAME" "$BACKBLAZE_BUCKET_NAME" "production"
    add_env_var "BACKBLAZE_BUCKET_NAME" "$BACKBLAZE_BUCKET_NAME" "preview"
    add_env_var "BACKBLAZE_BUCKET_NAME" "$BACKBLAZE_BUCKET_NAME" "development"
else
    echo -e "${YELLOW}⚠️  BACKBLAZE_BUCKET_NAME non configuré (optionnel)${NC}"
fi

if [ -n "$BACKBLAZE_REGION" ]; then
    add_env_var "BACKBLAZE_REGION" "$BACKBLAZE_REGION" "production"
    add_env_var "BACKBLAZE_REGION" "$BACKBLAZE_REGION" "preview"
    add_env_var "BACKBLAZE_REGION" "$BACKBLAZE_REGION" "development"
else
    echo -e "${YELLOW}⚠️  BACKBLAZE_REGION non configuré (optionnel)${NC}"
fi

if [ -n "$BACKBLAZE_ENDPOINT" ]; then
    add_env_var "BACKBLAZE_ENDPOINT" "$BACKBLAZE_ENDPOINT" "production"
    add_env_var "BACKBLAZE_ENDPOINT" "$BACKBLAZE_ENDPOINT" "preview"
    add_env_var "BACKBLAZE_ENDPOINT" "$BACKBLAZE_ENDPOINT" "development"
else
    echo -e "${YELLOW}⚠️  BACKBLAZE_ENDPOINT non configuré (optionnel)${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo ""
echo "📝 Prochaines étapes :"
echo "  1. Vérifiez les variables : https://vercel.com/nathanaelalobo-4808s-projects/v2/settings/environment-variables"
echo "  2. Redéployez l'application : vercel --prod"
echo ""
