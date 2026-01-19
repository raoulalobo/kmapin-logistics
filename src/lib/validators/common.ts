/**
 * Schémas Zod de validation communs pour l'application
 *
 * Ces validateurs sont conçus pour être internationaux et flexibles,
 * supportant les formats de plusieurs pays (France, Burkina Faso,
 * Côte d'Ivoire, Sénégal, Mali, etc.).
 *
 * @module lib/validators/common
 *
 * @example
 * ```ts
 * import { phoneSchema, postalCodeSchema, emailSchema } from '@/lib/validators/common';
 *
 * const mySchema = z.object({
 *   phone: phoneSchema,
 *   postalCode: postalCodeSchema,
 *   email: emailSchema,
 * });
 * ```
 */

import { z } from 'zod';

// ============================================
// MESSAGES D'ERREUR
// ============================================

/**
 * Messages d'erreur personnalisés en français
 * Utilisés par tous les schémas de validation
 */
export const VALIDATION_MESSAGES = {
  required: 'Ce champ est obligatoire',
  email: 'Adresse email invalide',
  phone: 'Numéro de téléphone invalide (ex: +226 70 12 34 56 ou +33 6 12 34 56 78)',
  phoneMinLength: 'Le numéro doit contenir au moins 8 chiffres',
  phoneMaxLength: 'Le numéro ne peut pas dépasser 15 chiffres',
  postalCode: 'Code postal invalide (laissez vide si non applicable)',
  postalCodeMaxLength: 'Le code postal ne peut pas dépasser 10 caractères',
  positiveNumber: 'Le nombre doit être positif',
  minDate: 'La date doit être dans le futur',
  maxLength: (max: number) => `Maximum ${max} caractères`,
  minLength: (min: number) => `Minimum ${min} caractères`,
};

// ============================================
// SCHÉMAS DE BASE - CONTACT
// ============================================

/**
 * Validation d'email internationale
 *
 * Caractéristiques :
 * - Conversion automatique en minuscules
 * - Suppression des espaces avant/après
 * - Validation du format email standard
 *
 * @example
 * emailSchema.parse('User@Example.COM') // → 'user@example.com'
 */
export const emailSchema = z
  .string({ required_error: VALIDATION_MESSAGES.required })
  .email(VALIDATION_MESSAGES.email)
  .toLowerCase()
  .trim();

/**
 * Validation de téléphone internationale flexible
 *
 * Supporte les formats de nombreux pays :
 * - France : +33 6 12 34 56 78, 06 12 34 56 78
 * - Burkina Faso : +226 70 12 34 56
 * - Côte d'Ivoire : +225 07 12 34 56 78
 * - Sénégal : +221 77 123 45 67
 * - Mali : +223 66 12 34 56
 * - Et autres formats internationaux
 *
 * Règles :
 * - Minimum 8 chiffres (numéros locaux courts)
 * - Maximum 15 chiffres (standard E.164)
 * - Accepte : +, espaces, tirets, points comme séparateurs
 * - Le + est optionnel en début
 *
 * Transformation : Supprime tous les séparateurs (espaces, tirets, points)
 *
 * @example
 * phoneSchema.parse('+226 70 12 34 56')   // → '+22670123456'
 * phoneSchema.parse('+33 6 12 34 56 78')  // → '+33612345678'
 * phoneSchema.parse('06.12.34.56.78')     // → '0612345678'
 */
export const phoneSchema = z
  .string({ required_error: VALIDATION_MESSAGES.required })
  .min(8, VALIDATION_MESSAGES.phoneMinLength)
  .refine(
    (val) => {
      // Compter uniquement les chiffres (ignorer +, espaces, tirets, points)
      const digitsOnly = val.replace(/[^\d]/g, '');
      return digitsOnly.length >= 8 && digitsOnly.length <= 15;
    },
    { message: VALIDATION_MESSAGES.phone }
  )
  .refine(
    (val) => {
      // Vérifier que le format est valide (chiffres + séparateurs autorisés)
      return /^[+]?[\d\s.\-()]{8,20}$/.test(val);
    },
    { message: VALIDATION_MESSAGES.phone }
  )
  .transform((val) => {
    // Nettoyer : garder uniquement + et chiffres
    const cleaned = val.replace(/[\s.\-()]/g, '');
    return cleaned;
  });

/**
 * Validation de téléphone optionnelle
 *
 * Même validation que phoneSchema mais accepte :
 * - undefined
 * - chaîne vide ''
 * - null (transformé en undefined)
 *
 * @example
 * phoneSchemaOptional.parse('')           // → undefined
 * phoneSchemaOptional.parse(undefined)    // → undefined
 * phoneSchemaOptional.parse('+226 70 12') // → '+22670123456'
 */
export const phoneSchemaOptional = z
  .string()
  .optional()
  .transform((val) => (val === '' ? undefined : val))
  .pipe(
    z.union([
      z.undefined(),
      phoneSchema,
    ])
  );

// ============================================
// SCHÉMAS DE BASE - ADRESSE
// ============================================

/**
 * Validation de code postal internationale flexible
 *
 * Adapté aux différents formats mondiaux :
 * - France : 5 chiffres (75001)
 * - Sénégal : 5 chiffres (12500)
 * - Burkina Faso : pas de code postal (champ vide autorisé)
 * - Côte d'Ivoire : pas de code postal (champ vide autorisé)
 * - Mali : pas de code postal (champ vide autorisé)
 * - UK : alphanumérique (SW1A 1AA)
 * - Canada : alphanumérique (K1A 0B1)
 *
 * Règles :
 * - Maximum 10 caractères
 * - Accepte chiffres, lettres, espaces, tirets
 * - Chaîne vide autorisée (pays sans code postal)
 *
 * @example
 * postalCodeSchema.parse('75001')      // → '75001'
 * postalCodeSchema.parse('SW1A 1AA')   // → 'SW1A 1AA'
 * postalCodeSchema.parse('')           // → '' (valide pour BF, CI, ML)
 */
export const postalCodeSchema = z
  .string({ required_error: VALIDATION_MESSAGES.required })
  .max(10, VALIDATION_MESSAGES.postalCodeMaxLength)
  .refine(
    (val) => {
      // Vide autorisé (pays sans code postal)
      if (val === '') return true;
      // Format alphanumérique avec espaces/tirets
      return /^[A-Za-z0-9\s\-]{1,10}$/.test(val);
    },
    { message: VALIDATION_MESSAGES.postalCode }
  )
  .transform((val) => val.toUpperCase().trim());

/**
 * Validation de code postal optionnelle
 *
 * Accepte undefined en plus des valeurs du postalCodeSchema
 *
 * @example
 * postalCodeSchemaOptional.parse(undefined) // → undefined
 * postalCodeSchemaOptional.parse('75001')   // → '75001'
 */
export const postalCodeSchemaOptional = z
  .string()
  .max(10, VALIDATION_MESSAGES.postalCodeMaxLength)
  .optional()
  .transform((val) => {
    if (!val || val === '') return undefined;
    return val.toUpperCase().trim();
  });

// ============================================
// SCHÉMAS DE BASE - TEXTE
// ============================================

/**
 * Validation de nom/prénom
 *
 * @param minLength - Longueur minimale (défaut: 2)
 * @param maxLength - Longueur maximale (défaut: 100)
 *
 * @example
 * nameSchema().parse('Jean Dupont') // → 'Jean Dupont'
 * nameSchema(3, 50).parse('AB')     // Erreur: minimum 3 caractères
 */
export const nameSchema = (minLength = 2, maxLength = 100) =>
  z
    .string({ required_error: VALIDATION_MESSAGES.required })
    .min(minLength, VALIDATION_MESSAGES.minLength(minLength))
    .max(maxLength, VALIDATION_MESSAGES.maxLength(maxLength))
    .trim();

/**
 * Validation d'adresse
 *
 * @param minLength - Longueur minimale (défaut: 5)
 * @param maxLength - Longueur maximale (défaut: 200)
 */
export const addressSchema = (minLength = 5, maxLength = 200) =>
  z
    .string({ required_error: VALIDATION_MESSAGES.required })
    .min(minLength, VALIDATION_MESSAGES.minLength(minLength))
    .max(maxLength, VALIDATION_MESSAGES.maxLength(maxLength))
    .trim();

/**
 * Validation de ville
 *
 * @param minLength - Longueur minimale (défaut: 2)
 * @param maxLength - Longueur maximale (défaut: 100)
 */
export const citySchema = (minLength = 2, maxLength = 100) =>
  z
    .string({ required_error: VALIDATION_MESSAGES.required })
    .min(minLength, VALIDATION_MESSAGES.minLength(minLength))
    .max(maxLength, VALIDATION_MESSAGES.maxLength(maxLength))
    .trim();

/**
 * Validation de code pays ISO 3166-1 alpha-2
 *
 * @example
 * countryCodeSchema.parse('fr') // → 'FR'
 * countryCodeSchema.parse('BF') // → 'BF'
 */
export const countryCodeSchema = z
  .string({ required_error: VALIDATION_MESSAGES.required })
  .length(2, 'Code pays ISO à 2 lettres requis (ex: FR, BF, CI)')
  .toUpperCase();

// ============================================
// SCHÉMAS DE BASE - DATES
// ============================================

/**
 * Validation de date future
 *
 * Accepte :
 * - String ISO (2026-01-20)
 * - Objet Date
 *
 * @example
 * futureDateSchema.parse('2026-12-31') // → Date object
 * futureDateSchema.parse(new Date())    // Erreur si dans le passé
 */
export const futureDateSchema = z
  .string({ required_error: VALIDATION_MESSAGES.required })
  .or(z.date())
  .pipe(
    z.coerce.date().refine((date) => date > new Date(), {
      message: VALIDATION_MESSAGES.minDate,
    })
  );

/**
 * Validation de date (passée ou future)
 *
 * Accepte :
 * - String ISO (2026-01-20)
 * - Objet Date
 */
export const dateSchema = z
  .string({ required_error: VALIDATION_MESSAGES.required })
  .or(z.date())
  .pipe(z.coerce.date());

// ============================================
// SCHÉMAS DE BASE - NOMBRES
// ============================================

/**
 * Validation de nombre positif
 *
 * @param message - Message d'erreur personnalisé
 */
export const positiveNumberSchema = (message = VALIDATION_MESSAGES.positiveNumber) =>
  z.number({ invalid_type_error: 'Doit être un nombre' }).positive(message);

/**
 * Validation d'entier positif
 *
 * @param min - Valeur minimale (défaut: 1)
 * @param max - Valeur maximale (défaut: Infinity)
 */
export const positiveIntegerSchema = (min = 1, max = Infinity) =>
  z
    .number({ invalid_type_error: 'Doit être un nombre entier' })
    .int('Doit être un entier')
    .min(min, `Minimum ${min}`)
    .max(max === Infinity ? Number.MAX_SAFE_INTEGER : max, `Maximum ${max}`);
