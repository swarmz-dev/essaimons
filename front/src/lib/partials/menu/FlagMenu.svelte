<script lang="ts">
    import { onMount } from 'svelte';
    import { type LanguageCode, language } from '#lib/stores/languageStore';
    import { location } from '#lib/stores/locationStore';
    import { setLocale } from '#lib/paraglide/runtime';
    import { goto } from '$app/navigation';
    import { Select, type SelectItem } from '#lib/components/ui/select';
    import EnglishFlag from '#icons/EnglishFlag.svelte';
    import FrenchFlag from '#icons/FrenchFlag.svelte';

    let flags: SelectItem[] = [
        { icon: EnglishFlag, label: 'English', value: 'en', disabled: $language === 'en' },
        { icon: FrenchFlag, label: 'Français', value: 'fr', disabled: $language === 'fr' },
    ];
    let selectedFlag: SelectItem = $state(flags[0]);

    onMount(() => {
        const match: SelectItem | undefined = flags.find((flag) => flag.value === $language);
        selectedFlag = match || flags[0];
    });

    const selectFlag = async (flag: SelectItem): Promise<void> => {
        if ($language === flag.value) {
            return;
        }

        await goto(`/${flag.value}${$location}`);
        setLocale(<LanguageCode>flag.value);
        window.location.reload();
    };
</script>

<Select items={flags} bind:selectedItem={selectedFlag} isTitleImageOnly={true} onValueChange={selectFlag} />
