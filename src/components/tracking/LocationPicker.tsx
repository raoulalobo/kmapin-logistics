'use client';

/**
 * Composant LocationPicker - Sélecteur de position GPS avec carte Leaflet
 *
 * Permet de sélectionner une position géographique de plusieurs façons :
 * 1. Clic sur la carte pour placer un marqueur
 * 2. Bouton "Ma position" pour utiliser la géolocalisation du navigateur
 * 3. Recherche d'adresse avec autocomplétion (Nominatim)
 *
 * Utilise OpenStreetMap (gratuit) via Leaflet pour l'affichage de la carte
 * et l'API Nominatim pour le geocoding/reverse geocoding.
 *
 * Props :
 * - value : Position actuelle {lat, lng, address?}
 * - onChange : Callback appelé quand la position change
 * - defaultCenter : Centre initial de la carte (défaut: Ouagadougou)
 * - defaultZoom : Niveau de zoom initial (défaut: 6)
 *
 * Exemple d'utilisation :
 * ```tsx
 * <LocationPicker
 *   value={{ lat: 12.3714, lng: -1.5197, address: 'Ouagadougou' }}
 *   onChange={(pos) => console.log(pos)}
 * />
 * ```
 *
 * @module components/tracking/LocationPicker
 */

import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { MapPin, Crosshair, MagnifyingGlass, SpinnerGap, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Import du CSS Leaflet (nécessaire pour l'affichage correct de la carte)
import 'leaflet/dist/leaflet.css';

/**
 * Interface pour les coordonnées avec adresse optionnelle
 */
export interface LocationValue {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Props du composant LocationPicker
 */
interface LocationPickerProps {
  /** Position actuelle (lat, lng, address) */
  value?: LocationValue | null;
  /** Callback appelé quand la position change */
  onChange: (value: LocationValue) => void;
  /** Centre initial de la carte [lat, lng] - défaut: Ouagadougou */
  defaultCenter?: LatLngExpression;
  /** Niveau de zoom initial (1-18) - défaut: 6 */
  defaultZoom?: number;
  /** Hauteur de la carte - défaut: 300px */
  height?: string;
  /** Désactiver les interactions */
  disabled?: boolean;
}

/**
 * Icône personnalisée pour le marqueur (évite les problèmes d'icône par défaut de Leaflet)
 */
const customMarkerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Centre par défaut : Ouagadougou, Burkina Faso
 * Coordonnées approximatives du centre-ville
 */
const DEFAULT_CENTER: LatLngExpression = [12.3714, -1.5197];
const DEFAULT_ZOOM = 6;

/**
 * Sous-composant : Gestion des clics sur la carte
 * Utilise useMapEvents pour capturer les clics et placer un marqueur
 */
function MapClickHandler({
  onLocationSelect,
  disabled,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

/**
 * Sous-composant : Centrage automatique de la carte
 * Utilise useMap pour recentrer la carte quand la position change
 */
function MapCenterUpdater({ center }: { center: LatLngExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null;
}

/**
 * Reverse geocoding avec l'API Nominatim (OpenStreetMap)
 * Convertit des coordonnées GPS en adresse lisible
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Adresse formatée ou null si erreur
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'fr', // Résultats en français
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erreur de geocoding');
    }

    const data = await response.json();

    // Construire une adresse lisible depuis les composants
    const parts: string[] = [];

    if (data.address) {
      // Ajouter les composants pertinents de l'adresse
      if (data.address.road) parts.push(data.address.road);
      if (data.address.suburb) parts.push(data.address.suburb);
      if (data.address.city || data.address.town || data.address.village) {
        parts.push(data.address.city || data.address.town || data.address.village);
      }
      if (data.address.state) parts.push(data.address.state);
      if (data.address.country) parts.push(data.address.country);
    }

    return parts.length > 0 ? parts.join(', ') : data.display_name || null;
  } catch (error) {
    console.error('[reverseGeocode] Erreur:', error);
    return null;
  }
}

/**
 * Composant principal LocationPicker
 *
 * Affiche une carte interactive avec :
 * - Un marqueur déplaçable (clic pour placer)
 * - Un bouton de géolocalisation
 * - Un champ de recherche d'adresse
 * - Affichage des coordonnées et de l'adresse
 */
export function LocationPicker({
  value,
  onChange,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
  height = '300px',
  disabled = false,
}: LocationPickerProps) {
  // État local pour la position du marqueur
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(
    value ? [value.lat, value.lng] : null
  );

  // État pour la recherche d'adresse
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // État pour la géolocalisation
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // État pour le reverse geocoding (adresse depuis coordonnées)
  const [isGeocoding, setIsGeocoding] = useState(false);

  /**
   * Gérer la sélection d'une position (clic sur carte ou géolocalisation)
   * Effectue un reverse geocoding pour obtenir l'adresse
   */
  const handleLocationSelect = useCallback(
    async (lat: number, lng: number) => {
      // Mettre à jour la position du marqueur immédiatement
      setMarkerPosition([lat, lng]);

      // Reverse geocoding pour obtenir l'adresse
      setIsGeocoding(true);
      const address = await reverseGeocode(lat, lng);
      setIsGeocoding(false);

      // Appeler le callback onChange avec les nouvelles coordonnées
      onChange({
        lat,
        lng,
        address: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });
    },
    [onChange]
  );

  /**
   * Utiliser la géolocalisation du navigateur pour obtenir la position actuelle
   */
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      // Succès : position obtenue
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationSelect(latitude, longitude);
        setIsGeolocating(false);
      },
      // Erreur : géolocalisation échouée
      (error) => {
        setIsGeolocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Accès à la position refusé. Veuillez autoriser la géolocalisation.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Position indisponible. Vérifiez votre connexion GPS.');
            break;
          case error.TIMEOUT:
            setGeoError('Délai dépassé. Réessayez dans un lieu avec meilleure réception.');
            break;
          default:
            setGeoError('Erreur de géolocalisation. Réessayez.');
        }
      },
      // Options
      {
        enableHighAccuracy: true, // Haute précision (GPS si disponible)
        timeout: 10000, // Timeout de 10 secondes
        maximumAge: 0, // Pas de cache
      }
    );
  }, [handleLocationSelect]);

  /**
   * Rechercher une adresse avec l'API Nominatim (forward geocoding)
   */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        {
          headers: {
            'Accept-Language': 'fr',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur de recherche');
      }

      const data = await response.json();

      if (data.length === 0) {
        setSearchError('Aucun résultat trouvé pour cette adresse');
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      // Mettre à jour la position
      setMarkerPosition([lat, lng]);
      onChange({
        lat,
        lng,
        address: result.display_name,
      });
    } catch (error) {
      console.error('[handleSearch] Erreur:', error);
      setSearchError('Erreur lors de la recherche. Réessayez.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onChange]);

  return (
    <div className="space-y-3">
      {/* ═══════════════════════════════════════════════════════════════════
          BARRE DE RECHERCHE + BOUTON GÉOLOCALISATION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-2">
        {/* Champ de recherche d'adresse */}
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Rechercher une adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={disabled || isSearching}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={handleSearch}
            disabled={disabled || isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <SpinnerGap className="h-4 w-4 animate-spin" />
            ) : (
              <MagnifyingGlass className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Bouton géolocalisation */}
        <Button
          type="button"
          variant="outline"
          onClick={handleUseMyLocation}
          disabled={disabled || isGeolocating}
          className="gap-2 whitespace-nowrap"
        >
          {isGeolocating ? (
            <SpinnerGap className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
          Ma position
        </Button>
      </div>

      {/* Messages d'erreur */}
      {(searchError || geoError) && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <Warning className="h-4 w-4" />
          {searchError || geoError}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CARTE LEAFLET
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={markerPosition || defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={!disabled}
        >
          {/* Tuiles OpenStreetMap (gratuites) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Gestionnaire de clics sur la carte */}
          <MapClickHandler onLocationSelect={handleLocationSelect} disabled={disabled} />

          {/* Centrage automatique quand la position change */}
          <MapCenterUpdater center={markerPosition} />

          {/* Marqueur de position */}
          {markerPosition && <Marker position={markerPosition} icon={customMarkerIcon} />}
        </MapContainer>

        {/* Overlay de chargement pendant le geocoding */}
        {isGeocoding && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
              <SpinnerGap className="h-4 w-4 animate-spin" />
              <span className="text-sm">Recherche de l'adresse...</span>
            </div>
          </div>
        )}

        {/* Instruction si pas de marqueur */}
        {!markerPosition && !disabled && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 text-center py-2 px-4 rounded-lg shadow text-sm z-[1000]">
            <MapPin className="h-4 w-4 inline-block mr-1" />
            Cliquez sur la carte pour placer un marqueur
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          AFFICHAGE DES COORDONNÉES ET DE L'ADRESSE
          ═══════════════════════════════════════════════════════════════════ */}
      {value && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-blue-600" weight="fill" />
            <div className="flex-1">
              <p className="text-sm font-medium">{value.address}</p>
              <p className="text-xs text-gray-500 font-mono">
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
