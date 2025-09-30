# Tâche 006 · Notifications & auditabilité

## Prérequis
- Tâches 001–005 fournissant les événements déclencheurs et les données à notifier.
- Choix des canaux de notification (email, in-app, push) et des templates i18n.
- Vérification des besoins de conformité (RGPD, conservation des logs).

## Architecture

### Système multi-canal
- **In-app** : SSE via @adonisjs/transmit + Postgres LISTEN/NOTIFY
- **Email** : BrevoMailService (intégration existante)
- **Web Push** : VAPID + Service Workers
- **Queue** : pg-boss pour delivery fiable et retry

### Base de données
- `notifications` : contenu des notifications (i18n keys, entity refs)
- `user_notifications` : fan-out avec statut delivery par canal
- `push_subscriptions` : subscriptions Web Push par device
- `notification_settings` : préférences utilisateur par type/canal

### Trigger temps réel
Postgres trigger sur `user_notifications` → `pg_notify('user_notification')` → SSE push

## Implémentation

### Phase 1 : Infrastructure (2025-01-30) ✅
- [x] Installation dépendances : `pg-boss`, `web-push`
- [x] Migrations base de données :
  - [database/migrations/app/1760000000200_create_notifications_table.ts](../../back/database/migrations/app/1760000000200_create_notifications_table.ts)
  - [database/migrations/app/1760000000210_create_user_notifications_table.ts](../../back/database/migrations/app/1760000000210_create_user_notifications_table.ts)
  - [database/migrations/app/1760000000220_create_push_subscriptions_table.ts](../../back/database/migrations/app/1760000000220_create_push_subscriptions_table.ts)
  - [database/migrations/app/1760000000230_create_notification_settings_table.ts](../../back/database/migrations/app/1760000000230_create_notification_settings_table.ts)
- [x] Trigger Postgres LISTEN/NOTIFY sur `user_notifications`
- [x] Génération clés VAPID : [scripts/generate-vapid-keys.ts](../../back/scripts/generate-vapid-keys.ts)
- [x] Migrations exécutées avec succès

### Phase 2 : Backend Core (À faire)
- [ ] Créer modèles Lucid :
  - `app/models/notification.ts`
  - `app/models/user_notification.ts`
  - `app/models/push_subscription.ts`
  - `app/models/notification_setting.ts`
- [ ] Service `NotificationService` :
  - Méthode `create()` : créer notification + fan-out vers users
  - Méthode `sendToChannels()` : dispatch vers in-app/email/push
  - Intégration avec pg-boss pour retry
- [ ] Service `WebPushService` :
  - Configuration web-push avec clés VAPID
  - Worker pg-boss pour envoyer push notifications
  - Gestion des subscriptions expirées (410 Gone)
- [ ] Service `NotificationListenerService` :
  - Écoute Postgres NOTIFY via pg client
  - Push vers Transmit SSE streams par user_id
- [ ] Initialisation dans `start/automation.ts` ou nouveau fichier

### Phase 3 : API REST (À faire)
- [ ] Controller `NotificationsController` :
  - `GET /notifications` : liste paginée pour user
  - `PATCH /notifications/:id/read` : marquer comme lue
  - `GET /notifications/unread-count` : badge count
- [ ] Controller `PushSubscriptionsController` :
  - `POST /push-subscriptions` : enregistrer subscription
  - `DELETE /push-subscriptions/:id` : désinscrire device
- [ ] Controller `NotificationSettingsController` :
  - `GET /notification-settings` : préférences user
  - `PUT /notification-settings/:type` : modifier préférences

### Phase 4 : Hooks métier (À faire)
Notifications prioritaires (Phase 1 & 2 du cycle) :
- [ ] **Status transitions** :
  - `draft → clarification` : notifier initiateur
  - `clarification → improvement` : notifier initiateur + contributeurs
  - `improvement → vote` : notifier tous votants
  - `vote → procedure` : notifier initiateur (si non conforme)
  - `vote → mandates` : notifier initiateur (si conforme)
  - `mandates → evaluation` : notifier mandataires
  - `evaluation → closed` : notifier tous participants
- [ ] **Mandates** :
  - Assignment : notifier mandataire assigné
  - Revocation : notifier mandataire révoqué
- [ ] **Deliverables** :
  - Upload : notifier évaluateurs
  - Evaluation : notifier mandataire
- [ ] **Approaching deadlines** (48h avant) :
  - Deadline clarification/improvement/vote/mandate/evaluation
- [ ] **Non-conformity threshold** (Phase 2) :
  - >= 1/3 évaluations non conformes → ouverture procédure
- [ ] **Revocation votes** (Phase 2) :
  - Ouverture vote révocatoire → notifier tous votants

### Phase 5 : Frontend (À faire)
- [ ] Composant Svelte notification bell :
  - Badge avec unread count
  - Dropdown avec liste notifications
  - Mark as read action
  - Real-time updates via SSE
- [ ] Service Worker pour Web Push :
  - `public/service-worker.js`
  - Enregistrement depuis settings page
  - Push event handler + notification display
- [ ] Settings page préférences notifications :
  - Toggle par type de notification
  - Toggle par canal (in-app / email / push)
  - Gestion devices pour push
- [ ] SSE client pour notifications temps réel :
  - Connexion à Transmit stream `user/${userId}/notifications`
  - Update badge + liste en temps réel

### Phase 6 : Email Templates (À faire)
- [ ] Intégration avec BrevoMailService existant
- [ ] Templates Brevo pour chaque type de notification
- [ ] Traductions FR/EN dans templates
- [ ] Fallback texte pour clients email basiques

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

### Postgres LISTEN/NOTIFY
Trigger créé sur `user_notifications` table :
```sql
CREATE FUNCTION notify_user_notification() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('user_notification', json_build_object(
    'id', NEW.id,
    'user_id', NEW.user_id,
    'notification_id', NEW.notification_id,
    'created_at', NEW.created_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Types de notifications
Liste des types implémentés dans le MVP :
- `status_transition` : changement de statut proposition
- `mandate_assigned` : affectation d'un mandat
- `mandate_revoked` : révocation d'un mandat
- `deliverable_uploaded` : livrable soumis
- `deliverable_evaluated` : livrable évalué
- `deadline_approaching` : échéance imminente (48h)
- `nonconformity_threshold` : seuil non conforme atteint
- `procedure_opened` : procédure ouverte (Phase 2)
- `revocation_vote_opened` : vote révocatoire ouvert (Phase 2)
