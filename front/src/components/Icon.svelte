<script lang="ts">
    import type { SvelteComponent } from 'svelte';
    import { toCamelCase } from '#lib/services/stringService';

    const iconNames = ['Discord', 'EnglishFlag', 'FrenchFlag', 'Github', 'Google', 'Spinner'] as const;

    type PascalCase = (typeof iconNames)[number];
    type CamelCase<S extends string> = S extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : S;

    type Props = {
        name: PascalCase | CamelCase<PascalCase>;
        size?: number;
    };

    let { name = $bindable(), size = 24 }: Props = $props();

    let currentName: string = '';

    let IconComponent: typeof SvelteComponent | undefined = $state();

    const setIcon = async (name: string): Promise<void> => {
        const camelCaseName = toCamelCase(name);
        const module = await import(`#icons/${camelCaseName}.svelte`);
        IconComponent = module.default;
    };

    $effect((): void => {
        if (name && name !== currentName) {
            currentName = name;
            (async () => {
                await setIcon(name);
            })();
        }
    });
</script>

{#if IconComponent}
    <IconComponent {size} class="transition-all duration-300" />
{/if}
