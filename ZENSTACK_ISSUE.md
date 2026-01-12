# Problème Zenstack : Blocage d'accès aux PickupRequests

## 📋 Description du problème

L'enhanced client Zenstack bloque l'accès aux `PickupRequest` pour les utilisateurs avec le rôle `CLIENT`, même lorsque les règles d'accès devraient explicitement autoriser la lecture.

**Date de découverte** : 2026-01-12
**Statut** : Non résolu - Solution temporaire en place
**Impact** : Critique - Les utilisateurs ne peuvent pas voir leurs demandes d'enlèvement

## 🔍 Symptômes observés

### Comportement attendu
Un utilisateur CLIENT devrait pouvoir voir ses propres `PickupRequest` lorsque :
- `userId` de la demande correspond à `auth().id`
- Le `status` n'est pas `EFFECTUE` ou `ANNULE`

### Comportement réel
- L'enhanced client Zenstack retourne **0 résultat**
- Le client Prisma standard retourne **tous les résultats attendus** (3 pickups dans les tests)

## 🧪 Tests effectués

### Test 1 : Vérification de l'attachement automatique
**Script** : `scripts/diagnose-pickup-attachment.ts`
**Résultat** : ✅ Les pickups sont correctement attachés en base
- 3 pickups avec `userId = RJWbhqjt8M0nbQEtgAUmWPWoECMOGuR1`
- Email de correspondance : `nathanaelalobo@gmail.com`
- Status : `NOUVEAU` (non terminé)
- Logs d'attachement : "Rattachement automatique lors de la création du compte"

### Test 2 : Vérification des permissions Zenstack
**Script** : `scripts/check-companyid-issue.ts`
**Résultat** : ✅ Les règles devraient permettre l'accès
- Utilisateur : role `CLIENT`, `companyId = NULL`
- Pickups : `userId` correspond, `status = NOUVEAU`
- Règle `auth().id == userId` : **devrait matcher les 3 pickups**

### Test 3 : Comparaison Enhanced vs Standard Client
**Script** : `scripts/test-enhanced-client.ts`
**Résultat** : ❌ Zenstack bloque l'accès de manière incorrecte

```typescript
// Contexte auth() passé à Zenstack
const authContext = {
  id: 'RJWbhqjt8M0nbQEtgAUmWPWoECMOGuR1',
  role: UserRole.CLIENT,
  companyId: null,
};

// Enhanced client (avec Zenstack)
const enhancedDb = getEnhancedPrisma(authContext);
const pickups = await enhancedDb.pickupRequest.findMany();
// Résultat : 0 pickup ❌

// Client standard (sans Zenstack)
const standardPickups = await prisma.pickupRequest.findMany({
  where: { userId: authContext.id }
});
// Résultat : 3 pickups ✅
```

### Test 4 : Règle simplifiée
Tentative avec une règle ultra-simple pour tester si le problème vient de la complexité :

```zmodel
@@allow('read', auth().role == CLIENT)
```

**Résultat** : ❌ Toujours 0 pickup retourné par l'enhanced client

## 📝 Règles Zenstack testées

### Règle actuelle (non fonctionnelle)
```zmodel
// schema.zmodel lignes 583-586
@@allow('read,update', userId != null && auth().id == userId && status != EFFECTUE && status != ANNULE)
```

### Variantes testées (toutes non fonctionnelles)
1. Sans check de `userId != null` : ❌
2. Règle simplifiée `auth().role == CLIENT` : ❌
3. Avec plugin `enhancePrisma` ajouté : ❌ (erreurs de compilation)

## 🛠️ Solution temporaire appliquée

### Fichiers modifiés
- `src/app/(dashboard)/dashboard/pickups/page.tsx`

### Changements
Remplacement de l'enhanced client par le client Prisma standard avec filtrage manuel par rôle :

```typescript
// AVANT (ne fonctionne pas)
const db = getEnhancedPrismaFromSession(session);
const pickups = await db.pickupRequest.findMany();

// APRÈS (solution temporaire)
const { prisma } = await import('@/lib/db/client');
const where: any = {};

// Filtrage manuel par rôle
if (session.user.role === 'CLIENT') {
  where.userId = session.user.id;
} else if (session.user.role === 'FINANCE_MANAGER' || session.user.role === 'OPERATIONS_MANAGER') {
  // Pas de filtre - voient tous les pickups
}

const pickups = await prisma.pickupRequest.findMany({ where });
```

### Sections concernées
- `StatsCards()` fonction (lignes 95-114)
- `PickupsList()` fonction (lignes 183-295)

## 🔎 Pistes d'investigation

### 1. Contexte auth() non reconnu
**Hypothèse** : Le contexte passé à `enhance()` n'est pas correctement interprété par Zenstack

**À vérifier** :
- La structure du contexte correspond-t-elle exactement au type `Auth` défini dans schema.zmodel ?
- Y a-t-il des problèmes de sérialisation/désérialisation ?
- Les enums (`UserRole`) sont-ils correctement comparés ?

### 2. Problème avec les champs nullable
**Hypothèse** : Zenstack a du mal avec les comparaisons impliquant des champs nullable

**Observations** :
- `userId` est défini comme `String?` (nullable)
- `companyId` est également nullable
- La comparaison `auth().id == userId` pourrait échouer si `userId = null`

**À tester** :
- Créer un pickup avec `userId` explicitement défini (non null)
- Tester avec un utilisateur ayant un `companyId` défini

### 3. Configuration Zenstack manquante
**Hypothèse** : Un plugin ou une configuration Zenstack n'est pas correctement installé

**À vérifier** :
- Versions des packages `@zenstackhq/*` dans package.json
- Présence de tous les plugins nécessaires dans schema.zmodel
- Configuration du generator `client` dans schema.zmodel

### 4. Bug Zenstack
**Hypothèse** : C'est un bug connu ou non documenté de Zenstack

**Actions** :
- Vérifier les issues GitHub de Zenstack
- Consulter la documentation pour des cas similaires
- Tester avec une version différente de Zenstack

## 📚 Références

### Code
- **Schema** : `schema.zmodel` (lignes 508-603)
- **Enhanced client** : `src/lib/db/enhanced-client.ts`
- **Dashboard** : `src/app/(dashboard)/dashboard/pickups/page.tsx`

### Scripts de diagnostic
- `scripts/diagnose-pickup-attachment.ts`
- `scripts/check-companyid-issue.ts`
- `scripts/test-enhanced-client.ts`

### Documentation
- [Zenstack Access Policies](https://zenstack.dev/docs/the-complete-guide/part1/access-policy)
- [Zenstack Auth Context](https://zenstack.dev/docs/the-complete-guide/part1/access-policy/expressions#auth)

## ⚠️ Impact et urgence

**Urgence** : 🔴 Critique
**Workaround** : ✅ Solution temporaire en place
**Risques** :
- Duplication du code de filtrage dans chaque page
- Risque d'oubli de filtrage dans de futures pages
- Perte du bénéfice de Zenstack (contrôle d'accès centralisé)

**Prochaines étapes recommandées** :
1. Ouvrir une issue sur le repo GitHub de Zenstack avec le test case complet
2. Investiguer les versions de packages et compatibilité
3. Tester avec un utilisateur ayant `companyId != null`
4. Envisager une alternative à Zenstack si le problème persiste (ex: CASL, Permit.io)

---

**Dernière mise à jour** : 2026-01-12
**Auteur** : Investigation via Claude Code
