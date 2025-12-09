import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fonction utilitaire pour fusionner les classes Tailwind CSS
 * Utilise clsx pour la gestion conditionnelle et tailwind-merge pour éviter les conflits
 *
 * @param inputs - Classes CSS à fusionner
 * @returns Classes CSS fusionnées sans conflits
 *
 * @example
 * ```tsx
 * cn("px-4 py-2", condition && "bg-blue-500", "text-white")
 * // => "px-4 py-2 bg-blue-500 text-white" (si condition est true)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
