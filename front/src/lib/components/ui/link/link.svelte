<script lang="ts" module>
    import type { Snippet } from 'svelte';

    const sizes = {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-10',
    };

    type SizeKeys = keyof typeof sizes;

    export type LinkProps = {
        children: Snippet;
        ref?: HTMLAnchorElement;
        onclick?: (event: MouseEvent) => void;
        onmouseover?: (event: MouseEvent) => void;
        onfocus?: (event: FocusEvent) => void;
        onblur?: (event: FocusEvent) => void;
        onmouseout?: (event: MouseEvent) => void;
        href: string;
        class?: string;
        target?: '_blank' | '_self';
        ariaLabel?: string;
        size?: SizeKeys;
        loading?: boolean;
        loadingLabel?: string;
        autoLoading?: boolean;
    };
</script>

<script lang="ts">
    import { navigate } from '#lib/stores/locationStore';
    import { language } from '#lib/stores/languageStore';
    import { cn } from '#lib/utils';
    import Icon from '#components/Icon.svelte';

    let {
        children,
        ref,
        onclick,
        onmouseover,
        onfocus,
        onblur,
        onmouseout,
        href,
        target = '_self',
        class: className = '',
        ariaLabel,
        size = 'default',
        loading = false,
        loadingLabel,
        autoLoading = true,
    }: LinkProps = $props();

    let isAbsolute: boolean = href.startsWith('http://') || href.startsWith('https://');

    const defaultClasses: string =
        "cursor-pointer focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 text-primary underline-offset-4 hover:underline hover:bg-transparent";
    let internalLoading: boolean = $state(false);

    const isLoading: boolean = $derived(Boolean(loading || internalLoading));
    const spinnerSize: number = $derived(size === 'lg' ? 32 : size === 'sm' ? 18 : size === 'icon' ? 24 : 24);

    const handleClick = async (event: MouseEvent): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();

        if (!href || isLoading) {
            return;
        }

        const shouldTrackLoading: boolean = autoLoading && !isAbsolute;

        if (shouldTrackLoading) {
            internalLoading = true;
        }

        try {
            const handler = onclick as ((event: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement }) => any) | undefined;
            const result = handler?.(event as MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement });
            if (autoLoading && result && typeof (result as Promise<unknown>).then === 'function') {
                await result;
            }

            if (isAbsolute) {
                window.open(href, target);
                return;
            }

            const cleanHref = href.startsWith(`/${$language}/`) ? href.substring(`/${$language}`.length) : href;
            await navigate(cleanHref);
        } finally {
            if (shouldTrackLoading) {
                internalLoading = false;
            }
        }
    };
</script>

<a
    bind:this={ref}
    class={cn(defaultClasses, sizes[size], className, isLoading ? 'pointer-events-none opacity-80' : '')}
    href={isAbsolute ? href : `/${$language}${href}`}
    aria-label={ariaLabel}
    aria-disabled={isLoading}
    data-loading={isLoading ? 'true' : undefined}
    tabindex={isLoading ? -1 : undefined}
    {target}
    {onmouseover}
    {onfocus}
    {onblur}
    {onmouseout}
    onclick={handleClick}
>
    {#if isLoading}
        <span class="flex items-center gap-2">
            <Icon name="spinner" size={spinnerSize} />
            {#if loadingLabel}
                <span class="font-medium">{loadingLabel}</span>
            {/if}
        </span>
    {:else}
        {@render children()}
    {/if}
</a>
