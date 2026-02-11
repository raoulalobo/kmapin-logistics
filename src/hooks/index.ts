/**
 * Hooks personnalisés de l'application
 *
 * @module hooks
 */

export { useFilters, type FilterState, type FilterConfig } from './use-filters';
export { useToast } from './use-toast';
export {
  useFormValidation,
  type UseFormValidationOptions,
  type UseFormValidationReturn,
} from './use-form-validation';
export {
  usePendingQuotes,
  type PendingQuote,
  type PendingQuoteFormData,
  type PendingQuoteResult,
} from './use-pending-quotes';
export { useMediaQuery } from './use-media-query';
