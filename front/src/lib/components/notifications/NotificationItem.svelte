<script lang="ts">
    import { notificationStore } from '$lib/stores/notificationStore.svelte';
    import type { Notification, NotificationService } from '$lib/services/notificationService';
    import { formatDistanceToNow } from 'date-fns';
    import { fr, enUS } from 'date-fns/locale';
    import { getLocale } from '$lib/paraglide/runtime';
    import * as m from '$lib/paraglide/messages';
    import { Bell, FileText, UserCheck, Upload, CheckCircle, MessageCircle, Calendar } from '@lucide/svelte';

    interface Props {
        notification: Notification;
        notificationService: NotificationService;
    }

    let { notification, notificationService }: Props = $props();

    const iconMap: Record<string, any> = {
        status_transition: Bell,
        mandate_assigned: UserCheck,
        mandate_revoked: UserCheck,
        deliverable_uploaded: Upload,
        deliverable_evaluated: CheckCircle,
        comment_added: MessageCircle,
        clarification_added: MessageCircle,
        clarification_updated: MessageCircle,
        clarification_deleted: MessageCircle,
        exchange_scheduled: Calendar,
    };

    const Icon = iconMap[notification.type] || Bell;

    async function handleClick() {
        if (!notification.isRead) {
            try {
                await notificationService.markAsRead(notification.id);
                notificationStore.markAsRead(notification.id);
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }

        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
        }
    }

    function getRelativeTime(date: string): string {
        const locale = getLocale() === 'fr' ? fr : enUS;
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale });
    }

    function getTranslation(key: string): any {
        const parts = key.split('.');
        let value: any = m;
        for (const part of parts) {
            value = value?.[part];
            if (!value) break;
        }
        return value;
    }

    function getNotificationTitle(): string {
        const titleTranslation = getTranslation(notification.titleKey);
        return typeof titleTranslation === 'function' ? titleTranslation() : notification.titleKey;
    }

    function getNotificationMessage(): string {
        const messageTranslation = getTranslation(notification.messageKey);
        const template = typeof messageTranslation === 'function' ? messageTranslation(notification.data || {}) : notification.messageKey;

        // Simple template replacement for any remaining placeholders
        if (typeof template === 'string') {
            return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
                return notification.data?.[key] || match;
            });
        }

        return String(template);
    }
</script>

<button
    onclick={handleClick}
    class="flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 {!notification.isRead
        ? 'bg-blue-50 dark:bg-blue-900/10'
        : ''}"
>
    <div class="flex size-10 shrink-0 items-center justify-center rounded-full {!notification.isRead ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}">
        <Icon class="size-5" />
    </div>

    <div class="flex-1 overflow-hidden">
        <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
                {getNotificationTitle()}
            </p>
            {#if !notification.isRead}
                <span class="size-2 shrink-0 rounded-full bg-primary"></span>
            {/if}
        </div>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {getNotificationMessage()}
        </p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {getRelativeTime(notification.createdAt)}
        </p>
    </div>
</button>
