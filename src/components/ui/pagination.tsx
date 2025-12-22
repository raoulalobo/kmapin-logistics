/**
 * Composant : Pagination
 *
 * Composant de pagination réutilisable avec :
 * - Navigation par numéros de page
 * - Boutons Précédent/Suivant
 * - Ellipsis pour les grandes listes
 * - Accessible (ARIA labels)
 * - Utilise les searchParams Next.js
 *
 * @module components/ui
 */

import Link from 'next/link';
import { CaretLeft, CaretRight, DotsThree } from '@phosphor-icons/react/dist/ssr';

import { Button } from '@/components/ui/button';

/**
 * Props du composant Pagination
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

/**
 * Génère l'URL pour une page donnée
 */
function buildPageUrl(baseUrl: string, page: number, searchParams?: Record<string, string>): string {
  const params = new URLSearchParams(searchParams);
  params.set('page', page.toString());
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Génère les numéros de page à afficher
 * Utilise un algorithme d'ellipsis pour les grandes listes
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const delta = 2; // Nombre de pages à afficher de chaque côté
  const range: (number | 'ellipsis')[] = [];
  const rangeWithDots: (number | 'ellipsis')[] = [];

  // Toujours afficher la première page
  range.push(1);

  // Pages autour de la page courante
  for (let i = currentPage - delta; i <= currentPage + delta; i++) {
    if (i > 1 && i < totalPages) {
      range.push(i);
    }
  }

  // Toujours afficher la dernière page
  if (totalPages > 1) {
    range.push(totalPages);
  }

  // Ajouter les ellipsis
  let prev = 0;
  for (const i of range) {
    if (i === 'ellipsis') continue;

    if (i - prev === 2) {
      rangeWithDots.push(prev + 1);
    } else if (i - prev !== 1) {
      rangeWithDots.push('ellipsis');
    }

    rangeWithDots.push(i);
    prev = i;
  }

  return rangeWithDots;
}

/**
 * Composant de pagination
 */
export function Pagination({ currentPage, totalPages, baseUrl, searchParams }: PaginationProps) {
  // Si une seule page, ne pas afficher la pagination
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex items-center justify-between gap-2"
    >
      {/* Informations sur la page */}
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium">{currentPage}</span> sur{' '}
        <span className="font-medium">{totalPages}</span>
      </p>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        {/* Bouton Précédent */}
        <Button
          variant="outline"
          size="sm"
          asChild={currentPage > 1}
          disabled={currentPage <= 1}
          aria-label="Page précédente"
        >
          {currentPage > 1 ? (
            <Link href={buildPageUrl(baseUrl, currentPage - 1, searchParams)}>
              <CaretLeft className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:ml-2">Précédent</span>
            </Link>
          ) : (
            <span>
              <CaretLeft className="h-4 w-4" />
              <span className="sr-only md:not-sr-only md:ml-2">Précédent</span>
            </span>
          )}
        </Button>

        {/* Numéros de page */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <div
                  key={`ellipsis-${index}`}
                  className="flex h-9 w-9 items-center justify-center"
                  aria-hidden="true"
                >
                  <DotsThree className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            }

            const isActive = page === currentPage;

            return (
              <Button
                key={page}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-9 w-9"
                asChild={!isActive}
                disabled={isActive}
                aria-label={`Page ${page}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive ? (
                  <span>{page}</span>
                ) : (
                  <Link href={buildPageUrl(baseUrl, page, searchParams)}>
                    {page}
                  </Link>
                )}
              </Button>
            );
          })}
        </div>

        {/* Bouton Suivant */}
        <Button
          variant="outline"
          size="sm"
          asChild={currentPage < totalPages}
          disabled={currentPage >= totalPages}
          aria-label="Page suivante"
        >
          {currentPage < totalPages ? (
            <Link href={buildPageUrl(baseUrl, currentPage + 1, searchParams)}>
              <span className="sr-only md:not-sr-only md:mr-2">Suivant</span>
              <CaretRight className="h-4 w-4" />
            </Link>
          ) : (
            <span>
              <span className="sr-only md:not-sr-only md:mr-2">Suivant</span>
              <CaretRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </nav>
  );
}
