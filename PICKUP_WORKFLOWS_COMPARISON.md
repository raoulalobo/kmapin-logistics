# 📋 Comparaison : Demande d'Enlèvement Front-Office vs Back-Office

## 🎯 Vue d'Ensemble

Le système de demande d'enlèvement dispose de **deux workflows distincts** selon que l'utilisateur est authentifié ou non :

| Aspect | 🌐 Front-Office (Public) | 🔒 Back-Office (Dashboard) |
|--------|-------------------------|---------------------------|
| **Route** | `/pickups/request` | `/dashboard/pickups/new` |
| **Authentification** | ❌ Non requise | ✅ Requise |
| **Table Prisma** | `GuestPickupRequest` | `PickupRequest` |
| **Action** | `createGuestPickupRequestAction` | `createPickupRequestAction` |
| **Schema Zod** | `guestPickupRequestSchema` | `pickupRequestSchema` |
| **Client Prisma** | `prisma` (standard) | `getEnhancedPrisma()` (Zenstack) |
| **Numéro Généré** | `GPK-YYYYMMDD-XXXXX` | Aucun (lié à Shipment) |
| **Email** | ✅ Email d'invitation | ❌ Pas d'email |
| **Association** | → `Prospect` | → `Company` + `Shipment` |

---

## 🌐 Workflow Front-Office (Public)

### 📍 Route : `/pickups/request`

**Accessible à** : Tout le monde (connecté ou non)

### 🔧 Architecture

**Composant** : `PickupRequestPublicForm`
**Action** : `createGuestPickupRequestAction`
**Schema** : `guestPickupRequestSchema`
**Table** : `GuestPickupRequest`

### 📊 Workflow Détaillé

```
┌─────────────────────────────────────────────────┐
│ 1. Utilisateur Visite /pickups/request         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 2. Remplit le Formulaire Public                │
│    - Email (prospectEmail)                      │
│    - Téléphone (prospectPhone)                  │
│    - Nom (optionnel)                           │
│    - Adresse d'enlèvement                       │
│    - Date et créneau horaire                    │
│    - Type de marchandise                        │
│    - Poids/Volume estimés                       │
│    - Instructions spéciales                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 3. Submit → createGuestPickupRequestAction      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 4. Validation avec guestPickupRequestSchema     │
│    (Zod côté serveur)                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 5. Créer ou Récupérer Prospect                 │
│    - Recherche par email                        │
│    - Si nouveau :                               │
│      • Créer Prospect                           │
│      • Générer invitationToken                  │
│      • Expiration 7 jours                       │
│      • Status PENDING                           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 6. Générer Numéro Unique                       │
│    Format : GPK-YYYYMMDD-XXXXX                 │
│    Ex: GPK-20250109-00042                      │
│                                                 │
│    Logique :                                    │
│    1. Récupère dernier numéro du jour          │
│    2. Incrémente séquence (+1)                 │
│    3. Pad avec zéros (5 chiffres)              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 7. Créer GuestPickupRequest                    │
│    - prospectId (lien vers Prospect)           │
│    - requestNumber (GPK-...)                   │
│    - Toutes les données du formulaire          │
│    - Status : REQUESTED                         │
│    - Table : GuestPickupRequest                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 8. Envoyer Email de Confirmation (TODO)        │
│    → sendGuestPickupConfirmationEmail()        │
│    Contenu :                                    │
│    - Numéro de demande (GPK-...)               │
│    - Récapitulatif de la demande               │
│    - Lien d'invitation à créer un compte       │
│    - Token avec expiration 7 jours             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 9. Affichage Message de Succès                 │
│                                                 │
│    Si NON connecté :                           │
│    → "Vérifiez votre email pour créer un      │
│       compte et suivre votre demande"          │
│                                                 │
│    Si connecté :                               │
│    → Redirect /dashboard/pickups               │
└─────────────────────────────────────────────────┘
```

### 🔐 Sécurité : Utilisation de Prisma Standard

```typescript
import { prisma } from '@/lib/db/client'; // ✅ CLIENT STANDARD

// Pas d'authentification requise
// Pas d'access control Zenstack
// Accès public contrôlé manuellement
```

**Pourquoi Prisma standard ?**
- La table `GuestPickupRequest` est accessible publiquement (par design)
- Pas de filtrage RBAC nécessaire (nouveaux prospects)
- Sécurité assurée par :
  - Validation Zod stricte
  - Email de confirmation
  - Token d'invitation avec expiration

### 📧 Email d'Invitation (TODO)

**Contenu prévu** :
```
Objet : Votre demande d'enlèvement GPK-20250109-00042

Bonjour [Nom],

Nous avons bien reçu votre demande d'enlèvement.

Numéro de demande : GPK-20250109-00042
Date souhaitée : 15 janvier 2025
Adresse : [Adresse complète]

Pour suivre votre demande en temps réel :
→ Créez votre compte : https://app.fasofret.com/signup?token=xxx

Ce lien est valable 7 jours.

Une fois votre compte créé, votre demande sera automatiquement
convertie en demande d'enlèvement officielle et vous pourrez :
- Suivre le statut en temps réel
- Recevoir des notifications
- Gérer vos futures expéditions

L'équipe Faso Fret Logistics
```

### 🔄 Conversion lors de l'Inscription

**Trigger** : Quand le prospect crée son compte (via token d'invitation)

**Processus** :
1. User s'inscrit avec token valide
2. Prospect → Company créée
3. `GuestPickupRequest` → `PickupRequest` (migration)
4. Toutes les données transférées
5. GuestPickupRequest marqué comme converti
6. User peut accéder à `/dashboard/pickups`

---

## 🔒 Workflow Back-Office (Dashboard)

### 📍 Route : `/dashboard/pickups/new`

**Accessible à** : Utilisateurs authentifiés uniquement

### 🔧 Architecture

**Page** : `NewPickupRequestPage`
**Action** : `createPickupRequestAction`
**Schema** : `pickupRequestSchema`
**Table** : `PickupRequest`

### 📊 Workflow Détaillé

```
┌─────────────────────────────────────────────────┐
│ 1. User Connecté Visite                        │
│    /dashboard/pickups/new                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 2. Vérification Session                        │
│    → requireAuth()                             │
│    Throw si non authentifié                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 3. Remplit le Formulaire Dashboard             │
│    Champs requis :                             │
│    - shipmentId (sélection expédition)         │
│    - pickupAddress                             │
│    - pickupCity, postalCode, country           │
│    - pickupContact, pickupPhone                │
│    - requestedDate, timeSlot                   │
│    - specialInstructions                       │
│    - accessInstructions                        │
│    - internalNotes (PRIVÉ)                     │
│    - companyId (auto-détecté ou sélectionné)   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 4. Submit → createPickupRequestAction           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 5. Vérification Authentification                │
│    const session = await requireAuth()          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 6. Obtenir Client Prisma Enhanced               │
│    const db = getEnhancedPrismaFromSession()    │
│    → Access control RBAC automatique            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 7. Validation avec pickupRequestSchema          │
│    (Zod côté serveur)                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 8. Vérifier Expédition Existe                  │
│    const shipment = await db.shipment           │
│      .findUnique({ where: { id } })             │
│                                                 │
│    Zenstack applique Access Control :           │
│    - CLIENT : voit uniquement sa company       │
│    - ADMIN : voit toutes les expéditions       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 9. Créer PickupRequest                         │
│    - Lié à Shipment (shipmentId)               │
│    - Lié à Company (companyId auto du shipment)│
│    - createdById (user actuel)                 │
│    - Status : REQUESTED                         │
│    - Table : PickupRequest                      │
│    - PAS de numéro GPK (utilise shipment)      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 10. Revalider Caches Next.js                   │
│     revalidatePath('/dashboard/pickups')        │
│     revalidatePath('/dashboard/shipments/...')  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 11. Redirect → /dashboard/pickups               │
│     La demande apparaît immédiatement           │
└─────────────────────────────────────────────────┘
```

### 🔐 Sécurité : Utilisation de Zenstack

```typescript
import { requireAuth } from '@/lib/auth/config'; // ✅ AUTH REQUISE
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client'; // ✅ ZENSTACK

const session = await requireAuth(); // Throw si non auth
const db = getEnhancedPrismaFromSession(session); // Access control RBAC
```

**Access Control Automatique** :
- **CLIENT** : Voit/crée uniquement pour sa company
- **OPERATIONS_MANAGER** : Voit/crée pour toutes les companies
- **ADMIN** : Accès complet
- **FINANCE_MANAGER** : Lecture seule
- **VIEWER** : Pas d'accès

### 🔗 Association Automatique

```typescript
// La companyId est automatiquement récupérée du Shipment
const pickupRequest = await db.pickupRequest.create({
  data: {
    ...validated,
    companyId: shipment.companyId, // ← Auto-récupéré
    createdById: session.user.id,  // ← User actuel
    status: PickupStatus.REQUESTED,
  },
});
```

**Avantages** :
- Pas de saisie manuelle de la company
- Cohérence garantie avec l'expédition
- Traçabilité de l'auteur (createdById)

---

## 🔍 Comparaison Détaillée des Schémas

### Front-Office : `guestPickupRequestSchema`

```typescript
{
  // Contact Prospect (requis)
  prospectEmail: z.string().email(),
  prospectPhone: z.string().min(10),
  prospectName: z.string().optional(),

  // Adresse d'enlèvement
  pickupAddress: z.string(),
  pickupCity: z.string(),
  pickupPostalCode: z.string(),
  pickupCountry: z.string(),

  // Contact sur place (optionnel)
  pickupContact: z.string().optional(),
  pickupPhone: z.string().optional(),

  // Planification
  requestedDate: z.string(),
  timeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'SPECIFIC_TIME', 'FLEXIBLE']),
  pickupTime: z.string().optional(),

  // Marchandise
  cargoType: z.string(),
  estimatedWeight: z.number().optional(),
  estimatedVolume: z.number().optional(),
  description: z.string().optional(),

  // Instructions
  specialInstructions: z.string().optional(),
  accessInstructions: z.string().optional(),

  // ❌ PAS DE : shipmentId, companyId, internalNotes
}
```

### Back-Office : `pickupRequestSchema`

```typescript
{
  // ✅ Lien vers Shipment (REQUIS)
  shipmentId: z.string(),

  // ✅ Company (REQUIS)
  companyId: z.string(),

  // Adresse d'enlèvement
  pickupAddress: z.string(),
  pickupCity: z.string(),
  pickupPostalCode: z.string(),
  pickupCountry: z.string(),

  // Contact sur place
  pickupContact: z.string().optional(),
  pickupPhone: z.string().optional(),

  // Planification
  requestedDate: z.string(),
  timeSlot: z.enum([...]),
  pickupTime: z.string().optional(),

  // Instructions
  specialInstructions: z.string().optional(),
  accessInstructions: z.string().optional(),

  // ✅ Notes internes (PRIVÉ - pas dans public)
  internalNotes: z.string().optional(),

  // ❌ PAS DE : prospectEmail, prospectPhone, cargoType, estimatedWeight
  // (Ces infos viennent du Shipment lié)
}
```

### 📊 Différences Clés

| Champ | Front-Office | Back-Office |
|-------|-------------|-------------|
| `prospectEmail` | ✅ Requis | ❌ N/A |
| `prospectPhone` | ✅ Requis | ❌ N/A |
| `prospectName` | ✅ Optionnel | ❌ N/A |
| `shipmentId` | ❌ N/A | ✅ Requis |
| `companyId` | ❌ N/A | ✅ Requis |
| `internalNotes` | ❌ N/A | ✅ Optionnel |
| `cargoType` | ✅ Requis | ❌ N/A (vient du Shipment) |
| `estimatedWeight` | ✅ Optionnel | ❌ N/A (vient du Shipment) |
| `estimatedVolume` | ✅ Optionnel | ❌ N/A (vient du Shipment) |
| `description` | ✅ Optionnel | ❌ N/A (vient du Shipment) |

---

## 📂 Modèles de Données

### `GuestPickupRequest` (Front-Office)

```prisma
model GuestPickupRequest {
  id          String   @id @default(cuid())

  // Lien vers Prospect
  prospectId  String
  prospect    Prospect @relation(...)

  // Numéro unique
  requestNumber String @unique // Format: GPK-YYYYMMDD-XXXXX

  // Adresse
  pickupAddress     String
  pickupCity        String
  pickupPostalCode  String
  pickupCountry     String

  // Contact
  pickupContact String?
  pickupPhone   String?

  // Planification
  requestedDate DateTime
  timeSlot      PickupTimeSlot
  pickupTime    String?

  // Marchandise
  cargoType        String
  estimatedWeight  Float?
  estimatedVolume  Float?
  description      String?

  // Instructions
  specialInstructions String?
  accessInstructions  String?

  // Statut
  status PickupStatus @default(REQUESTED)

  // Conversion
  convertedToPickupRequestId String?   @unique
  convertedAt                DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### `PickupRequest` (Back-Office)

```prisma
model PickupRequest {
  id String @id @default(cuid())

  // Liens essentiels
  shipmentId String
  shipment   Shipment @relation(...)

  companyId String
  company   Company @relation(...)

  createdById String
  createdBy   User   @relation(...)

  // Adresse
  pickupAddress    String
  pickupCity       String
  pickupPostalCode String
  pickupCountry    String

  // Contact
  pickupContact String?
  pickupPhone   String?

  // Planification
  requestedDate DateTime
  timeSlot      PickupTimeSlot
  pickupTime    String?

  // Instructions
  specialInstructions String?
  accessInstructions  String?
  internalNotes       String? // ← PRIVÉ

  // Statut et workflow
  status        PickupStatus
  transporterId String?
  transporter   Transporter? @relation(...)

  driverName  String?
  driverPhone String?
  vehicleInfo String?

  scheduledDate  DateTime?
  actualPickupDate DateTime?

  cancellationReason String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@allow('create', auth().role in ['ADMIN', 'OPERATIONS_MANAGER', 'CLIENT'])
  @@allow('read', auth().role in ['ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER']
                  || (auth().role == 'CLIENT' && companyId == auth().companyId))
}
```

---

## 🔄 Conversion GuestPickupRequest → PickupRequest

### Trigger

**Quand ?** Lors de l'inscription d'un prospect via token d'invitation

**Fichier** : (TODO) `src/modules/auth/signup-with-invitation.ts`

### Processus de Conversion

```typescript
async function convertGuestPickupRequests(prospectId: string, companyId: string, userId: string) {
  // 1. Récupérer toutes les demandes guest du prospect
  const guestPickups = await prisma.guestPickupRequest.findMany({
    where: {
      prospectId,
      convertedAt: null, // Pas encore converties
    },
  });

  // 2. Pour chaque demande guest
  for (const guestPickup of guestPickups) {
    // 3. Créer un Shipment associé (optionnel selon workflow)
    const shipment = await prisma.shipment.create({
      data: {
        companyId,
        cargoType: guestPickup.cargoType,
        weight: guestPickup.estimatedWeight || 0,
        // ... autres champs depuis guestPickup
      },
    });

    // 4. Créer le PickupRequest officiel
    const pickupRequest = await prisma.pickupRequest.create({
      data: {
        shipmentId: shipment.id,
        companyId,
        createdById: userId,

        // Copier toutes les données
        pickupAddress: guestPickup.pickupAddress,
        pickupCity: guestPickup.pickupCity,
        pickupPostalCode: guestPickup.pickupPostalCode,
        pickupCountry: guestPickup.pickupCountry,
        pickupContact: guestPickup.pickupContact,
        pickupPhone: guestPickup.pickupPhone,
        requestedDate: guestPickup.requestedDate,
        timeSlot: guestPickup.timeSlot,
        pickupTime: guestPickup.pickupTime,
        specialInstructions: guestPickup.specialInstructions,
        accessInstructions: guestPickup.accessInstructions,

        status: guestPickup.status,
      },
    });

    // 5. Marquer comme converti
    await prisma.guestPickupRequest.update({
      where: { id: guestPickup.id },
      data: {
        convertedToPickupRequestId: pickupRequest.id,
        convertedAt: new Date(),
      },
    });
  }
}
```

---

## 📊 Récapitulatif des Différences

### 🎯 Cas d'Usage

**Front-Office** :
- Prospect découvre le site
- Veut tester le service
- Pas encore prêt à créer un compte
- Besoin d'un enlèvement simple

**Back-Office** :
- Client existant avec compte
- Expédition déjà créée
- Besoin d'organiser l'enlèvement
- Suivi professionnel requis

### 🔐 Sécurité

**Front-Office** :
- Accès public contrôlé
- Validation email obligatoire
- Token d'invitation avec expiration
- Données minimales stockées

**Back-Office** :
- Authentification requise
- RBAC via Zenstack
- Traçabilité complète (createdById)
- Données liées à la company

### 📧 Communication

**Front-Office** :
- Email de confirmation
- Lien d'invitation
- Instructions pour créer compte

**Back-Office** :
- Pas d'email automatique
- Notifications internes (TODO)
- Tableau de bord en temps réel

### 🔄 Workflow Post-Création

**Front-Office** :
```
GuestPickupRequest créé
    ↓
Email envoyé avec token
    ↓
Prospect crée compte
    ↓
Conversion automatique
    ↓
PickupRequest accessible dans dashboard
```

**Back-Office** :
```
PickupRequest créé
    ↓
Visible immédiatement dans /dashboard/pickups
    ↓
Assignation transporteur
    ↓
Planification
    ↓
Exécution
```

---

## 🚀 Améliorations Futures

### Front-Office

1. **Email de Confirmation**
   - ✅ Template HTML professionnel
   - ✅ Tracking link (lien suivi demande)
   - ✅ Call-to-action inscription

2. **Formulaire Adaptatif**
   - Détection géolocalisation
   - Auto-complétion adresse
   - Estimation automatique volume/poids

3. **Suivi Sans Compte**
   - Page tracking par numéro GPK-YYYYMMDD-XXXXX
   - Statut basique visible
   - Incitation à créer compte pour détails

### Back-Office

1. **Pré-remplissage Intelligent**
   - Auto-remplir adresse depuis shipment
   - Suggérer créneaux selon transporteurs
   - Proposer instructions depuis précédentes demandes

2. **Validation Avancée**
   - Vérifier disponibilité transporteur
   - Alerter si date trop proche
   - Suggérer optimisations (groupage, etc.)

3. **Workflow Complet**
   - Notification transporteur automatique
   - Confirmation SMS/email au client
   - Suivi GPS en temps réel

---

## 💡 Points Clés pour l'Équipe

1. **Deux Tables Distinctes** : `GuestPickupRequest` (public) vs `PickupRequest` (authentifié)

2. **Conversion Automatique** : Lors de l'inscription, les demandes guest deviennent des demandes officielles

3. **Sécurité Différenciée** :
   - Public : Prisma standard + validation manuelle
   - Dashboard : Zenstack enhanced + RBAC automatique

4. **Numérotation** :
   - Guest : `GPK-YYYYMMDD-XXXXX` (unique)
   - Dashboard : Pas de numéro propre (lié au Shipment)

5. **Email Critique** : Le workflow guest dépend de l'email d'invitation (TODO à implémenter)

6. **UX Progressive** : Permettre l'essai avant l'inscription = meilleure conversion

---

**Les deux workflows sont complémentaires et répondent à des besoins utilisateurs distincts.** 🚀
