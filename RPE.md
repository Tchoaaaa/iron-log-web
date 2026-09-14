# RPE ressenti par série

Dans le drawer d’ajout ou de modification d’un exercice, « Activer le RPE ressenti pour ce bloc » affiche une saisie facultative « RPE 1 », « RPE 2 », … « RPE 10 » pour chaque série, avec le même affichage dans l’historique. Pendant la séance, le sélecteur arrondi occupe une colonne RPE à droite des répétitions, sur la même ligne que la charge et les répétitions ; « — » indique une série sans RPE. Un superset possède des valeurs distinctes pour chaque série de chacun des deux exercices. Aucun RPE cible n’est demandé.

L’option est désactivée par défaut et mémorisée dans les séances-types. Elle peut aussi être activée pendant la séance, même si la liste d’exercices du modèle est verrouillée. Le choix « — » efface une note ; ne pas renseigner de note n’empêche pas de valider les séries ou de terminer la séance.

Les RPE sont restaurés avec la séance en cours et apparaissent dans une colonne dédiée de l’historique, où ils restent modifiables. Les blocs sans RPE gardent leur présentation habituelle. Passer de Normal à Superset ou dissocier un superset conserve les notes avec leurs séries. Remplacer un exercice remet ses résultats, dont les RPE, à zéro. Le drawer empêche de retirer des séries contenant des RPE ou de masquer des RPE saisis sans les effacer d’abord.

## Données

- Modèle et bloc actif : `rpeEnabled: true`, uniquement si l’option est activée.
- Série normale et série enregistrée : `rpe`, entier de 1 à 10, absent si non renseigné.
- Série active en superset : `rpeA` et `rpeB`, convertis vers `rpe` pour chacun des exercices enregistrés.
- Un nouveau démarrage depuis un modèle ne reprend aucune ancienne note.
- La sauvegarde conserve les RPE des séries ayant une charge et des répétitions valides, conformément au traitement existant des résultats.

Les données restent dans les colonnes JSONB `exercises` existantes de `templates` et `workouts`. Aucun changement de schéma, de droits ou de calcul de performance. Le stockage JSON est documenté par [Supabase](https://supabase.com/docs/guides/database/json).

## Vérification

- 133 tests passent, dont 23 cas RPE : validation, caractère facultatif, indépendance des séries, sauvegarde/relecture, suppression d’une note et conversions Normal/Superset.
- Compilation de production réussie. Avertissement existant sur la taille du bundle.
- Analyse statique réussie avec les avertissements React existants.
- `scripts/verify-rpe.mjs` vérifie la préparation du modèle, l’activation sélective, les notes de chaque série et de chaque côté d’un superset, l’absence de note, le rechargement, l’activation pendant une séance issue d’un modèle, la sauvegarde et la modification/effacement dans l’historique.
- Captures contrôlées en 320 et 390 px, thèmes clair/sombre ; pas de débordement horizontal ni d’erreur JavaScript.

Les appels Supabase du test navigateur sont simulés : aucun compte ni donnée réelle n’est modifié. La sauvegarde dans le service hébergé n’a pas été testée sur un compte réel.

Pour relancer le parcours, démarrer Vite sur le port 5177, puis exécuter `node scripts/verify-rpe.mjs` avec Playwright disponible (`PLAYWRIGHT_MODULE` et `VERIFY_URL` configurables). Le script intercepte les appels de l’URL Supabase déclarée dans `.env`.
