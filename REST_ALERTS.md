# Alertes de repos — 15 septembre 2026

- Profil → Préférences de séance → Alertes de repos : interrupteur unique, activé par défaut.
- Préférence `rest_alerts` enregistrée dans les métadonnées utilisateur via l’API existante. Une erreur rétablit le choix précédent et affiche un message.
- Un bip toutes les 30 secondes écoulées, puis à 3, 2 et 1 seconde restante. Un son final et une vibration double signalent zéro. Aucun doublon si deux repères coïncident.
- Applicable aux repos manuels et automatiques. Les alertes restent actives lors de la navigation entre les écrans de l’application.
- Désactivation, fermeture du repos, fin/abandon de séance et déconnexion annulent les alertes. La pause suspend les alertes ; la reprise conserve le temps restant.
- Les repères périmés ne sont pas rejoués en rafale après suspension ou rechargement.

## Vérification

145 tests unitaires réussis, dont 9 nouveaux tests sur les alertes. Compilation réussie. Analyse statique de `src` sans erreur ; avertissements préexistants sur les refs et les effets React.

Contrôle mobile Chrome avec Supabase et sorties son/vibration simulés : persistance après rechargement, retour arrière après erreur d’enregistrement, bips à 30/60 secondes et 3/2/1, signal et vibration à zéro, pause/reprise, navigation vers le profil et désactivation immédiate.
Script : `scripts/verify-rest-alerts.mjs` dans la copie de travail. Aucun compte réel modifié par les tests.

## Limites de la version web

La vibration nécessite un appareil et un navigateur compatibles. L’audio nécessite une interaction utilisateur. Une application suspendue par le système ou un écran verrouillé ne garantit pas les alertes ; garder l’application ouverte. Son physique et vibration physique à valider sur le téléphone cible.

Références :
- https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://supabase.com/docs/reference/javascript/auth-updateuser
