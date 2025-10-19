<script lang="ts">
    import { onMount } from 'svelte';
    import { pushSubscriptionService, type PushDevice } from '$lib/services/pushSubscriptionService';
    import Trash2Icon from '@lucide/svelte/icons/trash-2';
    import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
    import MonitorIcon from '@lucide/svelte/icons/monitor';
    import TabletIcon from '@lucide/svelte/icons/tablet';
    import Loader2Icon from '@lucide/svelte/icons/loader-2';
    import * as m from '$lib/paraglide/messages';
    import { goto } from '$app/navigation';

    let subscriptions = $state<PushDevice[]>([]);
    let loading = $state(true);
    let deletingId = $state<string | null>(null);

    onMount(async () => {
        await loadSubscriptions();
    });

    async function loadSubscriptions() {
        loading = true;
        try {
            subscriptions = await pushSubscriptionService.getSubscriptions();
        } catch (error) {
            console.error('Failed to load subscriptions:', error);
        } finally {
            loading = false;
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(m['profile.devices.confirm_delete']())) {
            return;
        }

        deletingId = id;
        try {
            await pushSubscriptionService.deleteSubscription(id);
            subscriptions = subscriptions.filter((s) => s.id !== id);
        } catch (error) {
            console.error('Failed to delete subscription:', error);
            alert(m['common.error.default-message']());
        } finally {
            deletingId = null;
        }
    }

    function getDeviceIcon(userAgent: string) {
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return SmartphoneIcon;
        }
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return TabletIcon;
        }
        return MonitorIcon;
    }

    function getDeviceName(userAgent: string): string {
        const ua = userAgent.toLowerCase();

        // Mobile
        if (ua.includes('iphone')) return 'iPhone';
        if (ua.includes('ipad')) return 'iPad';
        if (ua.includes('android')) {
            if (ua.includes('mobile')) return 'Android Phone';
            return 'Android Tablet';
        }

        // Desktop browsers
        if (ua.includes('chrome')) return 'Chrome';
        if (ua.includes('firefox')) return 'Firefox';
        if (ua.includes('safari')) return 'Safari';
        if (ua.includes('edge')) return 'Edge';

        return 'Unknown Device';
    }

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleString();
    }
</script>

<div class="mx-auto max-w-4xl space-y-6">
    <!-- Header -->
    <div>
        <button onclick={() => goto('/profile')} class="mb-4 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">← Retour</button>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {m['profile.devices.title']()}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {m['profile.devices.description']()}
        </p>
    </div>

    <!-- Devices List -->
    <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {#if loading}
            <div class="flex items-center justify-center py-12">
                <Loader2Icon class="size-8 animate-spin text-gray-400" />
            </div>
        {:else if subscriptions.length === 0}
            <div class="py-12 text-center">
                <SmartphoneIcon class="mx-auto size-12 text-gray-400" />
                <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    {m['profile.devices.empty']()}
                </p>
            </div>
        {:else}
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
                {#each subscriptions as subscription (subscription.id)}
                    {@const DeviceIcon = getDeviceIcon(subscription.userAgent)}
                    <div class="flex items-center justify-between p-4">
                        <div class="flex items-center gap-4">
                            <div class="rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                                <DeviceIcon class="size-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <h3 class="font-medium text-gray-900 dark:text-white">
                                    {getDeviceName(subscription.userAgent)}
                                </h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    {m['profile.devices.last_used']()}: {formatDate(subscription.lastUsedAt)}
                                </p>
                                <p class="text-xs text-gray-400 dark:text-gray-500">
                                    {m['profile.devices.registered']()}: {formatDate(subscription.createdAt)}
                                </p>
                                {#if !subscription.active}
                                    <span class="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                        {m['profile.devices.inactive']()}
                                    </span>
                                {/if}
                            </div>
                        </div>
                        <button
                            onclick={() => handleDelete(subscription.id)}
                            disabled={deletingId === subscription.id}
                            class="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            title={m['profile.devices.remove']()}
                        >
                            {#if deletingId === subscription.id}
                                <Loader2Icon class="size-5 animate-spin" />
                            {:else}
                                <Trash2Icon class="size-5" />
                            {/if}
                        </button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Info Box -->
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <h3 class="font-medium text-blue-900 dark:text-blue-300">
            {m['profile.devices.info_title']()}
        </h3>
        <p class="mt-1 text-sm text-blue-700 dark:text-blue-400">
            {m['profile.devices.info_description']()}
        </p>
    </div>
</div>
