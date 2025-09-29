<script lang="ts">
    import '../app.css';
    import Menu from '#lib/partials/menu/Menu.svelte';
    import { onMount } from 'svelte';
    import Meta from '#components/Meta.svelte';
    import { m } from '#lib/paraglide/messages';
    import { initFlash } from 'sveltekit-flash-message/client';
    import { page } from '$app/state';
    import { readable } from 'svelte/store';
    import { showToast } from '#lib/services/toastService';
    import { Footer } from '#lib/components/ui/footer';
    import { transmit } from '#lib/stores/transmitStore';
    import { PUBLIC_API_REAL_URI } from '$env/static/public';
    import type { Snippet } from 'svelte';

    const currentPage = readable(page);

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();

    const flash = initFlash(currentPage);

    onMount((): void => {
        const theme: string | null = localStorage.getItem('theme');
        document.documentElement.classList.toggle('dark', theme === 'dark');
        if (theme !== 'light' && theme !== 'dark') {
            localStorage.setItem('theme', 'light');
        }
    });

    $effect((): void => {
        if (typeof window !== 'undefined') {
            (async () => {
                const { Transmit } = await import('@adonisjs/transmit-client');
                transmit.set(new Transmit({ baseUrl: PUBLIC_API_REAL_URI }));
            })();
        }

        if ($flash) {
            showToast($flash.message, $flash.type);
        }
    });
</script>

<Meta title={m['home.meta.title']()} description={m['home.meta.description']()} keywords={m['home.meta.keywords']().split(', ')} />

<div class="app">
    <main class="flex min-h-screen flex-col">
        <Menu>
            <div class:min-h-screen={!page.data.isAdmin} class="px-4 pb-16 pt-12 md:px-8 lg:px-12">
                <div class="mx-auto w-full max-w-6xl space-y-12">
                    {@render children()}
                    {#if !page.data.isAdmin}
                        <Footer />
                    {/if}
                </div>
            </div>
        </Menu>
    </main>
</div>
