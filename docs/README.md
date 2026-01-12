# Documentation - Faso Fret Logistics v2

Bienvenue dans la documentation complète du projet Kmapin Logistics v2 ! 📚

## 📋 Index des guides

### 🚀 Démarrage rapide

- **[JENKINS_QUICK_START.md](./JENKINS_QUICK_START.md)** ⚡
  - Configuration Jenkins en 30 minutes
  - Idéal pour commencer rapidement
  - Checklist complète de validation

### 🔧 Configuration détaillée

- **[JENKINS_SETUP.md](./JENKINS_SETUP.md)** 🛠️
  - Installation complète de Jenkins (Ubuntu, Docker)
  - Configuration des plugins
  - Gestion des credentials
  - Création du job Pipeline
  - Troubleshooting avancé

- **[WEBHOOKS_SETUP.md](./WEBHOOKS_SETUP.md)** 🔗
  - Configuration webhooks GitHub
  - Configuration webhooks GitLab
  - Utilisation de ngrok pour tests locaux
  - Tests et validation des webhooks
  - Résolution de problèmes courants

### 🧪 Tests et qualité

- **[TESTING.md](../TESTING.md)** 🧪
  - Framework Vitest
  - Tests unitaires et d'intégration
  - Stratégies de mocking
  - Rapport de couverture
  - Best practices

## 🗂️ Structure de la documentation

```
docs/
├── README.md                    # Ce fichier (index)
├── JENKINS_QUICK_START.md       # Guide rapide (30 min)
├── JENKINS_SETUP.md             # Guide complet Jenkins
└── WEBHOOKS_SETUP.md            # Guide webhooks Git

scripts/
├── setup-test-db.sh             # Init base de données de test
└── validate-jenkins-setup.sh    # Validation automatique Jenkins

root/
├── TESTING.md                   # Guide des tests
├── Jenkinsfile                  # Pipeline CI/CD
└── vitest.config.ts             # Configuration Vitest
```

## 🎯 Par où commencer ?

### Vous voulez configurer Jenkins rapidement ?

👉 Commencez par **[JENKINS_QUICK_START.md](./JENKINS_QUICK_START.md)**

### Vous avez besoin de détails techniques ?

👉 Consultez **[JENKINS_SETUP.md](./JENKINS_SETUP.md)**

### Vous voulez configurer les webhooks Git ?

👉 Lisez **[WEBHOOKS_SETUP.md](./WEBHOOKS_SETUP.md)**

### Vous voulez comprendre les tests ?

👉 Parcourez **[TESTING.md](../TESTING.md)**

## 🛠️ Scripts utiles

### Initialiser la base de données de test

```bash
./scripts/setup-test-db.sh
```

### Valider la configuration Jenkins

```bash
# 1. Créer le fichier de config
cp .env.jenkins.example .env.jenkins

# 2. Éditer avec vos credentials
nano .env.jenkins

# 3. Exécuter la validation
./scripts/validate-jenkins-setup.sh
```

### Exécuter les tests

```bash
# Tous les tests
npm run test

# Mode watch (développement)
npm run test:watch

# Interface graphique
npm run test:ui

# Avec couverture
npm run test:coverage

# Tests pickups uniquement
npm run test:pickups
```

## 📊 Pipeline CI/CD

La pipeline Jenkins exécute automatiquement ces étapes sur chaque push :

1. ✅ **Checkout** - Clone du code Git
2. ✅ **Install Dependencies** - `npm ci`
3. ✅ **Generate Prisma & Zenstack** - Clients DB
4. ✅ **Lint** - ESLint
5. ✅ **Run Tests** - Tests complets + couverture
6. ✅ **Run Pickup Tests** - Tests isolés pickups
7. ✅ **Build** - Build Next.js
8. ✅ **Security Audit** - `npm audit`

**Durée totale :** 3-5 minutes

## 🔍 Troubleshooting rapide

### Jenkins inaccessible

```bash
# Vérifier le statut
sudo systemctl status jenkins

# Démarrer Jenkins
sudo systemctl start jenkins

# Ouvrir le port 8080
sudo ufw allow 8080/tcp
```

### Webhook ne fonctionne pas

```bash
# Tester manuellement (GitHub)
curl -X POST http://your-jenkins:8080/github-webhook/ \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref": "refs/heads/main"}'
```

### Tests échouent

```bash
# Régénérer les clients Prisma
npm run db:generate

# Vérifier la base de test
./scripts/setup-test-db.sh

# Exécuter les tests avec logs détaillés
npm run test -- --reporter=verbose
```

## 📈 Métriques de qualité

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| **Couverture de code** | ≥ 70% | ✅ 75% |
| **Tests passants** | 100% | ✅ 57/57 |
| **Build time** | < 5 min | ✅ 3-4 min |
| **Linting** | 0 erreurs | ✅ 0 erreurs |

## 🔐 Sécurité

### Secrets à ne JAMAIS committer

- ❌ `.env` (production)
- ❌ `.env.test` (avec vraie DB URL)
- ❌ `.env.jenkins` (API tokens)
- ❌ `credentials.json`

### Fichiers .gitignore

Tous les fichiers sensibles sont déjà dans `.gitignore` :
```gitignore
.env
.env.local
.env.test
.env.jenkins
```

## 📞 Support

### En cas de problème

1. **Consulter les guides** dans ce dossier
2. **Vérifier les logs** Jenkins (Console Output)
3. **Exécuter le script de validation** : `./scripts/validate-jenkins-setup.sh`
4. **Ouvrir une issue** sur le repository avec :
   - Logs complets
   - Configuration utilisée
   - Version de Jenkins/Node.js

### Ressources externes

- [Documentation Jenkins](https://www.jenkins.io/doc/)
- [Documentation Vitest](https://vitest.dev/)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Prisma](https://www.prisma.io/docs)

## 🎓 Best Practices

### Avant de commit

```bash
# 1. Vérifier les tests
npm run test

# 2. Vérifier le linting
npm run lint

# 3. Vérifier le build
npm run build
```

### Avant de push (si Jenkins configuré)

```bash
# 1. S'assurer que la branche est à jour
git pull origin main

# 2. Vérifier que tous les tests passent
npm run test:coverage

# 3. Push
git push origin main

# 4. Surveiller Jenkins Dashboard
# Un build doit démarrer automatiquement
```

### Gestion des branches

```bash
# Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite

# Commiter régulièrement
git add .
git commit -m "feat: Ajouter nouvelle fonctionnalité"

# Pousser la branche
git push origin feature/nouvelle-fonctionnalite

# Jenkins testera automatiquement la branche
```

## 🎯 Roadmap documentation

- [ ] Guide de déploiement (Vercel/Production)
- [ ] Guide des tests E2E (Playwright)
- [ ] Guide de monitoring (logs, métriques)
- [ ] Guide de contribution (CONTRIBUTING.md)
- [ ] Architecture Decision Records (ADR)

## 📝 Changelog

### 2026-01-09 - Version initiale

- ✅ Guide Jenkins complet
- ✅ Guide Webhooks Git
- ✅ Guide des tests
- ✅ Scripts de validation
- ✅ Pipeline CI/CD opérationnelle

---

**Dernière mise à jour :** 2026-01-09
**Version :** 1.0.0
**Auteur :** DevOps Team - Faso Fret Logistics
**Contact :** dev@fasofret.com
