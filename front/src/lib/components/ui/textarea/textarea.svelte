<script lang="ts">
    import type { HTMLTextareaAttributes } from 'svelte/elements';
    import { cn, type WithElementRef } from '#lib/utils';

    type Props = WithElementRef<
        Omit<HTMLTextareaAttributes, 'value'> & {
            value?: string;
            label?: string;
            required?: boolean;
            max?: number;
            counter?: boolean;
        }
    >;

    let {
        ref = $bindable<HTMLTextAreaElement | null>(null),
        value = $bindable(''),
        class: className,
        name,
        placeholder,
        required = false,
        label,
        rows = 6,
        max,
        counter = true,
        readonly = false,
        onfocus,
        onblur,
        ...restProps
    }: Props = $props();

    let isFocused = $state(false);

    const handleFocus = (event: FocusEvent) => {
        isFocused = true;
        const textareaEvent = event as FocusEvent & { currentTarget: EventTarget & HTMLTextAreaElement };
        onfocus?.(textareaEvent);
    };

    const handleBlur = (event: FocusEvent) => {
        isFocused = false;
        const textareaEvent = event as FocusEvent & { currentTarget: EventTarget & HTMLTextAreaElement };
        onblur?.(textareaEvent);
    };

    $effect(() => {
        if (max && typeof value === 'string' && value.length > max) {
            value = value.slice(0, max);
        }
    });

    const currentLength: number = $derived(typeof value === 'string' ? value.length : 0);
</script>

<div class={cn('flex flex-col gap-2', className)}>
    {#if label}
        <label for={name} class="text-sm font-semibold text-foreground/80">
            {label}
            {#if required}
                <span class="text-red-600 font-medium">*</span>
            {/if}
        </label>
    {/if}
    <textarea
        bind:this={ref}
        bind:value
        {name}
        {placeholder}
        {rows}
        onfocus={handleFocus}
        onblur={handleBlur}
        class={cn(
            'border border-white/50 bg-white/85 selection:bg-primary selection:text-primary-foreground shadow-md backdrop-blur-2xl w-full rounded-2xl px-5 py-3 text-base font-medium text-foreground outline-none transition-[background,box-shadow,border] duration-300 dark:border-slate-800/70 dark:bg-slate-900/70',
            'focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/40',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            'disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-not-allowed read-only:opacity-60'
        )}
        {required}
        {readonly}
        {...restProps}
    ></textarea>
    {#if counter && max}
        <div class="text-xs text-muted-foreground text-right">{currentLength} / {max}</div>
    {/if}
</div>
