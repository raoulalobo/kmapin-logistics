# GitHub Actions Quick Start - Configuration en 10 minutes ⚡

Ce guide vous permet de configurer GitHub Actions en **10 minutes** chrono !

## 🚀 Étapes rapides (10 minutes)

### 1️⃣ Vérifier les prérequis (1 min)

```bash
# Votre projet doit être sur GitHub
git remote -v
# Devrait afficher : https://github.com/votre-username/kmapin-v2.git

# Vérifier que le workflow existe
ls -la .github/workflows/ci.yml
# Devrait afficher : .github/workflows/ci.yml
```

✅ Si le fichier `.github/workflows/ci.yml` existe, passez à l'étape suivante.

❌ Si le fichier n'existe pas, il a déjà été créé automatiquement.

---

### 2️⃣ Configurer les Secrets GitHub (3 min)

#### a) Accéder aux Secrets

1. Aller sur https://github.com/votre-username/kmapin-v2
2. Cliquer sur **Settings** (en haut à droite)
3. Menu gauche → **Secrets and variables → Actions**
4. Cliquer sur **New repository secret**

#### b) Ajouter DATABASE_URL_TEST

| Champ | Valeur |
|-------|--------|
| **Name** | `DATABASE_URL_TEST` |
| **Secret** | `postgresql://neondb_owner:npg_WGn1soJ8Qepf@ep-lively-rain-ahgmowzu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |

Cliquer sur **Add secret** ✅

#### c) Ajouter BETTER_AUTH_SECRET_TEST

**Générer le secret :**
```bash
openssl rand -base64 32
```

| Champ | Valeur |
|-------|--------|
| **Name** | `BETTER_AUTH_SECRET_TEST` |
| **Secret** | `[coller le résultat de la commande ci-dessus]` |

Cliquer sur **Add secret** ✅

**Vérification :** Vous devez voir 2 secrets dans la liste.

---

### 3️⃣ Activer le Workflow (2 min)

```bash
# Commit le workflow (si pas déjà fait)
git add .github/workflows/ci.yml
git commit -m "ci: Add GitHub Actions workflow"

# Push vers GitHub
git push origin main
```

**C'est tout !** Le workflow va s'exécuter automatiquement. 🎉

---

### 4️⃣ Vérifier l'exécution (2 min)

1. Aller sur https://github.com/votre-username/kmapin-v2
2. Cliquer sur l'onglet **Actions** (en haut)
3. Vous devriez voir "CI/CD Pipeline" en cours d'exécution

**Attendre 3-5 minutes** ⏱️

**Résultat attendu :**

| Job | Status | Durée |
|-----|--------|-------|
| 🧪 Tests & Couverture | ✅ | ~2 min |
| 📦 Tests Pickups | ✅ | ~1 min |
| 🏗️ Build Next.js | ✅ | ~1-2 min |
| 🔒 Security Audit | ✅ | ~30s |

**Si tout est vert :** ✅ Configuration réussie !

---

### 5️⃣ Ajouter un Badge (2 min)

Ouvrir votre `README.md` et ajouter en haut :

```markdown
# Faso Fret Logistics v2

[![CI/CD Pipeline](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/votre-username/kmapin-v2/actions/workflows/ci.yml)

Plateforme de gestion logistique pour transport multi-modal.
```

**Remplacer :**
- `votre-username` par votre nom d'utilisateur GitHub
- `kmapin-v2` par le nom de votre repository

**Commit et push :**
```bash
git add README.md
git commit -m "docs: Add CI/CD badge"
git push origin main
```

Le badge affichera le statut du workflow (✅ passing ou ❌ failing).

---

## ✅ Configuration terminée !

**Vous avez maintenant :**
- ✅ GitHub Actions configuré et opérationnel
- ✅ Tests automatiques sur chaque push
- ✅ Tests automatiques sur chaque Pull Request
- ✅ Rapport de couverture généré automatiquement
- ✅ Badge de build dans le README

---

## 🧪 Tester le Workflow

### Test 1 : Push simple

```bash
# Faire un changement
echo "# Test" >> test.txt
git add test.txt
git commit -m "test: Trigger GitHub Actions"
git push origin main

# Vérifier sur GitHub → Actions
# Un nouveau workflow doit apparaître et s'exécuter
```

### Test 2 : Pull Request

```bash
# Créer une branche
git checkout -b feature/test-pr

# Faire un changement
echo "Test PR" >> test.txt
git add test.txt
git commit -m "feat: Test PR"
git push origin feature/test-pr

# Créer la PR sur GitHub
# Le workflow s'exécutera automatiquement
# Un commentaire avec la couverture sera ajouté à la PR
```

---

## 🐛 Problèmes courants

### ❌ "Workflow does not trigger"

**Solution :**
1. Vérifier que le fichier est bien dans `.github/workflows/ci.yml` (avec le point initial)
2. Vérifier que le fichier a été pushé : `git log --oneline`
3. Forcer un nouveau push : `git commit --allow-empty -m "ci: Trigger" && git push`

### ❌ "Cannot connect to database"

**Solution :**
1. Vérifier que le secret `DATABASE_URL_TEST` existe : Settings → Secrets
2. Vérifier qu'il n'y a pas d'espaces avant/après l'URL
3. Re-créer le secret si nécessaire

### ❌ "Tests fail locally but pass on GitHub Actions"

**Solution :**
```bash
# S'assurer d'utiliser les mêmes variables d'environnement
cp .env.test.example .env.test
# Éditer .env.test avec les bonnes valeurs

# Exécuter les tests avec les variables d'environnement
npm run test
```

---

## 📊 Que fait le Workflow ?

Le workflow exécute automatiquement ces actions **sur chaque push et Pull Request** :

### 🧪 Tests & Couverture
- ✅ Installe Node.js 20.x
- ✅ Installe les dépendances (`npm ci`)
- ✅ Génère les clients Prisma et Zenstack
- ✅ Exécute ESLint (`npm run lint`)
- ✅ Exécute TOUS les tests avec couverture
- ✅ Upload le rapport de couverture
- ✅ Commente les PR avec le résumé
- ✅ Vérifie que la couverture ≥ 70%

### 📦 Tests Pickups
- ✅ Exécute les tests isolés pour les enlèvements
- ✅ Valide le module pickups spécifiquement

### 🏗️ Build Next.js
- ✅ Build complet de l'application
- ✅ Vérifie qu'il n'y a pas d'erreurs de build
- ✅ Upload le build en artefact

### 🔒 Security Audit
- ✅ Scan des vulnérabilités npm
- ✅ Alerte si vulnérabilités critiques

---

## 🚀 Prochaines étapes

### 1. Activer les Branch Protection Rules

Protéger la branche `main` pour exiger que les tests passent avant de merger :

1. GitHub → Settings → Branches
2. Add branch protection rule
3. Branch name pattern : `main`
4. ✅ Require status checks to pass before merging
5. ✅ Require branches to be up to date before merging
6. Chercher "CI/CD Pipeline" et cocher tous les jobs
7. Save changes

Maintenant, **impossible de merger une PR si les tests échouent** ! 🛡️

### 2. Ajouter des notifications Slack (optionnel)

Si vous voulez des notifications Slack en cas d'échec :

1. Créer un webhook Slack : https://api.slack.com/apps
2. Ajouter le secret `SLACK_WEBHOOK_URL` dans GitHub
3. Le workflow enverra automatiquement des notifications

### 3. Déploiement automatique (optionnel)

Ajouter un job de déploiement vers Vercel :

```yaml
deploy:
  name: 🚀 Deploy to Production
  runs-on: ubuntu-latest
  needs: [test, build]
  if: github.ref == 'refs/heads/main'

  steps:
    - name: Deploy to Vercel
      run: vercel --prod --yes
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 📚 Documentation complète

Pour plus de détails :
- **[GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)** - Guide complet
- **[TESTING.md](../TESTING.md)** - Guide des tests

---

## ✅ Checklist finale

- [ ] Secrets GitHub configurés (DATABASE_URL_TEST, BETTER_AUTH_SECRET_TEST)
- [ ] Workflow committé et pushé
- [ ] Premier workflow exécuté avec succès ✅
- [ ] Badge ajouté dans README.md
- [ ] Tests locaux passent : `npm run test`
- [ ] Branch protection activée (optionnel)

**Si tous les points sont cochés → GitHub Actions opérationnel ! 🎉**

---

## 🆚 GitHub Actions vs Jenkins

| Critère | GitHub Actions | Jenkins |
|---------|----------------|---------|
| **Setup** | ✅ 10 minutes | ❌ 30+ minutes |
| **Coût** | ✅ Gratuit | ❌ Infrastructure |
| **Maintenance** | ✅ Zéro | ❌ Régulière |
| **Intégration GitHub** | ✅ Native | ⚠️ Via plugins |
| **Configuration** | ✅ YAML simple | ❌ Interface web |

**Recommandation :** Utilisez GitHub Actions ! Plus simple, plus rapide, gratuit.

---

**Temps total : 10 minutes** ⏱️

**Dernière mise à jour :** 2026-01-09
