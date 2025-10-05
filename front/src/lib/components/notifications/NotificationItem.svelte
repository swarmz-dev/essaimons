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

    function getNotificationTitle(): string {
        // Map title keys to i18n functions
        const titleMap: Record<string, () => string> = {
            'notifications.status_transition_to_clarify_title': m.notifications_status_transition_to_clarify_title,
            'notifications.status_transition_to_amend_title': m.notifications_status_transition_to_amend_title,
            'notifications.status_transition_to_vote_title': m.notifications_status_transition_to_vote_title,
            'notifications.status_transition_to_mandate_title': m.notifications_status_transition_to_mandate_title,
            'notifications.status_transition_to_evaluate_title': m.notifications_status_transition_to_evaluate_title,
            'notifications.status_transition_to_archived_title': m.notifications_status_transition_to_archived_title,
            'notifications.mandate_assigned_title': m.notifications_mandate_assigned_title,
            'notifications.mandate_revoked_title': m.notifications_mandate_revoked_title,
            'notifications.deliverable_uploaded_title': m.notifications_deliverable_uploaded_title,
            'notifications.deliverable_evaluated_title': m.notifications_deliverable_evaluated_title,
            'notifications.comment_added_title': m.notifications_comment_added_title,
            'notifications.clarification_added_title': m.notifications_clarification_added_title,
            'notifications.clarification_updated_title': m.notifications_clarification_updated_title,
            'notifications.clarification_deleted_title': m.notifications_clarification_deleted_title,
            'notifications.exchange_scheduled_title': m.notifications_exchange_scheduled_title,
        };

        return titleMap[notification.titleKey]?.() || notification.titleKey;
    }

    function getNotificationMessage(): string {
        // Map message keys to i18n functions
        const messageMap: Record<string, () => string> = {
            'notifications.status_transition_to_clarify_message': m.notifications_status_transition_to_clarify_message,
            'notifications.status_transition_to_amend_message': m.notifications_status_transition_to_amend_message,
            'notifications.status_transition_to_vote_message': m.notifications_status_transition_to_vote_message,
            'notifications.status_transition_to_mandate_message': m.notifications_status_transition_to_mandate_message,
            'notifications.status_transition_to_evaluate_message': m.notifications_status_transition_to_evaluate_message,
            'notifications.status_transition_to_archived_message': m.notifications_status_transition_to_archived_message,
            'notifications.mandate_assigned_message': m.notifications_mandate_assigned_message,
            'notifications.mandate_revoked_message': m.notifications_mandate_revoked_message,
            'notifications.deliverable_uploaded_message': m.notifications_deliverable_uploaded_message,
            'notifications.deliverable_evaluated_message': m.notifications_deliverable_evaluated_message,
            'notifications.comment_added_message': m.notifications_comment_added_message,
            'notifications.clarification_added_message': m.notifications_clarification_added_message,
            'notifications.clarification_updated_message': m.notifications_clarification_updated_message,
            'notifications.clarification_deleted_message': m.notifications_clarification_deleted_message,
            'notifications.exchange_scheduled_message': m.notifications_exchange_scheduled_message,
        };

        const template = messageMap[notification.messageKey]?.() || notification.messageKey;

        // Simple template replacement
        return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
            return notification.data[key] || match;
        });
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
