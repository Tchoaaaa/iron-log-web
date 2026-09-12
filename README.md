# GymApp

Suivi de séances de musculation (React + Vite + Tailwind CSS v4), avec
authentification et stockage en ligne via **Supabase**.

## Fonctionnalités

- Inscription / connexion / déconnexion par **email + mot de passe**.
- Les séances, séances-types et la bibliothèque d'exercices sont enregistrées
  dans Supabase. La séance en cours est aussi mise en cache dans
  `localStorage` (par utilisateur) pour survivre à un rechargement ou une
  fermeture accidentelle de l'onglet.
- **Row Level Security** : chaque utilisateur ne voit et ne modifie que ses
  propres données.
- **Espace administrateur** séparé (statistiques d'usage : nombre
  d'utilisateurs, séances, utilisateurs actifs, volume cumulé, activité par
  utilisateur). Inaccessible aux comptes non-admin — l'accès est refusé côté
  base (RLS + fonctions `admin_*` qui vérifient le rôle).
- Aucune clé secrète / `service_role` n'est utilisée. Seule la clé
  **publishable** (client) est présente, et elle n'a de valeur qu'avec la RLS.
- Les mots de passe ne transitent que vers Supabase Auth : jamais stockés,
  journalisés ni affichés par l'app.

## Configuration

1. Copier l'exemple d'environnement puis renseigner le projet Supabase :

   ```bash
   cp .env.example .env
   ```

   `.env` (non versionné) :

   ```
   VITE_SUPABASE_URL=https://VOTRE-REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```

   Ces deux valeurs sont côté client et peuvent apparaître dans le bundle.
   **Ne jamais** ajouter la clé « secret » / `service_role` ici.

2. Créer le schéma : ouvrir le **SQL Editor** du dashboard Supabase, coller
   l'intégralité de [`supabase-schema.sql`](./supabase-schema.sql) et exécuter.
   (Fichier idempotent, ré-exécutable.)

3. *(optionnel, pour tester vite)* Dans **Authentication → Providers → Email**,
   désactiver « Confirm email » pour pouvoir se connecter immédiatement après
   l'inscription. Sinon, confirmer via le lien reçu par email.

## Devenir administrateur

Après avoir **créé votre compte dans l'app** avec votre vraie adresse, exécuter
dans le SQL Editor de Supabase (qui tourne avec un rôle privilégié — ce n'est
pas l'app, et ce n'est pas la `service_role` dans du code client) :

```sql
insert into public.admins (user_id)
select id from auth.users
where email = 'VOTRE_EMAIL_D_INSCRIPTION'
on conflict (user_id) do nothing;
```

Votre adresse n'est écrite nulle part dans le dépôt. Le bloc complet (avec la
vérification et la révocation) est en bas de `supabase-schema.sql`.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
npm run test
```
