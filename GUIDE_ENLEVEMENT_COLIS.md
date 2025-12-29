# Guide : Fonctionnalité d'Enlèvement de Colis

## 📦 Vue d'ensemble

Ce guide explique comment utiliser le système complet de gestion des enlèvements de colis dans Faso Fret Logistics v2.

## ✅ Fonctionnalités Implémentées

### 1. Workflow de Statuts

Le système gère un workflow complet avec 5 statuts :

```
REQUESTED → SCHEDULED → IN_PROGRESS → COMPLETED
                ↓           ↓
              CANCELED    CANCELED
```

**Détails des statuts** :
- **REQUESTED** : Demande créée, en attente de planification
- **SCHEDULED** : Enlèvement planifié avec date et transporteur assigné
- **IN_PROGRESS** : Transporteur en route ou sur place
- **COMPLETED** : Enlèvement effectué avec succès
- **CANCELED** : Enlèvement annulé (possible à tout moment sauf si COMPLETED)

### 2. Créneaux Horaires

5 types de créneaux disponibles :
- **FLEXIBLE** : Toute la journée (par défaut)
- **MORNING** : Matin (8h-12h)
- **AFTERNOON** : Après-midi (12h-17h)
- **EVENING** : Soirée (17h-20h)
- **SPECIFIC_TIME** : Heure précise (champ `pickupTime` obligatoire au format "HH:MM")

### 3. Système de Notifications

Champs prêts pour l'intégration avec un système de notifications :
- `notificationSent` : Notification 24h avant
- `reminderSent` : Rappel J-1
- `confirmationSent` : Confirmation après enlèvement

## 🚀 Guide d'Utilisation

### Étape 1 : Créer une Demande d'Enlèvement

**Page** : `/dashboard/pickups/new`

**Accès** : ADMIN, OPERATIONS_MANAGER, CLIENT

**Données requises** :
```typescript
{
  shipmentId: string,           // ID de l'expédition
  companyId: string,             // ID de la company
  pickupAddress: string,         // Adresse complète
  pickupCity: string,
  pickupPostalCode: string,
  pickupCountry: string,         // Code ISO 2 lettres (ex: FR)
  requestedDate: string,         // Date souhaitée (ISO format)
  timeSlot: PickupTimeSlot,     // Créneau horaire
  pickupTime?: string,           // Si SPECIFIC_TIME (format "HH:MM")

  // Optionnel
  pickupContact?: string,
  pickupPhone?: string,
  specialInstructions?: string,
  accessInstructions?: string,   // Code porte, interphone, etc.
  internalNotes?: string,        // Visible uniquement par l'équipe
}
```

**Exemple de création** :
```typescript
const result = await createPickupRequestAction({
  shipmentId: 'clxxxxxxxxxxx',
  companyId: 'clxxxxxxxxxxx',
  pickupAddress: '123 Rue de la Paix',
  pickupCity: 'Paris',
  pickupPostalCode: '75001',
  pickupCountry: 'FR',
  pickupContact: 'Jean Dupont',
  pickupPhone: '+33 6 12 34 56 78',
  requestedDate: '2025-01-15T09:00:00Z',
  timeSlot: 'MORNING',
  specialInstructions: 'Colis fragile, manipuler avec précaution',
  accessInstructions: 'Code porte: 1234, Interphone: Dupont',
});
```

### Étape 2 : Planifier et Assigner

**Action** : `assignTransporterAction`

**Rôles autorisés** : ADMIN, OPERATIONS_MANAGER

**Données requises** :
```typescript
{
  transporterId: string,
  scheduledDate?: string,        // Date confirmée
  driverName?: string,
  driverPhone?: string,
  vehiclePlate?: string,
}
```

**Effet** :
- Change automatiquement le statut à `SCHEDULED`
- Enregistre les informations du transporteur et du chauffeur

### Étape 3 : Suivre l'Enlèvement

**Transitions de statut** :

1. **SCHEDULED → IN_PROGRESS**
   ```typescript
   await updatePickupStatusAction(pickupId, {
     status: 'IN_PROGRESS',
     notes: 'Transporteur en route',
   });
   ```

2. **IN_PROGRESS → COMPLETED**
   ```typescript
   await updatePickupStatusAction(pickupId, {
     status: 'COMPLETED',
     actualPickupDate: new Date().toISOString(), // Obligatoire
     notes: 'Enlèvement effectué avec succès',
   });
   ```

   **Effet** : Met à jour automatiquement `actualPickupDate` de l'expédition liée

3. **Annulation** (depuis n'importe quel statut sauf COMPLETED)
   ```typescript
   await cancelPickupRequestAction(pickupId, 'Raison de l\'annulation');
   ```

### Étape 4 : Consulter et Filtrer

**Page** : `/dashboard/pickups`

**Filtres disponibles** :
- Par statut (REQUESTED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELED)
- Par date (startDate / endDate)
- Par transporteur (transporterId)
- Par company (companyId)
- Par pays (pickupCountry)
- Par créneau horaire (timeSlot)
- Recherche textuelle (adresse, ville, contact, N° de suivi)

**Exemple de recherche** :
```typescript
const result = await listPickupRequestsAction({
  status: 'SCHEDULED',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  transporterId: 'clxxxxxxxxxxx',
  page: 1,
  limit: 20,
  sortBy: 'requestedDate',
  sortOrder: 'asc',
});
```

## 🔐 Contrôle d'Accès (RBAC)

### Permissions par Rôle

| Action | ADMIN | OPERATIONS_MANAGER | FINANCE_MANAGER | CLIENT | VIEWER |
|--------|-------|-------------------|-----------------|--------|--------|
| Créer demande | ✅ | ✅ | ❌ | ✅ (ses demandes) | ❌ |
| Lire demandes | ✅ (toutes) | ✅ (toutes) | ✅ (toutes) | ✅ (sa company) | ❌ |
| Modifier demande | ✅ | ✅ | ❌ | ✅ (si créateur) | ❌ |
| Changer statut | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assigner transporteur | ✅ | ✅ | ❌ | ❌ | ❌ |
| Annuler | ✅ | ✅ | ❌ | ✅ (si créateur) | ❌ |

### Règles Métier

1. **Création** : Un client ne peut créer une demande que pour les expéditions de sa company
2. **Modification** : Impossible de modifier une demande COMPLETED ou CANCELED
3. **Transitions** : Les changements de statut suivent le workflow défini
4. **Suppression** : Pas de suppression (utiliser CANCELED)

## 📸 Upload de Documents

Les demandes d'enlèvement peuvent avoir des documents associés via la table `Document` :

**Types de documents spécifiques** :
- `PROOF_OF_PICKUP` : Preuve d'enlèvement (photo des colis)
- `PICKUP_SIGNATURE` : Signature du client

**Exemple d'upload** :
```typescript
// Créer un document lié à la demande
await db.document.create({
  data: {
    name: 'preuve_enlevement_12345.jpg',
    fileUrl: 'https://storage.example.com/...',
    fileKey: 'pickup-proof-xyz',
    fileSize: 245678,
    mimeType: 'image/jpeg',
    type: 'PROOF_OF_PICKUP',
    pickupRequestId: pickupId,
    companyId: companyId,
    uploadedBy: userId,
  },
});
```

## 🔔 Intégration Notifications (À Implémenter)

Le modèle inclut des champs pour gérer les notifications. Voici comment les implémenter avec **Inngest** :

### Job 1 : Notification 24h Avant

```typescript
// src/lib/inngest/functions/pickup-notifications.ts
export const sendPickupNotification = inngest.createFunction(
  { id: 'send-pickup-notification' },
  { cron: '0 9 * * *' }, // Tous les jours à 9h
  async ({ step }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pickups = await db.pickupRequest.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledDate: {
          gte: tomorrow,
          lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        },
        notificationSent: false,
      },
      include: {
        company: true,
        transporter: true,
      },
    });

    for (const pickup of pickups) {
      await step.run('send-email', async () => {
        await sendEmail({
          to: pickup.company.email,
          subject: `Enlèvement planifié demain - ${pickup.shipment.trackingNumber}`,
          template: 'pickup-reminder',
          data: pickup,
        });

        await db.pickupRequest.update({
          where: { id: pickup.id },
          data: { notificationSent: true },
        });
      });
    }
  }
);
```

### Job 2 : Confirmation Après Enlèvement

```typescript
export const sendPickupConfirmation = inngest.createFunction(
  { id: 'send-pickup-confirmation' },
  { event: 'pickup/completed' },
  async ({ event, step }) => {
    const pickup = event.data.pickup;

    await step.run('send-confirmation', async () => {
      await sendEmail({
        to: pickup.company.email,
        subject: `Enlèvement confirmé - ${pickup.shipment.trackingNumber}`,
        template: 'pickup-confirmation',
        data: {
          pickup,
          completionDate: pickup.actualPickupDate,
          transporter: pickup.transporter,
        },
      });

      await db.pickupRequest.update({
        where: { id: pickup.id },
        data: { confirmationSent: true },
      });
    });
  }
);
```

## 📊 Optimisations Futures

### 1. Vue Calendaire

Ajouter une vue calendrier pour visualiser tous les enlèvements planifiés :
- Intégrer `react-big-calendar` ou `@fullcalendar/react`
- Afficher les enlèvements par date
- Drag & drop pour replanifier

### 2. Carte Interactive

Afficher les enlèvements du jour sur une carte :
- Intégrer `react-leaflet` ou `@googlemaps/react-wrapper`
- Montrer les adresses d'enlèvement
- Optimiser les tournées des transporteurs

### 3. Optimisation des Tournées

Calculer automatiquement le meilleur itinéraire :
- Algorithme de routage (TSP - Traveling Salesman Problem)
- Regrouper les enlèvements par zone géographique
- Estimer les temps de trajet

### 4. Webhooks pour Transporteurs

Notifier les transporteurs en temps réel :
- Webhook lors de l'assignation
- Webhook lors du changement de statut
- API pour mettre à jour la position du véhicule

## 🔧 Maintenance

### Migration de la Base de Données

Pour appliquer le nouveau schéma :

```bash
# 1. Réveiller la BDD Neon (si en hibernation)
# Aller sur console.neon.tech

# 2. Pousser les migrations
npm run db:push

# 3. Vérifier que tout fonctionne
npm run db:studio
```

### Rollback

Si besoin de revenir en arrière :

```bash
# Supprimer la table PickupRequest
npx prisma db execute --sql "DROP TABLE IF EXISTS \"PickupRequest\" CASCADE;"

# Retirer le modèle du schema.zmodel
# Puis régénérer
npm run db:generate
npm run db:push
```

## 📝 Exemples de Code

### Créer une Demande avec Pré-remplissage depuis Expédition

```typescript
// Récupérer l'expédition
const shipment = await db.shipment.findUnique({
  where: { id: shipmentId },
});

// Créer la demande avec adresse d'origine de l'expédition
const pickup = await createPickupRequestAction({
  shipmentId: shipment.id,
  companyId: shipment.companyId,
  pickupAddress: shipment.originAddress,
  pickupCity: shipment.originCity,
  pickupPostalCode: shipment.originPostalCode,
  pickupCountry: shipment.originCountry,
  pickupContact: shipment.originContact,
  pickupPhone: shipment.originPhone,
  requestedDate: shipment.requestedPickupDate || new Date().toISOString(),
  timeSlot: 'FLEXIBLE',
});
```

### Générer un PDF de Bon d'Enlèvement

```typescript
import { jsPDF } from 'jspdf';

export async function generatePickupSlip(pickupId: string) {
  const pickup = await getPickupRequestByIdAction(pickupId);
  if (!pickup.success) throw new Error('Pickup not found');

  const doc = new jsPDF();

  // En-tête
  doc.setFontSize(20);
  doc.text('BON D\'ENLÈVEMENT', 105, 20, { align: 'center' });

  // Informations
  doc.setFontSize(12);
  doc.text(`N° Expédition: ${pickup.data.shipment.trackingNumber}`, 20, 40);
  doc.text(`Date: ${format(new Date(pickup.data.scheduledDate), 'dd/MM/yyyy')}`, 20, 50);
  doc.text(`Adresse: ${pickup.data.pickupAddress}`, 20, 60);
  doc.text(`${pickup.data.pickupPostalCode} ${pickup.data.pickupCity}`, 20, 70);

  // Transporteur
  if (pickup.data.transporter) {
    doc.text(`Transporteur: ${pickup.data.transporter.name}`, 20, 90);
    if (pickup.data.driverName) {
      doc.text(`Chauffeur: ${pickup.data.driverName}`, 20, 100);
    }
  }

  // Signature
  doc.text('Signature du client:', 20, 140);
  doc.rect(20, 150, 80, 30);

  return doc.output('blob');
}
```

## 🎯 Résumé des Fichiers Créés

```
src/
├── modules/pickups/
│   ├── schemas/pickup.schema.ts       # Schémas Zod de validation
│   ├── actions/pickup.actions.ts      # 7 Server Actions
│   └── index.ts                       # Exports du module
│
├── app/(dashboard)/dashboard/pickups/
│   ├── page.tsx                       # Liste et filtres
│   ├── new/page.tsx                   # Formulaire de création
│   └── [id]/page.tsx                  # Page de détails + actions
│
└── schema.zmodel                      # Modèle PickupRequest + relations
```

## 📞 Support

Pour toute question ou suggestion d'amélioration, créez une issue sur le repo GitHub du projet.
