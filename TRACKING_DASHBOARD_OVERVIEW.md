# 📊 Tracking dans le Dashboard - Vue d'Ensemble

## 🔐 Accès Authentifié vs Accès Public

Le système de tracking de Faso Fret Logistics dispose de **deux interfaces distinctes** :

### 1. 🌐 Tracking Public (Sans authentification)
- **Route** : `/tracking`
- **Données affichées** : Limitées et filtrées (pas de coûts, GPS, métadonnées)
- **Utilisateurs** : Tout le monde (clients, prospects, grand public)
- **Objectif** : Permettre un suivi de base avec incitation à créer un compte

### 2. 🔒 Tracking Dashboard (Avec authentification)
- **Route** : `/dashboard/tracking`
- **Données affichées** : Complètes (coûts, GPS, métadonnées, documents)
- **Utilisateurs** : Clients authentifiés, équipe opérationnelle, managers
- **Objectif** : Suivi professionnel complet avec toutes les données

---

## 🎨 Interface du Tracking Dashboard

### 🚪 Point d'Entrée

**Accès depuis la sidebar gauche du Dashboard** :
```
┌─────────────────────────┐
│ 📦 Faso Fret           │
├─────────────────────────┤
│ 🏠 Tableau de bord     │
│ 📦 Expéditions         │
│ 📊 Tracking            ← ICI
│ 📄 Devis               │
│ 🧾 Factures            │
│ 📅 Enlèvements         │
│ 🚚 Transporteurs       │
│ ⚙️  Paramètres         │
└─────────────────────────┘
```

**Permission requise** : `tracking:read`

**Rôles avec accès** :
- ✅ ADMIN (accès complet)
- ✅ OPERATIONS_MANAGER (accès complet)
- ✅ FINANCE_MANAGER (lecture seule)
- ✅ CLIENT (leurs expéditions uniquement)
- ❌ VIEWER (pas d'accès tracking)

---

## 📱 Structure de la Page `/dashboard/tracking`

### 1. 🎯 En-tête de Page

```
┌─────────────────────────────────────────────────┐
│  Tracking en Temps Réel                    📦 12 actives │
│  Suivez vos expéditions en cours                        │
└─────────────────────────────────────────────────┘
```

- **Titre principal** : "Tracking en Temps Réel"
- **Sous-titre** : "Suivez vos expéditions en cours"
- **Badge** : Nombre total d'expéditions actives (dynamique)

---

### 2. 📊 Statistiques Rapides (6 KPIs)

Grille de 6 cartes affichant les métriques en temps réel :

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ ✅ Prise en  │ 🏠 Disponible│ 🚚 En transit│ 📦 En douane │ 🚛 En livraison│ ✓ Livrées   │
│    charge    │              │              │              │               │  aujourd'hui │
│              │              │              │              │               │              │
│     8        │     3        │     15       │     4        │      7        │      2       │
│ Réceptionnées│ Au point de  │ Expéditions  │ En attente de│ En route vers │ Livraisons   │
│              │ retrait      │ en cours     │ dédouanement │ destination   │ du jour      │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

**Statuts trackés** :
1. **Prise en charge** (PICKED_UP) - Icône orange ✅
2. **Disponible** (READY_FOR_PICKUP) - Icône cyan 🏠
3. **En transit** (IN_TRANSIT) - Icône bleue 🚚
4. **En douane** (AT_CUSTOMS) - Icône violette 📦
5. **En livraison** (OUT_FOR_DELIVERY) - Icône indigo 🚛
6. **Livrées aujourd'hui** (DELIVERED) - Icône verte ✓

**Calculs** :
- Chaque carte affiche le **nombre** d'expéditions dans ce statut
- Les données sont calculées en temps réel par la fonction `getTrackingStats()`

---

### 3. 📋 Liste des Expéditions Actives

Chaque expédition est affichée dans une **Card expandable** avec :

#### 🔝 En-tête de la Card (Fond gris clair)

```
┌─────────────────────────────────────────────────────────────────┐
│ SHP-20250109-A1B2C     🔵 IN_TRANSIT                 [Voir détails] │
│ 📍 Paris, FR  ➜  Ouagadougou, BF                                 │
│ ✈️ Électronique • 250 kg • Acme Corp • ⏰ Livraison prévue: 15/01/2025 │
└─────────────────────────────────────────────────────────────────┘
```

**Informations affichées** :
- **Tracking Number** : Format `SHP-YYYYMMDD-XXXXX` (font mono, gras)
- **Badge de statut** : Couleur selon le statut (bleu, vert, rouge, etc.)
- **Trajet** : Ville origine + pays → Ville destination + pays
- **Détails** :
  - 🚚 Mode de transport (icône adaptative : avion, bateau, camion)
  - 📦 Type de marchandise (ex: Électronique)
  - ⚖️ Poids (en kg)
  - 🏢 Nom de la company
  - ⏰ Date de livraison estimée
- **Bouton action** : "Voir détails" → Redirection vers `/dashboard/shipments/{id}`

#### 🔽 Contenu de la Card : Timeline de Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   🟢──┐  ✅ Collecté                                             │
│       │  📍 Paris, France (48.8566, 2.3522)                      │
│       │  ⏰ 9 janvier 2025 à 08:30                               │
│       │  Colis réceptionné à l'entrepôt                          │
│       │                                                           │
│   🔵──┐  🚚 En transit                                           │
│       │  📍 Lyon, France                                         │
│       │  ⏰ 9 janvier 2025 à 14:15                               │
│       │  En route vers le hub international                      │
│       │                                                           │
│   🟣──┐  📦 En douane                                            │
│       │  📍 Aéroport CDG, France                                 │
│       │  ⏰ 10 janvier 2025 à 10:00                              │
│       │  Dossier douanier en cours de traitement                │
│       │  [Voir les détails ▼]                                    │
│       │                                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Composant** : `<TrackingTimeline />`

**Affichage de chaque événement** :
1. **Point coloré** sur la timeline verticale
   - Couleur selon le statut (vert = livré, bleu = transit, violet = douane, etc.)
   - Icône dans le point (CheckCircle, Truck, Package, etc.)

2. **Statut en français** (ex: "Collecté", "En transit", "En douane")

3. **Localisation complète**
   - 📍 Ville, Pays
   - **GPS** : Coordonnées (latitude, longitude) si disponibles
     - Format : `(48.8566, 2.3522)`
     - **UNIQUEMENT dans le Dashboard authentifié** (pas dans le tracking public)

4. **Timestamp complet**
   - ⏰ Format : "9 janvier 2025 à 14:15"
   - Locale française (date-fns)

5. **Description** (optionnelle)
   - Texte libre ajouté par l'équipe opérationnelle
   - Ex: "Colis réceptionné à l'entrepôt", "Retard dû aux intempéries"

6. **Métadonnées JSON** (optionnelles, expandable)
   - Détails techniques supplémentaires
   - Affichées dans un `<details>` dépliable
   - Format JSON indenté et lisible

---

### 4. 🎯 État Vide (Aucune expédition active)

Si aucune expédition n'est en cours :

```
┌─────────────────────────────────────────────────┐
│                                                   │
│                    📦                             │
│                                                   │
│          Aucune expédition active                │
│                                                   │
│   Il n'y a actuellement aucune expédition en     │
│         cours de traitement                       │
│                                                   │
│          [➕ Créer une expédition]                │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Bouton d'action** : "Créer une expédition"
- Redirection vers `/dashboard/shipments/new`
- Call-to-action pour inciter à créer une nouvelle expédition

---

## 🔐 Différences Tracking Public vs Dashboard

### Comparaison Détaillée

| Feature | 🌐 Tracking Public | 🔒 Tracking Dashboard |
|---------|-------------------|----------------------|
| **Authentification** | ❌ Non requise | ✅ Requise |
| **Route** | `/tracking` | `/dashboard/tracking` |
| **Access Control** | Aucun (ouvert à tous) | RBAC via Zenstack |
| **Données affichées** | Filtrées | Complètes |
| **Coordonnées GPS** | ❌ Masquées | ✅ Affichées |
| **Métadonnées JSON** | ❌ Masquées | ✅ Affichées (expandable) |
| **Coûts** | ❌ Masqués | ✅ Affichés (dans détails shipment) |
| **Notes internes** | ❌ Masquées | ✅ Affichées |
| **Documents** | ❌ Pas d'accès | ✅ Téléchargement PDF |
| **Statistiques** | ❌ Non | ✅ 6 KPIs en temps réel |
| **Vue globale** | ❌ Non (1 shipment à la fois) | ✅ Toutes les expéditions actives |
| **Recherche** | ❌ Par tracking number uniquement | ✅ Filtres avancés |
| **Actions** | ❌ Aucune | ✅ Ajouter événement, modifier |
| **Layout** | Header + Footer publics | Sidebar Dashboard |

---

## 🎯 Cas d'Usage

### Scénario 1 : Client Non Connecté

**Objectif** : Vérifier rapidement où se trouve son colis

**Parcours** :
1. Visite `/tracking` (accessible depuis le menu "Services")
2. Saisit son tracking number (ex: `SHP-20250109-A1B2C`)
3. Voit le **tracking limité** :
   - Statut actuel
   - Origine → Destination
   - Timeline simplifiée (sans GPS ni métadonnées)
4. Reçoit une **incitation à se connecter** :
   - Alert bleue en bas : "Créez un compte pour accéder aux coordonnées GPS, documents et notifications"
   - Boutons "Se connecter" et "Créer un compte"

**Avantage** : Accès rapide sans compte pour rassurer le client

---

### Scénario 2 : Client Authentifié

**Objectif** : Suivre toutes ses expéditions en cours avec détails complets

**Parcours** :
1. Se connecte au Dashboard
2. Clique sur "Tracking" dans la sidebar
3. Accède à `/dashboard/tracking`
4. Voit la **vue globale** :
   - 6 KPIs avec statistiques en temps réel
   - Liste de TOUTES ses expéditions actives (filtrées par sa company via Zenstack)
   - Timeline complète pour chaque expédition avec GPS, métadonnées, descriptions
5. Peut cliquer sur "Voir détails" pour accéder à la fiche complète de l'expédition

**Avantage** : Vue d'ensemble professionnelle avec toutes les données

---

### Scénario 3 : Operations Manager

**Objectif** : Monitorer toutes les expéditions en cours (toutes companies)

**Parcours** :
1. Se connecte avec rôle `OPERATIONS_MANAGER`
2. Accède à `/dashboard/tracking`
3. Voit **TOUTES** les expéditions actives (pas de filtre par company)
4. Peut cliquer sur chaque expédition pour :
   - Voir les détails complets
   - Ajouter un nouvel événement de tracking
   - Modifier les informations
   - Télécharger les documents

**Avantage** : Vue opérationnelle complète pour gérer la logistique

---

## 📐 Architecture Technique

### Server Actions Utilisées

**Fichier** : `src/modules/tracking/actions/tracking.actions.ts`

```typescript
// Récupérer toutes les expéditions actives avec tracking
export async function getActiveShipmentsWithTracking(): Promise<ShipmentWithTracking[]>

// Calculer les statistiques de tracking en temps réel
export async function getTrackingStats(): Promise<TrackingStats>

// Récupérer le tracking d'une expédition spécifique
export async function getShipmentTracking(shipmentId: string): Promise<ShipmentWithTracking | null>

// Ajouter un événement de tracking
export async function addTrackingEvent(data: TrackingEventInput): Promise<TrackingEvent>
```

**Sécurité** :
- Utilise `getEnhancedPrisma()` pour appliquer les Access Policies Zenstack
- Les CLIENTs ne voient que leurs propres expéditions
- Les ADMIN/OPERATIONS_MANAGER voient toutes les expéditions

### Composants UI

**Fichier** : `src/components/tracking/TrackingTimeline.tsx`

```typescript
interface TrackingTimelineProps {
  events: TrackingEventData[];
  className?: string;
}

export function TrackingTimeline({ events, className }: TrackingTimelineProps)
```

**Features** :
- Timeline verticale avec icônes colorées
- Affichage des coordonnées GPS (latitude, longitude)
- Descriptions optionnelles
- Métadonnées JSON expandables
- Format de date français (date-fns)

---

## 🎨 Design System

### Couleurs des Statuts

```typescript
const statusColors = {
  PICKED_UP: 'orange-500',        // 🟠 Prise en charge
  IN_TRANSIT: 'blue-500',         // 🔵 En transit
  AT_CUSTOMS: 'purple-500',       // 🟣 En douane
  CUSTOMS_CLEARED: 'purple-500',  // 🟣 Dédouané
  OUT_FOR_DELIVERY: 'indigo-500', // 🔷 En livraison
  READY_FOR_PICKUP: 'cyan-500',   // 🔷 Disponible
  DELIVERED: 'green-500',         // 🟢 Livré
  CANCELLED: 'red-500',           // 🔴 Annulé
  ON_HOLD: 'yellow-500',          // 🟡 En attente
  EXCEPTION: 'red-600',           // 🔴 Exception
};
```

### Icônes des Statuts

- ✅ **CheckCircle** : Livré, Collecté
- 🚚 **Truck** : En transit, En livraison
- 📦 **Package** : En douane, Prise en charge
- 📍 **MapPin** : Localisation générale
- ⏰ **Clock** : Timestamp
- ✈️ **Airplane** : Transport aérien
- 🚢 **Boat** : Transport maritime

---

## 🚀 Améliorations Futures Possibles

### Phase 1 : Fonctionnalités Manquantes

1. **Recherche et Filtres**
   - Recherche par tracking number
   - Filtres par statut
   - Filtres par date
   - Filtres par transporteur

2. **Export de Données**
   - Bouton "Exporter en PDF"
   - Export Excel des statistiques
   - Génération de rapports

3. **Notifications en Temps Réel**
   - WebSocket pour mise à jour live
   - Notifications push navigateur
   - Alertes email automatiques

### Phase 2 : Visualisations Avancées

1. **Carte Interactive**
   - Google Maps / Mapbox
   - Affichage des expéditions sur une carte
   - Trajet animé avec les événements de tracking
   - Clustering des expéditions par région

2. **Graphiques de Performance**
   - Temps de transit moyen
   - Taux de livraison à temps
   - Analyse des retards
   - Performance par transporteur

3. **Timeline Globale**
   - Vue calendrier des événements
   - Gantt chart des expéditions
   - Prévisions de livraison basées sur ML

### Phase 3 : Automatisation

1. **Tracking Automatique**
   - Intégration API transporteurs (FedEx, DHL, etc.)
   - Mise à jour automatique des événements
   - Détection automatique des anomalies

2. **Alertes Intelligentes**
   - Alerte si retard détecté
   - Notification si expédition bloquée en douane > 48h
   - Prédiction de livraison tardive

3. **Webhooks**
   - API webhook pour clients premium
   - Notifications vers systèmes tiers (ERP, CRM)

---

## 📝 Résumé pour l'Équipe

### Points Clés

1. **Deux Interfaces Distinctes** :
   - Public (`/tracking`) : Tracking limité pour acquisition
   - Dashboard (`/dashboard/tracking`) : Tracking complet pour clients authentifiés

2. **Architecture Sécurisée** :
   - Filtrage serveur des données sensibles dans le tracking public
   - Access Control via Zenstack dans le Dashboard
   - Séparation claire des responsabilités

3. **UX Progressive** :
   - Tracking public → Incitation à créer un compte
   - Dashboard → Expérience professionnelle complète

4. **Data-Driven** :
   - 6 KPIs en temps réel
   - Timeline détaillée avec GPS et métadonnées
   - Vue globale de toutes les expéditions actives

5. **Prêt pour Extensions** :
   - Architecture modulaire
   - Composants réutilisables (`TrackingTimeline`)
   - Server Actions séparées (public vs authentifié)

---

**La page de tracking du Dashboard offre une expérience professionnelle complète pour le suivi des expéditions en temps réel.** 🚀
