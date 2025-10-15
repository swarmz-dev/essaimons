<script lang="ts">
    import { notificationStore } from '$lib/stores/notificationStore.svelte';
    import { NotificationService } from '$lib/services/notificationService';
    import type { Notification } from '$lib/services/notificationService';
    import { formatDistanceToNow } from 'date-fns';
    import { fr, enUS } from 'date-fns/locale';
    import { getLocale } from '$lib/paraglide/runtime';
    import * as m from '$lib/paraglide/messages';
    import { Button } from '$lib/components/ui/button';
    import { Bell, ArrowLeft } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import Meta from '#components/Meta.svelte';

    const { data } = $props<{
        data: {
            notifications: Notification[];
            pagination: {
                page: number;
                limit: number;
                total: number;
            };
        };
    }>();

    const notificationService = new NotificationService();

    let notifications = $state<Notification[]>(data.notifications);
    let currentPage = $state(data.pagination.page);
    let isLoading = $state(false);

    const iconMap: Record<string, any> = {
        status_transition: Bell,
        mandate_assigned: Bell,
        mandate_revoked: Bell,
        deliverable_uploaded: Bell,
        deliverable_evaluated: Bell,
        comment_added: Bell,
        clarification_added: Bell,
        clarification_updated: Bell,
        clarification_deleted: Bell,
        exchange_scheduled: Bell,
    };

    function getRelativeTime(date: string): string {
        const locale = getLocale() === 'fr' ? fr : enUS;
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale });
    }

    function getTranslation(key: string): any {
        return (m as any)[key];
    }

    function getNotificationTitle(notification: Notification): string {
        const titleTranslation = getTranslation(notification.titleKey);
        return typeof titleTranslation === 'function' ? titleTranslation() : notification.titleKey;
    }

    function getNotificationMessage(notification: Notification): string {
        const messageTranslation = getTranslation(notification.messageKey);
        const template = typeof messageTranslation === 'function' ? messageTranslation(notification.data || {}) : notification.messageKey;

        if (typeof template === 'string') {
            return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
                return notification.data?.[key] || match;
            });
        }

        return String(template);
    }

    async function handleNotificationClick(notification: Notification) {
        if (!notification.isRead) {
            try {
                await notificationService.markAsRead(notification.id);
                notificationStore.markAsRead(notification.id);
                // Update local state
                notifications = notifications.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n));
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }

        if (notification.actionUrl) {
            await goto(notification.actionUrl);
        }
    }

    async function markAllAsRead() {
        try {
            await notificationService.markAllAsRead();
            notificationStore.markAllAsRead();
            notifications = notifications.map((n) => ({ ...n, isRead: true }));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }

    async function loadMore() {
        if (isLoading) return;

        isLoading = true;
        try {
            const nextPage = currentPage + 1;
            const response = await notificationService.getNotifications(nextPage, data.pagination.limit);
            notifications = [...notifications, ...response.notifications];
            currentPage = nextPage;
        } catch (error) {
            console.error('Failed to load more notifications:', error);
        } finally {
            isLoading = false;
        }
    }

    const hasMore = $derived(notifications.length < data.pagination.total);
    const unreadCount = $derived(notifications.filter((n) => !n.isRead).length);

    async function goBack() {
        await goto('/');
    }
</script>

<Meta title={(m as any)['notifications.title']?.()} description="Consultez toutes vos notifications" keywords={['notifications']} pathname="/notifications" />

<div class="container mx-auto max-w-4xl px-4 py-8">
    <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
            <Button variant="outline" size="sm" onclick={goBack}>
                <ArrowLeft class="size-4" />
            </Button>
            <h1 class="text-2xl font-bold text-foreground">{(m as any)['notifications.title']?.()}</h1>
        </div>
        {#if unreadCount > 0}
            <Button variant="outline" size="sm" onclick={markAllAsRead}>
                {(m as any)['notifications.mark_all_read']?.()}
            </Button>
        {/if}
    </div>

    {#if notifications.length === 0}
        <div class="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
            <Bell class="mb-4 size-16 text-muted-foreground" />
            <p class="text-lg text-muted-foreground">{(m as any)['notifications.empty']?.()}</p>
        </div>
    {:else}
        <div class="space-y-2 rounded-lg border border-border bg-card">
            {#each notifications as notification (notification.id)}
                {@const Icon = iconMap[notification.type] || Bell}
                <button
                    onclick={() => handleNotificationClick(notification)}
                    class="flex w-full items-start gap-4 border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-muted/50 {!notification.isRead ? 'bg-primary/5' : ''}"
                >
                    <div class="flex size-10 shrink-0 items-center justify-center rounded-full {!notification.isRead ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}">
                        <Icon class="size-5" />
                    </div>

                    <div class="flex-1 overflow-hidden">
                        <div class="flex items-start justify-between gap-2">
                            <p class="text-sm font-semibold text-foreground">
                                {getNotificationTitle(notification)}
                            </p>
                            {#if !notification.isRead}
                                <span class="size-2 shrink-0 rounded-full bg-primary"></span>
                            {/if}
                        </div>
                        <p class="mt-1 text-sm text-muted-foreground">
                            {getNotificationMessage(notification)}
                        </p>
                        <p class="mt-1 text-xs text-muted-foreground">
                            {getRelativeTime(notification.createdAt)}
                        </p>
                    </div>
                </button>
            {/each}
        </div>

        {#if hasMore}
            <div class="mt-6 text-center">
                <Button variant="outline" onclick={loadMore} disabled={isLoading}>
                    {isLoading ? (m as any)['common.actions.loading']?.() : 'Charger plus'}
                </Button>
            </div>
        {/if}
    {/if}
</div>
