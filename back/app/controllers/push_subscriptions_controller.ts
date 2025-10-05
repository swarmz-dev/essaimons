import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import WebPushService from '#services/web_push_service';
import type User from '#models/user';
import { subscribeValidator } from '#validators/push_subscriptions';

@inject()
export default class PushSubscriptionsController {
    constructor(private readonly webPushService: WebPushService) {}

    /**
     * GET /push-subscriptions/vapid-public-key
     * Get the VAPID public key for client subscription
     */
    public async getVapidPublicKey({ response }: HttpContext): Promise<void> {
        const publicKey = this.webPushService.getVapidPublicKey();

        if (!publicKey) {
            return response.serviceUnavailable({
                error: 'Web push notifications are not configured',
            });
        }

        return response.ok({
            publicKey,
        });
    }

    /**
     * POST /push-subscriptions
     * Subscribe to push notifications
     */
    public async subscribe({ request, response, auth, i18n }: HttpContext): Promise<void> {
        const user = auth.user as User;

        try {
            const payload = await subscribeValidator.validate(request.all());
            const userAgent = request.header('user-agent');

            const subscription = await this.webPushService.subscribe(user.id, payload, userAgent);

            return response.created({
                id: subscription.id,
                endpoint: subscription.endpoint,
                createdAt: subscription.createdAt.toISO(),
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
     * GET /push-subscriptions
     * Get all active push subscriptions for the authenticated user
     */
    public async index({ response, auth }: HttpContext): Promise<void> {
        const user = auth.user as User;
        const subscriptions = await this.webPushService.getUserSubscriptions(user.id);

        return response.ok({
            subscriptions: subscriptions.map((sub) => ({
                id: sub.id,
                endpoint: sub.endpoint,
                userAgent: sub.userAgent,
                lastUsedAt: sub.lastUsedAt?.toISO() || null,
                createdAt: sub.createdAt.toISO(),
            })),
        });
    }

    /**
     * DELETE /push-subscriptions/:id
     * Unsubscribe from push notifications
     */
    public async destroy({ request, response, auth, i18n }: HttpContext): Promise<void> {
        const user = auth.user as User;
        const subscriptionId = request.param('id');

        if (!subscriptionId || typeof subscriptionId !== 'string') {
            return response.badRequest({
                error: i18n.t('messages.push_subscriptions.invalid_id'),
            });
        }

        const success = await this.webPushService.unsubscribe(subscriptionId, user.id);

        if (!success) {
            return response.notFound({
                error: i18n.t('messages.push_subscriptions.not_found'),
            });
        }

        return response.noContent();
    }
}
