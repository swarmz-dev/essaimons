<script lang="ts">
    import AdminForm from '#lib/partials/admin/AdminForm.svelte';
    import type { SerializedLanguage } from 'backend/types';
    import { Input } from '#lib/components/ui/input';
    import { m } from '#lib/paraglide/messages';
    import FileUpload from '#components/FileUpload.svelte';
    import { onMount } from 'svelte';
    import * as zod from 'zod';

    const schema = zod.object({
        name: zod.string().min(3).max(50),
        code: zod.string().length(2).lowercase(),
        flag: zod.instanceof(File).refine((file) => ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(file.type), { message: 'Invalid file type' }),
    });

    type Props = {
        language?: SerializedLanguage;
    };

    let { language }: Props = $props();

    let formValues: { name: string; code: string } = $state({
        name: '',
        code: '',
    });
    let flag: File | undefined = $state();
    const canSubmit: boolean = $derived(schema.safeParse({ name: formValues.name, code: formValues.code, flag }).success);

    onMount(() => {
        setInitialValues();
    });

    const setInitialValues = (): void => {
        formValues.name = language?.name || '';
        formValues.code = language?.code || '';
    };

    const handleError = (): void => {
        setInitialValues();
    };
</script>

<AdminForm
    id={language?.code}
    {canSubmit}
    deleteTitle={m['admin.language.delete.title']({ languages: [language?.name] })}
    deleteText={m['admin.language.delete.text']({ languages: [language?.name], count: 1 })}
    onError={handleError}
>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-8">
            <Input name="name" label={m['admin.language.fields.name']()} bind:value={formValues.name} min={3} max={50} required />
            <Input name="code" label={m['admin.language.fields.code']()} bind:value={formValues.code} min={2} max={2} readonly={!!language} required />
        </div>
        <div>
            <FileUpload
                name="flag"
                accept="png jpg jpeg gif webp svg"
                fileName={language?.flag.name}
                title={m['admin.language.new.flag.title']()}
                description={m['admin.language.new.flag.description']()}
                pathPrefix="language-flag"
                id={formValues.code}
                bind:file={flag}
            />
        </div>
    </div>
</AdminForm>
