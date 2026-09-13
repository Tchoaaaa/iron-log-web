# Vérification des évolutions ØRE

Vérifié le 13 septembre 2026, sur la copie de travail du projet React/Vite fourni.

## Résultats

- **65 tests unitaires réussis**, répartis dans 9 fichiers : calculs existants, historique, validation du profil, chronomètre et conversions d’exercices.
- **Compilation de production réussie**. Vite signale un bundle principal de 512 ko avant gzip (144 ko après gzip), au-dessus de son seuil indicatif de 500 ko.
- **Lint sans erreur**. Un avertissement préexistant reste dans `AdminDashboard.jsx` concernant un changement d’état dans un effet.
- **Parcours Chrome vérifiés avec une API Supabase simulée**, sans erreur JavaScript :
  - onboarding → profil enregistré → accueil ;
  - préférence de repos enregistrée et conservée après rechargement ;
  - caméra inactive avant accord explicite, refus géré, drawer fermé avec Échap ;
  - changement de photo, conversion et sauvegarde de l’image ;
  - création de séance et objectifs de répétitions distincts des résultats ;
  - Normal → Superset → Normal et conservation des deux exercices lors de la dissociation ;
  - annulation du drawer sans mutation du brouillon de séance ;
  - chronomètre en pause, navigation, rechargement et reprise ;
  - repos automatique activé puis désactivé, repos manuel disponible ;
  - protection d’une séance en cours contre un nouveau démarrage ;
  - sauvegarde d’une séance et contrôle du contenu envoyé à l’API ;
  - historique vide, filtres sans résultat, réinitialisation, détail de séance et performances ;
  - inscription, écran de confirmation, délai de renvoi et demande de renvoi après expiration du délai.
- Rendu mobile clair et sombre vérifié à 390 px ; absence de débordement horizontal vérifiée à 320 px.
- Contraste minimal calculé pour les textes principaux, secondaires, tertiaires et d’accent sur les surfaces : **5,06:1 en clair et 5,07:1 en sombre**. Contours des champs : **3,57:1 et 3,20:1**. Ce contrôle des couleurs ne constitue pas un audit d’accessibilité complet.
- Modèle d’e-mail rendu dans Chrome à 390 px, sans débordement.

## Limites et mise en service

Les tests navigateur simulent les réponses Supabase : ils valident les parcours et les échanges attendus, mais ne prouvent pas une livraison d’e-mail réelle ni une sauvegarde sur le projet Supabase hébergé. Aucun compte de test réel ni e-mail réel n’a été créé ou envoyé.

Le modèle `emails/confirm-signup.html` doit être installé dans Supabase avec son objet ; confirmation d’adresse, URL de retour et SMTP doivent être configurés conformément à `emails/README.md`. Ces réglages hébergés n’ont pas été modifiés. La réception et le rendu dans les différentes messageries restent à vérifier sur une boîte de test autorisée.

Le parcours caméra est implémenté avec une demande d’accord explicite et la permission du navigateur. Le refus est testé ; la capture sur une caméra physique et la conformité juridique globale n’ont pas fait l’objet d’un audit.

Les tables existantes sont réutilisées. `profiles` doit disposer des colonnes définies dans `supabase-schema.sql`. La préférence personnelle `auto_rest` utilise les métadonnées Auth et ne sert jamais à attribuer des droits.

## Reproduire

```bash
npm run test
npm run lint
npm run build
npm run dev -- --host 127.0.0.1 --port 5174
# Dans un autre terminal, avec Playwright et Chrome disponibles :
node scripts/verify-browser.mjs
node scripts/verify-email.mjs
```

La variable `PLAYWRIGHT_MODULE` permet de fournir le chemin d’une installation externe de Playwright. Les captures sont générées dans `verification/` et ne sont pas intégrées au bundle.
