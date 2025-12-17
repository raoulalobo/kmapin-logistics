#!/bin/bash

source .env

PROD_URL="https://v2-n0r1u5umf-nathanaelalobo-4808s-projects.vercel.app"

echo "🔄 Ajout des variables à Vercel (production)..."
echo ""

# Fonction pour ajouter une variable
add_var() {
    local name=$1
    local value=$2
    echo "  ⚙️  $name"
    echo "$value" | vercel env add "$name" production 2>&1 | grep -v "Vercel CLI" || true
}

add_var "DATABASE_URL" "$DATABASE_URL"
add_var "DIRECT_URL" "$DIRECT_URL"
add_var "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET"
add_var "BETTER_AUTH_URL" "$PROD_URL"
add_var "BACKBLAZE_KEY_ID" "$BACKBLAZE_KEY_ID"
add_var "BACKBLAZE_APPLICATION_KEY" "$BACKBLAZE_APPLICATION_KEY"
add_var "BACKBLAZE_BUCKET_NAME" "$BACKBLAZE_BUCKET_NAME"
add_var "BACKBLAZE_REGION" "$BACKBLAZE_REGION"
add_var "BACKBLAZE_ENDPOINT" "$BACKBLAZE_ENDPOINT"

echo ""
echo "✅ Synchronisation terminée!"
echo "🔗 Vérifiez: https://vercel.com/nathanaelalobo-4808s-projects/v2/settings/environment-variables"
