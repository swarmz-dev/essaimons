# Notification System

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Notification Types](#notification-types)
5. [Notification Channels](#notification-channels)
6. [Translation System](#translation-system)
7. [Email Notification Flow](#email-notification-flow)
8. [User Preferences](#user-preferences)
9. [Services](#services)
10. [Testing](#testing)
11. [Best Practices](#best-practices)

---

## Overview

The notification system is a multi-channel notification platform that delivers real-time updates to users through three channels:

- **In-App Notifications**: Real-time notifications via Server-Sent Events (SSE) using AdonisJS Transmit
- **Email Notifications**: Batched email delivery with configurable frequency preferences
- **Push Notifications**: Web push notifications via service workers

The system supports internationalization (i18n) with English and French translations, user preferences per notification type, and intelligent email batching to reduce notification fatigue.

---

## Architecture

### High-Level Flow

```
┌─────────────────┐
│  Event Trigger  │ (e.g., status change, comment added)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ PropositionNotificationSvc  │ Determines recipients and translation keys
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   NotificationService       │ Core notification orchestration
└────────────┬────────────────┘
             │
             ├──────────────────────────────────┬──────────────────────┐
             ▼                                  ▼                      ▼
┌────────────────────┐           ┌──────────────────────┐   ┌─────────────────┐
│  In-App Channel    │           │   Email Channel      │   │  Push Channel   │
│  (Transmit SSE)    │           │  (Batch Queue)       │   │ (WebPush API)   │
└────────────────────┘           └──────────────────────┘   └─────────────────┘
             │                                  │
             ▼                                  ▼
   User sees notification        PendingEmailNotification
   immediately in browser         queued for batch send
                                          │
                                          ▼
                                  EmailBatchService
                                  (Cron Job)
                                          │
                                          ▼
                                  EmailTemplateService
                                  (Handlebars rendering)
                                          │
                                          ▼
                                   BrevoMailService
                                   (Send via Brevo API)
```

### Database Schema

```
┌─────────────────┐
│  notifications  │ (One notification record)
└────────┬────────┘
         │ 1
         │
         │ N
         ▼
┌──────────────────────┐
│ user_notifications   │ (Fan-out: one per recipient)
└──────────────────────┘
         │
         │
         ▼
┌────────────────────────────┐
│ pending_email_notifications│ (Email queue with scheduling)
└────────────────────────────┘

┌─────────────────────────┐
│  notification_settings  │ (User preferences per type)
└─────────────────────────┘
```

---

## Data Models

### Notification Model

**File**: `back/app/models/notification.ts`

Represents a single notification event with translation keys and interpolation data.

```typescript
{
  id: string                           // UUID
  type: NotificationTypeEnum           // Type of notification
  titleKey: string                     // i18n translation key for title
  bodyKey: string                      // i18n translation key for body/message
  interpolationData: Record<string, any> // Data for variable replacement
  propositionId: string | null         // Related proposition
  mandateId: string | null             // Related mandate
  deliverableId: string | null         // Related deliverable
  voteId: string | null                // Related vote
  actionUrl: string | null             // Deep link URL (e.g., /propositions/123)
  priority: string                     // Priority level (normal, high, urgent)
  metadata: Record<string, any> | null // Additional metadata
  createdAt: DateTime
}
```

### UserNotification Model

**File**: `back/app/models/user_notification.ts`

Join table tracking delivery status per user per notification.

```typescript
{
  id: string                    // UUID
  userId: string                // Recipient user ID
  notificationId: string        // Related notification
  read: boolean                 // Read status
  readAt: DateTime | null       // When user marked as read
  inAppSent: boolean            // SSE delivery status
  inAppSentAt: DateTime | null
  emailSent: boolean            // Email delivery status
  emailSentAt: DateTime | null
  emailError: string | null     // Email error message if failed
  pushSent: boolean             // Push notification status
  pushSentAt: DateTime | null
  pushError: string | null      // Push error message if failed
  createdAt: DateTime
  updatedAt: DateTime
}
```

### PendingEmailNotification Model

**File**: `back/app/models/pending_email_notification.ts`

Queue for batching email notifications based on user frequency preferences.

```typescript
{
  id: string                   // UUID
  userId: string               // Recipient user ID
  notificationId: string       // Related notification
  sent: boolean                // Whether email was sent
  scheduledFor: DateTime       // When email should be sent
  sentAt: DateTime | null      // When email was actually sent
  createdAt: DateTime
  updatedAt: DateTime
}
```

### NotificationSetting Model

**File**: `back/app/models/notification_setting.ts`

User preferences for each notification type and channel.

```typescript
{
  id: string                          // UUID
  userId: string                      // User ID
  notificationType: NotificationTypeEnum
  inAppEnabled: boolean               // Enable in-app notifications
  emailEnabled: boolean               // Enable email notifications
  pushEnabled: boolean                // Enable push notifications
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Default Behavior**: If no `NotificationSetting` exists for a user/type combination, all channels are enabled by default.

---

## Notification Types

**File**: `back/app/types/enum/notification_type_enum.ts`

```typescript
export enum NotificationTypeEnum {
  STATUS_TRANSITION = 'status_transition',          // Proposal status changed
  MANDATE_ASSIGNED = 'mandate_assigned',            // User assigned to mandate
  MANDATE_REVOKED = 'mandate_revoked',              // User removed from mandate
  DELIVERABLE_UPLOADED = 'deliverable_uploaded',    // New deliverable submitted
  DELIVERABLE_EVALUATED = 'deliverable_evaluated',  // Deliverable was evaluated
  DEADLINE_APPROACHING = 'deadline_approaching',    // Deadline reminder
  NONCONFORMITY_THRESHOLD = 'nonconformity_threshold', // Non-conformity threshold reached
  PROCEDURE_OPENED = 'procedure_opened',            // Procedure opened
  REVOCATION_VOTE_OPENED = 'revocation_vote_opened', // Revocation vote started
  COMMENT_ADDED = 'comment_added',                  // New comment on proposal
  CLARIFICATION_ADDED = 'clarification_added',      // New clarification added
  CLARIFICATION_UPDATED = 'clarification_updated',  // Clarification updated
  CLARIFICATION_DELETED = 'clarification_deleted',  // Clarification deleted
  EXCHANGE_SCHEDULED = 'exchange_scheduled',        // Exchange event scheduled
}
```

---

## Notification Channels

**File**: `back/app/types/enum/notification_channel_enum.ts`

```typescript
export enum NotificationChannelEnum {
  IN_APP = 'in_app',   // Server-Sent Events via AdonisJS Transmit
  EMAIL = 'email',     // Email via Brevo API
  PUSH = 'push',       // Web Push Notifications
}
```

### Channel Details

#### In-App Channel (SSE)

- **Technology**: AdonisJS Transmit (Server-Sent Events)
- **Delivery**: Immediate, real-time
- **Stream Format**: `user/{userId}/notifications`
- **Payload**:
  ```typescript
  {
    type: 'notification',
    data: {
      id: string,              // UserNotification ID
      notificationId: string,  // Notification ID
      type: NotificationTypeEnum,
      titleKey: string,
      messageKey: string,
      data: Record<string, any>,
      actionUrl: string | null,
      isRead: boolean,
      createdAt: string
    }
  }
  ```

#### Email Channel

- **Technology**: Brevo (formerly Sendinblue) SMTP API
- **Delivery**: Batched based on user preference (instant, hourly, daily, weekly)
- **Templates**: Handlebars-based HTML and text templates
- **Queue**: `pending_email_notifications` table
- **Processing**: Cron job via `EmailBatchService.processPendingEmails()`

#### Push Channel

- **Technology**: Web Push API via `WebPushService`
- **Delivery**: Queued via pg-boss
- **Requirements**: User must have granted push notification permission

---

## Translation System

### Translation Key Structure

All notification messages use i18n translation keys stored in:
- `back/resources/lang/en/messages.json`
- `back/resources/lang/fr/messages.json`

#### Key Format

Translation keys follow this hierarchical structure:

```
messages.notifications.{type}.{subtype}.{field}
```

**Examples**:
- `messages.notifications.status_transition.to_vote.title`
- `messages.notifications.status_transition.to_vote.message`
- `messages.notifications.comment_added.title`
- `messages.notifications.comment_added.message`

### Status Transition Notifications

Status transitions have specific sub-keys for each target status:

```json
{
  "notifications": {
    "status_transition": {
      "to_clarify": {
        "title": "Proposal requires clarification",
        "message": "The proposal \"{propositionTitle}\" has been moved to clarification phase"
      },
      "to_amend": {
        "title": "Proposal requires amendments",
        "message": "The proposal \"{propositionTitle}\" has been moved to amendment phase"
      },
      "to_vote": {
        "title": "Proposal moved to vote",
        "message": "The proposal \"{propositionTitle}\" is now open for voting"
      },
      "to_mandate": {
        "title": "Proposal mandate phase",
        "message": "The proposal \"{propositionTitle}\" has been moved to mandate phase"
      },
      "to_evaluate": {
        "title": "Deliverable ready for evaluation",
        "message": "A deliverable has been submitted for the proposal \"{propositionTitle}\" and is ready for your evaluation"
      },
      "to_archived": {
        "title": "Proposal archived",
        "message": "The proposal \"{propositionTitle}\" has been archived"
      }
    }
  }
}
```

### Variable Interpolation

Translation messages support variable interpolation using `{variableName}` syntax:

```json
{
  "title": "New comment",
  "message": "{username} commented on proposal \"{propositionTitle}\""
}
```

Variables are provided via the `interpolationData` field in the `Notification` model.

### Common Interpolation Variables

- `{propositionTitle}`: Title of the proposal
- `{propositionId}`: UUID of the proposal
- `{username}`: Username of the actor
- `{mandateTitle}`: Title of the mandate
- `{deliverableLabel}`: Label of the deliverable
- `{date}`: Formatted date
- `{days}`: Number of days

---

## Email Notification Flow

### User Email Frequency Preferences

**File**: `back/app/types/enum/email_frequency_enum.ts`

Users can configure how often they receive email notifications:

```typescript
export enum EmailFrequencyEnum {
  INSTANT = 'instant',  // Send immediately (default)
  HOURLY = 'hourly',    // Batch and send once per hour
  DAILY = 'daily',      // Batch and send once per day (9 AM)
  WEEKLY = 'weekly',    // Batch and send once per week (Monday 9 AM)
}
```

**Storage**: `users.email_frequency` column

### Email Batching Process

#### 1. Queue Email

**Service**: `EmailBatchService.queueEmail(user, notification)`

When a notification is created and the user has email enabled:

1. Calculate `scheduledFor` based on user's `emailFrequency`
2. Create `PendingEmailNotification` record
3. Notification waits in queue until `scheduledFor` time

**Scheduling Logic**:
- `INSTANT`: Send now
- `HOURLY`: Round up to next hour boundary
- `DAILY`: Next day at 9:00 AM
- `WEEKLY`: Next Monday at 9:00 AM

#### 2. Process Pending Emails (Cron Job)

**Service**: `EmailBatchService.processPendingEmails()`

**Trigger**: Cron job (recommended: every 5-15 minutes)

**Process**:
1. Query all `PendingEmailNotification` where `sent = false` and `scheduledFor <= NOW()`
2. Group pending notifications by `userId`
3. For each user:
   - If 1 notification: Send single notification email
   - If 2+ notifications: Send digest email with all notifications
4. Mark all as `sent = true` and set `sentAt = NOW()`

#### 3. Render Email Templates

**Service**: `EmailTemplateService`

**Templates**:
- `notification_single`: Single notification email
- `notification_digest`: Multiple notifications in one email

**Template Variables**:
- `organizationName`: From `APP_NAME` env var
- `baseUrl`: From `PUBLIC_APP_URI` env var
- `title`: Translated notification title
- `message`: Translated notification message
- `actionUrl`: Deep link URL
- `count`: Number of notifications (digest only)
- `notifications`: Array of notifications (digest only)

**Rendering**:
1. Fetch email template from `email_templates` table
2. Translate notification using i18n service
3. Interpolate variables using custom Handlebars-style engine
4. Generate both HTML and plain text versions

#### 4. Send Email

**Service**: `BrevoMailService.sendTransactionalEmail()`

Sends email via Brevo API with:
- Subject (translated and interpolated)
- HTML content
- Text content (fallback for plain text clients)
- Recipient name and email

### Email Template System

**Database Table**: `email_templates`

**Seeder**: `back/database/seeders/email_template_seeder.ts`

Templates use a custom Handlebars-style templating syntax:

**Simple Variables**:
```handlebars
{{organizationName}}
{{title}}
{{message}}
```

**Conditionals**:
```handlebars
{{#if actionUrl}}
  <a href="{{baseUrl}}{{actionUrl}}">View Details</a>
{{/if}}
```

**Loops** (digest template):
```handlebars
{{#each notifications}}
  <h3>{{this.title}}</h3>
  <p>{{this.message}}</p>
  {{#if this.actionUrl}}
    <a href="{{../baseUrl}}{{this.actionUrl}}">View</a>
  {{/if}}
{{/each}}
```

**Parent Scope Access**:
```handlebars
{{../baseUrl}}  <!-- Access parent context variable inside loop -->
```

### Template Interpolation Engine

**File**: `back/app/services/email_template_service.ts`

**Features**:
- `{{variable}}`: Simple variable replacement
- `{{#if variable}}...{{/if}}`: Conditional blocks
- `{{#each array}}...{{/each}}`: Loop blocks
- `{{this.property}}`: Access current item in loop
- `{{../variable}}`: Access parent scope in nested context

---

## User Preferences

### Notification Settings

Users can configure notification preferences per notification type and channel.

**API Endpoints**:
- `GET /api/notification-settings`: Get all user settings
- `PUT /api/notification-settings/:type`: Update settings for a type

**Example Settings**:
```json
{
  "notificationType": "comment_added",
  "inAppEnabled": true,
  "emailEnabled": false,
  "pushEnabled": true
}
```

### Email Frequency

Users can configure global email batching frequency.

**API Endpoint**:
- `PUT /api/profile/email-frequency`

**Payload**:
```json
{
  "emailFrequency": "daily"
}
```

---

## Services

### NotificationService

**File**: `back/app/services/notification_service.ts`

**Purpose**: Core notification orchestration service

**Key Methods**:

#### `create(payload, userIds): Promise<Notification>`

Creates a notification and fans out to multiple users.

**Parameters**:
```typescript
{
  type: NotificationTypeEnum,
  titleKey: string,              // e.g., 'messages.notifications.comment_added.title'
  messageKey: string,            // e.g., 'messages.notifications.comment_added.message'
  data?: Record<string, any>,    // Interpolation variables
  entityType?: 'proposition' | 'mandate' | 'deliverable' | 'vote',
  entityId?: string,
  actionUrl?: string             // e.g., '/propositions/123'
}
```

**Process**:
1. Create `Notification` record
2. Create `UserNotification` for each user
3. Asynchronously send to all enabled channels
4. Return notification immediately (don't wait for delivery)

#### `markAsRead(userNotificationId, userId): Promise<UserNotification | null>`

Marks a user's notification as read.

#### `getUnreadCount(userId): Promise<number>`

Returns count of unread notifications for a user.

#### `getUserNotifications(userId, page, limit)`

Returns paginated list of user's notifications.

### PropositionNotificationService

**File**: `back/app/services/proposition_notification_service.ts`

**Purpose**: Business logic for proposition-related notifications

**Key Methods**:

#### `notifyStatusTransition(proposition, oldStatus, newStatus)`

Notifies relevant users when proposal status changes.

**Recipient Logic**:
- `CLARIFY`: Notify creator
- `AMEND`: Notify creator + rescue initiators
- `VOTE`: Notify creator + rescue initiators
- `MANDATE`: Notify creator
- `EVALUATE`: Notify mandate holders (mandataires)
- `ARCHIVED`: Notify creator + rescue initiators

#### `notifyMandateAssignment(mandate, previousHolderId?)`

Notifies user assigned to a mandate. If `previousHolderId` is provided, also notifies the previous holder of revocation.

#### `notifyMandateRevocation(mandate, previousHolderId)`

Notifies user whose mandate was revoked.

#### `notifyDeliverableUpload(deliverable)`

Notifies proposal creator and rescue initiators when a deliverable is uploaded.

#### `notifyDeliverableEvaluation(deliverable)`

Notifies mandate holder when their deliverable is evaluated.

#### `notifyCommentAdded(proposition, comment, authorId)`

Notifies users when a comment or clarification is added. Excludes the comment author from notifications.

**Logic**:
- Regular comments: Notify creator + rescue initiators
- Clarifications: Uses `CLARIFICATION_ADDED` type

#### `notifyCommentUpdated(proposition, comment, editorId)`

Notifies users when a clarification is updated. Only sends notifications for clarifications, not regular comments.

#### `notifyCommentDeleted(proposition, comment)`

Notifies users when a clarification is deleted.

#### `notifyExchangeScheduled(proposition, event)`

Notifies users when an exchange event is scheduled.

### EmailBatchService

**File**: `back/app/services/email_batch_service.ts`

**Purpose**: Email batching and scheduling

**Key Methods**:

#### `queueEmail(user, notification)`

Adds a notification to the email queue based on user's email frequency preference.

#### `processPendingEmails()`

Processes all pending emails that are due to be sent. Should be called by a cron job.

#### `cleanupOldNotifications()`

Deletes sent email notifications older than 30 days.

### EmailTemplateService

**File**: `back/app/services/email_template_service.ts`

**Purpose**: Email template rendering with i18n

**Key Methods**:

#### `renderSingleNotification(notification, i18n, locale): Promise<{subject, htmlContent, textContent}>`

Renders a single notification email.

#### `renderDigestNotifications(notifications, i18n, locale): Promise<{subject, htmlContent, textContent}>`

Renders a digest email with multiple notifications.

---

## Testing

### Manual Testing Command

**File**: `back/commands/test_email_template.ts`

**Command**: `node ace test:email-template`

**Purpose**: Test email template rendering without sending actual emails

**Output**:
- Subject line
- HTML content
- Text content
- Tests both single notification and digest formats
- Tests both English and French locales

**Example Usage**:
```bash
cd back
node ace test:email-template
```

### Testing Email Delivery

See [TESTING_EMAIL_NOTIFICATIONS.md](./TESTING_EMAIL_NOTIFICATIONS.md) for detailed instructions on:
- Setting up Brevo for development
- Testing email delivery
- Configuring cron jobs
- Debugging email issues

---

## Best Practices

### Creating Notifications

1. **Always use translation keys** instead of hardcoded strings
2. **Provide interpolation data** for all dynamic content
3. **Set meaningful actionUrl** to enable deep linking
4. **Deduplicate user IDs** when fanning out to multiple users
5. **Don't await channel delivery** - let it happen asynchronously

**Example**:
```typescript
await propositionNotificationService.notifyStatusTransition(
  proposition,
  PropositionStatusEnum.DRAFT,
  PropositionStatusEnum.VOTE
);
```

### Adding New Notification Types

1. **Add enum value** to `NotificationTypeEnum`
2. **Add translation keys** to both `en/messages.json` and `fr/messages.json`:
   ```json
   {
     "notifications": {
       "your_new_type": {
         "title": "English Title",
         "message": "English message with {variables}"
       }
     }
   }
   ```
3. **Create service method** in `PropositionNotificationService` or relevant service
4. **Call notification** from appropriate controller or event handler
5. **Add user preference defaults** if needed

### Translation Keys

- **Use specific keys**: `notifications.status_transition.to_vote` instead of generic `status_changed`
- **Include context**: Clarify whether it's a title or message with `.title` and `.message` suffixes
- **Use snake_case**: For consistency across all notification types
- **Keep variables minimal**: Only include data needed for the message

### Email Templates

- **Always provide text fallback**: Some email clients don't support HTML
- **Test responsive design**: Emails should work on mobile devices
- **Use inline styles**: External stylesheets don't work in many email clients
- **Validate HTML**: Use table-based layouts for best email client compatibility
- **Keep file size small**: Inline large images can trigger spam filters

### Performance Considerations

1. **Fan-out is asynchronous**: Notification creation returns immediately
2. **Email batching reduces load**: Group notifications instead of sending individually
3. **SSE is efficient**: No polling required for real-time updates
4. **Database indexes**: Ensure indexes on `user_id`, `read`, and `scheduled_for` columns
5. **Cleanup old data**: Run `cleanupOldNotifications()` periodically

### Security

1. **Validate user permissions**: Only send notifications to users who should receive them
2. **Sanitize interpolation data**: Prevent XSS in notification content
3. **Rate limiting**: Implement rate limits on notification creation to prevent abuse
4. **Verify actionUrl**: Ensure URLs point to valid, accessible resources

### Monitoring

1. **Log notification failures**: Track errors in email/push delivery
2. **Monitor queue depth**: Alert if `pending_email_notifications` grows too large
3. **Track delivery rates**: Measure success/failure rates per channel
4. **User engagement**: Monitor read rates and notification preferences

---

## Troubleshooting

### Notifications Not Received

1. **Check user preferences**: Verify channel is enabled in `notification_settings`
2. **Check email frequency**: Email might be batched for later delivery
3. **Check pending queue**: Look for entries in `pending_email_notifications`
4. **Check logs**: Review application logs for errors
5. **Check Brevo quota**: Ensure you haven't exceeded API limits

### Email Not Sending

1. **Run cron job manually**: Execute `EmailBatchService.processPendingEmails()`
2. **Check Brevo API key**: Verify `BREVO_API_KEY` is set correctly
3. **Check template**: Ensure `notification_single` and `notification_digest` templates exist
4. **Check user email**: Verify user has a valid email address
5. **Review error logs**: Check `emailError` field in `user_notifications`

### Translation Missing

1. **Verify key exists**: Check both `en/messages.json` and `fr/messages.json`
2. **Check key path**: Ensure full path is correct (e.g., `messages.notifications.comment_added.title`)
3. **Run seeder**: Re-run database seeders if templates are missing
4. **Clear cache**: Restart application to reload translations

---

## Related Documentation

- [TESTING_EMAIL_NOTIFICATIONS.md](./TESTING_EMAIL_NOTIFICATIONS.md) - Email testing guide
- [PROPOSITION_IMPORT_EXPORT.md](./PROPOSITION_IMPORT_EXPORT.md) - Import/export system
- [sveltekit-translations.md](./sveltekit-translations.md) - Frontend i18n system

---

## File Reference

### Models
- `back/app/models/notification.ts`
- `back/app/models/user_notification.ts`
- `back/app/models/pending_email_notification.ts`
- `back/app/models/notification_setting.ts`
- `back/app/models/email_template.ts`

### Services
- `back/app/services/notification_service.ts`
- `back/app/services/proposition_notification_service.ts`
- `back/app/services/email_batch_service.ts`
- `back/app/services/email_template_service.ts`
- `back/app/services/brevo_mail_service.ts`
- `back/app/services/web_push_service.ts`

### Controllers
- `back/app/controllers/notifications_controller.ts`
- `back/app/controllers/notification_settings_controller.ts`

### Enums
- `back/app/types/enum/notification_type_enum.ts`
- `back/app/types/enum/notification_channel_enum.ts`
- `back/app/types/enum/email_frequency_enum.ts`

### Migrations
- `back/database/migrations/app/1760000000200_create_notifications_table.ts`
- `back/database/migrations/app/1760000000210_create_user_notifications_table.ts`
- `back/database/migrations/app/1760000000230_create_notification_settings_table.ts`
- `back/database/migrations/app/1759653128182_create_create_pending_email_notifications_table.ts`

### Seeders
- `back/database/seeders/email_template_seeder.ts`

### Translation Files
- `back/resources/lang/en/messages.json`
- `back/resources/lang/fr/messages.json`

### Commands
- `back/commands/test_email_template.ts`
