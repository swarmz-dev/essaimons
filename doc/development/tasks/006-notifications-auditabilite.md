# Tâche 006 · Notifications & auditabilité

## Prérequis
- Tâches 001–005 fournissant les événements déclencheurs et les données à notifier.
- Choix des canaux de notification (email, in-app, push) et des templates i18n.
- Vérification des besoins de conformité (RGPD, conservation des logs).

## Architecture

### Système multi-canal
- **In-app** : SSE via @adonisjs/transmit (broadcast direct) ✅
- **Email** : BrevoMailService (intégration existante) - à implémenter
- **Web Push** : VAPID + Service Workers ✅
- **Queue** : pg-boss pour delivery fiable et retry - à implémenter

### Base de données
- `notifications` : contenu des notifications (i18n keys, entity refs)
- `user_notifications` : fan-out avec statut delivery par canal
- `push_subscriptions` : subscriptions Web Push par device
- `notification_settings` : préférences utilisateur par type/canal

### Temps réel
Broadcast Transmit direct depuis NotificationService → SSE push vers clients connectés

## Implémentation

### Phase 1 : Infrastructure (2025-01-30) ✅
- [x] Installation dépendances : `pg-boss`, `web-push`
- [x] Migrations base de données :
  - [database/migrations/app/1760000000200_create_notifications_table.ts](../../back/database/migrations/app/1760000000200_create_notifications_table.ts)
  - [database/migrations/app/1760000000210_create_user_notifications_table.ts](../../back/database/migrations/app/1760000000210_create_user_notifications_table.ts)
  - [database/migrations/app/1760000000220_create_push_subscriptions_table.ts](../../back/database/migrations/app/1760000000220_create_push_subscriptions_table.ts)
  - [database/migrations/app/1760000000230_create_notification_settings_table.ts](../../back/database/migrations/app/1760000000230_create_notification_settings_table.ts)
- [x] ~~Trigger Postgres LISTEN/NOTIFY sur `user_notifications`~~ (remplacé par broadcast Transmit direct)
- [x] Génération clés VAPID : [scripts/generate-vapid-keys.ts](../../back/scripts/generate-vapid-keys.ts)
- [x] Migrations exécutées avec succès

### Phase 2 : Backend Core ✅ (2025-01-30)
- [x] Créer modèles Lucid :
  - [x] [app/models/notification.ts](../../back/app/models/notification.ts)
  - [x] [app/models/user_notification.ts](../../back/app/models/user_notification.ts)
  - [x] [app/models/push_subscription.ts](../../back/app/models/push_subscription.ts)
  - [x] [app/models/notification_setting.ts](../../back/app/models/notification_setting.ts)
- [x] Service `NotificationService` : [app/services/notification_service.ts](../../back/app/services/notification_service.ts)
  - [x] Méthode `create()` : créer notification + fan-out vers users
  - [x] Méthode `sendToChannels()` : dispatch vers in-app/email/push
  - [x] Méthodes `markAsRead()`, `getUnreadCount()`, `getUserNotifications()`
  - [ ] Intégration avec pg-boss pour retry (à implémenter)
- [x] Service `WebPushService` : [app/services/web_push_service.ts](../../back/app/services/web_push_service.ts)
  - [x] Configuration web-push avec clés VAPID
  - [x] Méthodes `subscribe()`, `unsubscribe()`, `sendPushNotification()`
  - [x] Gestion des subscriptions expirées (410 Gone)
  - [ ] Worker pg-boss pour envoyer push notifications (à implémenter)
- [x] ~~Service `NotificationListenerService`~~ (supprimé - broadcast Transmit direct utilisé à la place)
- [x] Broadcast Transmit direct dans NotificationService.sendInApp()

### Phase 3 : API REST ✅ (2025-01-30)
- [x] Controller `NotificationsController` : [app/controllers/notifications_controller.ts](../../back/app/controllers/notifications_controller.ts)
  - [x] `GET /notifications` : liste paginée pour user
  - [x] `PATCH /notifications/:id/read` : marquer comme lue
  - [x] `PATCH /notifications/mark-all-read` : marquer toutes comme lues
  - [x] `GET /notifications/unread-count` : badge count
- [x] Controller `PushSubscriptionsController` : [app/controllers/push_subscriptions_controller.ts](../../back/app/controllers/push_subscriptions_controller.ts)
  - [x] `GET /push-subscriptions/vapid-public-key` : récupérer clé publique VAPID
  - [x] `POST /push-subscriptions` : enregistrer subscription
  - [x] `GET /push-subscriptions` : lister subscriptions actives
  - [x] `DELETE /push-subscriptions/:id` : désinscrire device
- [x] Controller `NotificationSettingsController` : [app/controllers/notification_settings_controller.ts](../../back/app/controllers/notification_settings_controller.ts)
  - [x] `GET /notification-settings` : préférences user
  - [x] `PUT /notification-settings/:type` : modifier préférences
  - [x] `PUT /notification-settings/bulk` : mise à jour en masse
- [x] Routes ajoutées dans [start/routes.ts](../../back/start/routes.ts)

### Phase 4 : Hooks métier ✅ (2025-01-30)
- [x] Service `PropositionNotificationService` : [app/services/proposition_notification_service.ts](../../back/app/services/proposition_notification_service.ts)
  - [x] Méthode `notifyStatusTransition()` : gère toutes les transitions (CLARIFY, AMEND, VOTE, MANDATE, EVALUATE, ARCHIVED)
  - [x] Méthode `notifyMandateAssignment()` : affectation/changement de mandataire
  - [x] Méthode `notifyMandateRevocation()` : révocation de mandat
  - [x] Méthode `notifyDeliverableUpload()` : livrable soumis → notifie évaluateurs
  - [x] Méthode `notifyDeliverableEvaluation()` : livrable évalué → notifie mandataire
  - [x] Méthode `notifyCommentAdded()` : commentaire/clarification ajouté
  - [x] Méthode `notifyCommentUpdated()` : clarification modifiée
  - [x] Méthode `notifyCommentDeleted()` : clarification supprimée
  - [x] Méthode `notifyExchangeScheduled()` : échange planifié
  - [x] Méthode `broadcastPropositionUpdate()` : broadcast SSE temps réel vers stream `proposition/{id}`
- [x] Intégration dans les services métier :
  - [x] [PropositionService.transition()](../../back/app/services/proposition_service.ts) : notifications status transitions
  - [x] [PropositionMandateService.create/update()](../../back/app/services/proposition_mandate_service.ts) : notifications mandats
  - [x] [MandateDeliverableService.upload/evaluate()](../../back/app/services/mandate_deliverable_service.ts) : notifications livrables
  - [x] [PropositionCommentService.create/update/delete()](../../back/app/services/proposition_comment_service.ts) : notifications commentaires
  - [x] [PropositionEventService.create()](../../back/app/services/proposition_event_service.ts) : notifications échanges
- [x] Types de notifications ajoutés :
  - [x] `COMMENT_ADDED` : commentaire général ajouté
  - [x] `CLARIFICATION_ADDED` : demande de clarification ajoutée
  - [x] `CLARIFICATION_UPDATED` : clarification mise à jour
  - [x] `CLARIFICATION_DELETED` : clarification supprimée
  - [x] `EXCHANGE_SCHEDULED` : échange/événement planifié
- [x] Real-time updates via Transmit SSE pour utilisateurs consultant une proposition
- [ ] **Approaching deadlines** (48h avant) : à implémenter via cron job
- [ ] **Non-conformity threshold** (Phase 2) : >= 1/3 évaluations non conformes → ouverture procédure
- [ ] **Revocation votes** (Phase 2) : ouverture vote révocatoire → notifier tous votants

### Phase 5 : Frontend ✅ (2025-01-30 - 2025-10-05)
- [x] **Composants Svelte notification bell** :
  - [x] [NotificationBell.svelte](../../front/src/lib/components/notifications/NotificationBell.svelte) : icône cloche avec badge unread count
  - [x] [NotificationDropdown.svelte](../../front/src/lib/components/notifications/NotificationDropdown.svelte) : dropdown avec liste paginée
  - [x] [NotificationItem.svelte](../../front/src/lib/components/notifications/NotificationItem.svelte) : item avec icône, titre, message, timestamp
  - [x] Badge affiche "9+" quand > 9 notifications non lues
  - [x] Action "Marquer tout comme lu"
  - [x] Click sur notification → marque comme lue + navigation vers actionUrl
- [x] **Services frontend** :
  - [x] [NotificationService](../../front/src/lib/services/notificationService.ts) : API client avec fetch natif
    - [x] `getNotifications(page, limit)` : liste paginée
    - [x] `getUnreadCount()` : compteur non lues
    - [x] `markAsRead(id)` : marquer une notification
    - [x] `markAllAsRead()` : marquer toutes
  - [x] [NotificationSSEService](../../front/src/lib/services/notificationSSEService.ts) : client SSE temps réel via Transmit
    - [x] Subscription Transmit sur canal `user/${userId}/notifications`
    - [x] Update du store en temps réel sur réception
    - [x] Toast notifications affichées pendant 5s avec traductions
- [x] **Store Svelte 5** :
  - [x] [notificationStore.svelte.ts](../../front/src/lib/stores/notificationStore.svelte.ts) : gestion état avec runes
  - [x] Méthodes : `addNotification()`, `markAsRead()`, `markAllAsRead()`, `setUnreadCount()`
- [x] **Intégration layout** :
  - [x] NotificationBell ajouté dans [Menu.svelte](../../front/src/lib/partials/menu/Menu.svelte) header (visible si connecté)
  - [x] Initialisation SSE dans [+layout.svelte](../../front/src/routes/+layout.svelte) au login
  - [x] Déconnexion SSE au logout
- [x] **Internationalisation** :
  - [x] Traductions FR/EN dans [messages/fr.json](../../front/messages/fr.json) et [messages/en.json](../../front/messages/en.json)
  - [x] 15 types de notifications traduits (titres + messages)
  - [x] Timestamps relatifs localisés avec date-fns
  - [x] Icônes spécifiques par type (Bell, UserCheck, Upload, CheckCircle, MessageCircle, Calendar)
- [x] **Page préférences notifications utilisateur** :
  - [x] [/profile/notifications](../../front/src/routes/profile/notifications/+page.svelte) : page de paramètres par type
  - [x] Toggle par type de notification (10 types)
  - [x] Toggle par canal (in-app / email / push)
  - [x] Sauvegarde en masse avec API `/notification-settings/bulk`
  - [x] Interface avec switches interactifs et icônes par canal
  - [x] Traductions FR/EN complètes
- [x] **Page admin notifications** :
  - [x] [/admin/notifications](../../front/src/routes/admin/notifications/+page.svelte) : vue d'ensemble système
  - [x] Statistiques : total, non lues, aujourd'hui
  - [x] Liste paginée de toutes les notifications
  - [x] Filtres par statut lu/non lu
- [x] **Service Worker pour Web Push** :
  - [x] [static/sw.js](../../front/static/sw.js) : service worker avec push/notificationclick handlers
  - [x] [PushNotificationPrompt.svelte](../../front/src/lib/components/notifications/PushNotificationPrompt.svelte) : prompt permission
  - [x] [PushNotificationService](../../front/src/lib/services/pushNotificationService.ts) : gestion subscriptions VAPID
  - [x] [/profile/devices](../../front/src/routes/profile/devices/+page.svelte) : page gestion devices pour voir/supprimer les appareils enregistrés
  - [x] [PushSubscriptionService](../../front/src/lib/services/pushSubscriptionService.ts) : service frontend pour gérer les devices

### Phase 6 : Email Templates et Batching ✅
- [x] **Email Frequency Preference** :
  - [x] [EmailFrequencyEnum](../../back/app/types/enum/email_frequency_enum.ts) : enum pour instant, hourly, daily, weekly
  - [x] Ajout de `emailFrequency` au modèle User avec migration
  - [x] UI frontend pour choisir la fréquence d'email
- [x] **Email Batching System** :
  - [x] [PendingEmailNotification](../../back/app/models/pending_email_notification.ts) : modèle pour emails en attente
  - [x] [EmailBatchService](../../back/app/services/email_batch_service.ts) : service de batching et envoi
  - [x] Intégration avec BrevoMailService existant
  - [x] Cron job dans automation.ts pour traiter les emails en attente
  - [x] Calcul automatique du prochain envoi selon la fréquence choisie
- [x] **Frontend** :
  - [x] Sélecteur de fréquence d'email dans /profile/notifications
  - [x] Traductions FR/EN pour les options de fréquence

### Phase 7 : Audit Log (À faire)
- [ ] Extension du système de logs existant pour événements métier :
  - Changements permissions (affectation/révocation mandat)
  - Modifications settings globaux
  - Actions votes (création, ouverture, fermeture, bulletin)
  - Upload/évaluation livrables
  - Transitions de statut
- [ ] API admin pour consultation :
  - `GET /admin/audit-logs` avec filtres (user, entity, action, date)
- [ ] Documentation politique rétention/purge

### Phase 8 : Tests (À faire)
- [ ] Tests unitaires NotificationService
- [ ] Tests unitaires WebPushService
- [ ] Tests intégration : trigger event → notification créée → channels envoyés
- [ ] Tests intégration : SSE real-time delivery
- [ ] Tests e2e : workflow complet avec notifications
- [ ] Tests manuels templates email preview

## Tests
- Tests unitaires sur le module de notification pour vérifier les payloads générés selon chaque événement.
- Tests d'intégration Japa : simulation de transition → notification envoyée (mock transport), audit log créé.
- Tests e2e (optionnel) pour vérifier la présence des notifications in-app et emails (via sandbox transport).
- Vérification manuelle des templates (preview) dans les deux langues principales.

## Notes techniques

### VAPID Keys
Clés générées et ajoutées à `.env` :
```env
VAPID_SUBJECT=mailto:admin@essaimons.fr
VAPID_PUBLIC_KEY=BF7YpSvCfDgZoFvm30u2Aqr1kYWCcC9O3i_NqXHBsqi5e-qPhd28mMVZ9hGf0e6sL-XlOYPJq9dNy34TKQxl-wo
VAPID_PRIVATE_KEY=alBIS-iHmxTJ8W_1uYdKzMKEGMo63-Oge5Oo1L0tzXI
```

### Architecture temps réel
~~Postgres LISTEN/NOTIFY~~ **Remplacé par broadcast Transmit direct** :
- `NotificationService.sendInApp()` broadcast directement vers `user/${frontId}/notifications`
- Pas de trigger PostgreSQL, pas de NotificationListenerService
- Plus simple, fonctionne avec HMR, moins de latence

### Types de notifications
Liste des types implémentés :
- `status_transition` : changement de statut proposition (CLARIFY, AMEND, VOTE, MANDATE, EVALUATE, ARCHIVED)
- `mandate_assigned` : affectation d'un mandat
- `mandate_revoked` : révocation d'un mandat
- `deliverable_uploaded` : livrable soumis
- `deliverable_evaluated` : livrable évalué
- `comment_added` : commentaire général ajouté ✅
- `clarification_added` : demande de clarification ajoutée ✅
- `clarification_updated` : clarification mise à jour ✅
- `clarification_deleted` : clarification supprimée ✅
- `exchange_scheduled` : échange/événement planifié ✅
- `deadline_approaching` : échéance imminente (48h) - à implémenter
- `nonconformity_threshold` : seuil non conforme atteint - à implémenter
- `procedure_opened` : procédure ouverte (Phase 2) - à implémenter
- `revocation_vote_opened` : vote révocatoire ouvert (Phase 2) - à implémenter
