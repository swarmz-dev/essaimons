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
    import { Transmit } from '@adonisjs/transmit-client';
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
        transmit.set(new Transmit({ baseUrl: PUBLIC_API_REAL_URI }));
        if ($flash) {
            showToast($flash.message, $flash.type);
        }
    });
</script>

<Meta title={m['home.meta.title']()} description={m['home.meta.description']()} keywords={m['home.meta.keywords']().split(', ')} />

<div class="app">
    <main class="flex flex-col w-screen">
        <Menu>
            <div class:min-h-screen={!page.data.isAdmin} class="px-3.5">
                {@render children()}
            </div>

            {#if !page.data.isAdmin}
                <Footer />
            {/if}
        </Menu>
    </main>
</div>
