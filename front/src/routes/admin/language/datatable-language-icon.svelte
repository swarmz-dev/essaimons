<script lang="ts">
    import type { SerializedLanguage } from 'backend/types';

    type Props = {
        language: SerializedLanguage;
    };

    let { language }: Props = $props();
</script>

<img src={`/assets/language-flag/${language.code}`} alt={language.name} class="max-h-10" />
