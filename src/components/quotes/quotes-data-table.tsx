/**
 * Composant : DataTable TanStack pour la liste des devis
 *
 * Affiche les devis dans un tableau avec :
 * - Colonnes : N° devis (lien), Client, Route, Colis/Poids, Coût, Statut, Actions (⋮)
 * - Tri client par colonne (via TanStack Table)
 * - Menu d'actions contextuel (QuoteActionsMenu) par ligne
 *
 * Ce composant est un Client Component car TanStack Table utilise des hooks React
 * (useReactTable, state interne de tri). Les données sont fetchées côté serveur
 * dans page.tsx puis passées en props ici.
 *
 * @example
 * ```tsx
 * <QuotesDataTable data={quotes} userRole="ADMIN" />
 * ```
 *
 * @module components/quotes
 */

'use client';

import Link from 'next/link';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowsDownUp, ArrowUp, ArrowDown } from '@phosphor-icons/react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { QuoteActionsMenu } from '@/components/quotes/quote-actions-menu';

// ============================================
// TYPES
// ============================================

/**
 * Type d'une ligne de devis telle que retournée par getQuotesAction.
 * On type les champs utilisés dans les colonnes plutôt que d'importer
 * le type Prisma complet (évite couplage + simplifie la sérialisation RSC→Client).
 */
export interface QuoteRow {
  id: string;
  quoteNumber: string;
  status: string;
  originCountry: string;
  destinationCountry: string;
  weight: number;
  cargoType: string;
  estimatedCost: number;
  currency: string;
  validUntil: string | Date;
  paymentReceivedAt: string | Date | null;
  client: { id: string; name: string; email: string } | null;
  _count: { packages: number };
}

interface QuotesDataTableProps {
  /** Liste des devis à afficher (déjà paginée côté serveur) */
  data: QuoteRow[];
  /** Rôle de l'utilisateur connecté — transmis au QuoteActionsMenu */
  userRole: string;
}

// ============================================
// MAPPINGS DE LABELS
// ============================================

/** Labels français pour chaque statut de devis */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
  IN_TREATMENT: 'En traitement',
  VALIDATED: 'Validé',
  CANCELLED: 'Annulé',
};

/**
 * Couleurs Tailwind par statut pour les badges dans la colonne Statut.
 * Chaque statut a un couple bg/text pour un rendu lisible et distinctif.
 */
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-300',
  SENT: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  ACCEPTED: 'bg-green-100 text-green-700 border-green-300',
  REJECTED: 'bg-red-100 text-red-700 border-red-300',
  EXPIRED: 'bg-amber-100 text-amber-700 border-amber-300',
  IN_TREATMENT: 'bg-purple-100 text-purple-700 border-purple-300',
  VALIDATED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-rose-100 text-rose-700 border-rose-300',
};

/** Labels français pour les types de cargo */
const CARGO_LABELS: Record<string, string> = {
  GENERAL: 'Général',
  FOOD: 'Alimentaire',
  ELECTRONICS: 'Électronique',
  PHARMACEUTICALS: 'Pharma',
  CHEMICALS: 'Chimique',
  CONSTRUCTION: 'Construction',
  TEXTILES: 'Textile',
  AUTOMOTIVE: 'Auto',
  MACHINERY: 'Machines',
  PERISHABLE: 'Périssable',
  HAZARDOUS: 'Dangereux',
};

// ============================================
// DÉFINITION DES COLONNES
// ============================================

/**
 * Fabrique les définitions de colonnes TanStack Table.
 *
 * On utilise une fonction (et non une constante) car la colonne "Actions"
 * a besoin du `userRole` qui vient des props du composant parent.
 *
 * Chaque colonne définit :
 * - `accessorKey` ou `accessorFn` : comment extraire la valeur de la ligne
 * - `header` : rendu de l'en-tête (avec icône de tri)
 * - `cell` : rendu de la cellule
 */
function buildColumns(userRole: string): ColumnDef<QuoteRow>[] {
  return [
    // ── N° Devis ──
    {
      accessorKey: 'quoteNumber',
      header: 'N° Devis',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/quotes/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.quoteNumber}
        </Link>
      ),
    },

    // ── Client ──
    {
      accessorFn: (row) => row.client?.name ?? '—',
      id: 'client',
      header: 'Client',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue() as string}</span>
      ),
    },

    // ── Route (Origine → Destination) ──
    {
      accessorFn: (row) => `${row.originCountry} → ${row.destinationCountry}`,
      id: 'route',
      header: 'Route',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.originCountry} → {row.original.destinationCountry}
        </span>
      ),
    },

    // ── Colis / Poids ──
    {
      accessorKey: 'weight',
      header: 'Poids',
      cell: ({ row }) => {
        const q = row.original;
        // Si on a des packages, afficher le nombre de colis + poids total
        if (q._count?.packages > 0) {
          return (
            <span className="text-sm">
              {q._count.packages} colis — {q.weight} kg
            </span>
          );
        }
        // Sinon, type de cargo + poids
        return (
          <span className="text-sm">
            {CARGO_LABELS[q.cargoType] ?? q.cargoType} — {q.weight} kg
          </span>
        );
      },
    },

    // ── Coût estimé ──
    {
      accessorKey: 'estimatedCost',
      header: 'Coût',
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          {row.original.estimatedCost.toFixed(2)} {row.original.currency}
        </span>
      ),
    },

    // ── Statut (badge coloré) ──
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div
            className={`
              inline-flex items-center px-2.5 py-1 rounded-full
              text-xs font-semibold uppercase tracking-wide border
              ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}
            `}
          >
            {STATUS_LABELS[status] ?? status}
          </div>
        );
      },
    },

    // ── Actions (menu ⋮) ──
    {
      id: 'actions',
      header: '',
      // Désactiver le tri sur la colonne actions
      enableSorting: false,
      cell: ({ row }) => (
        <QuoteActionsMenu
          quoteId={row.original.id}
          quoteNumber={row.original.quoteNumber}
          quoteStatus={row.original.status}
          userRole={userRole}
          hasPayment={row.original.paymentReceivedAt != null}
        />
      ),
    },
  ];
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * DataTable TanStack pour l'affichage des devis en tableau.
 *
 * Utilise le pattern "headless UI" de TanStack Table :
 * - `useReactTable` gère le state (tri, modèle de lignes)
 * - Le rendu utilise les composants shadcn/ui Table* existants
 * - Le tri est côté client (les données sont déjà paginées serveur)
 */
export function QuotesDataTable({ data, userRole }: QuotesDataTableProps) {
  // État de tri local — TanStack gère le tri côté client
  const [sorting, setSorting] = useState<SortingState>([]);

  // Construire les colonnes avec le userRole injecté
  const columns = buildColumns(userRole);

  // Créer l'instance de table TanStack
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        {/* ── En-têtes de colonnes ── */}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    header.column.getCanSort()
                      ? 'cursor-pointer select-none hover:bg-muted/50'
                      : ''
                  }
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {/* Icône de tri : flèche haut/bas selon l'état */}
                    {header.column.getCanSort() && (
                      <>
                        {header.column.getIsSorted() === 'asc' && (
                          <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                        )}
                        {header.column.getIsSorted() === 'desc' && (
                          <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                        )}
                        {!header.column.getIsSorted() && (
                          <ArrowsDownUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        {/* ── Corps du tableau ── */}
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors duration-150">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                Aucun devis à afficher.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
