<script lang="ts">
    import { onMount } from 'svelte';
    import { PushNotificationService } from '$lib/services/pushNotificationService';
    import { Button } from '$lib/components/ui/button';
    import { Bell, BellOff, X } from '@lucide/svelte';
    import { m } from '$lib/paraglide/messages';

    const pushService = new PushNotificationService();

    let isSupported = $state(false);
    let permission = $state<NotificationPermission>('default');
    let isSubscribed = $state(false);
    let showPrompt = $state(false);
    let loading = $state(false);

    onMount(async () => {
        isSupported = pushService.isSupported();

        if (!isSupported) {
            return;
        }

        permission = pushService.getPermission();

        // Check if already subscribed
        const subscription = await pushService.getSubscription();
        isSubscribed = !!subscription;

        // Show prompt if permission is default and not subscribed
        if (permission === 'default' && !isSubscribed) {
            // Show prompt after a short delay
            setTimeout(() => {
                showPrompt = true;
            }, 3000);
        }

        // Register service worker
        await pushService.registerServiceWorker();
    });

    async function enablePushNotifications() {
        loading = true;
        try {
            const subscription = await pushService.requestPermissionAndSubscribe();
            if (subscription) {
                isSubscribed = true;
                permission = 'granted';
                showPrompt = false;
            }
        } catch (error) {
            console.error('Failed to enable push notifications:', error);
        } finally {
            loading = false;
        }
    }

    async function disablePushNotifications() {
        loading = true;
        try {
            const success = await pushService.unsubscribe();
            if (success) {
                isSubscribed = false;
            }
        } catch (error) {
            console.error('Failed to disable push notifications:', error);
        } finally {
            loading = false;
        }
    }

    function dismissPrompt() {
        showPrompt = false;
        // Store dismissal in localStorage to not show again for a while
        localStorage.setItem('push-prompt-dismissed', Date.now().toString());
    }
</script>

<!-- Floating prompt -->
{#if isSupported && showPrompt && permission === 'default'}
    <div class="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
        <button onclick={dismissPrompt} class="absolute right-2 top-2 rounded-sm opacity-70 transition-opacity hover:opacity-100" aria-label="Close">
            <X class="size-4" />
        </button>

        <div class="flex items-start gap-3">
            <div class="rounded-full bg-primary/10 p-2">
                <Bell class="size-5 text-primary" />
            </div>
            <div class="flex-1">
                <h3 class="font-semibold text-sm text-foreground">
                    {m['notifications.push.prompt.title']?.() || 'Enable Push Notifications'}
                </h3>
                <p class="mt-1 text-sm text-muted-foreground">
                    {m['notifications.push.prompt.description']?.() || 'Stay updated with real-time notifications even when the app is closed.'}
                </p>
                <div class="mt-3 flex gap-2">
                    <Button size="sm" onclick={enablePushNotifications} disabled={loading}>
                        {loading ? m['common.actions.loading']?.() || 'Loading...' : m['notifications.push.enable']?.() || 'Enable'}
                    </Button>
                    <Button size="sm" variant="outline" onclick={dismissPrompt}>
                        {m['common.actions.later']?.() || 'Later'}
                    </Button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Status indicator (optional - can be placed in settings) -->
{#if isSupported}
    <div class="flex items-center gap-2">
        {#if isSubscribed}
            <button onclick={disablePushNotifications} disabled={loading} class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Bell class="size-4 text-green-600" />
                <span>{m['notifications.push.enabled']?.() || 'Push notifications enabled'}</span>
            </button>
        {:else if permission === 'denied'}
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <BellOff class="size-4 text-destructive" />
                <span>{m['notifications.push.blocked']?.() || 'Push notifications blocked'}</span>
            </div>
        {:else}
            <button onclick={enablePushNotifications} disabled={loading} class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <BellOff class="size-4" />
                <span>{m['notifications.push.disabled']?.() || 'Push notifications disabled'}</span>
            </button>
        {/if}
    </div>
{/if}
