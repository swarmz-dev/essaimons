import { HttpContext } from '@adonisjs/core/http';
import type User from '#models/user';
import NotificationSetting from '#models/notification_setting';
import { NotificationTypeEnum } from '#models/notification';
import vine from '@vinejs/vine';

const updateSettingsValidator = vine.compile(
    vine.object({
        inAppEnabled: vine.boolean().optional(),
        emailEnabled: vine.boolean().optional(),
        pushEnabled: vine.boolean().optional(),
    })
);

export default class NotificationSettingsController {
    /**
     * GET /notification-settings
     * Get all notification settings for the authenticated user
     */
    public async index({ response, auth }: HttpContext): Promise<void> {
        const user = auth.user as User;

        // Get all settings for the user
        const settings = await NotificationSetting.query().where('user_id', user.id);

        // Create a map of all notification types with default settings
        const allTypes = Object.values(NotificationTypeEnum);
        const settingsMap = new Map(settings.map((s) => [s.notificationType, s]));

        const result = allTypes.map((type) => {
            const setting = settingsMap.get(type);

            return {
                type,
                inAppEnabled: setting?.inAppEnabled ?? true,
                emailEnabled: setting?.emailEnabled ?? false,
                pushEnabled: setting?.pushEnabled ?? true,
            };
        });

        return response.ok({
            settings: result,
        });
    }

    /**
     * PUT /notification-settings/:type
     * Update notification settings for a specific type
     */
    public async update({ request, response, auth, i18n }: HttpContext): Promise<void> {
        const user = auth.user as User;
        const notificationType = request.param('type') as NotificationTypeEnum;

        // Validate notification type
        if (!Object.values(NotificationTypeEnum).includes(notificationType)) {
            return response.badRequest({
                error: i18n.t('messages.notification_settings.invalid_type'),
            });
        }

        try {
            const payload = await updateSettingsValidator.validate(request.all());

            // Find existing setting or create new one
            let setting = await NotificationSetting.query().where('user_id', user.id).where('notification_type', notificationType).first();

            if (!setting) {
                setting = await NotificationSetting.create({
                    userId: user.id,
                    notificationType,
                    inAppEnabled: payload.inAppEnabled ?? true,
                    emailEnabled: payload.emailEnabled ?? true,
                    pushEnabled: payload.pushEnabled ?? true,
                });
            } else {
                if (payload.inAppEnabled !== undefined) {
                    setting.inAppEnabled = payload.inAppEnabled;
                }
                if (payload.emailEnabled !== undefined) {
                    setting.emailEnabled = payload.emailEnabled;
                }
                if (payload.pushEnabled !== undefined) {
                    setting.pushEnabled = payload.pushEnabled;
                }
                await setting.save();
            }

            return response.ok({
                type: setting.notificationType,
                inAppEnabled: setting.inAppEnabled,
                emailEnabled: setting.emailEnabled,
                pushEnabled: setting.pushEnabled,
            });
        } catch (error) {
            if (error.messages) {
                return response.badRequest({
                    error: i18n.t('messages.validation.failed'),
                    details: error.messages,
                });
            }
            throw error;
        }
    }

    /**
     * PUT /notification-settings/bulk
     * Update multiple notification settings at once
     */
    public async bulkUpdate({ request, response, auth, i18n }: HttpContext): Promise<void> {
        const user = auth.user as User;
        const updates = request.input('settings', []);

        if (!Array.isArray(updates)) {
            return response.badRequest({
                error: i18n.t('messages.notification_settings.invalid_payload'),
            });
        }

        const results = [];

        for (const update of updates) {
            const { type, inAppEnabled, emailEnabled, pushEnabled } = update;

            // Validate notification type
            if (!Object.values(NotificationTypeEnum).includes(type)) {
                continue;
            }

            // Find existing setting or create new one
            let setting = await NotificationSetting.query().where('user_id', user.id).where('notification_type', type).first();

            if (!setting) {
                setting = await NotificationSetting.create({
                    userId: user.id,
                    notificationType: type,
                    inAppEnabled: inAppEnabled ?? true,
                    emailEnabled: emailEnabled ?? true,
                    pushEnabled: pushEnabled ?? true,
                });
            } else {
                if (inAppEnabled !== undefined) {
                    setting.inAppEnabled = inAppEnabled;
                }
                if (emailEnabled !== undefined) {
                    setting.emailEnabled = emailEnabled;
                }
                if (pushEnabled !== undefined) {
                    setting.pushEnabled = pushEnabled;
                }
                await setting.save();
            }

            results.push({
                type: setting.notificationType,
                inAppEnabled: setting.inAppEnabled,
                emailEnabled: setting.emailEnabled,
                pushEnabled: setting.pushEnabled,
            });
        }

        return response.ok({
            settings: results,
        });
    }
}
