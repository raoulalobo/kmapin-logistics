import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Configuration Vitest pour Faso Fret Logistics v2
 *
 * Framework de tests unitaires et d'intégration pour :
 * - Server Actions (modules/pickups/actions)
 * - Composants React (components/pickups)
 * - Utilitaires (lib/utils)
 *
 * Utilise :
 * - @vitejs/plugin-react pour supporter JSX/TSX
 * - happy-dom pour simuler le DOM côté serveur
 * - Path aliases (@/) pour imports comme en prod
 *
 * Commandes :
 * - `npm run test` : Exécuter tous les tests
 * - `npm run test:watch` : Mode watch pour développement
 * - `npm run test:coverage` : Générer rapport de couverture
 * - `npm run test:ui` : Interface graphique Vitest
 */
export default defineConfig({
  plugins: [react()],

  test: {
    // Environnement de test : happy-dom (plus rapide que jsdom)
    environment: 'happy-dom',

    // Fichiers de tests à inclure
    include: [
      '**/__tests__/**/*.{test,spec}.{ts,tsx}',
      '**/*.{test,spec}.{ts,tsx}',
    ],

    // Fichiers à exclure
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'coverage',
    ],

    // Configuration de couverture de code
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/modules/pickups/**/*.{ts,tsx}',
        'src/components/pickups/**/*.{ts,tsx}',
        'src/lib/utils/pickup-*.{ts,tsx}',
      ],
      exclude: [
        '**/*.{test,spec}.{ts,tsx}',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/generated/**',
      ],
      // Seuils de couverture (70% minimum pour pickups)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    // Setup files exécutés avant chaque test
    setupFiles: ['./vitest.setup.ts'],

    // Globals disponibles dans tous les tests (describe, it, expect)
    globals: true,

    // Timeout par défaut pour les tests (10 secondes)
    testTimeout: 10000,

    // Configuration de sortie
    silent: false,
    reporters: ['verbose'],
  },

  // Résolution des path aliases (@/)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
