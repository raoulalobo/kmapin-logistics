# Workflow de Traitement des Devis par Agent

## Vue d'ensemble

Ce document décrit le workflow complet de traitement des devis par un agent (ADMIN ou OPERATIONS_MANAGER) dans l'application Faso Fret Logistics.

## Diagramme du Workflow

```
[Devis créé (DRAFT)]
        ↓
[Devis envoyé au client (SENT)]
        ↓
[Client accepte (ACCEPTED)] ──────────────────┐
        ↓                                      │
[Agent consulte liste devis]                   │
        ↓                                      │
[Agent ouvre détail devis]                     │
        ↓                                      │
        ├─→ [Bouton "Traiter devis"]           │
        │           ↓                          │
        │   [Popup choix paiement]             │
        │           ↓                          │
        │   ┌─────────────────────────────┐    │
        │   │  • Comptant (CASH)          │    │
        │   │  • À la livraison           │    │
        │   │    (ON_DELIVERY)            │    │
        │   │  • Virement (BANK_TRANSFER) │    │
        │   └─────────────────────────────┘    │
        │           ↓                          │
        │   [Si virement: Email RIB au client] │  ← TODO: Inngest
        │           ↓                          │
        │   [Commentaire optionnel]            │
        │           ↓                          │
        │   [Statut: IN_TREATMENT]             │
        │                                      │
        └─────────────────────────────────────►│
                                               │
[Statut: IN_TREATMENT]                         │
        ↓                                      │
        ├─→ [Bouton "Valider"]                 │
        │           ↓                          │
        │   [Création automatique Expédition]  │
        │           ↓                          │
        │   [Statut: VALIDATED]                │
        │           ↓                          │
        │   [Redirection vers Expédition]      │
        │                                      │
        └─→ [Bouton "Annuler"]                 │
                    ↓                          │
            [Raison obligatoire]               │
                    ↓                          │
            [Statut: CANCELLED]                │
```

## Statuts des Devis

| Statut | Description | Actions disponibles |
|--------|-------------|---------------------|
| `DRAFT` | Brouillon | Modifier, Supprimer |
| `SENT` | Envoyé au client | Modifier, Traiter, Annuler |
| `ACCEPTED` | Accepté par le client | Traiter, Annuler |
| `REJECTED` | Rejeté par le client | - |
| `EXPIRED` | Date de validité dépassée | - |
| `IN_TREATMENT` | En cours de traitement par agent | Valider, Annuler |
| `VALIDATED` | Traitement terminé, expédition créée | Voir expédition |
| `CANCELLED` | Annulé par l'agent | - |

## Méthodes de Paiement

| Code | Label | Description |
|------|-------|-------------|
| `CASH` | Comptant | Paiement immédiat à la commande |
| `ON_DELIVERY` | À la livraison | Paiement à la réception de la marchandise |
| `BANK_TRANSFER` | Virement bancaire | Envoi automatique du RIB par email |

## Fichiers Concernés

### Schéma de données
- `schema.zmodel` - Définition des enums `QuoteStatus` et `QuotePaymentMethod`
- Champs ajoutés au modèle `Quote` :
  - `paymentMethod` - Méthode de paiement choisie
  - `agentComment` - Commentaire de l'agent
  - `treatmentStartedAt` - Date de début du traitement
  - `treatmentValidatedAt` - Date de validation
  - `treatmentAgentId` - ID de l'agent traitant
  - `cancelledAt` - Date d'annulation
  - `cancelReason` - Raison de l'annulation
  - `shipmentId` - Lien vers l'expédition créée

### Actions serveur
- `src/modules/quotes/actions/quote.actions.ts`
  - `startQuoteTreatmentAction()` - Démarrer le traitement
  - `validateQuoteTreatmentAction()` - Valider et créer l'expédition
  - `cancelQuoteAction()` - Annuler le devis
  - `countQuotesAwaitingTreatmentAction()` - Compter les devis en attente
  - `countQuotesInTreatmentAction()` - Compter les devis en cours

### Schémas de validation (Zod)
- `src/modules/quotes/schemas/quote.schema.ts`
  - `quoteStartTreatmentSchema` - Validation du traitement
  - `quoteValidateTreatmentSchema` - Validation de la validation
  - `quoteCancelSchema` - Validation de l'annulation

### Composants UI
- `src/components/quotes/quote-agent-actions.tsx` - Boutons et dialogs agent

### Pages
- `src/app/(dashboard)/dashboard/quotes/[id]/page.tsx` - Page détail avec actions agent

## TODO : Intégration Inngest (Priorité)

### Événement à créer

Ajouter dans `src/lib/inngest/client.ts` :

```typescript
'quote/treatment-bank-transfer': {
  data: {
    quoteId: string;
    quoteNumber: string;
    companyId: string;
    companyName: string;
    companyEmail: string;
    estimatedCost: number;
    currency: string;
    agentId: string;
    agentName: string;
  };
};
```

### Fonction Inngest à créer

Créer `src/lib/inngest/functions/quote-treatment.ts` :

```typescript
import { inngest } from '../client';
import { prisma } from '@/lib/db/client';

/**
 * Fonction Inngest : Envoyer le RIB au client
 *
 * Déclenchée quand un devis passe en traitement avec virement bancaire
 */
export const sendBankTransferRIB = inngest.createFunction(
  {
    id: 'send-bank-transfer-rib',
    name: 'Envoi RIB pour virement bancaire',
  },
  { event: 'quote/treatment-bank-transfer' },
  async ({ event, step }) => {
    const { quoteId, quoteNumber, companyEmail, estimatedCost, currency } = event.data;

    // Step 1: Récupérer les informations bancaires de l'entreprise
    const bankInfo = await step.run('get-bank-info', async () => {
      // TODO: Récupérer les infos bancaires depuis la config
      return {
        bankName: 'Banque Exemple',
        iban: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX',
        bic: 'BNPAFRPP',
      };
    });

    // Step 2: Envoyer l'email
    await step.run('send-email', async () => {
      // TODO: Utiliser le service email (Resend, SendGrid, etc.)
      console.log(`[INNGEST] Envoi email RIB à ${companyEmail} pour devis ${quoteNumber}`);
      // Exemple avec Resend:
      // await resend.emails.send({
      //   from: 'noreply@fasofret.com',
      //   to: companyEmail,
      //   subject: `RIB pour le devis ${quoteNumber}`,
      //   template: 'bank-transfer-rib',
      //   data: { quoteNumber, estimatedCost, currency, ...bankInfo }
      // });
    });

    // Step 3: Logger l'envoi
    await step.run('log-email-sent', async () => {
      console.log(`[INNGEST] Email RIB envoyé pour devis ${quoteNumber}`);
    });

    return { success: true };
  }
);
```

### Intégration dans l'action

Modifier `startQuoteTreatmentAction()` pour déclencher l'événement :

```typescript
// Dans startQuoteTreatmentAction(), après la mise à jour du devis :
if (validatedData.paymentMethod === 'BANK_TRANSFER') {
  await inngest.send({
    name: 'quote/treatment-bank-transfer',
    data: {
      quoteId: existingQuote.id,
      quoteNumber: existingQuote.quoteNumber,
      companyId: existingQuote.companyId,
      companyName: existingQuote.company.name,
      companyEmail: existingQuote.company.email,
      estimatedCost: existingQuote.estimatedCost,
      currency: existingQuote.currency,
      agentId: session.user.id,
      agentName: session.user.name || session.user.email,
    },
  });
}
```

### Événement 2 : Email de confirmation de validation

Ajouter également dans `src/lib/inngest/client.ts` :

```typescript
'quote/validated': {
  data: {
    quoteId: string;
    quoteNumber: string;
    companyId: string;
    companyName: string;
    companyEmail: string;
    shipmentId: string;
    trackingNumber: string;
    estimatedCost: number;
    currency: string;
    originCountry: string;
    destinationCountry: string;
    agentId: string;
    agentName: string;
  };
};
```

### Fonction Inngest 2 : Email de confirmation de validation

Ajouter dans `src/lib/inngest/functions/quote-treatment.ts` :

```typescript
/**
 * Fonction Inngest : Envoyer l'email de confirmation au client
 *
 * Déclenchée quand un devis est validé et qu'une expédition est créée
 */
export const sendQuoteValidatedConfirmation = inngest.createFunction(
  {
    id: 'send-quote-validated-confirmation',
    name: 'Confirmation de validation de devis',
  },
  { event: 'quote/validated' },
  async ({ event, step }) => {
    const {
      quoteNumber,
      trackingNumber,
      companyEmail,
      companyName,
      estimatedCost,
      currency,
      originCountry,
      destinationCountry,
    } = event.data;

    // Step 1: Envoyer l'email de confirmation
    await step.run('send-confirmation-email', async () => {
      // TODO: Utiliser le service email (Resend, SendGrid, etc.)
      console.log(`[INNGEST] Envoi email confirmation validation à ${companyEmail}`);
      console.log(`[INNGEST] Devis ${quoteNumber} → Expédition ${trackingNumber}`);
      // Exemple avec Resend:
      // await resend.emails.send({
      //   from: 'noreply@fasofret.com',
      //   to: companyEmail,
      //   subject: `Confirmation de votre devis ${quoteNumber} - Expédition créée`,
      //   template: 'quote-validated',
      //   data: {
      //     quoteNumber,
      //     trackingNumber,
      //     companyName,
      //     estimatedCost,
      //     currency,
      //     originCountry,
      //     destinationCountry,
      //   }
      // });
    });

    return { success: true };
  }
);
```

### Intégration dans l'action validateQuoteTreatmentAction

Modifier `validateQuoteTreatmentAction()` pour déclencher l'événement après validation :

```typescript
// Après la transaction réussie, déclencher l'email de confirmation
await inngest.send({
  name: 'quote/validated',
  data: {
    quoteId: result.updatedQuote.id,
    quoteNumber: existingQuote.quoteNumber,
    companyId: existingQuote.companyId,
    companyName: existingQuote.company.name,
    companyEmail: existingQuote.company.email,
    shipmentId: result.shipment.id,
    trackingNumber: result.shipment.trackingNumber,
    estimatedCost: existingQuote.estimatedCost,
    currency: existingQuote.currency,
    originCountry: existingQuote.originCountry,
    destinationCountry: existingQuote.destinationCountry,
    agentId: session.user.id,
    agentName: session.user.name || session.user.email,
  },
});
```

### Enregistrer les fonctions

Ajouter dans `src/lib/inngest/index.ts` :

```typescript
import { sendBankTransferRIB, sendQuoteValidatedConfirmation } from './functions/quote-treatment';

export const functions = [
  // ... autres fonctions
  sendBankTransferRIB,
  sendQuoteValidatedConfirmation,
];
```

## Permissions RBAC

| Rôle | Peut traiter | Peut valider | Peut annuler |
|------|--------------|--------------|--------------|
| `ADMIN` | ✅ | ✅ | ✅ |
| `OPERATIONS_MANAGER` | ✅ | ✅ | ✅ |
| `FINANCE_MANAGER` | ❌ | ❌ | ❌ |
| `CLIENT` | ❌ | ❌ | ❌ |
| `VIEWER` | ❌ | ❌ | ❌ |

## Tests

### Scénarios à tester

1. **Traitement avec paiement comptant**
   - Créer un devis SENT
   - Cliquer sur "Traiter devis"
   - Sélectionner "Comptant"
   - Vérifier le passage à IN_TREATMENT

2. **Traitement avec virement bancaire**
   - Créer un devis ACCEPTED
   - Cliquer sur "Traiter devis"
   - Sélectionner "Virement bancaire"
   - Vérifier l'envoi d'email RIB (TODO)
   - Vérifier le passage à IN_TREATMENT

3. **Validation et création d'expédition**
   - Avoir un devis IN_TREATMENT
   - Cliquer sur "Valider"
   - Remplir les informations
   - Vérifier la création de l'expédition
   - Vérifier le passage à VALIDATED
   - Vérifier l'envoi d'email de confirmation au client (TODO)

4. **Annulation**
   - Avoir un devis SENT ou IN_TREATMENT
   - Cliquer sur "Annuler"
   - Entrer une raison
   - Vérifier le passage à CANCELLED

## Changelog

- **2026-01-14** : Création initiale du workflow
  - Ajout des statuts IN_TREATMENT, VALIDATED, CANCELLED
  - Ajout de l'enum QuotePaymentMethod
  - Création des actions serveur
  - Création du composant QuoteAgentActions
  - Intégration dans la page détail
  - Documentation du workflow
  - Ajout documentation Inngest pour email RIB (virement bancaire)
  - Ajout documentation Inngest pour email confirmation validation
