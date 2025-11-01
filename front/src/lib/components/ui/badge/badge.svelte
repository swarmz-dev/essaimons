<script lang="ts">
    import { cn } from '#lib/utils';
    import type { Snippet } from 'svelte';

    type BadgeVariant = 'default' | 'success' | 'destructive' | 'outline';

    interface Props {
        variant?: BadgeVariant;
        class?: string;
        children: Snippet;
    }

    let { variant = 'default', class: className, children }: Props = $props();

    const variantClasses: Record<BadgeVariant, string> = {
        default: 'bg-primary/10 text-primary hover:bg-primary/20',
        success: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400',
        destructive: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    };
</script>

<span
    class={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantClasses[variant],
        className
    )}
>
    {@render children()}
</span>
