<script lang="ts" module>
    export type TitleProps = {
        title: string;
        hasBackground?: boolean;
    };
</script>

<script lang="ts">
    import { cn } from '#lib/utils';

    let { title, hasBackground = false }: TitleProps = $props();
</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>

<h1 class:dark:text-white={hasBackground} class="relative z-10 mb-4 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
    <span class="flex flex-wrap items-center gap-4">
        <span class={cn('leading-tight', hasBackground ? 'text-foreground' : 'bg-gradient-to-r from-primary via-primary/70 to-accent bg-clip-text text-transparent')}>
            {title}
        </span>
        <span aria-hidden="true" class="hidden h-1 w-16 rounded-full bg-gradient-to-r from-primary via-accent to-transparent md:block"></span>
    </span>
</h1>
