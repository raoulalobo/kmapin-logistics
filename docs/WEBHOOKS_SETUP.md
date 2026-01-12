# Guide de Configuration des Webhooks Git

Ce guide détaille la configuration des webhooks pour déclencher automatiquement la pipeline Jenkins sur chaque push Git.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Webhook GitHub](#webhook-github)
3. [Webhook GitLab](#webhook-gitlab)
4. [Exposer Jenkins localement (ngrok)](#exposer-jenkins-localement-ngrok)
5. [Test des webhooks](#test-des-webhooks)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prérequis

Avant de configurer les webhooks, vérifier :

### 1. Jenkins est accessible depuis Internet

**Test depuis une autre machine ou depuis votre navigateur :**
```
http://your-jenkins-server-ip:8080/
```

**Exemples d'URLs valides :**
- `http://54.123.45.67:8080/` (IP publique)
- `http://jenkins.fasofret.com:8080/` (nom de domaine)
- `https://jenkins.fasofret.com/` (HTTPS avec reverse proxy)

**URLs NON valides pour webhooks :**
- ❌ `http://localhost:8080/` (GitHub/GitLab ne peuvent pas accéder à localhost)
- ❌ `http://192.168.1.100:8080/` (IP privée, pas accessible depuis Internet)

### 2. Le port Jenkins est ouvert dans le firewall

**Ubuntu/Debian :**
```bash
# Ouvrir le port 8080
sudo ufw allow 8080/tcp
sudo ufw reload

# Vérifier
sudo ufw status
```

**CentOS/RHEL :**
```bash
# Ouvrir le port 8080
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Vérifier
sudo firewall-cmd --list-ports
```

**Cloud providers (AWS, Azure, GCP) :**
- Configurer les Security Groups / Firewall Rules pour autoriser le port 8080 en entrée

### 3. Plugin Git installé dans Jenkins

**Manage Jenkins → Plugins → Installed plugins**

Vérifier la présence de :
- ✅ **Git plugin**
- ✅ **GitHub plugin** (si GitHub)
- ✅ **GitLab plugin** (si GitLab)

---

## 🐙 Webhook GitHub

### Étape 1 : Accéder aux paramètres du repository

1. Aller sur GitHub : https://github.com
2. Ouvrir votre repository (ex: `votre-username/kmapin-v2`)
3. Cliquer sur **Settings** (en haut à droite)
4. Dans le menu de gauche, cliquer sur **Webhooks**
5. Cliquer sur **Add webhook**

### Étape 2 : Configurer le webhook

#### URL du webhook

**Format :**
```
http://your-jenkins-server:8080/github-webhook/
```

**Exemples concrets :**

| Scénario | URL à utiliser |
|----------|----------------|
| Serveur Jenkins avec IP publique | `http://54.123.45.67:8080/github-webhook/` |
| Serveur Jenkins avec domaine | `http://jenkins.fasofret.com:8080/github-webhook/` |
| Jenkins avec HTTPS (reverse proxy) | `https://jenkins.fasofret.com/github-webhook/` |
| Jenkins local avec ngrok | `https://abc123.ngrok.io/github-webhook/` |

**⚠️ IMPORTANT :**
- L'URL doit se terminer par `/github-webhook/` (avec le slash final)
- Utiliser l'IP publique ou le nom de domaine, PAS localhost

#### Configuration complète

| Champ | Valeur | Description |
|-------|--------|-------------|
| **Payload URL** | `http://your-jenkins-server:8080/github-webhook/` | URL de Jenkins accessible depuis Internet |
| **Content type** | `application/json` | Format JSON (recommandé) |
| **Secret** | (laisser vide) | Optionnel : sécurité supplémentaire |
| **SSL verification** | `Enable SSL verification` | Si HTTPS, sinon `Disable` |
| **Which events would you like to trigger this webhook?** | `Just the push event` | Déclencher uniquement sur push |
| **Active** | ✅ Coché | Activer le webhook |

### Étape 3 : Créer le webhook

1. Cliquer sur **Add webhook**
2. GitHub affiche un message : "We'll send a ping to make sure it works"
3. Attendre quelques secondes

### Étape 4 : Vérifier le ping

1. Retourner dans **Settings → Webhooks**
2. Cliquer sur le webhook que vous venez de créer
3. Onglet **Recent Deliveries**
4. Vérifier la première livraison (type: `ping`)

**Résultat attendu :**

| Colonne | Valeur attendue |
|---------|-----------------|
| **Request** | ✅ POST request avec payload |
| **Response** | ✅ HTTP 200 OK (boule verte) |
| **Timestamp** | Date/heure récente |

**Si ✅ HTTP 200 :** Le webhook fonctionne !

**Si ❌ Erreur :** Voir la section [Troubleshooting](#troubleshooting)

### Étape 5 : Tester avec un vrai push

```bash
# Depuis votre repository local
git add .
git commit -m "test: Trigger Jenkins via webhook"
git push origin main
```

**Vérifications :**
1. Retourner sur Jenkins Dashboard
2. Un nouveau build doit démarrer automatiquement (≈ 30 secondes après le push)
3. Dans GitHub → Settings → Webhooks → Recent Deliveries, vous devez voir une nouvelle livraison de type `push`

---

## 🦊 Webhook GitLab

### Étape 1 : Accéder aux paramètres du repository

1. Aller sur GitLab : https://gitlab.com (ou votre instance GitLab)
2. Ouvrir votre repository (ex: `votre-username/kmapin-v2`)
3. Dans le menu de gauche, cliquer sur **Settings → Webhooks**

### Étape 2 : Configurer le webhook

#### URL du webhook

**Format pour GitLab :**
```
http://your-jenkins-server:8080/project/[NOM-DU-JOB-JENKINS]
```

**Exemple concret :**
```
http://jenkins.fasofret.com:8080/project/kmapin-logistics-v2-pipeline
```

**⚠️ IMPORTANT :**
- Remplacer `[NOM-DU-JOB-JENKINS]` par le nom exact de votre job Jenkins
- Si votre job s'appelle "kmapin-logistics-v2-pipeline", l'URL est :
  ```
  http://your-server:8080/project/kmapin-logistics-v2-pipeline
  ```

#### Configuration complète

| Champ | Valeur | Description |
|-------|--------|-------------|
| **URL** | `http://your-jenkins-server:8080/project/kmapin-logistics-v2-pipeline` | URL Jenkins avec nom du job |
| **Secret token** | (laisser vide ou générer) | Optionnel : sécurité |
| **Trigger** | ✅ Push events | Déclencher sur push |
| **Trigger** | ✅ Merge request events | (Optionnel) Déclencher sur MR |
| **SSL verification** | ✅ Enable | Si HTTPS, sinon décocher |

### Étape 3 : Ajouter le webhook

1. Cliquer sur **Add webhook**
2. GitLab affiche un message de confirmation

### Étape 4 : Tester le webhook

1. Dans la liste des webhooks, cliquer sur **Test**
2. Sélectionner **Push events**
3. GitLab envoie un événement de test

**Résultat attendu :**

| Statut | Description |
|--------|-------------|
| ✅ **HTTP 200** | Webhook fonctionne correctement |
| ⚠️ **HTTP 403** | Vérifier les permissions Jenkins |
| ❌ **Connection refused** | Jenkins inaccessible |

### Étape 5 : Tester avec un vrai push

```bash
# Depuis votre repository local
git add .
git commit -m "test: Trigger Jenkins via GitLab webhook"
git push origin main
```

**Vérifications :**
1. Jenkins Dashboard → Un nouveau build doit démarrer
2. GitLab → Settings → Webhooks → View details → Recent events

---

## 🌐 Exposer Jenkins localement (ngrok)

Si Jenkins tourne sur votre machine locale (localhost) et n'est pas accessible depuis Internet, utilisez **ngrok** pour créer un tunnel HTTPS.

### Étape 1 : Installer ngrok

**Linux/Mac :**
```bash
# Télécharger ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# Vérifier l'installation
ngrok version
```

**Windows :**
1. Télécharger : https://ngrok.com/download
2. Extraire le ZIP
3. Ajouter ngrok.exe au PATH

### Étape 2 : Créer un compte ngrok (gratuit)

1. Aller sur https://ngrok.com/
2. Créer un compte (gratuit)
3. Récupérer votre **Authtoken** : https://dashboard.ngrok.com/get-started/your-authtoken

### Étape 3 : Configurer ngrok

```bash
# Ajouter votre authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Étape 4 : Démarrer le tunnel

```bash
# Exposer Jenkins (port 8080)
ngrok http 8080
```

**Résultat affiché :**
```
ngrok

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:8080

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**URL publique générée :** `https://abc123def456.ngrok-free.app`

### Étape 5 : Utiliser l'URL ngrok dans le webhook

**GitHub webhook :**
```
https://abc123def456.ngrok-free.app/github-webhook/
```

**GitLab webhook :**
```
https://abc123def456.ngrok-free.app/project/kmapin-logistics-v2-pipeline
```

**⚠️ Limitations de ngrok gratuit :**
- L'URL change à chaque redémarrage de ngrok
- Limite de 40 connexions/minute
- Pas d'IP fixe

**💡 Recommandation :** Pour production, utiliser un serveur Jenkins avec IP publique ou nom de domaine.

---

## 🧪 Test des webhooks

### Test manuel (curl)

#### Test GitHub webhook

```bash
# Envoyer un payload de test à Jenkins
curl -X POST http://your-jenkins-server:8080/github-webhook/ \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{
    "ref": "refs/heads/main",
    "repository": {
      "name": "kmapin-v2",
      "full_name": "votre-username/kmapin-v2"
    }
  }'
```

**Résultat attendu :**
```
Scheduled polling of kmapin-logistics-v2-pipeline
```

#### Test GitLab webhook

```bash
# Envoyer un payload de test à Jenkins
curl -X POST http://your-jenkins-server:8080/project/kmapin-logistics-v2-pipeline \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Event: Push Hook" \
  -d '{
    "ref": "refs/heads/main",
    "project": {
      "name": "kmapin-v2"
    }
  }'
```

### Test depuis l'interface Git

#### GitHub

1. Settings → Webhooks → Votre webhook
2. Cliquer sur **Recent Deliveries**
3. Sélectionner une livraison
4. Cliquer sur **Redeliver** pour renvoyer le même payload

#### GitLab

1. Settings → Webhooks → Votre webhook
2. Cliquer sur **Test**
3. Sélectionner **Push events**

### Vérifier les logs Jenkins

**Dashboard → Manage Jenkins → System Log**

Rechercher les logs contenant :
```
GitHub webhook triggered build
```

Ou :
```
GitLab webhook triggered build
```

---

## 🐛 Troubleshooting

### Problème 1 : ❌ HTTP 404 Not Found

**Message d'erreur (GitHub) :**
```json
{
  "error": "No such repository on Jenkins"
}
```

**Causes possibles :**

1. **L'URL du webhook est incorrecte**
   - GitHub : Doit être `/github-webhook/` (avec le slash final)
   - GitLab : Doit être `/project/[NOM-DU-JOB]` (nom exact du job)

2. **Le job Jenkins n'existe pas**
   - Vérifier le nom exact du job : Dashboard → Voir le nom
   - Le nom est case-sensitive : `Kmapin` ≠ `kmapin`

**Solution :**

Corriger l'URL du webhook :
```
# GitHub
http://your-server:8080/github-webhook/
          ^^^^^^^^^^^^^^^^ IMPORTANT

# GitLab
http://your-server:8080/project/kmapin-logistics-v2-pipeline
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ IMPORTANT
```

### Problème 2 : ❌ Connection refused / Timeout

**Message d'erreur :**
```
Failed to connect to your-server port 8080: Connection refused
```

**Causes possibles :**

1. **Jenkins n'est pas démarré**
   ```bash
   # Vérifier le statut
   sudo systemctl status jenkins

   # Démarrer Jenkins
   sudo systemctl start jenkins
   ```

2. **Le firewall bloque le port 8080**
   ```bash
   # Ouvrir le port
   sudo ufw allow 8080/tcp
   sudo ufw reload
   ```

3. **Jenkins est sur localhost mais pas accessible depuis Internet**
   - Solution : Utiliser **ngrok** (voir ci-dessus)
   - Ou configurer un reverse proxy (Nginx, Apache)

### Problème 3 : ✅ HTTP 200 mais le build ne démarre pas

**Le webhook répond 200 OK mais Jenkins ne lance pas de build.**

**Causes possibles :**

1. **Le trigger n'est pas activé dans le job Jenkins**

   **Solution :**
   - Dashboard → Job → Configure
   - Section "Build Triggers"
   - ✅ Cocher "GitHub hook trigger for GITScm polling" (GitHub)
   - ✅ Ou "Build when a change is pushed to GitLab" (GitLab)
   - Sauvegarder

2. **La branche du push ne correspond pas à la configuration**

   **Vérifier :**
   - Dashboard → Job → Configure
   - Section "Pipeline" → "Branches to build"
   - Doit contenir : `*/main` ou `**` (toutes les branches)

3. **Le repository Git n'est pas configuré dans Jenkins**

   **Vérifier :**
   - Dashboard → Job → Configure
   - Section "Pipeline" → "Repository URL"
   - Doit correspondre à votre repository GitHub/GitLab

### Problème 4 : ❌ HTTP 403 Forbidden

**Message d'erreur :**
```json
{
  "error": "No valid crumb was included in the request"
}
```

**Cause :** Jenkins CSRF protection bloque le webhook.

**Solution :**

**Option 1 : Désactiver CSRF pour webhooks (recommandé)**

**Manage Jenkins → Security → CSRF Protection**

- Décocher "Prevent Cross Site Request Forgery exploits"
- Ou ajouter une exception pour `/github-webhook/` et `/project/`

**Option 2 : Configurer un authentification token**

Dans le webhook GitHub/GitLab, ajouter un header :
```
X-Jenkins-Crumb: <votre-crumb-token>
```

### Problème 5 : Webhook GitHub fonctionne mais déclenche 2 builds

**Cause :** Le trigger "Poll SCM" est activé en plus du webhook.

**Solution :**

**Dashboard → Job → Configure → Build Triggers**

- ✅ Garder : "GitHub hook trigger for GITScm polling"
- ❌ Désactiver : "Poll SCM"

### Problème 6 : ngrok "ERR_NGROK_108"

**Message d'erreur :**
```
ERR_NGROK_108: You've hit your free account limit
```

**Cause :** Limite de connexions atteinte (40/minute en gratuit).

**Solutions :**

1. **Attendre 1 minute** puis réessayer
2. **Upgrader vers ngrok Pro** ($8/mois)
3. **Utiliser un serveur Jenkins avec IP publique** (recommandé pour production)

---

## 📊 Monitoring des webhooks

### Logs GitHub

**Settings → Webhooks → Recent Deliveries**

Pour chaque livraison :
- **Request :** Payload envoyé par GitHub
- **Response :** Réponse de Jenkins
- **Redelivery :** Bouton pour renvoyer le même payload

### Logs GitLab

**Settings → Webhooks → Edit → Recent events**

- **Request URL :** URL appelée
- **Response status :** Code HTTP
- **Execution time :** Temps de réponse

### Logs Jenkins

**Dashboard → Manage Jenkins → System Log → Add new log recorder**

**Name :** `Webhook Triggers`

**Loggers :**
- `com.cloudbees.jenkins.GitHubPushTrigger` (GitHub)
- `com.dabsquared.gitlabjenkins` (GitLab)

**Log level :** `ALL`

Sauvegarder, puis consulter les logs en temps réel.

---

## 🚀 Configuration avancée

### Webhooks pour toutes les branches (Multibranch Pipeline)

Créer un **Multibranch Pipeline** pour tester automatiquement toutes les branches :

**New Item → Multibranch Pipeline → Branch Sources → GitHub**

Jenkins créera automatiquement un job pour chaque branche.

### Webhooks pour Pull Requests / Merge Requests

**GitHub :**
- Webhook → "Which events?" → ✅ "Pull requests"
- Jenkins doit avoir le plugin "GitHub Pull Request Builder"

**GitLab :**
- Webhook → Trigger → ✅ "Merge request events"

### Sécuriser les webhooks avec un secret

#### GitHub

1. Webhook → "Secret" → Générer un token aléatoire
   ```bash
   openssl rand -hex 20
   ```

2. Dans Jenkins → Job → Configure → Build Triggers
   - Cocher "GitHub hook trigger"
   - Ajouter le secret dans les paramètres avancés

#### GitLab

1. Webhook → "Secret token" → Générer un token
   ```bash
   openssl rand -hex 20
   ```

2. Dans Jenkins → Job → Configure
   - Plugin GitLab → "Secret token" → Ajouter le token

---

## ✅ Checklist de validation

- [ ] Jenkins accessible depuis Internet (IP publique ou ngrok)
- [ ] Port 8080 ouvert dans le firewall
- [ ] Plugin GitHub ou GitLab installé dans Jenkins
- [ ] Webhook créé dans GitHub/GitLab
- [ ] URL du webhook correcte (`/github-webhook/` ou `/project/[JOB]`)
- [ ] Test manuel réussi (Recent Deliveries → HTTP 200 ✅)
- [ ] Test avec un vrai push → Build automatique déclenché ✅
- [ ] Logs Jenkins montrent "webhook triggered" ✅

---

## 📞 Support

En cas de problème persistant :
1. Consulter la section [Troubleshooting](#troubleshooting)
2. Vérifier les logs Jenkins et GitHub/GitLab
3. Tester avec `curl` pour isoler le problème
4. Ouvrir une issue avec :
   - URL du webhook (masquer les secrets)
   - Réponse HTTP (200, 403, 404, etc.)
   - Logs Jenkins complets

---

**Dernière mise à jour :** 2026-01-09
**Auteur :** DevOps Team - Faso Fret Logistics
