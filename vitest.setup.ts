/**
 * Configuration globale des tests Vitest
 *
 * Ce fichier est exécuté AVANT chaque fichier de test.
 * Il configure l'environnement de test global :
 * - Variables d'environnement pour les tests
 * - Mocks globaux (fetch, dates, etc.)
 * - Extensions de matchers Vitest
 *
 * @see vitest.config.ts (setupFiles)
 */

import { vi } from 'vitest';

/**
 * Variables d'environnement pour les tests
 * Ces valeurs remplacent .env pendant l'exécution des tests
 */
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://test:test@localhost:5432/kmapin_test';
process.env.BETTER_AUTH_SECRET = 'test-secret-key-32-characters-long!';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

/**
 * Mock global de fetch pour éviter les appels réseau réels
 * Tous les tests qui utilisent fetch doivent le mocker explicitement
 */
global.fetch = vi.fn();

/**
 * Mock de console.error pour éviter la pollution des logs pendant les tests
 * Les erreurs attendues (throw, rejections) sont silencées
 */
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Ignorer les erreurs React de développement
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render')
  ) {
    return;
  }
  originalConsoleError(...args);
};

/**
 * Mock de Date pour tests déterministes
 * Fige la date à 2026-01-09 12:00:00 UTC
 */
const MOCK_DATE = new Date('2026-01-09T12:00:00.000Z');
vi.setSystemTime(MOCK_DATE);

/**
 * Cleanup après chaque test
 * Réinitialise tous les mocks automatiquement
 */
afterEach(() => {
  vi.clearAllMocks();
});
