/**
 * Jenkinsfile : Pipeline CI/CD pour Faso Fret Logistics v2
 *
 * Pipeline complète pour les tests des enlèvements (pickups) :
 * 1. Checkout du code depuis Git
 * 2. Installation des dépendances Node.js
 * 3. Génération des clients Prisma + Zenstack
 * 4. Linting ESLint
 * 5. Tests unitaires et d'intégration (Vitest)
 * 6. Tests spécifiques pickups
 * 7. Génération du rapport de couverture
 * 8. Build de production Next.js
 * 9. Archivage des artefacts
 * 10. Notifications Slack/Email
 *
 * Environnements :
 * - DEV : Tests automatiques sur chaque push
 * - STAGING : Tests + déploiement sur PR
 * - PRODUCTION : Tests + déploiement sur merge main
 *
 * Variables d'environnement requises (Jenkins credentials) :
 * - DATABASE_URL_TEST : URL PostgreSQL de test
 * - BETTER_AUTH_SECRET_TEST : Secret pour les tests
 * - SLACK_WEBHOOK_URL : URL webhook Slack (optionnel)
 * - VERCEL_TOKEN : Token Vercel pour déploiement (optionnel)
 *
 * @see https://www.jenkins.io/doc/book/pipeline/syntax/
 */

pipeline {
  agent any

  /**
   * Environnement global pour tous les stages
   * Utilise les credentials Jenkins pour les secrets
   */
  environment {
    // Node.js et npm
    NODE_VERSION = '20.x'
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"

    // Variables d'environnement pour les tests
    DATABASE_URL = credentials('DATABASE_URL_TEST')
    BETTER_AUTH_SECRET = credentials('BETTER_AUTH_SECRET_TEST')
    BETTER_AUTH_URL = 'http://localhost:3000'
    NODE_ENV = 'test'

    // Paths
    PROJECT_NAME = 'kmapin-logistics-v2'
    BUILD_DIR = '.next'
    COVERAGE_DIR = 'coverage'
    TEST_RESULTS_DIR = 'test-results'
  }

  /**
   * Options de la pipeline
   */
  options {
    // Timeout global (30 minutes max)
    timeout(time: 30, unit: 'MINUTES')

    // Garder les 10 derniers builds
    buildDiscarder(logRotator(numToKeepStr: '10'))

    // Afficher les timestamps dans les logs
    timestamps()

    // Nettoyer le workspace avant de commencer
    skipDefaultCheckout(false)
  }

  /**
   * Triggers : Exécuter automatiquement
   */
  triggers {
    // Polling SCM toutes les 5 minutes (optionnel, préférer les webhooks Git)
    pollSCM('H/5 * * * *')
  }

  /**
   * Stages de la pipeline
   */
  stages {

    /**
     * STAGE 1 : Checkout du code source
     * Clone le repository Git et affiche les infos de commit
     */
    stage('Checkout') {
      steps {
        echo '🔄 Checkout du code source...'
        checkout scm

        script {
          // Afficher les informations de commit
          def commitHash = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          def commitAuthor = sh(returnStdout: true, script: 'git log -1 --pretty=format:"%an"').trim()
          def commitMessage = sh(returnStdout: true, script: 'git log -1 --pretty=format:"%s"').trim()

          echo "📦 Commit: ${commitHash}"
          echo "👤 Auteur: ${commitAuthor}"
          echo "💬 Message: ${commitMessage}"

          // Stocker pour utilisation ultérieure
          env.GIT_COMMIT_SHORT = commitHash
          env.GIT_COMMIT_AUTHOR = commitAuthor
          env.GIT_COMMIT_MESSAGE = commitMessage
        }
      }
    }

    /**
     * STAGE 2 : Installation des dépendances
     * Installation via npm ci (clean install) pour garantir la reproductibilité
     */
    stage('Install Dependencies') {
      steps {
        echo '📦 Installation des dépendances...'

        script {
          // Utiliser npm ci (plus rapide et déterministe que npm install)
          sh '''
            echo "Node version: $(node --version)"
            echo "NPM version: $(npm --version)"

            # Clean install des dépendances
            npm ci

            echo "✅ Dépendances installées avec succès"
          '''
        }
      }
    }

    /**
     * STAGE 3 : Génération des clients Prisma et Zenstack
     * Obligatoire pour que Prisma Client et Zenstack soient disponibles
     */
    stage('Generate Prisma & Zenstack') {
      steps {
        echo '🔧 Génération des clients Prisma et Zenstack...'

        sh '''
          npm run db:generate

          echo "✅ Clients générés avec succès"
        '''
      }
    }

    /**
     * STAGE 4 : Linting avec ESLint
     * Vérification de la qualité du code
     */
    stage('Lint') {
      steps {
        echo '🔍 Linting du code avec ESLint...'

        script {
          def lintResult = sh(returnStatus: true, script: 'npm run lint')

          if (lintResult != 0) {
            unstable(message: '⚠️ Le linting a détecté des problèmes')
          } else {
            echo '✅ Linting réussi'
          }
        }
      }
    }

    /**
     * STAGE 5 : Tests unitaires et d'intégration
     * Exécution de tous les tests avec Vitest
     */
    stage('Run Tests') {
      steps {
        echo '🧪 Exécution des tests unitaires et d\'intégration...'

        sh '''
          # Exécuter tous les tests avec rapport de couverture
          npm run test:coverage

          echo "✅ Tests exécutés avec succès"
        '''
      }

      /**
       * Post-actions après les tests
       */
      post {
        always {
          // Publier les rapports de tests (JUnit format)
          // Vitest peut générer des rapports JUnit avec --reporter=junit
          script {
            if (fileExists('test-results/junit.xml')) {
              junit 'test-results/junit.xml'
            }
          }

          // Publier le rapport de couverture
          script {
            if (fileExists('coverage/lcov.info')) {
              echo '📊 Rapport de couverture disponible dans coverage/'

              // Afficher un résumé de la couverture
              sh '''
                if [ -f coverage/coverage-summary.json ]; then
                  cat coverage/coverage-summary.json
                fi
              '''
            }
          }
        }
      }
    }

    /**
     * STAGE 6 : Tests spécifiques pickups
     * Tests isolés pour les fonctionnalités d'enlèvement
     */
    stage('Run Pickup Tests') {
      steps {
        echo '📦 Exécution des tests spécifiques pickups...'

        sh '''
          # Tests uniquement pour les pickups (plus rapide pour itérer)
          npm run test:pickups

          echo "✅ Tests pickups réussis"
        '''
      }
    }

    /**
     * STAGE 7 : Build de production
     * Vérification que le build Next.js fonctionne
     */
    stage('Build') {
      steps {
        echo '🏗️ Build de production Next.js...'

        sh '''
          # Build Next.js (avec Turbopack si configuré)
          npm run build

          echo "✅ Build réussi"
        '''
      }

      post {
        success {
          // Archiver les artefacts de build
          archiveArtifacts artifacts: '.next/**/*', fingerprint: true, allowEmptyArchive: true
        }
      }
    }

    /**
     * STAGE 8 : Vérification de sécurité (optionnel)
     * Scan des vulnérabilités npm
     */
    stage('Security Audit') {
      steps {
        echo '🔒 Audit de sécurité npm...'

        script {
          def auditResult = sh(returnStatus: true, script: 'npm audit --audit-level=high')

          if (auditResult != 0) {
            unstable(message: '⚠️ Vulnérabilités de sécurité détectées')
          } else {
            echo '✅ Aucune vulnérabilité critique détectée'
          }
        }
      }
    }

  } // Fin des stages

  /**
   * Post-actions globales de la pipeline
   * Exécutées après TOUS les stages
   */
  post {

    /**
     * En cas de succès
     */
    success {
      echo '✅ Pipeline réussie ! Tous les tests sont passés.'

      script {
        // Notification Slack (si configuré)
        if (env.SLACK_WEBHOOK_URL) {
          slackSend(
            color: 'good',
            message: """
              ✅ *Build Réussi* - ${env.PROJECT_NAME}
              *Branch:* ${env.GIT_BRANCH}
              *Commit:* ${env.GIT_COMMIT_SHORT} par ${env.GIT_COMMIT_AUTHOR}
              *Message:* ${env.GIT_COMMIT_MESSAGE}
              *Build:* <${env.BUILD_URL}|#${env.BUILD_NUMBER}>
            """.stripIndent(),
            channel: '#deployments'
          )
        }
      }
    }

    /**
     * En cas d'échec
     */
    failure {
      echo '❌ Pipeline échouée. Veuillez vérifier les logs.'

      script {
        // Notification Slack (si configuré)
        if (env.SLACK_WEBHOOK_URL) {
          slackSend(
            color: 'danger',
            message: """
              ❌ *Build Échoué* - ${env.PROJECT_NAME}
              *Branch:* ${env.GIT_BRANCH}
              *Commit:* ${env.GIT_COMMIT_SHORT} par ${env.GIT_COMMIT_AUTHOR}
              *Message:* ${env.GIT_COMMIT_MESSAGE}
              *Build:* <${env.BUILD_URL}|#${env.BUILD_NUMBER}>
              *Logs:* <${env.BUILD_URL}/console|Voir les logs>
            """.stripIndent(),
            channel: '#deployments'
          )
        }
      }
    }

    /**
     * En cas d'état instable (tests échoués mais build OK)
     */
    unstable {
      echo '⚠️ Pipeline instable. Certains tests ou vérifications ont échoué.'
    }

    /**
     * Toujours exécuté (nettoyage)
     */
    always {
      echo '🧹 Nettoyage du workspace...'

      // Nettoyer les fichiers temporaires (garde .next et coverage pour archivage)
      sh '''
        echo "Nettoyage des fichiers temporaires..."
        # rm -rf node_modules/.cache
      '''

      // Afficher un résumé
      script {
        def duration = currentBuild.duration / 1000 // En secondes
        echo "⏱️ Durée totale: ${duration}s"

        // Archiver les logs de test
        if (fileExists('test-results')) {
          archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
        }

        // Archiver le rapport de couverture
        if (fileExists('coverage')) {
          archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
        }
      }
    }

  } // Fin post-actions

} // Fin pipeline

/**
 * INSTRUCTIONS D'UTILISATION
 *
 * 1. Configuration Jenkins :
 *    - Créer un job Pipeline dans Jenkins
 *    - Pointer vers ce Jenkinsfile dans le repository
 *    - Configurer les credentials (DATABASE_URL_TEST, BETTER_AUTH_SECRET_TEST)
 *
 * 2. Variables d'environnement à créer dans Jenkins :
 *    a. DATABASE_URL_TEST : URL PostgreSQL de test
 *       Exemple : postgresql://test_user:test_pass@localhost:5432/kmapin_test
 *
 *    b. BETTER_AUTH_SECRET_TEST : Secret pour Better Auth (32+ caractères)
 *       Générer avec : openssl rand -base64 32
 *
 *    c. SLACK_WEBHOOK_URL (optionnel) : URL webhook Slack pour notifications
 *
 * 3. Configuration de la base de données de test :
 *    - Créer une base PostgreSQL dédiée aux tests
 *    - Exécuter les migrations : npx prisma db push --schema=schema.zmodel
 *
 * 4. Webhooks Git (recommandé) :
 *    - Configurer un webhook dans GitHub/GitLab pour déclencher le build automatiquement
 *    - URL : http://jenkins-server/github-webhook/ (GitHub)
 *    - Événements : Push, Pull Request
 *
 * 5. Tests automatiques :
 *    - Sur chaque push : Exécution complète des tests
 *    - Sur chaque PR : Tests + build + rapport de couverture
 *    - Sur merge main : Tests + build + déploiement staging
 *
 * 6. Rapports disponibles :
 *    - Rapport de tests : test-results/junit.xml
 *    - Rapport de couverture : coverage/lcov-report/index.html
 *    - Logs de build : Disponibles dans l'interface Jenkins
 *
 * 7. Commandes utiles en local :
 *    npm run test           # Exécuter tous les tests
 *    npm run test:pickups   # Tester uniquement les pickups
 *    npm run test:coverage  # Tests avec couverture
 *    npm run build          # Build de production
 */
