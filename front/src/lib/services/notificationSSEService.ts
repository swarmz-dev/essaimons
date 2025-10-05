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
            console.warn('Already subscribed to notifications');
            return;
        }

        const channelName = `user/${userId}/notifications`;
        console.log(`Subscribing to notification channel: ${channelName}`);

        this.subscription = this.transmit.subscription(channelName);

        this.subscription.onMessage((payload: any) => {
            console.log('Received notification via Transmit:', payload);

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
                const titleTranslation = m[notification.titleKey as keyof typeof m];
                const messageTranslation = m[notification.messageKey as keyof typeof m];

                toastStore.show({
                    type: 'notification',
                    title: typeof titleTranslation === 'function' ? titleTranslation() : notification.titleKey,
                    message: typeof messageTranslation === 'function' ? messageTranslation(notification.data) : notification.messageKey,
                    actionUrl: notification.actionUrl,
                    actionLabel: m.notifications_view(),
                    duration: 5000,
                });
            }
        });

        try {
            this.subscription.create();
            console.log('Subscribed to notifications successfully');
        } catch (error) {
            console.error('Failed to subscribe to notifications:', error);
        }
    }

    /**
     * Unsubscribe from notification channel
     */
    disconnect() {
        if (this.subscription) {
            console.log('Unsubscribing from notifications');
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
