<script lang="ts">
    import { onMount } from 'svelte';
    import { notificationStore } from '$lib/stores/notificationStore.svelte';
    import type { NotificationService } from '$lib/services/notificationService';
    import NotificationItem from './NotificationItem.svelte';
    import { Check, Loader2 } from '@lucide/svelte';
    import * as m from '$lib/paraglide/messages';

    interface Props {
        notificationService: NotificationService;
    }

    let { notificationService }: Props = $props();
    let loading = $state(false);
    let markingAllAsRead = $state(false);

    onMount(async () => {
        // Only load if we don't have notifications yet (avoid overwriting SSE notifications)
        if (notificationStore.notifications.length === 0) {
            loading = true;
            try {
                const data = await notificationService.getNotifications(1, 10);
                notificationStore.setNotifications(data.notifications);
            } catch (error) {
                console.error('Failed to load notifications:', error);
            } finally {
                loading = false;
            }
        }
    });

    async function handleMarkAllAsRead() {
        if (markingAllAsRead) return;

        markingAllAsRead = true;
        try {
            await notificationService.markAllAsRead();
            notificationStore.markAllAsRead();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            markingAllAsRead = false;
        }
    }
</script>

<div data-notification-dropdown class="absolute right-0 top-12 z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {m['notifications.title']()}
        </h3>
        {#if notificationStore.unreadCount > 0}
            <button onclick={handleMarkAllAsRead} disabled={markingAllAsRead} class="flex items-center gap-1 text-sm text-primary hover:text-primary-dark disabled:opacity-50">
                {#if markingAllAsRead}
                    <Loader2 class="size-4 animate-spin" />
                {:else}
                    <Check class="size-4" />
                {/if}
                {m['notifications.mark_all_read']()}
            </button>
        {/if}
    </div>

    <!-- Notification List -->
    <div class="max-h-96 overflow-y-auto">
        {#if loading}
            <div class="flex items-center justify-center py-8">
                <Loader2 class="size-8 animate-spin text-gray-400" />
            </div>
        {:else if notificationStore.notifications.length === 0}
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
                {m['notifications.empty']()}
            </div>
        {:else}
            {#each notificationStore.notifications as notification (notification.id)}
                <NotificationItem {notification} {notificationService} />
            {/each}
        {/if}
    </div>

    <!-- Footer -->
    <div class="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <a href="/notifications" class="block text-center text-sm font-medium text-primary hover:text-primary-dark">
            {m['notifications.view_all']()}
        </a>
    </div>
</div>
