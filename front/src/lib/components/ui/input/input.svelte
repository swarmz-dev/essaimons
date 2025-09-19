<script lang="ts">
    import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
    import { cn, type WithElementRef } from '#lib/utils';
    import { Button } from '#lib/components/ui/button/index';
    import { Eye, EyeOff } from '@lucide/svelte';

    type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

    type Props = WithElementRef<
        Omit<HTMLInputAttributes, 'type'> & {
            type?: InputType | 'file';
            files?: FileList;
            label?: string;
            readonly?: boolean;
            max?: number;
        }
    >;

    let {
        ref = $bindable(),
        value = $bindable(),
        type = 'text',
        files = $bindable(),
        class: className,
        name,
        placeholder,
        required = false,
        onfocus,
        onblur,
        label,
        readonly = false,
        max,
        ...restProps
    }: Props = $props();

    let showPassword = $state(false);
    let isFocused = $state(false);

    const isPassword: boolean = $derived(type === 'password');
    const actualType: InputType = $derived(isPassword ? (showPassword ? 'text' : 'password') : type);

    const togglePasswordVisibility = () => {
        showPassword = !showPassword;
    };

    const handleFocus = (event: FocusEvent) => {
        isFocused = true;
        const inputEvent = event as FocusEvent & { currentTarget: EventTarget & HTMLInputElement };
        onfocus?.(inputEvent);
    };

    const handleBlur = (event: FocusEvent) => {
        isFocused = false;
        const inputEvent = event as FocusEvent & { currentTarget: EventTarget & HTMLInputElement };
        onblur?.(inputEvent);
    };

    $effect(() => {
        if (max && typeof value === 'string' && value.length > max) {
            value = value.slice(0, max);
        }
    });
</script>

<div class="relative w-full">
    {#if type === 'file'}
        <input
            bind:this={ref}
            type="file"
            data-slot="input"
            class={cn(
                'selection:bg-primary dark:bg-input/30 selection:text-primary-foreground border-input ring-offset-background placeholder:text-muted-foreground shadow-xs flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 pt-1.5 text-sm font-medium outline-none transition-[color,box-shadow]',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                'disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-not-allowed read-only:opacity-50',
                className
            )}
            {name}
            bind:files
            bind:value
            {readonly}
            {...restProps}
        />
    {:else}
        <label
            for={name}
            class={cn(
                'pointer-events-none absolute left-5 z-10 transform font-medium transition-all duration-300',
                isFocused || value ? 'top-0 -translate-y-full rounded-md bg-background px-1 text-xs text-primary dark:bg-slate-950' : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
            )}
        >
            {label}
            {#if required}
                <span class="text-red-600 font-medium">*</span>
            {/if}
        </label>
        <input
            bind:this={ref}
            type={actualType}
            data-slot="input"
            placeholder={isFocused ? placeholder : ''}
            onfocus={handleFocus}
            onblur={handleBlur}
            class={cn(
                'border border-white/50 bg-white/85 selection:bg-primary selection:text-primary-foreground shadow-md backdrop-blur-2xl flex h-12 w-full min-w-0 rounded-2xl px-5 text-base font-medium text-foreground outline-none transition-[background,box-shadow,border] duration-300 dark:border-slate-800/70 dark:bg-slate-900/70',
                'focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/40',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                'disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-not-allowed read-only:opacity-60',
                isPassword ? 'pr-12' : '',
                className
            )}
            {name}
            bind:value
            {readonly}
            {...restProps}
        />

        {#if isPassword}
            <Button type="button" onclick={togglePasswordVisibility} aria-label="Toggle password visibility" variant="ghost" size="icon" class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full">
                {#if showPassword}
                    <EyeOff class="size-6" />
                {:else}
                    <Eye class="size-6" />
                {/if}
            </Button>
        {/if}
    {/if}
</div>
