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
    };
</script>

<script lang="ts">
    import { navigate } from '#lib/stores/locationStore';
    import { language } from '#lib/stores/languageStore';
    import { cn } from '#lib/utils';

    let { children, ref, onclick, onmouseover, onfocus, onblur, onmouseout, href, target = '', class: className = '', ariaLabel, size = 'default' }: LinkProps = $props();

    let isAbsolute: boolean = href.startsWith('http://') || href.startsWith('https://');

    const defaultClasses: string =
        "cursor-pointer focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 text-primary underline-offset-4 hover:underline hover:bg-transparent";

    const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (href) {
            onclick?.(event);
            if (isAbsolute) {
                window.open(href, target);
            } else {
                const cleanHref = href.startsWith(`/${$language}/`) ? href.substring(`/${$language}`.length) : href;
                navigate(cleanHref);
            }
        }
    };
</script>

<a
    bind:this={ref}
    class={cn(defaultClasses, sizes[size], className)}
    href={isAbsolute ? href : `/${$language}${href}`}
    aria-label={ariaLabel}
    {target}
    {onmouseover}
    {onfocus}
    {onblur}
    {onmouseout}
    onclick={handleClick}
>
    {@render children()}
</a>
