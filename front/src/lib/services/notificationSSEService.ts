import { notificationStore } from '$lib/stores/notificationStore.svelte';
import { toastStore } from '$lib/stores/toastStore.svelte';
import type { Notification } from '$lib/services/notificationService';
import type { Transmit, TransmitSubscription } from '@adonisjs/transmit-client';
import * as m from '$lib/paraglide/messages';

export class NotificationSSEService {
    private subscription: TransmitSubscription | null = null;

    constructor(private transmit: Transmit) {}

    /**
     * Subscribe to user notification channel
     */
    connect(userId: string) {
        if (this.subscription) {
            console.warn('[NotificationSSE] Already subscribed to notifications');
            return;
        }

        // Validate that userId is a UUID (not a numeric ID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            console.error(`[NotificationSSE] ERROR: User ID is not a UUID! Got: ${userId}`);
            console.error('[NotificationSSE] This means the user cookie is outdated. Please logout and login again.');
        }

        const channelName = `user/${userId}/notifications`;

        this.subscription = this.transmit.subscription(channelName);

        this.subscription.onMessage((payload: any) => {
            if (payload.type === 'notification' && payload.data) {
                const notification: Notification = {
                    id: payload.data.id,
                    notificationId: payload.data.notificationId,
                    type: payload.data.type,
                    titleKey: payload.data.titleKey,
                    messageKey: payload.data.messageKey,
                    data: payload.data.data,
                    actionUrl: payload.data.actionUrl,
                    isRead: payload.data.isRead,
                    createdAt: payload.data.createdAt,
                    readAt: null,
                };

                notificationStore.addNotification(notification);

                // Show toast notification
                // Convert dot notation to underscore notation for Paraglide
                const titleKey = notification.titleKey.replace(/\./g, '_');
                const messageKey = notification.messageKey.replace(/\./g, '_');

                const titleTranslation = m[titleKey as keyof typeof m];
                const messageTranslation = m[messageKey as keyof typeof m];

                toastStore.show({
                    type: 'notification',
                    title: typeof titleTranslation === 'function' ? titleTranslation() : notification.titleKey,
                    message: typeof messageTranslation === 'function' ? messageTranslation(notification.data) : notification.messageKey,
                    actionUrl: notification.actionUrl,
                    actionLabel: m.notifications_view ? m.notifications_view() : 'Voir',
                    duration: 5000,
                });
            }
        });

        try {
            this.subscription.create();
        } catch (error) {
            console.error('[NotificationSSE] Failed to subscribe to notifications:', error);
        }
    }

    /**
     * Unsubscribe from notification channel
     */
    disconnect() {
        if (this.subscription) {
            this.subscription.delete();
            this.subscription = null;
        }
    }

    /**
     * Check if currently subscribed
     */
    isConnected(): boolean {
        return this.subscription !== null;
    }
}
