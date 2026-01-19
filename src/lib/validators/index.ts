/**
 * Point d'entrée des validateurs communs
 *
 * @module lib/validators
 *
 * @example
 * import { phoneSchema, emailSchema, postalCodeSchema } from '@/lib/validators';
 */

export {
  // Messages
  VALIDATION_MESSAGES,

  // Contact
  emailSchema,
  phoneSchema,
  phoneSchemaOptional,

  // Adresse
  postalCodeSchema,
  postalCodeSchemaOptional,
  addressSchema,
  citySchema,
  countryCodeSchema,

  // Texte
  nameSchema,

  // Dates
  futureDateSchema,
  dateSchema,

  // Nombres
  positiveNumberSchema,
  positiveIntegerSchema,
} from './common';
