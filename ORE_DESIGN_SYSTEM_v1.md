# ORE --- Design System

**Version 1.0 --- Septembre 2026**\
**Produit :** Training d'abord → Performance ensuite → Nutrition plus
tard

> **Principe directeur : The interface stays quiet. The performance
> speaks.**

------------------------------------------------------------------------

## 1. Vision de marque

ORE est une application de training pensée comme un **instrument de
précision**, pas comme une app fitness générique.

L'interface doit être :

-   **Minérale** --- graphite, pierre, bone, ice ; jamais noir/blanc
    purs.
-   **Précise** --- hiérarchie claire, alignements rigoureux, données
    fiables.
-   **Calme** --- pas de bruit visuel ni de motivation artificielle.
-   **Physique** --- le sport est exprimé par les actions et les
    données.
-   **Premium** --- la qualité vient de la retenue, de la typographie,
    du spacing et des interactions.

### Priorité produit

1.  **TRAIN** --- planifier et exécuter une séance.
2.  **TRACK** --- enregistrer ce qui a été fait.
3.  **PROGRESS** --- comprendre la progression mesurable.
4.  **FUEL** --- nutrition, plus tard.

Boucle produit actuelle :

`PLAN → TRAIN → RECORD → PROGRESS`

Future :

`PLAN → TRAIN → RECORD → PROGRESS → FUEL`

Ne pas diluer le produit avec des fonctionnalités prématurées de
wellness, réseau social, nutrition, hydratation, pas, gamification ou
dashboard santé.

------------------------------------------------------------------------

## 2. Principes fondamentaux

### 2.1 Retenue

Chaque élément visible doit avoir une fonction. Si sa suppression ne
réduit ni la compréhension, ni l'utilisabilité, ni le feedback, ni
l'identité, le supprimer.

### 2.2 Hiérarchie avant décoration

Créer la hiérarchie dans cet ordre :

1.  taille ;
2.  graisse ;
3.  espacement ;
4.  position ;
5.  tonalité ;
6.  couleur accent --- en dernier.

Ne pas ajouter une card, une icône, une bordure ou une couleur
uniquement pour « faire design ».

### 2.3 La data est l'esthétique sportive

ORE n'a pas besoin d'haltères décoratives, de flammes, de silhouettes,
de gradients agressifs ou d'une esthétique gaming.

Le sport est visible par :

-   exercices ;
-   séries ;
-   répétitions ;
-   charge ;
-   durée ;
-   volume ;
-   records ;
-   progression.

### 2.4 Progressive disclosure

Afficher uniquement l'information utile au niveau courant.

-   **Historique :** séance, date, durée, volume, PR.
-   **Détail séance :** exercices + séries.
-   **Progress :** tendances, comparaisons, évolution.

### 2.5 Une action principale évidente

Chaque écran ou état doit avoir une action dominante. Éviter plusieurs
CTA visuellement équivalents.

------------------------------------------------------------------------

## 3. Couleurs

**ORE is not black and white. ORE is mineral.**

### 3.1 Light --- identité principale

  ------------------------------------------------------------------------
  Token                    HEX                     Usage
  ------------------------ ----------------------- -----------------------
  `--ore-bg`               `#EFEFEC`               Fond principal

  `--ore-surface`          `#F7F7F4`               Surface élevée, rare

  `--ore-text-primary`     `#292A29`               Titres, contenu
                                                   principal

  `--ore-text-secondary`   `#858681`               Dates, texte secondaire

  `--ore-text-tertiary`    `#A9AAA5`               Metadata faible
                                                   priorité

  `--ore-border`           `#D5D5D0`               Hairlines, séparateurs

  `--ore-signal`           `#7CCBC6`               Actif, progression, PR,
                                                   signal de marque
  ------------------------------------------------------------------------

Le mode clair est la référence principale de l'identité ORE.

### 3.2 Dark

  ------------------------------------------------------------------------
  Token                    HEX                     Usage
  ------------------------ ----------------------- -----------------------
  `--ore-bg`               `#414246`               Fond principal ; jamais
                                                   noir pur

  `--ore-surface`          `#48494D`               Surface subtile

  `--ore-text-primary`     `#F0EFEB`               Texte principal ;
                                                   jamais blanc pur

  `--ore-text-secondary`   `#A6A6A2`               Texte secondaire

  `--ore-text-tertiary`    `#85868A`               Metadata

  `--ore-border`           `#595A5E`               Hairlines

  `--ore-signal`           `#7CCBC6`               Même sémantique que le
                                                   light
  ------------------------------------------------------------------------

Le dark est **la même ORE inversée**, pas une version cyber/gaming.

### 3.3 Règle du turquoise

Le turquoise est un **signal système**, pas la couleur d'un programme.

Utiliser pour :

-   état actif ;
-   sélection ;
-   PR / record ;
-   progression ;
-   feedback d'action important ;
-   détail `Ø` du logo.

Ne pas utiliser :

-   sur toutes les icônes ;
-   en grands fonds décoratifs ;
-   sur tous les boutons ;
-   pour colorer chaque programme ;
-   comme substitut à une bonne hiérarchie.

**Cible : environ 95 % neutre / 5 % signal.**

### 3.4 Couleurs sémantiques futures

Erreur, danger, warning et succès devront avoir leurs propres tokens
accessibles. Ne jamais faire signifier au turquoise à la fois sélection,
succès, erreur et warning.

------------------------------------------------------------------------

## 4. Typographie

### Familles

**UI / Hero : Space Grotesk**\
Évolution premium possible : ABC Diatype.

**Data : Space Mono**\
Évolution premium possible : Söhne Mono.

### Règle sémantique

**Grotesk = langage / structure.**\
**Mono = mesure / donnée.**

Mono convient à :

-   `82.5 KG`
-   `05 REPS`
-   `01:42`
-   `+4.2%`
-   numéros de séries.

Ne pas mettre toute l'interface en monospace.

### Échelle recommandée

  Style          Taille   Line-height     Weight Usage
  --------- ----------- ------------- ---------- ---------------------
  Display     40--48 px    0.95--1.05        700 Hero / material
  H1              32 px          1.10        700 Titre de page
  H2              24 px          1.20   650--700 Section majeure
  H3          18--20 px          1.25   650--700 Séance / exercice
  Body            16 px    1.45--1.55   400--500 UI courante
  Meta        14--15 px          1.40   400--500 Date / secondaire
  Label       12--13 px          1.30        600 Eyebrow / catégorie
  Data L      22--28 px          1.10   600--700 Métrique importante
  Data M      16--18 px          1.25   500--600 Sets / historique

### Uppercase

Approprié pour :

-   labels courts ;
-   mois ;
-   materials ;
-   headers data/exercice.

Éviter les longues phrases en uppercase. Ajouter un tracking modéré
(`0.06em–0.14em`) selon la taille.

### Chiffres

Utiliser des **tabular numerals** si disponibles pour timers et valeurs
qui changent.

------------------------------------------------------------------------

## 5. Grille, spacing et layout

Base : **grille 4 px**.

  Token          Valeur
  ------------ --------
  `space-1`        4 px
  `space-2`        8 px
  `space-3`       12 px
  `space-4`       16 px
  `space-5`       20 px
  `space-6`       24 px
  `space-8`       32 px
  `space-10`      40 px
  `space-12`      48 px
  `space-16`      64 px

### Règles

-   Mobile first.
-   Marges mobiles : généralement **20--24 px**.
-   Peu d'axes d'alignement, mais très forts.
-   Alignement à gauche par défaut.
-   Utiliser le vide comme structure.
-   Préférer rythme vertical + séparateurs aux conteneurs imbriqués.
-   Sur desktop, ne pas simplement agrandir : limiter les largeurs de
    lecture et augmenter l'espace.

------------------------------------------------------------------------

## 6. Formes, borders et élévation

### Radius

ORE est architectural, pas « bubbly ».

-   petits contrôles : `4–6 px` ;
-   surfaces standard : `8 px` ;
-   grands conteneurs exceptionnels : `8–12 px`.

Éviter les cards à `20–30 px` par défaut.

### Borders

Hairlines de `1 px` avec le token border.

Préférer :

`contenu → espace → séparateur → contenu`

à :

`card → card → card`.

### Shadows

Par défaut : **aucune**.

Seulement lorsqu'une vraie hiérarchie spatiale l'exige : modal, menu
flottant, overlay.

### Cards

Une card n'est **pas** le primitive de layout par défaut.

Avant d'en créer une :

> Cette information doit-elle réellement être perçue comme un
> objet/groupe indépendant ?

Si non : spacing + typographie + séparateur.

------------------------------------------------------------------------

## 7. Iconographie

Une icône doit :

-   clarifier une action ou un concept ;
-   appartenir à une famille de stroke cohérente ;
-   rester secondaire face au contenu ;
-   avoir un label accessible si elle est seule.

Préférer :

`42 MIN   2.84 T   2 PR`

à :

`[horloge] 42 min   [haltère] 2.84 T   [trophée] 2 PR`

si le texte suffit.

**Pas d'emoji dans l'UI produit.**

------------------------------------------------------------------------

## 8. Logo

Direction actuelle :

`ØRE`

-   `Ø` peut utiliser `--ore-signal`.
-   `RE` utilise `--ore-text-primary`.
-   Tracking généreux.
-   Aucun gradient ou effet.
-   Pas d'illustration littérale de minerai.

Le logo est une signature, pas une décoration.

Les labels de développement/back-office comme `Admin` ne doivent pas
apparaître dans l'interface utilisateur normale.

------------------------------------------------------------------------

## 9. Navigation

Architecture cœur :

1.  **HOME** --- que dois-je faire maintenant ?
2.  **TRAIN** --- séances, programmes, exercices.
3.  **HISTORY / PROGRESS** --- qu'ai-je fait et comment je progresse ?
4.  **PROFILE** --- compte et préférences.

Ne pas ajouter d'onglets tant que le produit ne le justifie pas.

### États

-   inactif : gris secondaire/tertiaire ;
-   actif : primaire + petit signal turquoise ;
-   ne pas remplir tout l'item actif en turquoise.

------------------------------------------------------------------------

## 10. Home

Question principale :

> **Que dois-je faire maintenant ?**

Priorité :

1.  séance actuelle / suivante ;
2.  action START ;
3.  contexte récent utile ;
4.  raccourcis secondaires.

Ne pas transformer la Home en dashboard lifestyle.

Éviter de prioriser dans la V1 :

-   pas ;
-   hydratation ;
-   nutrition ;
-   communauté ;
-   wellness générique.

Exemple :

``` text
TODAY

BASALT / 07
STRENGTH
45 MIN

LAST SESSION
+4.2% LOAD

START
```

------------------------------------------------------------------------

## 11. Training

Pendant une séance, minimiser la charge cognitive.

### Exercice

``` text
BACK SQUAT

82.5 KG
05 REPS

SET 03 / 05

COMPLETE SET
```

Afficher :

-   exercice ;
-   charge ;
-   reps ;
-   position du set ;
-   une action principale.

### Repos

``` text
REST

01:24

NEXT
BACK SQUAT
82.5 KG × 5

+10 SEC      SKIP
```

Le timer doit être lisible en une fraction de seconde.

**Ne pas lancer automatiquement le repos tant que cette fonctionnalité
n'est pas explicitement prévue dans le produit.**

### Fin de séance

Préférer :

``` text
SESSION COMPLETE

46:12
18 SETS
4.82 T

LOAD     +4.2%
VOLUME   +7.8%
```

Éviter :

-   confetti ;
-   « You crushed it! » ;
-   flammes ;
-   explosion XP ;
-   streak forcé.

------------------------------------------------------------------------

## 12. Historique

L'Historique est un **journal d'entraînement**, pas un dashboard.

### Vue liste

Elle doit répondre instantanément :

1.  quoi ?
2.  quand ?
3.  combien ?
4.  record ?

Exemple :

``` text
SEPTEMBRE 2026

PUSH
JEUDI, 10 SEPT.

01:00    59 KG    2 PR
────────────────────────
```

### Règles

-   grouper chronologiquement, idéalement par mois ;
-   rows compactes ;
-   pas de séries individuelles dans la liste ;
-   masquer `0 PR` ;
-   PR en turquoise ;
-   row entière tappable ;
-   `•••` uniquement si réellement nécessaire et visuellement discret.

### Détail séance

``` text
PUSH
JEUDI, 10 SEPT.

42:18    2.84 T    2 PR

────────────────────────

DÉVELOPPÉ COUCHÉ
3 SÉRIES · 29 KG

01   80 KG × 8
02   80 KG × 8
03   82.5 KG × 6
```

Préférer le même background + séparateurs au gros rectangle blanc qui
écrase visuellement le header.

Une fine ligne turquoise peut signaler le bloc développé/sélectionné.

------------------------------------------------------------------------

## 13. Formatage des données

La donnée doit être exacte, compacte et non ambiguë.

### Durée

Choisir un format selon le contexte :

-   overview : `42 MIN` ;
-   timer/détail : `42:18`.

Ne pas mélanger arbitrairement.

### Charge / volume

Ne jamais modifier la donnée stockée pour l'affichage.

Exemples de format :

-   `754 KG`
-   `1.14 T`
-   `10.2 T`

Avant d'appliquer une unité, vérifier ce que la valeur représente
réellement :

-   charge ?
-   volume de séance ?
-   tonnage ?
-   top set ?
-   autre métrique ?

Ne jamais inventer le sens d'une donnée.

### Records

Terme recommandé : **PR**.

-   `1 PR`
-   `2 PR`
-   rien si zéro.

### Localisation

Respecter la locale pour :

-   dates ;
-   séparateurs décimaux ;
-   mois/jours ;
-   unités.

Ne pas hardcoder inutilement le français si une couche i18n existe.

------------------------------------------------------------------------

## 14. Taxonomie des materials

Les minéraux correspondent à une **fonction d'entraînement**, jamais à
un niveau ou une rareté.

  Material       Fonction                 Idée physique
  -------------- ------------------------ ------------------------------
  **GRANITE**    Foundation               stable, base, structure
  **BASALT**     Strength / hypertrophy   dense, lourd, structurel
  **OBSIDIAN**   Power / explosivité      rupture, impact, tranchant
  **QUARTZ**     Endurance                résistance, rythme
  **SLATE**      Mobility / recovery      couches, contrôle, souplesse

### Important

**Pas de couleur différente par material.**

Différencier via :

-   géométrie ;
-   pattern ;
-   densité ;
-   rythme ;
-   typographie ;
-   motion.

Pistes :

-   BASALT → blocs / densité ;
-   OBSIDIAN → fractures / diagonales ;
-   QUARTZ → rythme / répétition ;
-   SLATE → couches horizontales ;
-   GRANITE → grille / structure granulaire.

Éviter la photographie littérale de pierres comme langage UI principal.

------------------------------------------------------------------------

## 15. Boutons et contrôles

### Primary

Une action principale par contexte.

-   contraste fort via les neutres ;
-   turquoise possible comme petit signal ;
-   cible tactile minimale : **44 × 44 px** ;
-   verbe clair : `START`, `COMPLETE SET`, `SAVE`.

### Secondary

-   outline neutre ou text button ;
-   clairement subordonné.

### Destructive

Ne jamais utiliser le turquoise. Utiliser un token destructive dédié et
confirmation lorsque la conséquence est importante.

### Disabled

Un contrôle disabled doit rester identifiable. Ne pas dépendre
uniquement d'une opacité trop faible.

------------------------------------------------------------------------

## 16. Inputs & formulaires

-   Label visible ; ne pas utiliser uniquement un placeholder.
-   Erreur proche du champ concerné.
-   Inputs numériques optimisés pour l'utilisation en salle.
-   Keyboard/input mode adapté sur mobile.
-   Conserver les valeurs en cas d'erreur de validation.
-   Unités explicites.
-   Minimiser les confirmations inutiles.

Pour les sets : **vitesse et répétabilité \> esthétique du formulaire.**

------------------------------------------------------------------------

## 17. Motion & feedback

La motion explique un état ; elle ne divertit pas.

Repères :

-   feedback rapide : `120–180 ms` ;
-   transition standard : `180–250 ms` ;
-   transition importante : jusqu'à `300 ms`.

Bon usage :

-   set complété ;
-   expansion d'une séance ;
-   mise à jour de progression ;
-   timer ;
-   sélection.

Éviter :

-   CTA qui rebondit ;
-   animations décoratives en boucle ;
-   parallax gratuit ;
-   confetti.

Respecter `prefers-reduced-motion`.

Haptics : subtils et uniquement sur actions significatives.

------------------------------------------------------------------------

## 18. Accessibilité

L'accessibilité fait partie du design.

### Contraste

-   Vérifier les contrastes WCAG.
-   Tester spécifiquement le turquoise sur les surfaces claires et
    sombres.
-   Ne jamais transmettre une information uniquement par couleur.

### Touch

-   cible interactive minimale d'environ **44 × 44 px** ;
-   espace suffisant entre actions critiques.

### Texte

-   supporter le text scaling lorsque la plateforme le demande ;
-   éviter les textes secondaires trop faibles ;
-   ne pas mettre une information essentielle uniquement en micro-label.

### Screen readers

-   nom accessible pour chaque contrôle ;
-   label pour boutons icon-only ;
-   ordre de lecture logique ;
-   glyphes décoratifs masqués aux technologies d'assistance.

### Web / clavier

-   tous les contrôles atteignables au clavier ;
-   focus visible ;
-   ordre logique ;
-   aucun keyboard trap.

------------------------------------------------------------------------

## 19. États Empty / Loading / Error

Tout écran data-driven doit définir ses états.

### Empty

``` text
AUCUNE SÉANCE

Votre historique apparaîtra ici
après votre premier entraînement.

START A SESSION
```

Expliquer ce qui manque + prochaine action utile.

### Loading

Éviter les sauts de layout. Préférer des skeletons subtils qui
reprennent la structure finale plutôt qu'un spinner partout.

### Error

Dire :

1.  ce qui a échoué ;
2.  si les données sont conservées ;
3.  quoi faire ensuite.

Ne pas afficher d'erreur technique brute à l'utilisateur.

### Offline / sync

Si une synchronisation existe, rendre son état compréhensible sans
alarmer. La saisie d'entraînement doit être résiliente aux coupures
temporaires lorsque l'architecture le permet.

------------------------------------------------------------------------

## 20. Ton éditorial

ORE parle comme un instrument.

### Voix

-   concise ;
-   neutre ;
-   assurée ;
-   factuelle ;
-   calme.

Préférer :

-   `SESSION COMPLETE`
-   `2 PR`
-   `NEXT SESSION — THU`
-   `LOAD +4.2%`

Éviter :

-   « Amazing! »
-   « You crushed it! »
-   « Keep the streak alive 🔥 »
-   motivation artificielle ou infantilisante.

Actions = verbes.\
États = noms / données.

------------------------------------------------------------------------

## 21. Densité d'information

La densité dépend de la tâche.

### Faible

-   onboarding ;
-   Home / CTA principal ;
-   set actif.

### Moyenne

-   historique ;
-   programme.

### Forte

-   détail séance ;
-   analytics performance.

Ne pas rendre tous les écrans artificiellement vides pour rester «
minimal ». **L'efficacité de la tâche prime.**

------------------------------------------------------------------------

## 22. Onboarding

Objectif : atteindre rapidement une première séance utile.

Ne demander que ce qui est nécessaire :

-   objectif ;
-   fréquence ;
-   lieu / équipement ;
-   niveau d'expérience.

Éviter de demander toutes les données de profil avant la première valeur
produit.

Cible mentale :

`≈ 30 secondes → première séance utile`

------------------------------------------------------------------------

## 23. Qualité d'implémentation

La qualité visuelle inclut le comportement technique.

-   éviter les layout shifts ;
-   interactions rapides ;
-   optimiser les longues listes d'historique si nécessaire ;
-   éviter assets lourds et animations inutiles ;
-   utiliser des tokens, pas des HEX dispersés ;
-   composants robustes aux longues traductions ;
-   tester données vides, réalistes et extrêmes ;
-   ne pas concevoir uniquement avec des données de mock parfaites.

------------------------------------------------------------------------

## 24. Tokens CSS de référence

``` css
:root {
  --ore-bg: #EFEFEC;
  --ore-surface: #F7F7F4;
  --ore-text-primary: #292A29;
  --ore-text-secondary: #858681;
  --ore-text-tertiary: #A9AAA5;
  --ore-border: #D5D5D0;
  --ore-signal: #7CCBC6;

  --ore-radius-sm: 4px;
  --ore-radius-md: 8px;

  --ore-space-1: 4px;
  --ore-space-2: 8px;
  --ore-space-3: 12px;
  --ore-space-4: 16px;
  --ore-space-6: 24px;
  --ore-space-8: 32px;
  --ore-space-10: 40px;
  --ore-space-12: 48px;
}

[data-theme="dark"] {
  --ore-bg: #414246;
  --ore-surface: #48494D;
  --ore-text-primary: #F0EFEB;
  --ore-text-secondary: #A6A6A2;
  --ore-text-tertiary: #85868A;
  --ore-border: #595A5E;
  --ore-signal: #7CCBC6;
}
```

**Les composants consomment des tokens sémantiques.** Éviter les
couleurs hardcodées directement dans chaque composant.

------------------------------------------------------------------------

## 25. Checklist composant

Avant validation :

-   Son objectif est-il évident ?
-   La hiérarchie est-elle claire ?
-   Peut-on supprimer une décoration ?
-   L'action principale est-elle évidente ?
-   Fonctionne-t-il en light et dark ?
-   Fonctionne-t-il sans dépendre du turquoise ?
-   Le turquoise a-t-il une signification ?
-   Les touch targets sont-ils suffisants ?
-   Focus/clavier fonctionnent-ils sur web ?
-   Les textes longs survivent-ils ?
-   Empty/loading/error sont-ils prévus ?
-   Les données extrêmes passent-elles ?
-   Les unités sont-elles non ambiguës ?
-   Le composant reste-t-il cohérent avec ORE ?

------------------------------------------------------------------------

## 26. Checklist écran

Pour chaque écran :

1.  Quelle est la question principale de l'utilisateur ?
2.  Peut-il y répondre en quelques secondes ?
3.  Quelle est l'action principale ?
4.  Quelque chose concurrence-t-il cette action ?
5.  Utilise-t-on une card là où du spacing suffirait ?
6.  Une icône répète-t-elle simplement le texte ?
7.  Le turquoise est-il signal ou décoration ?
8.  Les données secondaires sont-elles réellement secondaires ?
9.  L'écran fonctionnerait-il encore en monochrome ?
10. Est-il minéral, précis, calme et physique ?
11. Est-il utilisable pendant un vrai entraînement ?
12. Reste-t-il compréhensible sans connaître le concept des minéraux ?

------------------------------------------------------------------------

## 27. Anti-patterns

Ne pas dériver vers :

-   fitness générique noir/rouge/orange ;
-   noir pur ;
-   blanc pur ;
-   gradients ;
-   néon/cyber ;
-   énormes cards arrondies ;
-   cards imbriquées ;
-   glassmorphism ;
-   arc-en-ciel par programme ;
-   photos de pierres décoratives partout ;
-   excès d'icônes ;
-   badges arbitraires ;
-   XP/gamification omniprésente ;
-   feed social ;
-   Home dashboard surchargée ;
-   copy motivationnelle criarde ;
-   langage visuel de back-office/admin ;
-   formats de métriques incohérents.

------------------------------------------------------------------------

## 28. North Star

ORE doit donner l'impression de :

> **A precision training instrument built from mineral surfaces,
> typography, measured data, and restrained signal.**

L'utilisateur doit retenir :

-   l'environnement off-white / graphite ;
-   le `ØRE` ;
-   le turquoise Ice rare ;
-   une typographie forte ;
-   des données précises ;
-   une interface qui disparaît pendant l'effort.

### Règle finale de décision

Quand deux designs sont possibles :

> **Choisir celui qui rend la tâche d'entraînement plus claire avec le
> moins d'éléments visuels nécessaires.**

Ce n'est pas du minimalisme pour le minimalisme.

**Clarity first. Restraint second. Character through consistency.**
