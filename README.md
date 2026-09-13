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

3. Activer **Confirm email** dans les réglages d’authentification Supabase.
   Installer le modèle et configurer les URL de retour selon [emails/README.md](./emails/README.md).

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


## Évolutions de septembre 2026

- Navigation Accueil / Séances / Suivi / Profil, sans topbar globale.
- Accueil centré sur le démarrage et la reprise d’une séance.
- Onboarding : âge, poids, taille et moyenne de pas, avec validation et brouillon local par utilisateur.
- Profil dédié : données, photo, accès explicite à la caméra, déconnexion et repos automatique.
- Même drawer pour ajouter ou modifier un exercice : Normal / Superset, séries, objectifs de répétitions et repos.
- Dissocier un superset conserve les deux exercices. Les objectifs restent distincts des résultats.
- Chronomètre avec pause/reprise et minuteur de repos indépendant ; reprise après rechargement.
- Historique filtrable par dates, type et séance, avec pages de détail et accès aux performances.

La préférence `auto_rest` est enregistrée dans les métadonnées personnelles Supabase Auth. Elle ne participe à aucune décision d’autorisation. Les mensurations restent dans les colonnes existantes de `profiles` ; aucune nouvelle migration n’est nécessaire si `supabase-schema.sql` a été appliqué. Une erreur de sauvegarde n’est plus masquée quand une colonne manque.

### Vérifications

`npm run test` et `npm run build` vérifient la logique et la compilation. Le script facultatif `scripts/verify-browser.mjs` utilise Playwright et Chrome avec des réponses Supabase simulées ; il ne crée pas de compte réel et n’envoie aucun e-mail. Lancer d’abord le serveur local sur le port 5174, puis exécuter le script avec Playwright disponible dans l’environnement (`PLAYWRIGHT_MODULE` permet d’indiquer son chemin). Le rapport détaillé est dans `VERIFICATION.md`.

## Planification hebdomadaire

L’accueil propose une semaine type récurrente, des ajustements pour la semaine en cours et un démarrage de la séance du jour. Stockage dans les métadonnées personnelles Supabase Auth, sans migration SQL. Voir [WEEKLY_PLANNING.md](WEEKLY_PLANNING.md) pour les règles et les vérifications.
