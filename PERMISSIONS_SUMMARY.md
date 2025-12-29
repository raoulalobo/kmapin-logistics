# Résumé des Permissions par Rôle - Faso Fret Logistics

## 📋 Rôles Disponibles

- **ADMIN** : Accès complet à tout le système
- **OPERATIONS_MANAGER** : Gestion des opérations (expéditions, enlèvements, transporteurs)
- **FINANCE_MANAGER** : Gestion financière (factures, devis)
- **CLIENT** : Accès limité aux données de sa company
- **VIEWER** : Lecture limitée

---

## 🔐 Permissions par Modèle

### User
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : 📖 Lecture des users de leur company
- **FINANCE_MANAGER** : 📖 Lecture des users de leur company
- **Propriétaire** : 📖✏️ Lecture et modification de son propre profil

### Company
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : 📖 Lecture de toutes les companies
- **FINANCE_MANAGER** : 📖 Lecture de toutes les companies
- **Members** : 📖✏️ Lecture et modification de leur company

### Shipment (Expéditions)
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : ✅➕📖✏️ Création, lecture, modification
- **FINANCE_MANAGER** : 📖 Lecture seule
- **CLIENT** : 📖 Lecture des expéditions de leur company
- **Créateur** : 📖✏️ Lecture et modification (sauf si status == DELIVERED)

### PickupRequest (Demandes d'enlèvement)
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : ✅ Toutes opérations
- **FINANCE_MANAGER** : 📖 Lecture seule
- **CLIENT** : ➕📖 Création et lecture pour leur company
- **Créateur** : 📖✏️ Lecture et modification (sauf si COMPLETED ou CANCELED)

### TrackingEvent
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : ➕📖 Création et lecture
- **Tous** : 📖 Lecture des events des shipments de leur company

### Invoice (Factures)
- **ADMIN** : ✅ Toutes opérations
- **FINANCE_MANAGER** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : 📖 Lecture seule
- **CLIENT** : 📖 Lecture des factures de leur company
- **Protection** : ❌ Modification/Suppression interdite si status == PAID

### InvoiceItem
- **ADMIN** : ✅ Toutes opérations
- **FINANCE_MANAGER** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : 📖 Lecture seule
- **CLIENT** : 📖 Lecture via leur company
- **Protection** : ❌ Modification interdite si invoice.status == PAID

### Quote (Devis)
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : ✅➕📖✏️ Création, lecture, modification
- **FINANCE_MANAGER** : 📖 Lecture seule
- **CLIENT** : 📖➕ Lecture et création pour leur company

### Prospect & GuestQuote
- **Public** : ✅➕📖 Création et lecture (pour calculateur de devis public)
- **ADMIN** : ✅✏️🗑️ Modification et suppression

### Notification
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : ➕ Création de notifications
- **Propriétaire** : 📖✏️ Lecture et modification (marquer comme lu) de ses propres notifications

### Document
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : ➕📖🗑️ Création, lecture, suppression
- **FINANCE_MANAGER** : 📖 Lecture seule
- **CLIENT** : ➕📖 Création et lecture pour leur company
- **Uploader** : 🗑️ Suppression de ses propres documents

### Transporter
- **ADMIN** : ✅ Toutes opérations
- **OPERATIONS_MANAGER** : ➕📖✏️ Création, lecture, modification
- **FINANCE_MANAGER** : 📖 Lecture seule
- **CLIENT** : 📖 Lecture des transporteurs actifs uniquement
- **VIEWER** : 📖 Lecture des transporteurs actifs uniquement

### PricingConfig
- **ADMIN** : ✅ Toutes opérations (ADMIN UNIQUEMENT)

### CountryDistance
- **Public** : 📖 Lecture (nécessaire pour calcul des devis)
- **ADMIN** : ➕✏️🗑️ Création, modification, suppression

### TransportRate
- **Public** : 📖 Lecture (nécessaire pour calcul des devis)
- **ADMIN** : ✅ Toutes opérations

### Country
- **Public** : 📖 Lecture (nécessaire pour formulaires de devis)
- **ADMIN** : ➕✏️🗑️ Création, modification, suppression

---

## 🎯 Points de Vigilance

### ✅ Correctement configuré
- Type `Auth` défini avec `@@auth` (CRITIQUE)
- Toutes les comparaisons utilisent `auth().id`, `auth().role`, `auth().companyId`
- Pas de comparaison directe `auth() == this`
- Protection des données sensibles (factures payées, tarifs)

### 🔍 À tester
Il serait judicieux de tester les opérations suivantes avec différents rôles :

1. **CLIENT** essayant de créer un Shipment → Devrait être REFUSÉ
2. **OPERATIONS_MANAGER** créant un Shipment → Devrait RÉUSSIR
3. **FINANCE_MANAGER** modifiant une Invoice non payée → Devrait RÉUSSIR
4. **CLIENT** lisant les Shipments d'une autre company → Devrait être REFUSÉ
5. **VIEWER** créant un Transporter → Devrait être REFUSÉ

---

## 📝 Légende
- ✅ : Toutes opérations (create, read, update, delete)
- ➕ : Création (create)
- 📖 : Lecture (read)
- ✏️ : Modification (update)
- 🗑️ : Suppression (delete)
- ❌ : Opération interdite

---

**Date de génération** : 2025-12-27
**Version du schema** : Avec type Auth et @@auth
