# Plan : Guidelines Stack Technique & Skills Agent — Faso Fret v2

## Contexte

Le projet Faso Fret Logistics v2 utilise un stack technique riche (Next.js 16, Zenstack, Better Auth, Zod v4, Resend, etc.) mais le CLAUDE.md ne documente pas encore les guidelines d'utilisation avancee de chaque librairie, ni les skills agent installes. De plus, certaines librairies cles manquent (Zustand + Immer pour le state client, React Email pour des templates emails maintenables).

Ce plan definit :
1. Les skills agent installes et quand les consulter
2. Les guidelines d'utilisation de chaque librairie du stack
3. Les etapes incrementales pour integrer les librairies manquantes (Zustand+Immer, React Email)

## Objectif

Centraliser dans le CLAUDE.md les regles d'utilisation du stack technique et des skills agent, puis integrer incrementalement Zustand+Immer et React Email dans le projet avec tests a chaque etape.

## Plans en relation

| Plan | Relation | Description de l'interaction |
| --- | --- | --- |
| `witty-napping-bumblebee.md` | Dependance | Le plan multi-colis a etabli les patterns Server Actions + Zod + Zenstack utilises ici comme reference |
| `zesty-tinkering-hennessy.md` | Parallele | Le plan unitPrice peut etre execute independamment |

## Architecture / Fichiers concernes

### Skills agent installes (`.claude/skills/` → symlinks vers `.agents/skills/`)

| Skill | Source | Role dans le projet |
| --- | --- | --- |
| `plan-management` | Local (copie directe) | Regles de nommage et gestion des fichiers de plans |
| `next-best-practices` | vercel-labs/next-skills | Patterns Next.js 16 App Router, RSC, metadata, images |
| `vercel-react-best-practices` | vercel-labs/agent-skills | 57 regles React : waterfalls, bundle, server, re-renders |
| `vercel-composition-patterns` | vercel-labs/agent-skills | Compound components, state lifting, dependency injection |
| `better-auth-best-practices` | better-auth/skills | Config auth, sessions, plugins (2FA, org, passkey) |
| `supabase-postgres-best-practices` | supabase/agent-skills | Optimisation Postgres, indexes, RLS, connexions |
| `frontend-design` | anthropics/skills | Design production-grade, eviter "AI slop", direction esthetique |
| `ui-ux-pro-max` | nextlevelbuilder | 50 styles, 97 palettes, 57 font pairings, checklist UX |
| `agent-browser` | vercel-labs/agent-browser | Automatisation navigateur pour tests et scraping |

### Librairies a documenter dans CLAUDE.md

| Librairie | Statut | Action |
| --- | --- | --- |
| **Zod v4** (`^4.1.13`) | Installe | Documenter differences avec v3 |
| **Zenstack** (`2.22.0`) | Installe | Documenter patterns access policies |
| **Better Auth** (`^1.4.5`) | Installe | Documenter patterns session + plugins |
| **Resend** (`^6.6.0`) | Installe | Documenter config email existante |
| **Zustand + Immer** | A installer | Installer + creer store pattern |
| **React Email** | A installer | Installer + migrer templates HTML |

### Fichiers a creer/modifier

| # | Fichier | Action |
| --- | --- | --- |
| 1 | `CLAUDE.md` | Ajouter sections Skills, Zustand, Zod v4, Email |
| 2 | `src/lib/store/index.ts` | NOUVEAU — Store Zustand de base avec middleware Immer |
| 3 | `src/lib/store/use-ui-store.ts` | NOUVEAU — Store UI (sidebar, modals, notifications) |
| 4 | `src/components/emails/base-layout.tsx` | NOUVEAU — Layout React Email partage |
| 5 | `src/components/emails/welcome.tsx` | NOUVEAU — Template bienvenue en React Email |
| 6 | `src/components/emails/quote-pdf.tsx` | NOUVEAU — Template devis PDF en React Email |
| 7 | `src/components/emails/invitation.tsx` | NOUVEAU — Template invitation en React Email |
| 8 | `src/lib/email/resend.ts` | MODIFIER — Adapter sendEmail pour React Email (render → html) |
| 9 | `src/lib/email/templates/welcome.ts` | SUPPRIMER (remplace par composant React Email) |
| 10 | `src/lib/email/templates/quote-pdf.ts` | SUPPRIMER (remplace par composant React Email) |
| 11 | `src/lib/email/templates/invitation.ts` | SUPPRIMER (remplace par composant React Email) |

---

## Etapes

### Etape 1 — Mise a jour CLAUDE.md (documentation)

**Objectif** : Ajouter toutes les sections manquantes au CLAUDE.md.

1. Section **Skills Agent** : liste des 9 skills, quand les consulter, commande d'installation
2. Section **Zustand + Immer** : patterns de stores, conventions de nommage, exemples
3. Section **Zod v4** : differences cles avec v3, patterns du projet
4. Section **Resend + React Email** : architecture email, templates React, conventions
5. Section **Methodologie** : approche incrementale et iterative avec tests

**Test** : Relire le CLAUDE.md et verifier la coherence avec le code existant.

---

### Etape 2 — Installation Zustand + Immer

**Objectif** : Installer les dependances et creer le pattern de store de base.

1. `npm install zustand immer`
2. Creer `src/lib/store/index.ts` — helper `createStore` avec middleware Immer
3. Creer `src/lib/store/use-ui-store.ts` — store UI initial (sidebar collapse, theme, toasts)
4. Integrer le store dans un composant existant comme preuve de concept

**Test** : Verifier que `npm run build` passe, tester le store dans le navigateur.

---

### Etape 3 — Installation React Email

**Objectif** : Installer React Email et creer le layout de base.

1. `npm install @react-email/components`
2. Creer `src/components/emails/base-layout.tsx` — layout partage (header, footer, couleurs dynamiques)
3. Adapter `src/lib/email/resend.ts` pour supporter le `render()` de React Email

**Test** : Generer le HTML d'un email de test et verifier le rendu.

---

### Etape 4 — Migration template Welcome

**Objectif** : Migrer le premier template email vers React Email.

1. Creer `src/components/emails/welcome.tsx` base sur le contenu de `src/lib/email/templates/welcome.ts`
2. Adapter les appels dans le code qui utilisent `generateWelcomeTemplate()`
3. Supprimer l'ancien `src/lib/email/templates/welcome.ts`

**Test** : Envoyer un email de bienvenue en mode console, verifier le HTML genere.

---

### Etape 5 — Migration templates restants

**Objectif** : Migrer les templates quote-pdf et invitation.

1. Creer `src/components/emails/quote-pdf.tsx`
2. Creer `src/components/emails/invitation.tsx`
3. Adapter les appels dans le code (prospect actions, auth hooks)
4. Supprimer les anciens fichiers `src/lib/email/templates/`

**Test** : Tester chaque flux d'envoi d'email (creation prospect, invitation).

---

### Etape 6 — Store Zustand avance (si besoin)

**Objectif** : Creer des stores specifiques selon les besoins identifies.

1. Eventuellement : `use-quote-form-store.ts` pour etat complexe du formulaire multi-colis
2. Eventuellement : `use-notification-store.ts` pour notifications temps reel
3. Refactoring progressif des `useState` complexes vers Zustand

**Test** : Verifier que les formulaires fonctionnent identiquement apres migration.

---

## Verification

- [ ] CLAUDE.md contient les sections : Skills, Zustand+Immer, Zod v4, Resend+React Email, Methodologie
- [ ] `npm install` installe zustand et immer sans erreur
- [ ] Le store UI fonctionne (sidebar, theme)
- [ ] `npm run build` passe apres chaque etape
- [ ] Les 3 templates emails sont migres vers React Email
- [ ] Les anciens templates HTML sont supprimes
- [ ] Les flux d'envoi d'email fonctionnent en mode console et resend
- [ ] Les skills sont accessibles dans `.claude/skills/` (symlinks valides)
