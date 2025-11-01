# Testing Email Notifications

## Overview

This guide explains how to test the email notification system, which sends both single notifications and digest emails to users based on their email frequency preferences.

## Email Notification System

The email notification system uses:
- **Brevo API** (formerly Sendinblue) for sending emails
- **Email Templates** stored in the database with HTML and text versions
- **i18n Translation System** for multilingual support (EN/FR)
- **Batching Queue** to group notifications based on user preferences
- **Handlebars-style Templates** for variable interpolation

See [NOTIFICATION_SYSTEM.md](./NOTIFICATION_SYSTEM.md) for comprehensive documentation.

---

## Quick Start: Testing Email Templates

### Test Command (No Emails Sent)

The fastest way to test email rendering without sending actual emails:

```bash
cd back
node ace test:email-template
```

**What it does**:
- Renders a sample single notification email
- Renders a sample digest email (multiple notifications)
- Tests both French and English locales
- Displays HTML and text content in the console
- Does NOT send actual emails
- Does NOT require Brevo API configuration

**Output**:
```
--- Testing French locale ---
Subject: Nouvelle notification : Nouveau commentaire
--- HTML Content (French) ---
<!DOCTYPE html>...
--- Text Content (French) ---
Nouveau commentaire

Jean Dupont a commenté la proposition "Ma super proposition"
...
```

### Verify Template Rendering

Check that the output contains:
- ✅ Translated text (NOT `messages.notifications.xxx` keys)
- ✅ Interpolated variables (usernames, proposition titles)
- ✅ Complete HTML structure
- ✅ Plain text fallback version
- ✅ Proper French and English translations

---

## Testing with Mock Mode (Console Output)

Test the full email flow without sending real emails.

### 1. Configure Mock Mode

In `back/.env`:
```env
MAIL_MOCK=true
PUBLIC_APP_URI=http://localhost:5173
APP_NAME=Essaimons V1
```

### 2. Ensure Templates Are Seeded

```bash
cd back
node ace db:seed --files=database/seeders/email_template_seeder.ts
```

### 3. Trigger a Notification

In the application:
- Create a proposal
- Add a comment
- Change proposal status
- Any action that generates a notification

### 4. Process Email Queue

Run the email batch processor:

```bash
cd back
node ace notification:send-emails
```

**Note**: Replace with your actual cron job command if different.

### 5. Check Console Output

With `MAIL_MOCK=true`, you should see:
```
Sending email (MOCK MODE):
To: user@example.com
Subject: Nouvelle notification : Nouveau commentaire
HTML Content: <!DOCTYPE html>...
Text Content: Nouveau commentaire...
```

---

## Testing with Real Emails (Brevo)

Test end-to-end email delivery using the Brevo API.

### 1. Get Brevo API Key

1. Sign up at [Brevo](https://www.brevo.com) (free tier available)
2. Go to **Settings** → **API Keys**
3. Create a new API key
4. Copy the key

### 2. Configure Environment

In `back/.env`:
```env
MAIL_MOCK=false
BREVO_API_KEY=xkeysib-your-api-key-here
ACCOUNT_SENDER_EMAIL=noreply@yourdomain.com
ACCOUNT_SENDER_NAME=Essaimons
PUBLIC_APP_URI=http://localhost:5173
APP_NAME=Essaimons V1
```

**Important**:
- `ACCOUNT_SENDER_EMAIL` must be verified in Brevo
- Use your actual domain or Brevo test domain
- Free tier has daily sending limits

### 3. Verify Sender Email in Brevo

1. Go to Brevo dashboard → **Senders & IPs**
2. Add and verify your sender email
3. For testing, you can use Brevo's test domain

### 4. Seed Email Templates

```bash
cd back
node ace db:seed --files=database/seeders/email_template_seeder.ts
```

### 5. Configure User Email Frequency

By default, users have `emailFrequency = 'instant'`. To test batching:

**SQL**:
```sql
UPDATE users
SET email_frequency = 'daily'  -- or 'hourly', 'weekly'
WHERE email = 'testuser@example.com';
```

**Email Frequencies**:
- `instant`: Send immediately
- `hourly`: Batch and send on the hour
- `daily`: Batch and send at 9 AM daily
- `weekly`: Batch and send Monday at 9 AM

### 6. Trigger Notifications

In the application, perform actions that generate notifications:
- Add a comment to a proposal
- Change proposal status
- Assign a mandate
- Upload a deliverable
- etc.

### 7. Run Email Batch Processor

For instant emails:
```bash
cd back
node ace notification:send-emails
```

For batched emails, wait until the scheduled time or manually adjust `scheduled_for`:
```sql
UPDATE pending_email_notifications
SET scheduled_for = NOW()
WHERE sent = false;
```

Then run the processor.

### 8. Check Your Inbox

You should receive an email with:
- ✅ Translated subject line
- ✅ Professional HTML layout
- ✅ Translated notification content
- ✅ Interpolated variables (names, titles)
- ✅ Clickable action buttons
- ✅ Plain text fallback version

### 9. Verify Brevo Dashboard

Check Brevo dashboard for:
- Email sent status
- Delivery status
- Open/click rates
- Any errors or bounces

---

## Testing Email Batching (Digest)

### Single Notification Email

Sent when a user has exactly **1 pending notification**.

**Template**: `notification_single`

**Subject**: `New notification: {title}`

**Content**:
- Single notification title and message
- Optional action button
- Footer with notification preferences link

### Digest Email

Sent when a user has **2 or more pending notifications**.

**Template**: `notification_digest`

**Subject**: `You have {count} new notifications`

**Content**:
- List of all pending notifications
- Each notification shows title, message, and action link
- "View All Notifications" button
- Footer with notification preferences link

### Testing Digest Flow

1. **Set user to batch mode**:
```sql
UPDATE users SET email_frequency = 'daily' WHERE email = 'test@example.com';
```

2. **Trigger multiple notifications**:
- Add 3-4 comments to different proposals
- Change status on multiple proposals
- Perform various actions

3. **Verify pending queue**:
```sql
SELECT * FROM pending_email_notifications
WHERE user_id = 'user-uuid' AND sent = false;
```

4. **Process immediately** (for testing):
```sql
UPDATE pending_email_notifications
SET scheduled_for = NOW()
WHERE user_id = 'user-uuid';
```

5. **Run processor**:
```bash
node ace notification:send-emails
```

6. **Receive digest email** with all notifications grouped

---

## Debugging Email Issues

### Problem: No Email Received

**Check**:
1. **User email enabled?**
```sql
SELECT email_enabled
FROM notification_settings
WHERE user_id = 'user-uuid'
  AND notification_type = 'comment_added';
```
Default: `true` if no setting exists

2. **Email in pending queue?**
```sql
SELECT * FROM pending_email_notifications
WHERE user_id = 'user-uuid' AND sent = false;
```

3. **Scheduled time passed?**
```sql
SELECT id, scheduled_for, sent
FROM pending_email_notifications
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

4. **Check logs**:
```bash
tail -f logs/app.log | grep -i email
```

5. **Check Brevo quota**: Free tier has daily limits

### Problem: Translation Keys Shown Instead of Text

**Example**: Email shows `messages.notifications.comment_added.title` instead of "New comment"

**Solution**:
1. **Verify translation keys exist**:
   - Check `back/resources/lang/en/messages.json`
   - Check `back/resources/lang/fr/messages.json`
   - Ensure path is correct: `notifications.comment_added.title`

2. **Verify notification uses correct keys**:
```sql
SELECT title_key, body_key
FROM notifications
WHERE id = 'notification-uuid';
```
Should be: `messages.notifications.comment_added.title` (with `messages.` prefix)

3. **Restart application** to reload translations

### Problem: Variables Not Interpolated

**Example**: Email shows `{username}` instead of actual username

**Solution**:
1. **Check interpolation data**:
```sql
SELECT interpolation_data
FROM notifications
WHERE id = 'notification-uuid';
```

2. **Verify variable names match**:
Translation: `"{username} commented on {propositionTitle}"`
Data: `{"username": "John", "propositionTitle": "My Proposal"}`

3. **Check template syntax**: Use `{{variableName}}` not `{variableName}`

### Problem: HTML Not Rendering

**Solution**:
1. **Check email client**: Some clients block HTML
2. **Verify text fallback**: Plain text version should always work
3. **Check template in database**:
```sql
SELECT html_contents FROM email_templates WHERE key = 'notification_single';
```

### Problem: Email Sent Multiple Times

**Solution**:
1. **Check sent flag**:
```sql
SELECT sent, sent_at
FROM pending_email_notifications
WHERE notification_id = 'notification-uuid';
```

2. **Don't run processor multiple times** for same scheduled time

3. **Check for duplicate records**:
```sql
SELECT user_id, notification_id, COUNT(*)
FROM pending_email_notifications
GROUP BY user_id, notification_id
HAVING COUNT(*) > 1;
```

---

## Testing Notification Preferences

### Per-Type Preferences

Users can disable email for specific notification types.

**Test**:
1. **Disable email for comment notifications**:
```sql
INSERT INTO notification_settings (user_id, notification_type, in_app_enabled, email_enabled, push_enabled)
VALUES ('user-uuid', 'comment_added', true, false, true);
```

2. **Trigger comment notification**

3. **Verify**: Should appear in-app but NOT in email queue:
```sql
SELECT * FROM pending_email_notifications
WHERE user_id = 'user-uuid'
  AND notification_id = (
    SELECT id FROM notifications
    WHERE type = 'comment_added'
    ORDER BY created_at DESC
    LIMIT 1
  );
```
Should return no rows.

---

## Production Setup

### Cron Job Configuration

Set up a cron job to process pending emails:

**Every 15 minutes** (recommended):
```cron
*/15 * * * * cd /path/to/back && node ace notification:send-emails
```

**Every hour** (for hourly batching):
```cron
0 * * * * cd /path/to/back && node ace notification:send-emails
```

**Daily at 9 AM** (for daily batching):
```cron
0 9 * * * cd /path/to/back && node ace notification:send-emails
```

### Monitoring

Monitor email delivery:

**Pending queue depth**:
```sql
SELECT COUNT(*) as pending_count
FROM pending_email_notifications
WHERE sent = false;
```

**Failed deliveries**:
```sql
SELECT COUNT(*) as failed_count
FROM user_notifications
WHERE email_sent = false
  AND email_error IS NOT NULL;
```

**Delivery rate**:
```sql
SELECT
  COUNT(CASE WHEN email_sent = true THEN 1 END) as sent,
  COUNT(CASE WHEN email_sent = false THEN 1 END) as pending,
  COUNT(*) as total
FROM user_notifications
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Cleanup Old Records

Run cleanup periodically:

```bash
cd back
node ace notification:cleanup
```

Or manually:
```sql
DELETE FROM pending_email_notifications
WHERE sent = true
  AND sent_at < NOW() - INTERVAL '30 days';
```

---

## Translation Keys Reference

### Current Structure (After Refactoring)

All notification translations now use the `notifications` (plural) section:

```json
{
  "notifications": {
    "status_transition": {
      "to_vote": {
        "title": "Proposal moved to vote",
        "message": "The proposal \"{propositionTitle}\" is now open for voting"
      }
    },
    "comment_added": {
      "title": "New comment",
      "message": "{username} commented on proposal \"{propositionTitle}\""
    },
    "mandate_assigned": {
      "title": "New mandate assigned",
      "message": "You have been assigned to the mandate for proposal \"{propositionTitle}\""
    }
  }
}
```

**Key Format**: `messages.notifications.{type}.{subtype}.{field}`

See [NOTIFICATION_SYSTEM.md](./NOTIFICATION_SYSTEM.md#translation-system) for complete translation reference.

---

## Email Template Variables

### Single Notification Template

Available variables:
- `{{organizationName}}`: From `APP_NAME` env var
- `{{baseUrl}}`: From `PUBLIC_APP_URI` env var
- `{{title}}`: Translated notification title
- `{{message}}`: Translated notification message
- `{{actionUrl}}`: Deep link URL (optional)

### Digest Template

Available variables:
- `{{organizationName}}`: Organization name
- `{{baseUrl}}`: Application base URL
- `{{count}}`: Number of notifications
- `{{#each notifications}}`: Loop over notifications
  - `{{this.title}}`: Notification title
  - `{{this.message}}`: Notification message
  - `{{this.actionUrl}}`: Action URL (optional)
  - `{{../baseUrl}}`: Parent scope base URL

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No email received | Email frequency set to batch | Check `users.email_frequency` |
| Translation keys shown | Missing i18n keys | Add keys to `messages.json` |
| Variables not replaced | Incorrect variable names | Match template with interpolation data |
| HTML broken | Invalid template HTML | Validate template in database |
| Duplicate emails | Multiple cron runs | Ensure cron runs once per interval |
| Brevo API error | Invalid API key or quota exceeded | Check Brevo dashboard |

---

## Related Documentation

- [NOTIFICATION_SYSTEM.md](./NOTIFICATION_SYSTEM.md) - Complete notification system documentation
- [sveltekit-translations.md](./sveltekit-translations.md) - Frontend i18n system

---

## File Reference

### Services
- `back/app/services/email_batch_service.ts` - Email batching and queuing
- `back/app/services/email_template_service.ts` - Template rendering with i18n
- `back/app/services/brevo_mail_service.ts` - Brevo API integration

### Models
- `back/app/models/pending_email_notification.ts` - Email queue
- `back/app/models/email_template.ts` - Email templates
- `back/app/models/notification.ts` - Notification data
- `back/app/models/user_notification.ts` - User-specific notification tracking

### Commands
- `back/commands/test_email_template.ts` - Test template rendering

### Seeders
- `back/database/seeders/email_template_seeder.ts` - Email template seeder

### Translation Files
- `back/resources/lang/en/messages.json` - English translations
- `back/resources/lang/fr/messages.json` - French translations

---

**Last Updated**: 2025-11-01
**Key Changes**: Updated to reflect refactored notification translation structure
