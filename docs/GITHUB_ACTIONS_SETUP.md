# Guide de Configuration GitHub Actions

Ce guide explique comment configurer GitHub Actions pour automatiser les tests et le CI/CD de Faso Fret Logistics v2.

## 📋 Table des matières

1. [Pourquoi GitHub Actions ?](#pourquoi-github-actions-)
2. [Prérequis](#prérequis)
3. [Configuration des Secrets](#configuration-des-secrets)
4. [Activation du Workflow](#activation-du-workflow)
5. [Comprendre le Workflow](#comprendre-le-workflow)
6. [Ajouter un Badge](#ajouter-un-badge)
7. [Tests et Validation](#tests-et-validation)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Pourquoi GitHub Actions ?

### Avantages vs Jenkins

| Critère | GitHub Actions | Jenkins |
|---------|----------------|---------|
| **Installation** | ✅ Aucune (intégré GitHub) | ❌ Serveur requis |
| **Configuration** | ✅ Fichier YAML simple | ❌ Interface web complexe |
| **Coût** | ✅ Gratuit (repos publics) | ❌ Infrastructure à gérer |
| **Maintenance** | ✅ Zéro | ❌ Mises à jour régulières |
| **Intégration** | ✅ Native GitHub (PR, Issues) | ⚠️ Via plugins |
| **Parallélisation** | ✅ Multi-jobs automatique | ⚠️ Configuration manuelle |
| **Notifications** | ✅ Intégrées (PR comments) | ⚠️ Via plugins |

**Recommandation :** GitHub Actions pour la plupart des projets, Jenkins uniquement si besoins très spécifiques.

---

## ✅ Prérequis

### 1. Repository GitHub

Votre projet doit être hébergé sur GitHub :
```bash
# Vérifier la remote Git
git remote -v

# Devrait afficher quelque chose comme :
# origin  https://github.com/votre-username/kmapin-v2.git (fetch)
# origin  https://github.com/votre-username/kmapin-v2.git (push)
```

### 2. Fichiers nécessaires

Vérifier que ces fichiers existent :
- ✅ `.github/workflows/ci.yml` (créé automatiquement)
- ✅ `vitest.config.ts`
- ✅ `package.json` (avec scripts de test)
- ✅ `Jenkinsfile` (optionnel, peut coexister)

### 3. Base de données de test

Vous avez déjà configuré la base Neon PostgreSQL :
```
postgresql://neondb_owner:npg_WGn1soJ8Qepf@ep-lively-rain-ahgmowzu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## 🔐 Configuration des Secrets

GitHub Actions a besoin de secrets pour se connecter à la base de données et exécuter les tests.

### Étape 1 : Accéder aux Secrets GitHub

1. Aller sur GitHub : https://github.com
2. Ouvrir votre repository (ex: `votre-username/kmapin-v2`)
3. Cliquer sur **Settings** (en haut à droite)
4. Dans le menu de gauche, cliquer sur **Secrets and variables → Actions**
5. Cliquer sur **New repository secret**

### Étape 2 : Ajouter DATABASE_URL_TEST

| Champ | Valeur |
|-------|--------|
| **Name** | `DATABASE_URL_TEST` |
| **Secret** | `postgresql://neondb_owner:npg_WGn1soJ8Qepf@ep-lively-rain-ahgmowzu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |

Cliquer sur **Add secret**

### Étape 3 : Ajouter BETTER_AUTH_SECRET_TEST

**Générer d'abord le secret :**
```bash
openssl rand -base64 32
```

| Champ | Valeur |
|-------|--------|
| **Name** | `BETTER_AUTH_SECRET_TEST` |
| **Secret** | `[coller le secret généré]` |

Cliquer sur **Add secret**

### Étape 4 : (Optionnel) Ajouter SLACK_WEBHOOK_URL

Si vous voulez des notifications Slack :

1. Créer un webhook Slack : https://api.slack.com/apps
2. Copier l'URL du webhook

| Champ | Valeur |
|-------|--------|
| **Name** | `SLACK_WEBHOOK_URL` |
| **Secret** | `https://hooks.slack.com/services/YOUR/WEBHOOK/URL` |

Cliquer sur **Add secret**

### Vérification des secrets

Retourner dans **Settings → Secrets and variables → Actions**

Vous devriez voir :
- ✅ `DATABASE_URL_TEST`
- ✅ `BETTER_AUTH_SECRET_TEST`
- ✅ `SLACK_WEBHOOK_URL` (optionnel)

**⚠️ IMPORTANT :** Les secrets ne sont JAMAIS affichés dans les logs GitHub Actions (masqués automatiquement).

---

## 🚀 Activation du Workflow

### Étape 1 : Commit et Push du Workflow

```bash
# Vérifier que le fichier existe
ls -la .github/workflows/ci.yml

# Ajouter le workflow
git add .github/workflows/ci.yml

# Commit
git commit -m "ci: Add GitHub Actions workflow"

# Push vers GitHub
git push origin main
```

### Étape 2 : Vérifier l'exécution

1. Aller sur GitHub → Votre repository
2. Cliquer sur l'onglet **Actions** (en haut)
3. Vous devriez voir le workflow "CI/CD Pipeline" en cours d'exécution

**Durée attendue :** 3-5 minutes

### Étape 3 : Vérifier les résultats

Une fois terminé, vous devriez voir :

| Job | Statut | Durée |
|-----|--------|-------|
| 🧪 Tests & Couverture | ✅ Success | ~2 min |
| 📦 Tests Pickups | ✅ Success | ~1 min |
| 🏗️ Build Next.js | ✅ Success | ~1-2 min |
| 🔒 Security Audit | ✅ Success | ~30s |

**Total :** ✅ All jobs passed

---

## 📊 Comprendre le Workflow

Le workflow `.github/workflows/ci.yml` définit 5 jobs qui s'exécutent automatiquement.

### Déclencheurs (Triggers)

Le workflow s'exécute automatiquement dans ces cas :

#### 1. Push sur main ou develop
```bash
git push origin main
# → Déclenche le workflow automatiquement
```

#### 2. Pull Request vers main ou develop
```bash
# Créer une PR sur GitHub
# → Déclenche le workflow pour valider les changements
```

#### 3. Exécution manuelle
```
GitHub → Actions → CI/CD Pipeline → Run workflow
```

### Jobs du Workflow

#### Job 1 : 🧪 Tests & Couverture (test)

**Ce qui est fait :**
1. Checkout du code
2. Installation Node.js 20.x avec cache npm
3. Installation des dépendances (`npm ci`)
4. Génération Prisma + Zenstack
5. Linting ESLint
6. **Exécution de TOUS les tests avec couverture**
7. Upload du rapport de couverture (artefact)
8. Commentaire automatique sur la PR avec résumé
9. Vérification du seuil de couverture (70% minimum)

**Durée :** ~2 minutes

**Si échec :** Le workflow s'arrête (fast-fail)

#### Job 2 : 📦 Tests Pickups (test-pickups)

**Ce qui est fait :**
1. Exécution des tests isolés pour les pickups (`npm run test:pickups`)
2. Validation spécifique du module enlèvements

**Durée :** ~1 minute

**Dépendance :** Démarre après `test`

#### Job 3 : 🏗️ Build Next.js (build)

**Ce qui est fait :**
1. Build complet de l'application Next.js
2. Vérification que le build fonctionne
3. Upload du build en artefact (`.next/`)

**Durée :** ~1-2 minutes

**Dépendance :** Démarre après `test`

#### Job 4 : 🔒 Security Audit (security)

**Ce qui est fait :**
1. Audit npm des vulnérabilités (`npm audit`)
2. Vérification des vulnérabilités critiques
3. Échec si des vulnérabilités critiques sont trouvées

**Durée :** ~30 secondes

**Exécution :** En parallèle des autres jobs

#### Job 5 : 📊 Summary (summary)

**Ce qui est fait :**
1. Génération d'un résumé de tous les jobs
2. Affichage dans l'onglet "Summary" GitHub Actions
3. Notification Slack en cas d'échec (si configuré)

**Durée :** ~5 secondes

**Exécution :** Toujours (même si échecs)

### Variables d'environnement

Le workflow utilise ces variables (définies dans les Secrets GitHub) :

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
  BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET_TEST }}
  BETTER_AUTH_URL: http://localhost:3000
  NODE_ENV: test
```

---

## 🏷️ Ajouter un Badge

Ajouter un badge de build dans votre `README.md` pour afficher le statut du workflow.

### Badge standard

```markdown
[![CI/CD Pipeline](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml)
```

**Remplacer :**
- `votre-username` par votre nom d'utilisateur GitHub
- `kmapin-v2` par le nom de votre repository

### Badge avec branche spécifique

Pour afficher uniquement le statut de la branche `main` :

```markdown
[![CI/CD Pipeline](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml)
```

### Badge custom

Utiliser shields.io pour un badge personnalisé :

```markdown
[![Tests](https://img.shields.io/github/actions/workflow/status/votre-username/kmapin-v2/ci.yml?label=tests&logo=github)](https://github.com/votre-username/kmapin-v2/actions)
```

### Exemple de README.md

```markdown
# Faso Fret Logistics v2

[![CI/CD Pipeline](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Plateforme de gestion logistique pour transport multi-modal.

## 🚀 Quick Start

...
```

---

## 🧪 Tests et Validation

### Test 1 : Push sur main

```bash
# Faire un changement
echo "# Test GitHub Actions" >> test.txt
git add test.txt
git commit -m "test: Trigger GitHub Actions"
git push origin main

# Vérifier sur GitHub
# GitHub → Actions → Voir le workflow en cours
```

**Résultat attendu :**
- ✅ Workflow démarre automatiquement (≈30 secondes après le push)
- ✅ Tous les jobs passent en ~3-5 minutes
- ✅ Badge devient vert (passing)

### Test 2 : Pull Request

```bash
# Créer une branche
git checkout -b feature/test-ci

# Faire un changement
echo "Test PR" >> test.txt
git add test.txt
git commit -m "feat: Test PR workflow"
git push origin feature/test-ci

# Créer la PR sur GitHub
# GitHub → Pull requests → New pull request
```

**Résultat attendu :**
- ✅ Workflow s'exécute automatiquement pour la PR
- ✅ Commentaire automatique avec résumé de couverture
- ✅ Checks GitHub montrent le statut des tests
- ✅ Merge autorisé uniquement si tous les tests passent

### Test 3 : Exécution manuelle

```
GitHub → Actions → CI/CD Pipeline → Run workflow
Branch : main (ou autre)
→ Cliquer sur "Run workflow"
```

---

## 🐛 Troubleshooting

### Problème 1 : ❌ "Process completed with exit code 1"

**Cause :** Un des tests ou le linting a échoué.

**Solution :**

1. **Cliquer sur le job qui a échoué** pour voir les logs détaillés

2. **Identifier l'erreur** :
   ```
   ❌ FAIL  src/modules/pickups/actions/__tests__/pickup.actions.test.ts
   TypeError: Cannot read property 'id' of undefined
   ```

3. **Reproduire localement** :
   ```bash
   npm run test
   # Ou pour un fichier spécifique
   npm run test -- src/modules/pickups/actions/__tests__/pickup.actions.test.ts
   ```

4. **Corriger l'erreur** et re-push

### Problème 2 : ❌ "Cannot connect to database"

**Cause :** Le secret `DATABASE_URL_TEST` n'est pas configuré ou est incorrect.

**Solution :**

1. Vérifier que le secret existe :
   ```
   GitHub → Settings → Secrets and variables → Actions
   → DATABASE_URL_TEST devrait être visible
   ```

2. Re-créer le secret si nécessaire :
   - Delete secret → Add secret
   - Coller la bonne URL Neon

3. Re-run le workflow :
   ```
   GitHub → Actions → [Workflow échoué] → Re-run all jobs
   ```

### Problème 3 : ⚠️ "Coverage is below 70% threshold"

**Cause :** La couverture de code est inférieure à 70%.

**Solution :**

1. **Télécharger le rapport de couverture** :
   ```
   GitHub → Actions → [Workflow] → Artifacts → coverage-report
   → Download
   ```

2. **Ouvrir le rapport HTML** :
   ```bash
   unzip coverage-report.zip
   open coverage/lcov-report/index.html
   ```

3. **Identifier les fichiers non couverts** (surlignés en rouge)

4. **Ajouter des tests** pour les parties non couvertes

5. **Vérifier localement** :
   ```bash
   npm run test:coverage
   ```

### Problème 4 : ❌ "npm audit found X vulnerabilities"

**Cause :** Des vulnérabilités de sécurité critiques ont été détectées.

**Solution :**

1. **Identifier les vulnérabilités** :
   ```bash
   npm audit
   ```

2. **Tenter la correction automatique** :
   ```bash
   npm audit fix
   ```

3. **Vérifier les changements** :
   ```bash
   npm test
   npm run build
   ```

4. **Commit et push** :
   ```bash
   git add package-lock.json
   git commit -m "fix: Update dependencies to fix vulnerabilities"
   git push origin main
   ```

### Problème 5 : 🕐 "Workflow takes too long (>10 minutes)"

**Cause :** L'installation des dépendances ou les tests sont lents.

**Solution :**

1. **Vérifier le cache npm** :
   Le workflow utilise déjà `cache: 'npm'` mais parfois le cache peut être invalide.

2. **Optimiser les tests** :
   ```typescript
   // vitest.config.ts
   export default defineConfig({
     test: {
       threads: true,  // Parallélisation
       maxConcurrency: 4,
     },
   });
   ```

3. **Réduire les dépendances de dev** (si trop volumineuses)

### Problème 6 : ❌ "Workflow does not trigger"

**Cause :** Le workflow n'est pas configuré pour s'exécuter sur votre branche.

**Solution :**

1. **Vérifier les triggers** dans `.github/workflows/ci.yml` :
   ```yaml
   on:
     push:
       branches:
         - main
         - develop  # Ajouter votre branche si nécessaire
   ```

2. **Re-push** sur la branche :
   ```bash
   git commit --allow-empty -m "chore: Trigger workflow"
   git push origin main
   ```

---

## 📊 Monitoring et Rapports

### Consulter les logs

**GitHub → Actions → [Workflow] → [Job] → [Step]**

Les logs affichent la sortie complète de chaque étape.

### Télécharger les artefacts

**GitHub → Actions → [Workflow] → Artifacts**

Artefacts disponibles :
- **coverage-report** (30 jours de rétention)
  - Rapport HTML de couverture
  - Fichier LCOV pour intégrations (SonarCloud, Codecov)

- **nextjs-build** (7 jours de rétention)
  - Build complet Next.js (`.next/`)

### Résumé du Workflow

**GitHub → Actions → [Workflow] → Summary**

Affiche un tableau récapitulatif :
- Status de chaque job
- Commit hash
- Branche
- Auteur

### Historique des Workflows

**GitHub → Actions**

Liste de tous les workflows exécutés :
- ✅ Success (vert)
- ❌ Failure (rouge)
- ⚠️ Cancelled (gris)

---

## 🔧 Configuration Avancée

### Ajouter des jobs conditionnels

Exécuter un job uniquement sur `main` :

```yaml
deploy:
  name: 🚀 Deploy to Production
  runs-on: ubuntu-latest
  needs: [test, build]
  if: github.ref == 'refs/heads/main'

  steps:
    - name: Deploy to Vercel
      run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Matrix Testing (tester plusieurs versions)

Tester avec Node.js 18, 20, 22 :

```yaml
test:
  strategy:
    matrix:
      node-version: [18.x, 20.x, 22.x]

  steps:
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
```

### Caching personnalisé

Cache supplémentaire pour Prisma :

```yaml
- name: Cache Prisma
  uses: actions/cache@v4
  with:
    path: node_modules/.prisma
    key: ${{ runner.os }}-prisma-${{ hashFiles('**/schema.zmodel') }}
```

### Notifications avancées

Discord au lieu de Slack :

```yaml
- name: Discord notification
  if: failure()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
    title: "CI/CD Pipeline Failed"
```

---

## ✅ Checklist de Validation

Avant de considérer GitHub Actions comme opérationnel :

- [ ] Workflow créé : `.github/workflows/ci.yml` ✅
- [ ] Secrets configurés (DATABASE_URL_TEST, BETTER_AUTH_SECRET_TEST) ✅
- [ ] Workflow committé et pushé vers GitHub ✅
- [ ] Workflow s'exécute automatiquement sur push ✅
- [ ] Tous les jobs passent (test, build, security) ✅
- [ ] Badge ajouté dans README.md ✅
- [ ] PR commentée automatiquement avec couverture ✅
- [ ] Artefacts disponibles (coverage, build) ✅
- [ ] Notifications configurées (optionnel) ✅

---

## 📞 Support

### Ressources

- [Documentation GitHub Actions](https://docs.github.com/en/actions)
- [Marketplace Actions](https://github.com/marketplace?type=actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

### En cas de problème

1. Consulter la section [Troubleshooting](#troubleshooting)
2. Vérifier les logs GitHub Actions
3. Tester localement : `npm run test`
4. Ouvrir une issue sur le repository

---

**Dernière mise à jour :** 2026-01-09
**Version :** 1.0.0
**Auteur :** DevOps Team - Faso Fret Logistics
