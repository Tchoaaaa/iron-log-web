# E-mail de confirmation ØRE

Objet : **Confirme ton adresse — ØRE**

Le modèle `confirm-signup.html` utilise `{{ .ConfirmationURL }}`, généré et signé par Supabase. Aucun lien d’activation n’est construit dans le client.

Pour le projet Supabase hébergé :

1. Dans Authentication → Email / Templates → Confirm signup, installer le contenu HTML et l’objet ci-dessus.
2. Activer la confirmation des adresses e-mail. Ne pas désactiver cette option en production.
3. Configurer la Site URL et autoriser l’URL de l’app avec `?confirmed=1` dans les Redirect URLs (ainsi que l’URL locale de développement si nécessaire).
4. Configurer un SMTP de production et son expéditeur vérifié ; désactiver le suivi des liens du prestataire pour préserver les liens d’authentification.
5. Vérifier un véritable envoi sur une boîte de test autorisée : réception, rendu mobile, confirmation, lien réutilisé/expiré et renvoi limité.

Ces réglages sont distincts des fichiers de l’app. Le modèle local ne modifie pas automatiquement le service d’envoi. Aucun e-mail réel n’a été envoyé pendant les tests locaux.

Documentation : https://supabase.com/docs/guides/auth/auth-email-templates et https://supabase.com/docs/reference/javascript/auth-resend
