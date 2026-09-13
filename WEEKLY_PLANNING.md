# Planification hebdomadaire

Depuis l’accueil, « Organiser ma semaine » permet d’assigner les séances existantes aux sept jours. Une semaine vide est une configuration valide. « Semaine type » définit la récurrence ; « Cette semaine » ajuste uniquement les jours en cours. Annuler ne sauvegarde rien.

La Home affiche le total terminé / prévu et les états terminée, aujourd’hui, à venir, manquée et déplacée. Une séance déplacée reste visible à son origine mais n’est comptée qu’une fois. Les séances libres et les autres séances restent accessibles. Aucun lancement ni déplacement automatique.

## Stockage

`user.user_metadata.training_plan` réutilise Supabase Auth, comme la préférence de repos. Ce sont des données personnelles modifiables, jamais des permissions. Aucune migration SQL n’est nécessaire.

- `weekly_template` : sept clés de jours, chacune avec un ID de modèle ou `null`.
- `current_week` : lundi local, sept créneaux (ID de modèle, éventuel ID d’historique, origine/destination de déplacement), jours ajustés.
- `previous_week` : un seul instantané précédent pour terminer une séance commencée avant le changement de semaine.
- `version` : 1.

Les contenus des séances ne sont pas dupliqués. Un renommage utilise le même ID ; une suppression affiche « Séance supprimée » et permet de remplacer ou retirer le créneau. Les séances terminées restent liées à l’historique.

Au passage du lundi, une nouvelle semaine est créée depuis la semaine type. Les jours passés, terminés ou ajustés sont conservés lorsqu’on applique une modification de la semaine type aux jours à venir. Dates civiles dans le fuseau local de l’appareil, calculs calendaires compatibles avec le changement d’heure ; actualisation à la reprise et toutes les 30 secondes.

Les séances démarrées depuis le planning transportent leur créneau jusqu’à l’enregistrement, même après minuit. Un lancement libre depuis un modèle peut compléter le créneau du jour si l’ID correspond. Les anciens historiques sans ID de modèle peuvent être reconnus lors de la sauvegarde du planning uniquement par nom unique et date locale identique ; le drawer permet aussi une association explicite. Un historique ne peut compter qu’une fois.

Les modifications sont sérialisées dans l’app et relisent les métadonnées avant écriture. Deux appareils écrivant simultanément restent soumis à la dernière écriture réussie (pas de verrou distribué). Une erreur de planning après enregistrement d’une séance ne supprime pas l’historique et ne conserve pas une séance active qui pourrait être sauvegardée en double ; une association manuelle permet de récupérer.

## Vérification

`npm run test` : logique des semaines vides / 1 / 3 / 7 jours, répétitions du même modèle, historique, déplacements, suppression, renommage, nouvelle semaine, passage de minuit et fuseaux avec changement d’heure.

`npm run build` et `npm run lint` : compilation et contrôles statiques. Les avertissements existants des hooks et du bundle restent présents.

`scripts/verify-weekly-plan.mjs` : parcours Chrome mobile avec Supabase entièrement simulé (aucun compte réel modifié). Démarrer Vite sur 5175, puis lancer ce script avec Playwright disponible ; `VERIFY_URL` et `PLAYWRIGHT_MODULE` permettent de choisir le serveur et le module. Configuration / annulation / rechargement, déplacement, fin de séance avec confirmation, association manuelle, renommage / suppression, changement de semaine, panne de sauvegarde et rendu clair / sombre à 320 px. Captures dans `verification/`. La persistance sur le service Supabase réel n’est pas couverte par ces fixtures.
