# Workflow de Gestion des Expéditions par Agent

## Vue d'ensemble

Ce document décrit le workflow complet de gestion des expéditions par un agent (ADMIN ou OPERATIONS_MANAGER) dans l'application Faso Fret Logistics.

## Diagramme du Workflow

```
[Devis validé (VALIDATED)]
        ↓
[Création automatique Expédition]
        ↓
[Génération numéro de suivi: {PAYS}-{CODE}-{JJAA}-{SEQ}]
        ↓
[TODO: Envoi email client avec numéro + lien direct suivi]
        ↓
┌─────────────────────────────────────────────────┐
│ STATUT: "Enregistré" (PENDING_APPROVAL)         │
│ → Bouton "Prendre en charge"                    │
│   (Agent, commentaire optionnel)                │
└─────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│ STATUT: "Prise en charge" (PICKED_UP)           │
│ → Bouton "Acheminer"                            │
│   (Agent, commentaire optionnel)                │
└─────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│ STATUT: "En cours d'acheminement" (IN_TRANSIT)  │
│ → Bouton "Traitement administratif"             │
│   (Agent, commentaire optionnel)                │
└─────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│ STATUT: "En cours de dédouanement" (AT_CUSTOMS) │
│ → Bouton "Réceptionner"                         │
│   (Agent, commentaire optionnel)                │
└─────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────┐
│ STATUT: "À retirer" (READY_FOR_PICKUP)          │
│ → Bouton "Confirmer le retrait"                 │
│   (Agent, commentaire optionnel)                │
└─────────────────────────────────────────────────┘
        ↓
[STATUT: "Retiré" (DELIVERED)] ✅
```

## Format du Numéro de Tracking

**Format** : `{PAYS}-{CODE3}-{JJAA}-{SEQUENCE5}`

**Exemple** : `BF-XK7-1425-00042`

| Composant | Description | Exemple |
|-----------|-------------|---------|
| `PAYS` | Code pays destination ISO 3166-1 alpha-2 | `BF` (Burkina Faso) |
| `CODE3` | Code aléatoire 3 caractères (sans I, O, 0, 1) | `XK7` |
| `JJAA` | Jour (2 chiffres) + Année (2 derniers chiffres) | `1425` (14 janvier 2025) |
| `SEQUENCE5` | Numéro séquentiel journalier par pays (5 chiffres) | `00042` |

**Caractéristiques** :
- Unicité garantie par le code aléatoire + séquence
- Facile à lire/dicter (pas de confusion I/1, O/0)
- Identifie immédiatement le pays de destination
- Permet le tri chronologique

## Statuts des Expéditions

| Statut | Label FR | Description | Actions disponibles |
|--------|----------|-------------|---------------------|
| `PENDING_APPROVAL` | Enregistré | Créé depuis un devis validé | Prendre en charge, Mettre en attente, Annuler |
| `PICKED_UP` | Prise en charge | Agent a pris l'expédition | Acheminer, Mettre en attente, Annuler |
| `IN_TRANSIT` | En cours d'acheminement | En transit vers destination | Traitement admin, Mettre en attente, Annuler |
| `AT_CUSTOMS` | En cours de dédouanement | En douane | Réceptionner, Mettre en attente, Annuler |
| `READY_FOR_PICKUP` | À retirer | Prêt pour retrait client | Confirmer retrait, Mettre en attente, Annuler |
| `DELIVERED` | Retiré | Client a retiré | - (Terminé) |
| `ON_HOLD` | En attente | Suspendu temporairement | Reprendre |
| `CANCELLED` | Annulé | Annulé par l'agent | - (Terminé) |

## Fichiers Concernés

### Composants UI
- `src/components/shipments/shipment-agent-actions.tsx` - Boutons et dialogs agent

### Pages
- `src/app/(dashboard)/dashboard/shipments/[id]/page.tsx` - Page détail avec actions agent

### Actions serveur
- `src/modules/shipments/actions/shipment.actions.ts`
  - `generateTrackingNumber(destinationCountry)` - Génère le numéro de suivi
  - `updateShipmentStatusAction(id, statusData)` - Change le statut + crée TrackingEvent

### Actions liées (création depuis devis)
- `src/modules/quotes/actions/quote.actions.ts`
  - `validateQuoteTreatmentAction()` - Crée l'expédition avec statut `PENDING_APPROVAL`

## TODO : Intégration Inngest (Priorité)

### Événement 1 : Email de création d'expédition

Ajouter dans `src/lib/inngest/client.ts` :

```typescript
'shipment/created': {
  data: {
    shipmentId: string;
    trackingNumber: string;
    companyId: string;
    companyName: string;
    companyEmail: string;
    originCountry: string;
    destinationCountry: string;
    estimatedCost: number;
    currency: string;
    trackingUrl: string; // URL directe vers la page de suivi
  };
};
```

### Fonction Inngest : Envoyer email de création

Créer `src/lib/inngest/functions/shipment-notifications.ts` :

```typescript
import { inngest } from '../client';

/**
 * Fonction Inngest : Envoyer l'email de création d'expédition au client
 *
 * Déclenchée quand une expédition est créée (depuis devis validé)
 * Envoie au client :
 * - Le numéro de tracking
 * - Un lien direct vers la page de suivi
 * - Les informations de la route
 */
export const sendShipmentCreatedEmail = inngest.createFunction(
  {
    id: 'send-shipment-created-email',
    name: 'Email création expédition',
  },
  { event: 'shipment/created' },
  async ({ event, step }) => {
    const {
      trackingNumber,
      companyEmail,
      companyName,
      originCountry,
      destinationCountry,
      trackingUrl,
    } = event.data;

    // Step 1: Envoyer l'email
    await step.run('send-email', async () => {
      // TODO: Utiliser le service email (Resend, SendGrid, etc.)
      console.log(`[INNGEST] Envoi email création expédition à ${companyEmail}`);
      console.log(`[INNGEST] Tracking: ${trackingNumber}, URL: ${trackingUrl}`);

      // Exemple avec Resend:
      // await resend.emails.send({
      //   from: 'noreply@fasofret.com',
      //   to: companyEmail,
      //   subject: `Votre expédition ${trackingNumber} a été créée`,
      //   template: 'shipment-created',
      //   data: {
      //     trackingNumber,
      //     companyName,
      //     originCountry,
      //     destinationCountry,
      //     trackingUrl,
      //   }
      // });
    });

    return { success: true };
  }
);
```

### Événement 2 : Email de mise à jour de statut

Ajouter dans `src/lib/inngest/client.ts` :

```typescript
'shipment/status-updated': {
  data: {
    shipmentId: string;
    trackingNumber: string;
    companyEmail: string;
    companyName: string;
    previousStatus: string;
    newStatus: string;
    newStatusLabel: string;
    notes?: string;
    trackingUrl: string;
  };
};
```

### Fonction Inngest : Envoyer email de mise à jour

```typescript
/**
 * Fonction Inngest : Notifier le client d'un changement de statut
 *
 * Déclenchée à chaque changement de statut d'une expédition
 * Permet au client de suivre la progression en temps réel
 */
export const sendShipmentStatusUpdateEmail = inngest.createFunction(
  {
    id: 'send-shipment-status-update-email',
    name: 'Email mise à jour statut expédition',
  },
  { event: 'shipment/status-updated' },
  async ({ event, step }) => {
    const {
      trackingNumber,
      companyEmail,
      newStatusLabel,
      trackingUrl,
    } = event.data;

    await step.run('send-email', async () => {
      console.log(`[INNGEST] Email statut ${newStatusLabel} pour ${trackingNumber}`);

      // Exemple avec Resend:
      // await resend.emails.send({
      //   from: 'noreply@fasofret.com',
      //   to: companyEmail,
      //   subject: `${trackingNumber} - ${newStatusLabel}`,
      //   template: 'shipment-status-update',
      //   data: { trackingNumber, newStatusLabel, trackingUrl }
      // });
    });

    return { success: true };
  }
);
```

### Intégration dans les actions

#### Dans `validateQuoteTreatmentAction()` :

```typescript
// Après la création de l'expédition, déclencher l'email
await inngest.send({
  name: 'shipment/created',
  data: {
    shipmentId: result.shipment.id,
    trackingNumber: result.shipment.trackingNumber,
    companyId: existingQuote.companyId,
    companyName: existingQuote.company.name,
    companyEmail: existingQuote.company.email,
    originCountry: existingQuote.originCountry,
    destinationCountry: existingQuote.destinationCountry,
    estimatedCost: existingQuote.estimatedCost,
    currency: existingQuote.currency,
    trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tracking/${result.shipment.trackingNumber}`,
  },
});
```

#### Dans `updateShipmentStatusAction()` :

```typescript
// Après la mise à jour du statut, notifier le client
await inngest.send({
  name: 'shipment/status-updated',
  data: {
    shipmentId: id,
    trackingNumber: shipment.trackingNumber,
    companyEmail: shipment.company.email,
    companyName: shipment.company.name,
    previousStatus: shipment.status,
    newStatus: validatedData.status,
    newStatusLabel: STATUS_LABELS[validatedData.status],
    notes: validatedData.notes,
    trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tracking/${shipment.trackingNumber}`,
  },
});
```

### Enregistrer les fonctions

Ajouter dans `src/lib/inngest/index.ts` :

```typescript
import {
  sendShipmentCreatedEmail,
  sendShipmentStatusUpdateEmail
} from './functions/shipment-notifications';

export const functions = [
  // ... autres fonctions
  sendShipmentCreatedEmail,
  sendShipmentStatusUpdateEmail,
];
```

## Permissions RBAC

| Rôle | Voir | Traiter | Mettre en attente | Annuler |
|------|------|---------|-------------------|---------|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `OPERATIONS_MANAGER` | ✅ | ✅ | ✅ | ✅ |
| `FINANCE_MANAGER` | ✅ | ❌ | ❌ | ❌ |
| `CLIENT` | ✅ (propres) | ❌ | ❌ | ❌ |
| `VIEWER` | ❌ | ❌ | ❌ | ❌ |

## Tests

### Scénarios à tester

1. **Création depuis devis validé**
   - Avoir un devis IN_TREATMENT
   - Cliquer sur "Valider"
   - Vérifier la création de l'expédition avec numéro format `XX-XXX-XXXX-XXXXX`
   - Vérifier le statut initial PENDING_APPROVAL
   - Vérifier l'envoi d'email (TODO)

2. **Workflow complet de traitement**
   - Prendre une expédition PENDING_APPROVAL
   - Passer par tous les statuts jusqu'à DELIVERED
   - Vérifier les TrackingEvents créés
   - Vérifier les emails de notification (TODO)

3. **Mise en attente et reprise**
   - Mettre une expédition ON_HOLD avec raison
   - Vérifier la raison dans les notes
   - Reprendre le traitement
   - Vérifier le retour à PENDING_APPROVAL

4. **Annulation**
   - Annuler une expédition avec raison
   - Vérifier le statut CANCELLED
   - Vérifier l'impossibilité de continuer le workflow

## Changelog

- **2026-01-14** : Création du workflow expédition agent
  - Nouveau format de tracking `{PAYS}-{CODE}-{JJAA}-{SEQ}`
  - Composant ShipmentAgentActions
  - Intégration dans la page détail
  - Documentation Inngest pour emails
