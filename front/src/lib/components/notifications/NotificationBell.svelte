<script lang="ts">
    import { onMount } from 'svelte';
    import { Bell } from '@lucide/svelte';
    import { notificationStore } from '$lib/stores/notificationStore.svelte';
    import { NotificationService } from '$lib/services/notificationService';
    import NotificationDropdown from './NotificationDropdown.svelte';

    const notificationService = new NotificationService();
    let bellButton: HTMLButtonElement;

    onMount(async () => {
        // Load initial unread count
        try {
            const count = await notificationService.getUnreadCount();
            notificationStore.setUnreadCount(count);
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }

        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (notificationStore.isOpen && !bellButton.contains(event.target as Node)) {
                const dropdown = document.querySelector('[data-notification-dropdown]');
                if (dropdown && !dropdown.contains(event.target as Node)) {
                    notificationStore.closeDropdown();
                }
            }
        }

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });

    function toggleDropdown() {
        notificationStore.toggleDropdown();
    }
</script>

<div class="relative">
    <button
        bind:this={bellButton}
        onclick={toggleDropdown}
        class="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="Notifications"
        aria-expanded={notificationStore.isOpen}
    >
        <Bell class="size-6" />
        {#if notificationStore.unreadCount > 0}
            <span class="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount}
            </span>
        {/if}
    </button>

    {#if notificationStore.isOpen}
        <NotificationDropdown {notificationService} />
    {/if}
</div>
