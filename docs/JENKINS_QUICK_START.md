# Jenkins Quick Start - Guide Rapide

Ce guide vous permet de configurer Jenkins et les webhooks Git en **30 minutes** chrono ! ⏱️

## 🚀 Étapes rapides (30 minutes)

### 1️⃣ Installer Jenkins (5 min)

**Ubuntu/Debian :**
```bash
# Installation en une ligne
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo gpg --dearmor -o /usr/share/keyrings/jenkins-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.gpg]" https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list
sudo apt update && sudo apt install jenkins -y
sudo systemctl start jenkins
```

**Docker (alternative) :**
```bash
docker run -d --name jenkins -p 8080:8080 -p 50000:50000 -v jenkins-data:/var/jenkins_home jenkins/jenkins:lts
```

**Récupérer le mot de passe initial :**
```bash
sudo cat /var/jenkins_home/secrets/initialAdminPassword
```

**Ouvrir Jenkins :** http://localhost:8080

---

### 2️⃣ Configuration initiale (5 min)

1. Coller le mot de passe initial
2. Choisir **"Install suggested plugins"** → Attendre 5 min
3. Créer le premier utilisateur :
   - Username : `admin`
   - Password : `[votre_mot_de_passe]`
   - Email : `admin@fasofret.com`
4. Jenkins URL : Laisser par défaut ou mettre votre domaine
5. Cliquer sur **"Start using Jenkins"**

---

### 3️⃣ Installer les plugins supplémentaires (3 min)

**Manage Jenkins → Plugins → Available plugins**

Rechercher et installer (cocher les cases) :
- ✅ **NodeJS Plugin**
- ✅ **Slack Notification Plugin** (optionnel)
- ✅ **JUnit Plugin**
- ✅ **HTML Publisher Plugin**

Cliquer sur **"Install"** → **"Restart Jenkins when installation is complete"**

Attendre le redémarrage (2-3 minutes).

---

### 4️⃣ Configurer les credentials (5 min)

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

#### Credential 1 : DATABASE_URL_TEST

| Champ | Valeur |
|-------|--------|
| Kind | Secret text |
| Secret | `postgresql://neondb_owner:npg_WGn1soJ8Qepf@ep-lively-rain-ahgmowzu-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| ID | `DATABASE_URL_TEST` |
| Description | Base de données de test (Neon) |

Cliquer sur **"Create"**

#### Credential 2 : BETTER_AUTH_SECRET_TEST

**Générer d'abord le secret :**
```bash
openssl rand -base64 32
```

| Champ | Valeur |
|-------|--------|
| Kind | Secret text |
| Secret | `[coller le secret généré]` |
| ID | `BETTER_AUTH_SECRET_TEST` |
| Description | Secret Better Auth pour tests |

Cliquer sur **"Create"**

---

### 5️⃣ Créer le job Pipeline (5 min)

**Dashboard → New Item**

| Champ | Valeur |
|-------|--------|
| Name | `kmapin-logistics-v2-pipeline` |
| Type | Pipeline |

Cliquer sur **"OK"**

#### Configuration du job :

**Section "General" :**
- ✅ Discard old builds → Max # of builds to keep : `10`

**Section "Build Triggers" :**
- ✅ GitHub hook trigger for GITScm polling (si GitHub)
- OU ✅ Build when a change is pushed to GitLab (si GitLab)

**Section "Pipeline" :**

| Champ | Valeur |
|-------|--------|
| Definition | Pipeline script from SCM |
| SCM | Git |
| Repository URL | `https://github.com/votre-username/kmapin-v2.git` |
| Credentials | - none - (si repository public) |
| Branches to build | `*/main` |
| Script Path | `Jenkinsfile` |

Cliquer sur **"Save"**

---

### 6️⃣ Configurer le webhook Git (5 min)

#### Pour GitHub :

1. GitHub → Votre repository → **Settings → Webhooks → Add webhook**

| Champ | Valeur |
|-------|--------|
| Payload URL | `http://your-jenkins-server-ip:8080/github-webhook/` |
| Content type | `application/json` |
| SSL verification | Disable (si HTTP local) |
| Events | Just the push event |
| Active | ✅ |

2. Cliquer sur **"Add webhook"**

3. Vérifier : **Settings → Webhooks → Recent Deliveries** → Doit être HTTP 200 ✅

#### Pour GitLab :

1. GitLab → Votre repository → **Settings → Webhooks**

| Champ | Valeur |
|-------|--------|
| URL | `http://your-jenkins-server-ip:8080/project/kmapin-logistics-v2-pipeline` |
| Trigger | ✅ Push events |
| SSL verification | ✅ (si HTTPS) |

2. Cliquer sur **"Add webhook"**

3. Cliquer sur **"Test → Push events"** → Doit retourner HTTP 200 ✅

---

### 7️⃣ Tester la pipeline (2 min)

#### Test manuel :

**Dashboard → kmapin-logistics-v2-pipeline → Build Now**

Attendre 3-5 minutes → Doit être ✅ SUCCESS (boule bleue)

#### Test avec webhook :

```bash
# Depuis votre repository local
git add .
git commit -m "test: Trigger Jenkins pipeline"
git push origin main
```

Retourner sur Jenkins → Un nouveau build doit démarrer automatiquement (≈30 secondes après le push)

---

## ✅ Validation complète

Exécuter le script de validation automatique :

```bash
# 1. Créer le fichier de configuration
cp .env.jenkins.example .env.jenkins

# 2. Éditer et remplir vos credentials
nano .env.jenkins

# 3. Exécuter la validation
./scripts/validate-jenkins-setup.sh
```

**Résultat attendu :**
```
✅ Jenkins est accessible
✅ Authentification Jenkins réussie
✅ Tous les plugins installés
✅ Credentials configurés
✅ Job Pipeline trouvé
✅ Configuration Jenkins validée avec succès !
```

---

## 🐛 Problèmes courants

### Jenkins inaccessible depuis GitHub/GitLab

**Problème :** Webhook retourne "Connection refused"

**Solution rapide (pour tests locaux) :**

```bash
# Installer ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# S'authentifier (créer un compte sur ngrok.com)
ngrok config add-authtoken YOUR_TOKEN

# Exposer Jenkins
ngrok http 8080
```

Utiliser l'URL ngrok (ex: `https://abc123.ngrok.io`) dans le webhook Git.

### Webhook répond 200 mais le build ne démarre pas

**Vérifications :**
1. Dashboard → Job → Configure → Build Triggers
2. ✅ Vérifier que "GitHub hook trigger" ou "GitLab push" est coché
3. Sauvegarder

### Tests échouent avec "Cannot connect to database"

**Vérifier le credential :**
1. Manage Jenkins → Credentials
2. Vérifier que `DATABASE_URL_TEST` existe et est correct
3. Re-créer le credential si besoin

---

## 📚 Documentation complète

Pour plus de détails, consultez :

- **[JENKINS_SETUP.md](./JENKINS_SETUP.md)** - Guide complet d'installation et configuration
- **[WEBHOOKS_SETUP.md](./WEBHOOKS_SETUP.md)** - Guide détaillé des webhooks Git
- **[TESTING.md](../TESTING.md)** - Guide des tests avec Vitest

---

## 🎯 Checklist finale

Avant de considérer Jenkins comme opérationnel :

- [ ] Jenkins accessible via `http://your-server:8080` ✅
- [ ] Plugins installés (Git, NodeJS, JUnit) ✅
- [ ] Credentials configurés (DATABASE_URL_TEST, BETTER_AUTH_SECRET_TEST) ✅
- [ ] Job Pipeline créé ✅
- [ ] Webhook Git configuré ✅
- [ ] Build manuel réussi ✅
- [ ] Build automatique sur push Git ✅
- [ ] Tests passent (57/57) ✅
- [ ] Couverture ≥ 70% ✅

**Si tous les points sont cochés → Configuration terminée ! 🎉**

---

## 🚀 Prochaines étapes

1. **Ajouter un badge de build dans README.md :**
   ```markdown
   [![Build Status](http://your-jenkins-server:8080/buildStatus/icon?job=kmapin-logistics-v2-pipeline)](http://your-jenkins-server:8080/job/kmapin-logistics-v2-pipeline/)
   ```

2. **Configurer les notifications Slack :**
   - Créer un webhook Slack : https://api.slack.com/apps
   - Ajouter le credential `SLACK_WEBHOOK_URL` dans Jenkins
   - Les notifications seront envoyées automatiquement

3. **Activer Blue Ocean (interface moderne) :**
   ```
   Manage Jenkins → Plugins → Blue Ocean → Install
   Accéder via : http://localhost:8080/blue/
   ```

4. **Monitoring des builds :**
   - Dashboard → Build History
   - Consulter les rapports de tests et couverture
   - Analyser les logs en cas d'échec

---

**Temps total estimé : 30 minutes** ⏱️

**Support :** En cas de problème, consultez [JENKINS_SETUP.md](./JENKINS_SETUP.md) ou ouvrez une issue.

**Dernière mise à jour :** 2026-01-09
