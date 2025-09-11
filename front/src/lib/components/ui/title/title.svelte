<script lang="ts" module>
    export type TitleProps = {
        title: string;
        hasBackground?: boolean;
    };
</script>

<script lang="ts">
    let { title, hasBackground = false }: TitleProps = $props();
</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>

<h1 class:dark:text-white={hasBackground} class="relative z-10 text-5xl font-bold mb-2">{title}</h1>
