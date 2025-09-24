<script lang="ts" module>
    import { cn, type WithElementRef } from '#lib/utils';
    import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
    import { type VariantProps, tv } from 'tailwind-variants';

    export const buttonVariants = tv({
        base: "cursor-pointer focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
                destructive: 'bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white',
                outline: 'bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border',
                secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
                ghost: 'hover:text-accent-foreground hover:bg-transparent',
            },
            size: {
                default: 'h-9 px-4 py-2 has-[>svg]:px-3',
                sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
                lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
                icon: 'size-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    });

    export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
    export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

    export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
        WithElementRef<HTMLAnchorAttributes> & {
            variant?: ButtonVariant;
            size?: ButtonSize;
            loading?: boolean;
            loadingLabel?: string;
            autoLoading?: boolean;
        };
</script>

<script lang="ts">
    import Icon from '#components/Icon.svelte';

    let {
        class: className,
        variant = 'default',
        size = 'default',
        ref = $bindable(),
        type = 'button',
        disabled,
        loading = false,
        loadingLabel,
        autoLoading = true,
        children,
        onclick,
        target,
        ...restProps
    }: ButtonProps = $props();

    let asyncLoading: boolean = $state(false);

    const isLoading: boolean = $derived(Boolean(loading || asyncLoading));
    const isDisabled: boolean = $derived(Boolean(disabled || isLoading));
    const spinnerSize: number = $derived(size === 'lg' ? 32 : size === 'sm' ? 18 : size === 'icon' ? 24 : 24);

    const handleClick = async (event: MouseEvent): Promise<void> => {
        if (isDisabled) {
            event.preventDefault();
            return;
        }

        const handler = onclick as ((event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) => any) | undefined;
        const result = handler?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });

        if (!autoLoading || !result || typeof (result as Promise<unknown>).then !== 'function') {
            return;
        }

        asyncLoading = true;
        try {
            await result;
        } finally {
            asyncLoading = false;
        }
    };
</script>

<button
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    disabled={isDisabled}
    aria-busy={isLoading}
    data-loading={isLoading ? 'true' : undefined}
    onclick={handleClick}
    {...restProps}
>
    {#if isLoading}
        <span class="flex items-center gap-2">
            <Icon name="spinner" size={spinnerSize} />
            {#if loadingLabel}
                <span class="font-medium">{loadingLabel}</span>
            {/if}
        </span>
    {:else}
        {@render children?.()}
    {/if}
</button>
