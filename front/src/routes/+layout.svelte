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

    // Get favicon URL from organization settings with cache busting
    const faviconUrl = $derived.by(() => {
        const favicon = page.data.organization?.favicon;
        if (!favicon?.id) {
            return '/icons/favicon.ico';
        }
        const timestamp = favicon.updatedAt ? new Date(favicon.updatedAt).getTime() : favicon.id;
        return `/assets/organization/logo/${favicon.id}?v=${timestamp}`;
    });

    // Get organization metadata from settings
    const orgMetaTitle = $derived.by(() => {
        const currentLang = page.data.language;
        const fallbackLang = page.data.organization?.fallbackLocale || 'fr';
        return page.data.organization?.name?.[currentLang] || page.data.organization?.name?.[fallbackLang] || m['home.meta.title']();
    });

    const orgMetaDescription = $derived.by(() => {
        const currentLang = page.data.language;
        const fallbackLang = page.data.organization?.fallbackLocale || 'fr';
        // Get plain text from HTML description
        const htmlDesc = page.data.organization?.description?.[currentLang] || page.data.organization?.description?.[fallbackLang] || '';
        if (!htmlDesc) return m['home.meta.description']();

        // Simple HTML tag removal for meta description
        const plainText = htmlDesc
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return plainText.substring(0, 160); // Limit to 160 chars for meta description
    });

    const orgKeywords = $derived.by(() => {
        const currentLang = page.data.language;
        const fallbackLang = page.data.organization?.fallbackLocale || 'fr';
        const keywords = page.data.organization?.keywords?.[currentLang] || page.data.organization?.keywords?.[fallbackLang];

        // If no keywords are set, return empty array
        if (!keywords || keywords.trim().length === 0) {
            return [];
        }

        // Split by comma and trim whitespace
        return keywords
            .split(',')
            .map((k: string) => k.trim())
            .filter((k: string) => k.length > 0);
    });

    const orgLogoUrl = $derived.by(() => {
        const logo = page.data.organization?.logo;
        if (!logo?.id) return undefined;
        return `${PUBLIC_API_REAL_URI}/api/static/organization/logo/${logo.id}`;
    });

    const flash = initFlash(currentPage);
    let notificationSSE: NotificationSSEService | null = null;

    onMount((): void => {
        const theme: string | null = localStorage.getItem('theme');
        document.documentElement.classList.toggle('dark', theme === 'dark');
        if (theme !== 'light' && theme !== 'dark') {
            localStorage.setItem('theme', 'light');
        }
    });

    // Update favicon dynamically when organization settings change
    $effect(() => {
        if (typeof document !== 'undefined') {
            const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (link) {
                link.href = faviconUrl;
            }
        }
    });

    onMount(() => {
        // Initialize Transmit once on mount
        if (typeof window !== 'undefined') {
            (async () => {
                const { Transmit } = await import('@adonisjs/transmit-client');
                const transmitInstance = new Transmit({ baseUrl: PUBLIC_API_REAL_URI });
                transmit.set(transmitInstance);
            })();
        }
    });

    onDestroy(() => {
        if (notificationSSE) {
            notificationSSE.disconnect();
            notificationSSE = null;
        }
    });

    // Handle flash messages
    $effect(() => {
        if ($flash) {
            showToast($flash.message, $flash.type);
        }
    });

    // Handle SSE connection based on profile and page
    $effect(() => {
        // Initialize notification SSE when user is logged in
        // But disable on admin pages to avoid connection limit issues
        const isAdminPage = page.url.pathname.startsWith('/admin');

        if ($profile && !notificationSSE && $transmit && !isAdminPage) {
            notificationSSE = new NotificationSSEService($transmit);
            notificationSSE.connect($profile.id);
        } else if ((!$profile || isAdminPage) && notificationSSE) {
            notificationSSE.disconnect();
            notificationSSE = null;
        }
    });
</script>

<svelte:head>
    <link rel="icon" type="image/png" href="/icons/favicon.ico" />
    <title>{orgMetaTitle}</title>
    <meta name="description" content={orgMetaDescription} />
</svelte:head>

<Meta title={orgMetaTitle} description={orgMetaDescription} keywords={orgKeywords} organizationLogoUrl={orgLogoUrl} organizationName={orgMetaTitle} />

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
