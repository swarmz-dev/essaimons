import { BaseSeeder } from '@adonisjs/lucid/seeders';
import EmailTemplate from '#models/email_template';

export default class extends BaseSeeder {
    async run() {
        // First, delete existing templates to start fresh
        await EmailTemplate.query().delete();

        await EmailTemplate.createMany([
            {
                key: 'notification_single',
                name: 'Single Notification Email',
                description: 'Template for sending a single notification via email',
                subjects: {
                    en: 'New notification: {{title}}',
                    fr: 'Nouvelle notification : {{title}}',
                },
                htmlContents: {
                    en: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #4f46e5; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">{{organizationName}}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">{{title}}</h2>
                            <p style="margin: 0 0 20px 0; color: #4b5563; line-height: 1.6;">{{message}}</p>
                            {{#if actionUrl}}
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{baseUrl}}{{actionUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Details</a>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                You received this email because you have notifications enabled.<br>
                                <a href="{{baseUrl}}/profile/notifications" style="color: #4f46e5; text-decoration: none;">Manage your notification preferences</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                    fr: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #4f46e5; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">{{organizationName}}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">{{title}}</h2>
                            <p style="margin: 0 0 20px 0; color: #4b5563; line-height: 1.6;">{{message}}</p>
                            {{#if actionUrl}}
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{baseUrl}}{{actionUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Voir les détails</a>
                                    </td>
                                </tr>
                            </table>
                            {{/if}}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                Vous avez reçu cet email car vous avez activé les notifications.<br>
                                <a href="{{baseUrl}}/profile/notifications" style="color: #4f46e5; text-decoration: none;">Gérer vos préférences de notification</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                },
                textContents: {
                    en: `{{title}}

{{message}}

{{#if actionUrl}}
View details: {{baseUrl}}{{actionUrl}}
{{/if}}

---
You received this email because you have notifications enabled.
Manage your notification preferences: {{baseUrl}}/profile/notifications`,
                    fr: `{{title}}

{{message}}

{{#if actionUrl}}
Voir les détails : {{baseUrl}}{{actionUrl}}
{{/if}}

---
Vous avez reçu cet email car vous avez activé les notifications.
Gérer vos préférences de notification : {{baseUrl}}/profile/notifications`,
                },
                isActive: true,
            },
            {
                key: 'notification_digest',
                name: 'Notification Digest Email',
                description: 'Template for sending multiple notifications in a digest',
                subjects: {
                    en: 'You have {{count}} new notifications',
                    fr: 'Vous avez {{count}} nouvelles notifications',
                },
                htmlContents: {
                    en: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notification Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #4f46e5; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">{{organizationName}}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">Notification Digest</h2>
                            <p style="margin: 0 0 30px 0; color: #6b7280;">You have {{count}} new notifications:</p>
                            {{#each notifications}}
                            <div style="margin-bottom: 20px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #4f46e5; border-radius: 4px;">
                                <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">{{this.title}}</h3>
                                <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px;">{{this.message}}</p>
                                {{#if this.actionUrl}}
                                <a href="{{../baseUrl}}{{this.actionUrl}}" style="color: #4f46e5; text-decoration: none; font-size: 14px; font-weight: 600;">View Details →</a>
                                {{/if}}
                            </div>
                            {{/each}}
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{baseUrl}}/notifications" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View All Notifications</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                You received this email because you have notifications enabled.<br>
                                <a href="{{baseUrl}}/profile/notifications" style="color: #4f46e5; text-decoration: none;">Manage your notification preferences</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                    fr: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Résumé des notifications</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #4f46e5; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">{{organizationName}}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">Résumé des notifications</h2>
                            <p style="margin: 0 0 30px 0; color: #6b7280;">Vous avez {{count}} nouvelles notifications :</p>
                            {{#each notifications}}
                            <div style="margin-bottom: 20px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #4f46e5; border-radius: 4px;">
                                <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">{{this.title}}</h3>
                                <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px;">{{this.message}}</p>
                                {{#if this.actionUrl}}
                                <a href="{{../baseUrl}}{{this.actionUrl}}" style="color: #4f46e5; text-decoration: none; font-size: 14px; font-weight: 600;">Voir les détails →</a>
                                {{/if}}
                            </div>
                            {{/each}}
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{baseUrl}}/notifications" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Voir toutes les notifications</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                Vous avez reçu cet email car vous avez activé les notifications.<br>
                                <a href="{{baseUrl}}/profile/notifications" style="color: #4f46e5; text-decoration: none;">Gérer vos préférences de notification</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                },
                textContents: {
                    en: `NOTIFICATION DIGEST

You have {{count}} new notifications:

{{#each notifications}}
- {{this.title}}
  {{this.message}}
  {{#if this.actionUrl}}
  View: {{../baseUrl}}{{this.actionUrl}}
  {{/if}}

{{/each}}

View all notifications: {{baseUrl}}/notifications

---
You received this email because you have notifications enabled.
Manage your notification preferences: {{baseUrl}}/profile/notifications`,
                    fr: `RÉSUMÉ DES NOTIFICATIONS

Vous avez {{count}} nouvelles notifications :

{{#each notifications}}
- {{this.title}}
  {{this.message}}
  {{#if this.actionUrl}}
  Voir : {{../baseUrl}}{{this.actionUrl}}
  {{/if}}

{{/each}}

Voir toutes les notifications : {{baseUrl}}/notifications

---
Vous avez reçu cet email car vous avez activé les notifications.
Gérer vos préférences de notification : {{baseUrl}}/profile/notifications`,
                },
                isActive: true,
            },
        ]);
    }
}
