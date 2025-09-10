<script lang="ts">
    import { m } from '#lib/paraglide/messages';
    import { Input } from '#lib/components/ui/input';

    type Props = {
        onSearch: () => void;
        search: string;
        placeholder?: string;
        debounce?: number;
        minChars?: number;
        name?: string;
        disabled?: boolean;
        label?: string;
        selected?: boolean;
        resultsArray?: any[];
        selectedObserver?: boolean;
        class?: string;
    };

    let {
        onSearch,
        search = $bindable(''),
        label = m['common.search.label'](),
        placeholder = m['common.search.placeholder'](),
        debounce = 300,
        minChars,
        name = '',
        disabled = false,
        selected = false,
        resultsArray = $bindable([]),
        selectedObserver = false,
        class: className = '',
    }: Props = $props();

    let searchTimeout: NodeJS.Timeout | undefined;
    let inputElement: HTMLInputElement | undefined = $state();
    let focused: boolean = $state(false);

    const searchFunction = async (): Promise<void> => {
        if (minChars && search.length < minChars) {
            resultsArray = [];
            return;
        }
        await onSearch();
    };

    const searchDebounced = (event: KeyboardEvent): void => {
        clearTimeout(searchTimeout);

        if (event.key === 'Enter') {
            event.preventDefault();
        } else {
            searchTimeout = setTimeout(searchFunction, debounce);
        }
    };

    const handleFocus = (): void => {
        focused = true;
    };

    const handleBlur = (): void => {
        focused = false;
    };

    $effect((): void => {
        if (selectedObserver && selected) {
            inputElement!.focus();
        }
    });
</script>

<Input
    bind:ref={inputElement}
    onfocus={handleFocus}
    onblur={handleBlur}
    onkeydown={searchDebounced}
    type="search"
    bind:value={search}
    placeholder={focused || search.length ? placeholder : ''}
    {name}
    {disabled}
    {label}
    class={className}
/>
