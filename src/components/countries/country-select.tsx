/**
 * CountrySelect - Sélecteur de pays
 *
 * Composant de sélection de pays basé sur la base de données
 * Utilise les pays actifs uniquement
 */
'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listCountries } from '@/modules/countries';
import { CircleNotch } from '@phosphor-icons/react';

interface Country {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface CountrySelectProps {
  /** Valeur sélectionnée (code ISO du pays, ex: "FR", "CM") */
  value?: string;
  /** Callback lors du changement de sélection (retourne le code ISO) */
  onValueChange: (value: string) => void;
  /** Placeholder du select */
  placeholder?: string;
  /** ID du select (pour l'accessibilité) */
  id?: string;
  /** Classe CSS personnalisée */
  className?: string;
}

/**
 * Sélecteur de pays avec chargement asynchrone depuis la base de données
 *
 * Affiche uniquement les pays actifs, triés par nom.
 * IMPORTANT: Retourne le code ISO (ex: "FR", "CM") et non le nom du pays.
 *
 * @param value - Code ISO du pays sélectionné (ex: "FR", "CM")
 * @param onValueChange - Callback appelé lors du changement (reçoit le code ISO)
 * @param placeholder - Texte du placeholder
 * @param id - ID HTML du select
 * @param className - Classes CSS supplémentaires
 *
 * @example
 * ```tsx
 * <CountrySelect
 *   value={originCountry}  // "FR"
 *   onValueChange={(code) => setValue('originCountry', code)}  // code = "FR"
 *   placeholder="Sélectionnez un pays"
 *   id="originCountry"
 * />
 * ```
 */
export function CountrySelect({
  value,
  onValueChange,
  placeholder = 'Sélectionnez un pays',
  id,
  className,
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Charger les pays actifs au montage du composant
   */
  useEffect(() => {
    async function loadCountries() {
      try {
        setIsLoading(true);
        const data = await listCountries(true); // Uniquement les pays actifs
        setCountries(data);
      } catch (error) {
        console.error('Erreur lors du chargement des pays:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCountries();
  }, []);

  if (isLoading) {
    return (
      <Select disabled value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={className}>
          <div className="flex items-center gap-2">
            <CircleNotch className="h-4 w-4 animate-spin" />
            <span>Chargement...</span>
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country.id} value={country.code}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">{country.code}</span>
              <span>{country.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
