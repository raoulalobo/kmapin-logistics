#!/bin/bash

# Script automatique pour synchroniser .env vers Vercel
# Lit le fichier .env et ajoute chaque variable à Vercel

set -e  # Arrêter en cas d'erreur

echo "🔄 Synchronisation des variables d'environnement vers Vercel"
echo "============================================================="
echo ""

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo "❌ Erreur: Fichier .env introuvable"
    exit 1
fi

# Vérifier que vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Erreur: Vercel CLI n'est pas installé"
    echo "   Installez-le avec: npm i -g vercel"
    exit 1
fi

# URL de production Vercel
PRODUCTION_URL="https://v2-n0r1u5umf-nathanaelalobo-4808s-projects.vercel.app"

echo "📋 Lecture des variables depuis .env..."
echo ""

# Compteur
count=0

# Lire le fichier .env ligne par ligne
while IFS= read -r line || [ -n "$line" ]; do
    # Ignorer les commentaires et lignes vides
    if [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]]; then
        continue
    fi

    # Extraire le nom et la valeur
    var_name=$(echo "$line" | cut -d '=' -f 1)
    var_value=$(echo "$line" | cut -d '=' -f 2-)

    # Ignorer si vide
    if [ -z "$var_name" ] || [ -z "$var_value" ]; then
        continue
    fi

    # Cas spécial pour BETTER_AUTH_URL en production
    if [ "$var_name" = "BETTER_AUTH_URL" ]; then
        var_value="$PRODUCTION_URL"
        echo "⚙️  $var_name → $var_value (URL Vercel)"
    else
        # Masquer la valeur pour l'affichage
        masked_value="${var_value:0:10}***"
        echo "⚙️  $var_name → $masked_value"
    fi

    # Ajouter à Vercel pour production
    echo "$var_value" | vercel env add "$var_name" production --yes > /dev/null 2>&1 || true

    ((count++))

done < .env

echo ""
echo "============================================================="
echo "✅ Synchronisation terminée !"
echo "   $count variables ajoutées à Vercel (production)"
echo ""
echo "🔗 Vérifiez sur: https://vercel.com/nathanaelalobo-4808s-projects/v2/settings/environment-variables"
echo ""
echo "🚀 Pour redéployer avec les nouvelles variables:"
echo "   vercel --prod"
echo ""
