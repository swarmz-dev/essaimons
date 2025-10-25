<script lang="ts">
    import '../app.css';
    import Menu from '#lib/partials/menu/Menu.svelte';
    import { onMount, onDestroy } from 'svelte';
    import Meta from '#components/Meta.svelte';
    import { m } from '#lib/paraglide/messages';
    import { initFlash } from 'sveltekit-flash-message/client';
    import { page } from '$app/state';
    import { readable } from 'svelte/store';
    import { showToast } from '#lib/services/toastService';
    import { Footer } from '#lib/components/ui/footer';
    import { transmit } from '#lib/stores/transmitStore';
    import { PUBLIC_API_REAL_URI } from '$env/static/public';
    import { NotificationSSEService } from '#lib/services/notificationSSEService';
    import { profile } from '#lib/stores/profileStore';
    import PushNotificationPrompt from '#lib/components/notifications/PushNotificationPrompt.svelte';
    import ToastContainer from '#lib/components/ToastContainer.svelte';
    import type { Snippet } from 'svelte';

    const currentPage = readable(page);

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();

    const flash = initFlash(currentPage);
    let notificationSSE: NotificationSSEService | null = null;

    onMount((): void => {
        const theme: string | null = localStorage.getItem('theme');
        document.documentElement.classList.toggle('dark', theme === 'dark');
        if (theme !== 'light' && theme !== 'dark') {
            localStorage.setItem('theme', 'light');
        }
    });

    onDestroy(() => {
        if (notificationSSE) {
            notificationSSE.disconnect();
        }
    });

    $effect((): void => {
        if (typeof window !== 'undefined') {
            (async () => {
                const { Transmit } = await import('@adonisjs/transmit-client');
                const transmitInstance = new Transmit({ baseUrl: PUBLIC_API_REAL_URI });
                transmit.set(transmitInstance);
            })();
        }

        if ($flash) {
            showToast($flash.message, $flash.type);
        }

        // Initialize notification SSE when user is logged in
        if ($profile && !notificationSSE && $transmit) {
            notificationSSE = new NotificationSSEService($transmit);
            notificationSSE.connect($profile.id);
        } else if (!$profile && notificationSSE) {
            notificationSSE.disconnect();
            notificationSSE = null;
        }
    });
</script>

<Meta title={m['home.meta.title']()} description={m['home.meta.description']()} keywords={m['home.meta.keywords']().split(', ')} />

<div class="app">
    <main class="flex min-h-screen flex-col">
        <Menu>
            <div class:min-h-screen={!page.data.isAdmin} class="px-4 pb-16 pt-12 md:px-8 lg:px-12">
                <div class="mx-auto w-full space-y-12">
                    {@render children()}
                    {#if !page.data.isAdmin}
                        <Footer />
                    {/if}
                </div>
            </div>
        </Menu>
    </main>

    <!-- Push Notification Prompt (only show when logged in) -->
    {#if $profile}
        <PushNotificationPrompt />
    {/if}

    <!-- Toast Notifications -->
    <ToastContainer />
</div>
