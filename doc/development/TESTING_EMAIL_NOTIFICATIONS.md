# Test des Notifications Email - Text/HTML

## Problème Résolu

Les notifications email envoyées affichaient les **clés de traduction** (labels) au lieu du **texte traduit**.

Exemple avant :
- ❌ `messages.notification.new-comment` (label)

Exemple après :
- ✅ `Jean a commenté votre proposition` (texte traduit)

## Corrections Apportées

### 1. Nouveau Service de Rendu de Templates (`EmailTemplateService`)

**Fichier** : `back/app/services/email_template_service.ts`

Ce service :
- ✅ Charge les templates depuis la base de données (`EmailTemplate`)
- ✅ Traduit les clés i18n (`titleKey`, `bodyKey`) en texte réel
- ✅ Interpole les variables (`{{username}}`, `{{propositionTitle}}`, etc.)
- ✅ Génère **à la fois** la version **HTML** et **Text** de l'email
- ✅ Supporte les templates multilingues (FR/EN)
- ✅ Gère les conditionnels Handlebars (`{{#if}}`, `{{#each}}`)

### 2. Mise à Jour du Service d'Envoi d'Emails (`EmailBatchService`)

**Fichier** : `back/app/services/email_batch_service.ts`

Changements :
- ✅ Utilise `EmailTemplateService` au lieu de générer du HTML inline
- ✅ Envoie **à la fois** `htmlContent` ET `textContent` à Brevo
- ✅ Les emails ont maintenant une belle mise en forme professionnelle
- ✅ Les textes sont correctement traduits via i18n

### 3. Format des Emails

Les emails contiennent maintenant :
- **Version HTML** : Email stylisé avec couleurs, boutons, mise en page responsive
- **Version Texte** : Version texte brut pour les clients email qui ne supportent pas le HTML

## Comment Tester

### Option 1 : Test Rapide avec la Commande de Test

```bash
cd back
node ace test:email-template
```

Cette commande affiche un aperçu des emails rendus avec :
- Template de notification unique
- Template de digest (plusieurs notifications)
- Versions FR et EN
- Contenu HTML et Texte

### Option 2 : Test avec Mode Mock (Emails dans la Console)

1. Dans `.env`, configurez :
```env
MAIL_MOCK=true
```

2. Déclenchez une notification (créez une proposition, ajoutez un commentaire, etc.)

3. Exécutez le cron job d'envoi d'emails :
```bash
node ace notification:send-emails
```

4. Les emails s'afficheront dans la console avec le contenu complet (HTML + Text)

### Option 3 : Test avec de Vrais Emails (Brevo)

1. Dans `.env`, configurez :
```env
MAIL_MOCK=false
BREVO_API_KEY=votre_clé_api_brevo
ACCOUNT_SENDER_EMAIL=noreply@votredomaine.com
PUBLIC_APP_URI=https://votredomaine.com
```

2. Assurez-vous que les templates sont dans la base de données :
```bash
node ace db:seed --files=database/seeders/email_template_seeder.ts
```

3. Déclenchez une notification dans l'application

4. Exécutez le cron job :
```bash
node ace notification:send-emails
```

5. Vérifiez votre boîte email - vous devriez recevoir un email avec :
   - ✅ Texte traduit (pas de labels)
   - ✅ Mise en forme HTML professionnelle
   - ✅ Version texte brut disponible

## Structure des Templates Email

Les templates sont stockés dans la base de données avec :
- `subjects` : Sujet de l'email (multilingue)
- `htmlContents` : Contenu HTML (multilingue)
- `textContents` : Contenu texte brut (multilingue)

Deux templates sont disponibles :
1. **`notification_single`** : Pour une seule notification
2. **`notification_digest`** : Pour plusieurs notifications (résumé)

## Variables Disponibles dans les Templates

### Template de Notification Unique
- `{{organizationName}}` : Nom de l'organisation
- `{{baseUrl}}` : URL de l'application
- `{{title}}` : Titre de la notification (traduit)
- `{{message}}` : Message de la notification (traduit)
- `{{actionUrl}}` : URL de l'action (optionnel)

### Template de Digest
- `{{organizationName}}` : Nom de l'organisation
- `{{baseUrl}}` : URL de l'application
- `{{count}}` : Nombre de notifications
- `{{#each notifications}}` : Boucle sur les notifications
  - `{{this.title}}` : Titre de chaque notification
  - `{{this.message}}` : Message de chaque notification
  - `{{this.actionUrl}}` : URL d'action (optionnel)

## Vérification

Pour vérifier que les emails sont bien formatés, regardez :

1. ✅ **Pas de labels** : Le texte doit être en français/anglais, pas `messages.notification.xxx`
2. ✅ **HTML valide** : Les emails doivent avoir une structure HTML complète
3. ✅ **Version texte** : Les clients email sans HTML doivent afficher une version texte propre
4. ✅ **Variables interpolées** : Les noms d'utilisateur, titres de propositions, etc. doivent être affichés
5. ✅ **Boutons cliquables** : Les boutons "Voir les détails" doivent fonctionner
6. ✅ **Responsive** : Les emails doivent s'afficher correctement sur mobile

## Support

En cas de problème :
- Vérifiez que les templates sont bien en base de données
- Vérifiez que les clés i18n existent dans `resources/lang/`
- Consultez les logs pour voir les erreurs d'envoi
- Utilisez le mode `MAIL_MOCK=true` pour débugger

---

**Date de correction** : 2025-10-19
**Services modifiés** : `EmailTemplateService` (nouveau), `EmailBatchService`
