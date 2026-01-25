# 📍 Guide : Tracking des modifications d'adresses

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Utilisation](#utilisation)
4. [Cas d'usage](#cas-dusage)
5. [Résolution de litiges](#résolution-de-litiges)
6. [Conformité RGPD/ISO](#conformité-rgpdiso)

---

## 🎯 Vue d'ensemble

Le système de tracking des adresses enregistre **toutes les modifications** d'adresses (expéditeur et destinataire) dans les **Quotes** et **Shipments**.

### Pourquoi tracker les adresses ?

1. ✅ **Résolution de litiges** : Prouver qu'une adresse a été modifiée et par qui
2. ✅ **Conformité légale** : Audit trail RGPD/ISO obligatoire
3. ✅ **Transparence** : Historique complet visible par les agents
4. ✅ **Traçabilité** : Savoir exactement ce qui a été demandé vs ce qui a été livré

### Événements capturés

- ✅ Modification de l'adresse complète (rue, numéro, bâtiment)
- ✅ Changement de ville
- ✅ Mise à jour du code postal
- ✅ Modification du nom de contact
- ✅ Changement de téléphone
- ✅ Mise à jour de l'email

---

## 🏗️ Architecture

### Pattern Snapshot / Immutable Data

```typescript
// Chaque modification d'adresse crée un nouvel événement
{
  eventType: 'ADDRESS_UPDATED',
  addressType: 'destination',
  changedFields: ['address', 'city'],
  oldAddress: {
    address: '123 Rue Ancienne',
    city: 'Paris'
  },
  newAddress: {
    address: '456 Rue Nouvelle',
    city: 'Lyon'
  },
  changedBy: { id: 'agent123', name: 'Agent Dupont' },
  createdAt: '2026-01-25T14:30:00Z'
}
```

### Fichiers modifiés

```
src/
├── lib/db/
│   ├── quote-log-events.ts         ← Ajout ADDRESS_UPDATED
│   └── shipment-log-events.ts      ← Ajout ADDRESS_UPDATED
├── modules/
│   ├── quotes/lib/
│   │   ├── quote-log-helper.ts     ← Ajout logQuoteAddressUpdated()
│   │   └── address-tracking-example.ts  ← Exemples complets
│   └── shipments/lib/
│       └── shipment-log-helper.ts  ← Ajout logShipmentAddressUpdated()
```

---

## 💻 Utilisation

### 1. Import des helpers

```typescript
import { logQuoteAddressUpdated } from '@/modules/quotes/lib/quote-log-helper';
import { logShipmentAddressUpdated } from '@/modules/shipments/lib/shipment-log-helper';
```

### 2. Enregistrer une modification (manuelle)

```typescript
// Après avoir modifié une adresse dans la base de données
await logQuoteAddressUpdated({
  quoteId: 'clxxx',
  changedById: session.user.id,
  addressType: 'destination',
  changedFields: ['address', 'city'],
  oldAddress: {
    address: '123 Rue Ancienne',
    city: 'Paris',
  },
  newAddress: {
    address: '456 Rue Nouvelle',
    city: 'Lyon',
  },
  reason: 'Client a déménagé',
  notes: 'Nouvelle adresse confirmée par téléphone le 25/01/2026',
});
```

### 3. Utiliser le helper automatique (recommandé)

```typescript
import { updateQuoteAddressWithTracking } from '@/modules/quotes/lib/address-tracking-example';

// Cette fonction :
// 1. Détecte automatiquement les champs modifiés
// 2. Met à jour le Quote dans la base
// 3. Enregistre l'événement dans l'historique
const result = await updateQuoteAddressWithTracking(
  'clxxx',
  {
    destinationAddress: '456 Rue Nouvelle',
    destinationCity: 'Lyon',
    destinationPostalCode: '69001',
  },
  session.user.id,
  'destination',
  'Client a déménagé - confirmé par email'
);

// Résultat
if (result.updated) {
  console.log(`${result.changedFields.length} champ(s) modifié(s)`);
  console.log('Champs:', result.changedFields); // ['address', 'city', 'postalCode']
}
```

### 4. Récupérer l'historique des modifications

```typescript
import { getQuoteAddressHistory } from '@/modules/quotes/lib/address-tracking-example';

const history = await getQuoteAddressHistory('clxxx');

// Afficher l'historique
history.forEach((change) => {
  console.log(`
Date: ${change.createdAt}
Modifié par: ${change.changedBy?.name} (${change.changedBy?.role})
Type: ${change.metadata.addressType}
Champs: ${change.metadata.changedFields.join(', ')}
Raison: ${change.metadata.reason}
Notes: ${change.notes}
  `);
});
```

---

## 📖 Cas d'usage

### Cas 1 : Client déménage après création du devis

**Contexte** : Un client a demandé un devis avec son ancienne adresse. Il déménage avant la livraison.

```typescript
'use server';

export async function updateClientAddressAction(
  quoteId: string,
  newAddress: {
    destinationAddress: string;
    destinationCity: string;
    destinationPostalCode: string;
  }
) {
  const session = await requireAuth();

  const result = await updateQuoteAddressWithTracking(
    quoteId,
    newAddress,
    session.user.id,
    'destination',
    'Client a déménagé'
  );

  if (result.updated) {
    // Envoyer notification à l'agent
    await sendNotificationToAgent({
      message: `Adresse de livraison modifiée pour le devis ${quoteId}`,
      changedFields: result.changedFields,
    });
  }

  return { success: true, ...result };
}
```

### Cas 2 : Correction d'erreur de saisie par un agent

**Contexte** : Un agent a fait une faute de frappe lors de la saisie initiale.

```typescript
await logShipmentAddressUpdated({
  shipmentId: 'clxxx',
  changedById: agentId,
  addressType: 'origin',
  changedFields: ['contactEmail'],
  oldAddress: {
    contactEmail: 'cliemt@example.com', // Faute de frappe
  },
  newAddress: {
    contactEmail: 'client@example.com', // Correction
  },
  reason: 'Correction erreur de saisie',
  notes: 'Email corrigé - faute de frappe détectée',
});
```

### Cas 3 : Changement de point de livraison

**Contexte** : Le client préfère se faire livrer au bureau plutôt qu'à domicile.

```typescript
await updateShipmentAddressWithTracking(
  shipmentId,
  {
    destinationAddress: 'Société ABC - 10 Rue du Commerce',
    destinationContactName: 'Secrétariat',
    destinationContactPhone: '+226 25 11 22 33',
  },
  session.user.id,
  'destination',
  'Préférence client : livraison au bureau'
);
```

---

## ⚖️ Résolution de litiges

### Scénario : "Vous avez livré au mauvais endroit !"

**Sans tracking** ❌ :

```
Agent: "Désolé, je ne sais pas ce qui s'est passé..."
Client: "C'est votre faute !"
→ Litige non résolu, client mécontent
```

**Avec tracking** ✅ :

```typescript
// L'agent consulte l'historique
const history = await getShipmentAddressHistory(shipmentId);

// Résultat
[
  {
    createdAt: '2026-01-15T10:00:00Z',
    eventType: 'CREATED',
    metadata: { source: 'quote' },
    // Adresse initiale : 123 Rue A
  },
  {
    createdAt: '2026-01-20T14:23:00Z',
    eventType: 'ADDRESS_UPDATED',
    changedBy: { name: 'Client Dupont', role: 'CLIENT' },
    metadata: {
      addressType: 'destination',
      changedFields: ['address'],
      oldAddress: { address: '123 Rue A' },
      newAddress: { address: '456 Rue B' },
      reason: 'Déménagement',
    },
    notes: 'Modification par le client lui-même',
  },
];
```

**Réponse de l'agent** :

> "Monsieur Dupont, je vois dans notre système que le 20 janvier à 14h23, l'adresse a été modifiée de '123 Rue A' vers '456 Rue B'. Cette modification a été effectuée par vous-même depuis votre compte. Nous avons bien livré à l'adresse que vous nous avez communiquée."

→ **Litige résolu en 30 secondes avec preuves** ✅

---

## 🔒 Conformité RGPD/ISO

### Article 5 RGPD : Accountability

> "Le responsable du traitement doit être en mesure de **démontrer** que les données personnelles sont traitées de manière licite."

**Notre implémentation** :

- ✅ **Traçabilité complète** : Qui, quand, quoi, pourquoi
- ✅ **Immutabilité** : Les logs ne peuvent pas être modifiés (INSERT only)
- ✅ **Transparence** : Les utilisateurs peuvent consulter leur historique

### ISO 27001 : Audit Trail

**Exigences** :

1. ✅ Enregistrer les événements de sécurité
2. ✅ Inclure l'identité de l'utilisateur
3. ✅ Horodatage précis
4. ✅ Conservation des preuves

**Notre implémentation** :

```typescript
{
  eventType: 'ADDRESS_UPDATED',        // Type d'événement
  changedById: 'clxxx',                // Qui
  changedBy: { name, email, role },    // Détails utilisateur
  createdAt: '2026-01-25T14:30:00Z',   // Quand (ISO 8601)
  metadata: {
    oldAddress: {...},                  // Avant
    newAddress: {...},                  // Après
    reason: 'Client a déménagé',        // Pourquoi
  }
}
```

---

## 📊 Statistiques et rapports

### Exemple : Nombre de modifications par mois

```typescript
const stats = await prisma.shipmentLog.groupBy({
  by: ['eventType'],
  where: {
    eventType: 'ADDRESS_UPDATED',
    createdAt: {
      gte: new Date('2026-01-01'),
      lte: new Date('2026-01-31'),
    },
  },
  _count: { eventType: true },
});

console.log(`${stats[0]._count.eventType} modifications d'adresses en janvier`);
```

### Exemple : Agent le plus actif

```typescript
const topAgent = await prisma.shipmentLog.groupBy({
  by: ['changedById'],
  where: {
    eventType: 'ADDRESS_UPDATED',
  },
  _count: { changedById: true },
  orderBy: {
    _count: {
      changedById: 'desc',
    },
  },
  take: 1,
});
```

---

## 🎓 Bonnes pratiques

### ✅ À faire

1. **Toujours fournir une raison** pour les modifications importantes
2. **Utiliser les helpers** automatiques (`updateQuoteAddressWithTracking`)
3. **Consulter l'historique** avant de résoudre un litige
4. **Envoyer des notifications** aux agents lors de modifications importantes

### ❌ À éviter

1. Modifier une adresse sans enregistrer l'événement
2. Utiliser des notes vagues ("modification", "update")
3. Oublier de spécifier la raison (`reason`)
4. Modifier directement en SQL sans passer par les helpers

---

## 🔗 Ressources

- **Fichier exemple complet** : `src/modules/quotes/lib/address-tracking-example.ts`
- **Helpers Quote** : `src/modules/quotes/lib/quote-log-helper.ts`
- **Helpers Shipment** : `src/modules/shipments/lib/shipment-log-helper.ts`
- **Event types** : `src/lib/db/quote-log-events.ts` et `shipment-log-events.ts`

---

## ❓ FAQ

### Q: Faut-il tracker TOUTES les modifications d'adresses ?

**R:** Oui, même les petites corrections. C'est essentiel pour :

- La conformité légale (RGPD/ISO)
- La résolution de litiges
- L'audit trail complet

### Q: Les logs prennent-ils beaucoup d'espace en base ?

**R:** Non. Estimation :

- 1 log = ~500 bytes (JSON metadata)
- 1000 modifications/mois = 0.5 MB/mois
- **Négligeable** par rapport aux bénéfices

### Q: Peut-on supprimer les anciens logs ?

**R:** Légalement, **NON** pendant la durée de conservation RGPD (minimum 3 ans pour les données commerciales). Après cette période, archivage recommandé.

### Q: Comment afficher l'historique dans l'UI ?

**R:** Exemple de composant React :

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { getQuoteAddressHistory } from '@/modules/quotes/lib/address-tracking-example';

export function AddressHistoryTimeline({ quoteId }: { quoteId: string }) {
  const { data: history } = useQuery({
    queryKey: ['quote-address-history', quoteId],
    queryFn: () => getQuoteAddressHistory(quoteId),
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Historique des modifications</h3>
      {history?.map((log) => (
        <div key={log.id} className="border-l-2 border-blue-500 pl-4">
          <p className="text-sm text-gray-500">
            {new Date(log.createdAt).toLocaleDateString('fr-FR')}
          </p>
          <p className="font-medium">{log.notes}</p>
          <p className="text-sm">Par: {log.changedBy?.name}</p>
          <details className="text-xs text-gray-600 mt-2">
            <summary>Détails</summary>
            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}
```

---

**Dernière mise à jour** : 25 janvier 2026
**Version** : 1.0.0
