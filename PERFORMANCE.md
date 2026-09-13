# Performance

Navigation principale : Accueil / Séances / Performance / Profil. Performance contient Aperçu, Historique et Records. Les sous-sections sont accessibles au clavier avec les flèches, Début et Fin. L’application conserve sa navigation React existante, sans nouveau routeur ni dépendance.

`PerformanceScreen` réutilise `HistoryScreen` et adapte `PRScreen` ; il n’existe pas de second écran d’historique ou de records. Les filtres de l’historique restent dans l’état principal. Les liens de la Home et de la semaine conduisent au détail enregistré puis reviennent à la Home. Le détail exercice conserve sa période lorsque l’on consulte ou modifie une séance associée. La fin d’une séance ouvre Performance > Historique.

## Indicateurs

Toutes les valeurs viennent de `workouts`, sans nouvelle table, métadonnée ou migration. Une édition ou suppression d’historique recalcule la synthèse, les records et les courbes. Les noms d’exercices restent les identifiants employés par le modèle existant.

- Semaine : depuis lundi ; mois : depuis le premier ; année : depuis le 1er janvier. Calculs en dates civiles locales, jusqu’au jour actuel inclus.
- Évolutions globales : comparaison avec autant de jours avant le début de la période. Une base nulle ou absente affiche « — », pas un pourcentage inventé.
- Volume et PR : fonctions existantes. Le PR correspond à une nouvelle charge maximale par exercice, première séance lestée comprise.
- Fréquence : séances / durée écoulée en semaines, avec au moins une semaine au dénominateur.
- Volume : barres quotidiennes sur semaine/mois, mensuelles sur année ; axe gradué depuis zéro, volumes exprimés en tonnes.
- Progression : exercices les plus pratiqués sur la période (au maximum quatre), charge maximale réellement enregistrée ; à charge nulle, répétitions maximales. Les écarts comparent la première et la dernière séance affichée.
- Records : meilleure charge ; à charge égale, plus de répétitions. Dates et liens vers les données historiques, sans trophée. Aucun poids de corps ni lest implicite n’est inventé.
- Détail exercice : fenêtres de 4/8/12 semaines, meilleur set toutes périodes, une mesure par séance, volume et PR sur la fenêtre. La comparaison du volume utilise la fenêtre précédente de même durée ; celle de la charge utilise la première et la dernière séance affichées.

Les séries répétées d’un exercice dans une même séance sont regroupées pour la courbe. Les dates espacées gardent leur espacement temporel. Les courbes sont affichées sans marqueurs ; les graphiques de détail ont un axe vertical chiffré. Les SVG fournissent un équivalent textuel des valeurs ; les séries sont aussi consultables dans les détails de séance. Aucune bibliothèque de graphiques ajoutée.

## Vérification

`npm run test` : tests existants et tests de `performanceMath`, notamment périodes, agrégations, égalités de charges, exercices sans charge, doublons, données vides, édition et suppression.

`npm run build` et `npm run lint` : compilation et analyse statique. Les avertissements existants sur les hooks et la taille du bundle restent présents.

`scripts/verify-performance.mjs` : démarrer Vite sur 5176 puis lancer avec Playwright/Chrome (`PLAYWRIGHT_MODULE` et `VERIFY_URL` configurables). Les réponses Supabase sont entièrement simulées, sans modification d’un compte réel. Vérifie navigation, trois sous-sections, filtres, retour exercice/séance, édition et suppression, entrées Home, états vides, navigation clavier et captures mobiles light/dark (390 et 320 px). Captures dans `verification/`.
