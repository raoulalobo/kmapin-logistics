# Guide d'Installation et Configuration Jenkins

Ce guide détaille l'installation complète de Jenkins et la configuration de la pipeline CI/CD pour Faso Fret Logistics v2.

## 📋 Table des matières

1. [Installation de Jenkins](#installation-de-jenkins)
2. [Configuration initiale](#configuration-initiale)
3. [Installation des plugins](#installation-des-plugins)
4. [Configuration des credentials](#configuration-des-credentials)
5. [Création du job Pipeline](#création-du-job-pipeline)
6. [Configuration des Webhooks Git](#configuration-des-webhooks-git)
7. [Test de la pipeline](#test-de-la-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Installation de Jenkins

### Option 1 : Installation sur Ubuntu/Debian

```bash
# 1. Ajouter la clé GPG Jenkins
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

# 2. Ajouter le repository Jenkins
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | \
  sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# 3. Installer Jenkins
sudo apt-get update
sudo apt-get install jenkins -y

# 4. Démarrer Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# 5. Vérifier le statut
sudo systemctl status jenkins
```

**Jenkins sera accessible sur :** `http://localhost:8080`

### Option 2 : Installation avec Docker

```bash
# 1. Créer un volume pour la persistance des données
docker volume create jenkins-data

# 2. Lancer Jenkins
docker run -d \
  --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins-data:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts

# 3. Récupérer le mot de passe initial
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Récupérer le mot de passe initial (installation native)

```bash
sudo cat /var/jenkins_home/secrets/initialAdminPassword
```

Copiez ce mot de passe, vous en aurez besoin pour l'étape suivante.

---

## ⚙️ Configuration initiale

### 1. Premier accès à Jenkins

1. Ouvrir `http://localhost:8080` dans votre navigateur
2. Coller le mot de passe initial récupéré précédemment
3. Cliquer sur "Continue"

### 2. Installation des plugins suggérés

1. Choisir **"Install suggested plugins"**
2. Attendre la fin de l'installation (5-10 minutes)

### 3. Créer le premier utilisateur admin

Remplir le formulaire :
- **Username :** `admin`
- **Password :** `[votre_mot_de_passe_sécurisé]`
- **Full name :** `Jenkins Admin`
- **Email :** `admin@fasofret.com`

Cliquer sur "Save and Continue"

### 4. Configuration de l'URL Jenkins

- **Jenkins URL :** `http://your-server-ip:8080/` (ou votre nom de domaine)
- Cliquer sur "Save and Finish"

---

## 🔌 Installation des plugins

Jenkins a besoin de plugins supplémentaires pour notre pipeline.

### 1. Accéder à la gestion des plugins

**Dashboard → Manage Jenkins → Plugins → Available plugins**

### 2. Plugins requis

Rechercher et installer les plugins suivants (cocher les cases) :

#### Plugins Git et SCM
- ✅ **Git plugin** (normalement déjà installé)
- ✅ **GitHub plugin** (si vous utilisez GitHub)
- ✅ **GitLab plugin** (si vous utilisez GitLab)
- ✅ **GitHub Branch Source plugin**

#### Plugins de build
- ✅ **NodeJS Plugin** (pour gérer les versions de Node.js)
- ✅ **Pipeline** (normalement déjà installé)
- ✅ **Pipeline: Stage View Plugin**

#### Plugins de notifications
- ✅ **Slack Notification Plugin** (pour notifications Slack)
- ✅ **Email Extension Plugin** (pour notifications email)

#### Plugins de reporting
- ✅ **JUnit Plugin** (pour rapports de tests)
- ✅ **HTML Publisher Plugin** (pour rapport de couverture)
- ✅ **Cobertura Plugin** ou **Code Coverage API Plugin**

### 3. Installer les plugins

1. Cocher tous les plugins listés ci-dessus
2. Cliquer sur "Install" (en bas de la page)
3. Cocher "Restart Jenkins when installation is complete"
4. Attendre le redémarrage de Jenkins (2-3 minutes)

---

## 🔐 Configuration des credentials

### 1. Accéder aux credentials

**Dashboard → Manage Jenkins → Credentials → System → Global credentials (unrestricted) → Add Credentials**

### 2. Ajouter DATABASE_URL_TEST

**Type de credential :** Secret text

| Champ | Valeur |
|-------|--------|
| **Kind** | Secret text |
| **Scope** | Global |
| **Secret** | `postgresql://neondb_owner:npg_WGn1soJ8Qepf@ep-lively-rain-ahgmowzu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| **ID** | `DATABASE_URL_TEST` |
| **Description** | URL de la base de données PostgreSQL de test (Neon) |

Cliquer sur "Create"

### 3. Ajouter BETTER_AUTH_SECRET_TEST

**Générer d'abord le secret :**

```bash
# Sur votre machine locale
openssl rand -base64 32
```

**Type de credential :** Secret text

| Champ | Valeur |
|-------|--------|
| **Kind** | Secret text |
| **Scope** | Global |
| **Secret** | `[coller le secret généré]` |
| **ID** | `BETTER_AUTH_SECRET_TEST` |
| **Description** | Secret Better Auth pour les tests |

Cliquer sur "Create"

### 4. (Optionnel) Ajouter SLACK_WEBHOOK_URL

Si vous souhaitez des notifications Slack :

**Créer d'abord un webhook Slack :**
1. Aller sur https://api.slack.com/apps
2. Créer une nouvelle app
3. Activer "Incoming Webhooks"
4. Créer un nouveau webhook pour votre channel (ex: #deployments)
5. Copier l'URL du webhook

**Type de credential :** Secret text

| Champ | Valeur |
|-------|--------|
| **Kind** | Secret text |
| **Scope** | Global |
| **Secret** | `https://hooks.slack.com/services/YOUR/WEBHOOK/URL` |
| **ID** | `SLACK_WEBHOOK_URL` |
| **Description** | Webhook Slack pour notifications CI/CD |

Cliquer sur "Create"

### 5. (Si repository privé) Ajouter les credentials Git

**Pour GitHub :**

**Type de credential :** Username with password

| Champ | Valeur |
|-------|--------|
| **Kind** | Username with password |
| **Scope** | Global |
| **Username** | `votre-username-github` |
| **Password** | `[Personal Access Token GitHub]` |
| **ID** | `github-credentials` |
| **Description** | Credentials GitHub pour accès au repository |

**Créer un Personal Access Token GitHub :**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → Cocher "repo" (Full control of private repositories)
3. Copier le token généré

---

## 🏗️ Création du job Pipeline

### 1. Créer un nouveau job

**Dashboard → New Item**

| Champ | Valeur |
|-------|--------|
| **Item name** | `kmapin-logistics-v2-pipeline` |
| **Type** | Pipeline |

Cliquer sur "OK"

### 2. Configuration générale du job

#### Section "General"

- ✅ Cocher **"Discard old builds"**
  - Strategy : Log Rotation
  - Max # of builds to keep : `10`

- Description :
  ```
  Pipeline CI/CD pour Faso Fret Logistics v2
  Tests automatiques des enlèvements (pickups) + Build Next.js
  ```

#### Section "Build Triggers"

- ✅ Cocher **"GitHub hook trigger for GITScm polling"** (si vous utilisez GitHub)
- OU ✅ Cocher **"Build when a change is pushed to GitLab"** (si vous utilisez GitLab)
- OU ✅ Cocher **"Poll SCM"** (si pas de webhook)
  - Schedule : `H/5 * * * *` (toutes les 5 minutes)

### 3. Configuration du Pipeline

#### Section "Pipeline"

| Champ | Valeur |
|-------|--------|
| **Definition** | Pipeline script from SCM |
| **SCM** | Git |
| **Repository URL** | `https://github.com/votre-username/kmapin-v2.git` (ou GitLab URL) |
| **Credentials** | `github-credentials` (si repository privé) ou `- none -` (si public) |
| **Branches to build** | `*/main` (ou `*/master`) |
| **Script Path** | `Jenkinsfile` |

#### Section "Pipeline" → "Additional Behaviours"

Cliquer sur "Add" → **"Clean before checkout"** (pour éviter les conflits)

### 4. Sauvegarder

Cliquer sur "Save" en bas de la page

---

## 🔗 Configuration des Webhooks Git

### Option 1 : Webhook GitHub

#### 1. Accéder aux settings du repository

GitHub → Votre repository → **Settings → Webhooks → Add webhook**

#### 2. Configurer le webhook

| Champ | Valeur |
|-------|--------|
| **Payload URL** | `http://your-jenkins-server:8080/github-webhook/` |
| **Content type** | `application/json` |
| **SSL verification** | Enable (si HTTPS) ou Disable (si HTTP local) |
| **Which events would you like to trigger this webhook?** | Just the push event |
| **Active** | ✅ Coché |

**IMPORTANT :** Remplacer `your-jenkins-server` par :
- L'IP publique de votre serveur Jenkins (ex: `54.123.45.67`)
- Ou un nom de domaine (ex: `jenkins.fasofret.com`)
- `localhost` ne fonctionnera PAS (GitHub ne peut pas accéder à localhost)

#### 3. Créer le webhook

Cliquer sur "Add webhook"

#### 4. Tester le webhook

1. Retourner dans Settings → Webhooks
2. Cliquer sur le webhook créé
3. Onglet "Recent Deliveries"
4. Vérifier que la réponse est **200 OK** (vert)

**Si erreur :**
- Vérifier que Jenkins est accessible depuis Internet
- Vérifier le firewall (port 8080 doit être ouvert)
- Utiliser un service comme **ngrok** pour exposer Jenkins localement

### Option 2 : Webhook GitLab

#### 1. Accéder aux settings du repository

GitLab → Votre repository → **Settings → Webhooks**

#### 2. Configurer le webhook

| Champ | Valeur |
|-------|--------|
| **URL** | `http://your-jenkins-server:8080/project/kmapin-logistics-v2-pipeline` |
| **Secret token** | (laisser vide ou générer un token) |
| **Trigger** | ✅ Push events |
| **Trigger** | ✅ Merge request events (optionnel) |
| **SSL verification** | ✅ Enable (si HTTPS) |

#### 3. Ajouter le webhook

Cliquer sur "Add webhook"

#### 4. Tester le webhook

1. Cliquer sur "Test" → "Push events"
2. Vérifier que la réponse est **HTTP 200** (succès)

### Option 3 : Utiliser ngrok pour exposer Jenkins localement

Si Jenkins est sur votre machine locale et non accessible depuis Internet :

```bash
# 1. Installer ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# 2. S'authentifier (créer un compte sur ngrok.com)
ngrok config add-authtoken YOUR_AUTH_TOKEN

# 3. Exposer Jenkins (port 8080)
ngrok http 8080
```

**Résultat :**
```
Forwarding    https://abc123.ngrok.io -> http://localhost:8080
```

**Utiliser cette URL dans le webhook GitHub/GitLab :**
```
https://abc123.ngrok.io/github-webhook/
```

---

## 🧪 Test de la pipeline

### 1. Déclencher un build manuellement

**Dashboard → kmapin-logistics-v2-pipeline → Build Now**

### 2. Surveiller l'exécution

1. Cliquer sur le numéro du build (ex: `#1`)
2. Cliquer sur "Console Output" pour voir les logs en temps réel

### 3. Vérifier les stages

La pipeline doit exécuter ces 8 stages :

1. ✅ **Checkout** - Clone du code Git
2. ✅ **Install Dependencies** - `npm ci`
3. ✅ **Generate Prisma & Zenstack** - `npm run db:generate`
4. ✅ **Lint** - `npm run lint`
5. ✅ **Run Tests** - `npm run test:coverage`
6. ✅ **Run Pickup Tests** - `npm run test:pickups`
7. ✅ **Build** - `npm run build`
8. ✅ **Security Audit** - `npm audit`

### 4. Résultat attendu

**Si tout fonctionne :**
- ✅ Build status : **SUCCESS** (boule bleue)
- ✅ Durée : 3-5 minutes
- ✅ Notification Slack envoyée (si configuré)

**Logs attendus (fin) :**
```
✅ Pipeline réussie ! Tous les tests sont passés.
🧹 Nettoyage du workspace...
⏱️ Durée totale: 245s
Finished: SUCCESS
```

### 5. Tester le webhook

1. Faire un commit et push sur votre repository :
   ```bash
   git add .
   git commit -m "test: Trigger Jenkins pipeline"
   git push origin main
   ```

2. Retourner sur Jenkins Dashboard
3. Vérifier qu'un nouveau build démarre automatiquement (≈ 30 secondes après le push)

---

## 📊 Consulter les rapports

### Rapport de tests (JUnit)

**Dashboard → kmapin-logistics-v2-pipeline → [Build #X] → Test Result**

### Rapport de couverture de code

**Dashboard → kmapin-logistics-v2-pipeline → [Build #X] → Coverage Report**

Si le plugin HTML Publisher est installé, vous verrez :
- Lignes couvertes : XX%
- Branches couvertes : XX%
- Fonctions couvertes : XX%

### Artefacts de build

**Dashboard → kmapin-logistics-v2-pipeline → [Build #X] → Build Artifacts**

Télécharger :
- `.next/` (build Next.js)
- `coverage/` (rapport de couverture)
- `test-results/` (résultats des tests)

---

## 🐛 Troubleshooting

### Problème 1 : "npm: command not found"

**Cause :** Node.js n'est pas installé sur le serveur Jenkins.

**Solution :**

#### Installer Node.js sur le serveur Jenkins

```bash
# Installation Node.js 20.x sur Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

#### OU configurer Node.js via le plugin Jenkins

**Manage Jenkins → Tools → NodeJS installations → Add NodeJS**

| Champ | Valeur |
|-------|--------|
| **Name** | `NodeJS 20` |
| **Install automatically** | ✅ Coché |
| **Version** | `NodeJS 20.x` |

Puis modifier le Jenkinsfile pour utiliser ce Node.js :

```groovy
pipeline {
  agent any

  tools {
    nodejs 'NodeJS 20'  // Ajouter cette ligne
  }

  // ... reste du Jenkinsfile
}
```

### Problème 2 : Webhook ne déclenche pas le build

**Vérifications :**

1. **Jenkins est-il accessible depuis Internet ?**
   ```bash
   # Tester depuis une autre machine
   curl http://your-jenkins-server:8080/
   ```

2. **Le firewall bloque-t-il le port 8080 ?**
   ```bash
   # Ouvrir le port 8080 (Ubuntu/Debian)
   sudo ufw allow 8080/tcp
   sudo ufw reload
   ```

3. **Le webhook est-il correctement configuré ?**
   - GitHub : Vérifier "Recent Deliveries" → Response doit être **200 OK**
   - GitLab : Tester le webhook → Doit retourner **HTTP 200**

4. **Jenkins a-t-il le plugin GitHub/GitLab installé ?**
   - Manage Jenkins → Plugins → Installed plugins
   - Vérifier "GitHub plugin" ou "GitLab plugin"

### Problème 3 : Tests échouent avec "Cannot connect to database"

**Cause :** La variable `DATABASE_URL_TEST` n'est pas correctement configurée.

**Solution :**

1. Vérifier que le credential existe :
   - Manage Jenkins → Credentials → Vérifier `DATABASE_URL_TEST`

2. Vérifier que Jenkins peut accéder à la base Neon :
   ```bash
   # Tester la connexion depuis le serveur Jenkins
   psql "postgresql://neondb_owner:npg_WGn1soJ8Qepf@ep-lively-rain-ahgmowzu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

3. Vérifier les logs de build pour voir la valeur de DATABASE_URL :
   - Console Output → Rechercher "DATABASE_URL"

### Problème 4 : Build très lent (>10 minutes)

**Causes possibles :**

1. **`npm ci` télécharge toutes les dépendances à chaque build**
   - Solution : Utiliser un cache npm

2. **Tests s'exécutent en mode séquentiel**
   - Solution : Configurer Vitest pour paralléliser

**Amélioration du Jenkinsfile (cache npm) :**

```groovy
environment {
  NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
}

stage('Install Dependencies') {
  steps {
    // Utiliser le cache npm du workspace
    sh 'npm ci --cache ${NPM_CONFIG_CACHE}'
  }
}
```

### Problème 5 : Notifications Slack ne fonctionnent pas

**Vérifications :**

1. **Le plugin Slack est-il installé ?**
   - Manage Jenkins → Plugins → Installed → "Slack Notification Plugin"

2. **Le credential SLACK_WEBHOOK_URL est-il configuré ?**
   - Manage Jenkins → Credentials → Vérifier `SLACK_WEBHOOK_URL`

3. **Le webhook Slack est-il valide ?**
   - Tester manuellement :
     ```bash
     curl -X POST -H 'Content-type: application/json' \
       --data '{"text":"Test depuis Jenkins"}' \
       https://hooks.slack.com/services/YOUR/WEBHOOK/URL
     ```

4. **Le Jenkinsfile utilise-t-il correctement slackSend ?**
   - Vérifier que `env.SLACK_WEBHOOK_URL` existe dans le Jenkinsfile

---

## 📈 Optimisations avancées

### 1. Build parallèle (multi-branch pipeline)

Créer un Multibranch Pipeline pour tester automatiquement toutes les branches :

**New Item → Multibranch Pipeline**

### 2. Notifications par email

Configurer le plugin Email Extension :

**Manage Jenkins → System → Extended E-mail Notification**

| Champ | Valeur |
|-------|--------|
| **SMTP server** | `smtp.gmail.com` |
| **SMTP port** | `587` |
| **Use TLS** | ✅ |
| **Username** | `votre-email@gmail.com` |
| **Password** | `[mot de passe d'application]` |

### 3. Badge de build dans README.md

Ajouter un badge Jenkins dans votre README :

```markdown
[![Build Status](http://your-jenkins-server:8080/buildStatus/icon?job=kmapin-logistics-v2-pipeline)](http://your-jenkins-server:8080/job/kmapin-logistics-v2-pipeline/)
```

### 4. Blue Ocean (interface moderne)

Installer le plugin **Blue Ocean** pour une interface Jenkins moderne :

**Manage Jenkins → Plugins → Available → Blue Ocean**

Accéder via : `http://localhost:8080/blue/`

---

## 🎯 Checklist de validation

Avant de considérer Jenkins comme opérationnel :

- [ ] Jenkins accessible via `http://your-server:8080`
- [ ] Tous les plugins installés (Git, NodeJS, Slack, JUnit)
- [ ] Credentials configurés (DATABASE_URL_TEST, BETTER_AUTH_SECRET_TEST)
- [ ] Job Pipeline créé (`kmapin-logistics-v2-pipeline`)
- [ ] Jenkinsfile détecté et validé
- [ ] Webhook Git configuré (GitHub ou GitLab)
- [ ] Premier build manuel réussi ✅
- [ ] Build automatique déclenché par push Git ✅
- [ ] Tests passent (57/57) ✅
- [ ] Couverture de code ≥ 70% ✅
- [ ] Build Next.js réussi ✅
- [ ] Notifications Slack fonctionnent (si configuré) ✅
- [ ] Artefacts archivés (coverage, test-results, .next) ✅

---

## 📞 Support

En cas de blocage :
1. Consulter la section [Troubleshooting](#troubleshooting)
2. Vérifier les logs Jenkins (Console Output)
3. Consulter la documentation officielle : https://www.jenkins.io/doc/
4. Ouvrir une issue sur le repository avec :
   - Logs Jenkins complets
   - Configuration du job (copie du Jenkinsfile)
   - Version de Jenkins (`Manage Jenkins → About Jenkins`)

---

**Dernière mise à jour :** 2026-01-09
**Version Jenkins recommandée :** 2.440+ (LTS)
**Auteur :** DevOps Team - Faso Fret Logistics
