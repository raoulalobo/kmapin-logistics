# Flux de l'Algorithme de Calcul de Devis

## 🔄 Vue d'Ensemble

```
┌─────────────────────┐
│   ENTRÉE UTILISATEUR │
│  - Poids réel (kg)  │
│  - Dimensions (cm)  │
│  - Mode transport   │
│  - Priorité         │
│  - Origine/Dest     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  ÉTAPE 1 : Récupération Configuration BDD  │
│  ─────────────────────────────────────────  │
│  • volumetricWeightRatios                  │
│  • useVolumetricWeightPerMode              │
│  • prioritySurcharges                      │
│  • defaultRatePerKg / defaultRatePerM3     │
│  • transportMultipliers                    │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  ÉTAPE 2 : Calcul du Volume                │
│  ─────────────────────────────────────────  │
│                                             │
│  volume_m3 = (L × l × h) / 1 000 000       │
│                                             │
│  Exemple : 50×40×30 cm = 0.06 m³           │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  ÉTAPE 3 : Calcul Poids Volumétrique        │
│  ─────────────────────────────────────────  │
│                                             │
│  SI useVolumetric[mode] = true ALORS        │
│    poids_vol = volume × ratio[mode]        │
│  SINON                                      │
│    poids_vol = 0                           │
│                                             │
│  Ratios :                                   │
│  • AIR  : 167 kg/m³ (ratio 1/6)            │
│  • ROAD : 333 kg/m³ (ratio 1/3)            │
│  • RAIL : 250 kg/m³                        │
│  • SEA  : N/A (système UP)                 │
└──────────┬──────────────────────────────────┘
           │
           ▼
       ┌───────┐
       │ Mode? │
       └───┬───┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
  [SEA]      [AIR/ROAD/RAIL]
     │           │
     │           ▼
     │   ┌───────────────────────────────┐
     │   │ ÉTAPE 4A : Masse Taxable      │
     │   │ (Modes Standards)             │
     │   │ ───────────────────────────   │
     │   │                               │
     │   │ masse_taxable =               │
     │   │   MAX(poids_réel, poids_vol) │
     │   │                               │
     │   │ unité = "kg"                  │
     │   │                               │
     │   │ facture_sur_volume =          │
     │   │   poids_vol > poids_réel     │
     │   └───────────┬───────────────────┘
     │               │
     │               │
     ▼               │
┌─────────────────────────────────┐
│ ÉTAPE 4B : Unité Payante (UP)  │
│ (Maritime Uniquement)           │
│ ─────────────────────────────── │
│                                 │
│ poids_tonnes = poids_réel/1000 │
│                                 │
│ masse_taxable =                 │
│   MAX(poids_tonnes, volume_m3) │
│                                 │
│ unité = "UP"                    │
│                                 │
│ facture_sur_volume =            │
│   volume_m3 > poids_tonnes     │
│                                 │
│ ⚠️  Toujours facturé en m³     │
└───────────┬─────────────────────┘
            │
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
     │             │
     └──────┬──────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│  ÉTAPE 5 : Recherche Tarif                  │
│  ─────────────────────────────────────────  │
│                                             │
│  🔍 Recherche dans TransportRate            │
│     WHERE origine = ? AND                   │
│           destination = ? AND               │
│           mode = ? AND                      │
│           isActive = true                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ SI trouvé :                         │   │
│  │   • Utiliser ratePerKg ou ratePerM3 │   │
│  │   • tarifsRouteUtilises = true      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ SINON (fallback) :                  │   │
│  │   • base = defaultRate (kg ou m³)   │   │
│  │   • tarif = base × multiplier[mode] │   │
│  │   • tarifsRouteUtilises = false     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Multipliers par Mode :                     │
│  • ROAD : 1.0× (tarif standard)            │
│  • SEA  : 0.6× (moins cher)                │
│  • AIR  : 3.0× (plus cher)                 │
│  • RAIL : 0.8× (économique)                │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  ÉTAPE 6 : Calcul Coût de Base             │
│  ─────────────────────────────────────────  │
│                                             │
│  cout_base = masse_taxable × tarif_unité   │
│                                             │
│  Exemple :                                  │
│    10.02 kg × 6.0 EUR/kg = 60.12 EUR       │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  ÉTAPE 7 : Application Priorité             │
│  ─────────────────────────────────────────  │
│                                             │
│  surcharge = prioritySurcharges[priorité]  │
│  coefficient = 1 + surcharge               │
│                                             │
│  Coefficients :                             │
│  • STANDARD : 1.0  (0%)                    │
│  • NORMAL   : 1.1  (+10%)                  │
│  • EXPRESS  : 1.5  (+50%)                  │
│  • URGENT   : 1.3  (+30%)                  │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  ÉTAPE 8 : Prix Final                       │
│  ─────────────────────────────────────────  │
│                                             │
│  prix_final = cout_base × coefficient      │
│                                             │
│  Exemple :                                  │
│    60.12 EUR × 1.0 = 60.12 EUR             │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│              RÉSULTAT COMPLET               │
│  ─────────────────────────────────────────  │
│  {                                          │
│    volume_m3: 0.06,                        │
│    poidsVolumetrique_kg: 10.02,            │
│    masseTaxable: 10.02,                    │
│    uniteMasseTaxable: "kg",                │
│    tarifParUnite: 6.0,                     │
│    coutBase: 60.12,                        │
│    coefficientPriorite: 1.0,               │
│    prixFinal: 60.12,                       │
│    devise: "EUR",                          │
│    route: {                                │
│      origine: "FR",                        │
│      destination: "CI",                    │
│      axe: "FR → CI"                        │
│    },                                       │
│    modeTransport: "AIR",                   │
│    priorite: "STANDARD",                   │
│    factureSurVolume: true,                 │
│    tarifsRouteUtilises: true               │
│  }                                          │
└─────────────────────────────────────────────┘
```

---

## 📊 Exemples Concrets

### Exemple 1 : Colis Aérien Volumineux (France → Côte d'Ivoire)

```
📦 Entrée :
   Poids réel : 5 kg
   Dimensions : 50×40×30 cm
   Mode : AIR
   Priorité : STANDARD

🔄 Traitement :

1️⃣ Volume = (50×40×30) / 1M = 0.06 m³

2️⃣ Poids volumétrique AIR :
   useVolumetric[AIR] = true ✓
   poids_vol = 0.06 × 167 = 10.02 kg

3️⃣ Masse taxable :
   MAX(5, 10.02) = 10.02 kg
   → FACTURATION AU VOLUME ✓

4️⃣ Tarif (route FR→CI) :
   TransportRate trouvé : 6.0 EUR/kg ✓

5️⃣ Coût de base :
   10.02 × 6.0 = 60.12 EUR

6️⃣ Priorité STANDARD :
   coefficient = 1.0 (pas de surcharge)

7️⃣ Prix final :
   60.12 × 1.0 = 60.12 EUR

✅ Résultat : 60.12 EUR
```

---

### Exemple 2 : Colis Lourd Compact (France → Burkina Faso)

```
📦 Entrée :
   Poids réel : 15 kg
   Dimensions : 20×20×20 cm
   Mode : AIR
   Priorité : STANDARD

🔄 Traitement :

1️⃣ Volume = (20×20×20) / 1M = 0.008 m³

2️⃣ Poids volumétrique AIR :
   useVolumetric[AIR] = true ✓
   poids_vol = 0.008 × 167 = 1.34 kg

3️⃣ Masse taxable :
   MAX(15, 1.34) = 15 kg
   → FACTURATION AU POIDS RÉEL ✓

4️⃣ Tarif (route FR→BF) :
   TransportRate trouvé : 7.25 EUR/kg ✓

5️⃣ Coût de base :
   15 × 7.25 = 108.75 EUR

6️⃣ Priorité STANDARD :
   coefficient = 1.0

7️⃣ Prix final :
   108.75 × 1.0 = 108.75 EUR

✅ Résultat : 108.75 EUR
```

---

### Exemple 3 : Conteneur Maritime (France → Burkina Faso)

```
📦 Entrée :
   Poids réel : 800 kg
   Dimensions : 200×200×150 cm
   Mode : SEA
   Priorité : STANDARD

🔄 Traitement :

1️⃣ Volume = (200×200×150) / 1M = 6.0 m³

2️⃣ Poids volumétrique :
   ⚠️  SEA n'utilise PAS le poids volumétrique
   → Système Unité Payante (UP)

3️⃣ Unité Payante :
   poids_tonnes = 800 / 1000 = 0.8 T
   UP = MAX(0.8, 6.0) = 6.0 UP
   → FACTURATION AU VOLUME ✓

4️⃣ Tarif (route FR→BF SEA) :
   TransportRate trouvé : 465 EUR/UP
   ⚠️  Utilise ratePerM3 (car toujours "volume")

5️⃣ Coût de base :
   6.0 × 465 = 2790 EUR

6️⃣ Priorité STANDARD :
   coefficient = 1.0

7️⃣ Prix final :
   2790 × 1.0 = 2790 EUR

✅ Résultat : 2790 EUR
```

---

### Exemple 4 : Colis Urgent (Burkina Faso → France)

```
📦 Entrée :
   Poids réel : 8 kg
   Dimensions : 40×30×25 cm
   Mode : AIR
   Priorité : URGENT

🔄 Traitement :

1️⃣ Volume = (40×30×25) / 1M = 0.03 m³

2️⃣ Poids volumétrique AIR :
   poids_vol = 0.03 × 167 = 5.01 kg

3️⃣ Masse taxable :
   MAX(8, 5.01) = 8 kg
   → FACTURATION AU POIDS RÉEL ✓

4️⃣ Tarif (route BF→FR) :
   TransportRate trouvé : 10.5 EUR/kg ✓

5️⃣ Coût de base :
   8 × 10.5 = 84 EUR

6️⃣ Priorité URGENT :
   coefficient = 1.3 (+30%) ✓

7️⃣ Prix final :
   84 × 1.3 = 109.20 EUR

✅ Résultat : 109.20 EUR
   (Surcharge urgence : +25.20 EUR)
```

---

## 🎯 Points Clés

### ✅ Facturation au Volume vs Poids

**Condition** :
```typescript
if (poidsVolumetrique_kg > poidsReel) {
  // Facturation au VOLUME
  masseTaxable = poidsVolumetrique_kg;
  factureSurVolume = true;
} else {
  // Facturation au POIDS RÉEL
  masseTaxable = poidsReel;
  factureSurVolume = false;
}
```

**Cas Spécial Maritime** :
```typescript
if (modeTransport === 'SEA') {
  // Toujours en UP (Unité Payante)
  masseTaxable = MAX(poidsTonnes, volume_m3);
  uniteMasseTaxable = 'UP';
  // Toujours facturé en m³ (ratePerM3)
}
```

---

### ✅ Hiérarchie des Tarifs

```
1. TransportRate (route spécifique)
   ↓ Si non trouvé ou isActive=false
2. PricingConfig (défaut global)
   ↓ Avec multiplicateur par mode
3. Tarif final appliqué
```

**Exemple** :
```typescript
// Route FR→CI en AIR
// 1. Chercher TransportRate(FR, CI, AIR)
//    → Trouvé : 6.0 EUR/kg ✓

// Route FR→ZA en AIR (non configurée)
// 1. Chercher TransportRate(FR, ZA, AIR)
//    → Non trouvé ✗
// 2. Utiliser PricingConfig :
//    defaultRatePerKg = 1.0 EUR/kg
//    transportMultipliers[AIR] = 3.0
//    → Tarif = 1.0 × 3.0 = 3.0 EUR/kg
```

---

### ✅ Priorités et Coefficients

| Priorité | Coefficient | Surcharge | Cas d'Usage |
|----------|-------------|-----------|-------------|
| STANDARD | 1.0 | 0% | Livraison normale |
| NORMAL | 1.1 | +10% | Livraison accélérée |
| EXPRESS | 1.5 | +50% | Livraison rapide |
| URGENT | 1.3 | +30% | Livraison urgente |

**Application** :
```typescript
const surcharge = prioritySurcharges[priorite];
const coefficient = 1 + surcharge;
const prixFinal = coutBase × coefficient;
```

---

## 🔧 Configuration BDD (PricingConfig)

Tous les paramètres sont stockés dans la table `pricing_config` :

```json
{
  "volumetricWeightRatios": {
    "AIR": 167,
    "ROAD": 333,
    "SEA": 1,
    "RAIL": 250
  },
  "useVolumetricWeightPerMode": {
    "AIR": true,
    "ROAD": true,
    "SEA": false,
    "RAIL": true
  },
  "prioritySurcharges": {
    "STANDARD": 0,
    "NORMAL": 0.1,
    "EXPRESS": 0.5,
    "URGENT": 0.3
  },
  "defaultRatePerKg": 1.0,
  "defaultRatePerM3": 200.0,
  "transportMultipliers": {
    "ROAD": 1.0,
    "SEA": 0.6,
    "AIR": 3.0,
    "RAIL": 0.8
  }
}
```

**Avantage** : Modification des paramètres sans redéploiement via interface admin.

---

## 📚 Documentation Complète

- **Statut Implémentation** : `STATUS_IMPLEMENTATION_ALGORITHME.md`
- **Guide Rapide** : `GUIDE_RAPIDE_EXECUTION.md`
- **Code Source** : `src/modules/quotes/lib/pricing-calculator-dynamic.ts`
- **Tests** : `scripts/test-pricing-algorithm-fixed.ts`

---

**Version** : 1.0
**Date** : 2024-12-27
**Auteur** : Claude Code
