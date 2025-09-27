<script lang="ts">
    import { FieldLabel } from '#lib/components/forms';
    import { Input } from '#lib/components/ui/input';
    import { MultiSelect, type MultiSelectOption } from '#lib/components/ui/multi-select';
    import { RichTextEditor } from '#lib/components/ui/rich-text';
    import { m } from '#lib/paraglide/messages';

    export let title: string;
    export let smartObjectives: string;
    export let detailedDescription: string;
    export let categoryIdsStrings: string[];
    export let categoryOptions: MultiSelectOption[] = [];
    export let visualFiles: FileList | undefined;
    export let attachmentFiles: FileList | undefined;
    export let attachmentsInputRef: HTMLInputElement | undefined;
    export let attachmentAccept: string;
    export let onAttachmentsChange: (event: Event) => void = () => {};
</script>

<div class="space-y-6">
    <div class="space-y-2">
        <Input name="title" id="title" label={m['proposition-create.fields.title.label']()} bind:value={title} placeholder={m['proposition-create.fields.title.placeholder']()} required max={150} />
        <p class="text-xs leading-snug text-muted-foreground">{m['proposition-create.fields.title.info']()}</p>
    </div>

    <FieldLabel forId="visual" label={m['proposition-create.fields.visual.label']()} info={m['proposition-create.fields.visual.info']()}>
        <Input type="file" name="visual" id="visual" accept="image/*" bind:files={visualFiles} />
        {#if visualFiles?.length}
            <p class="mt-2 text-sm text-muted-foreground">{visualFiles[0].name}</p>
        {/if}
    </FieldLabel>

    <FieldLabel forId="categories" label={m['proposition-create.fields.categories.label']()} required info={m['proposition-create.fields.categories.info']()}>
        <MultiSelect placeholder={m['proposition-create.fields.categories.placeholder']()} bind:selectedValues={categoryIdsStrings} options={categoryOptions} />
    </FieldLabel>

    <RichTextEditor
        name="smartObjectives"
        label={m['proposition-create.fields.smart-objectives.label']()}
        info={m['proposition-create.fields.smart-objectives.info']()}
        bind:value={smartObjectives}
        required
        max={1500}
    />

    <FieldLabel forId="attachments" label={m['proposition-create.fields.attachments.label']()} info={m['proposition-create.fields.attachments.info']()}>
        <Input type="file" name="attachments" id="attachments" multiple bind:files={attachmentFiles} bind:ref={attachmentsInputRef} accept={attachmentAccept} onchange={onAttachmentsChange} />
        {#if attachmentFiles?.length}
            <ul class="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {#each Array.from(attachmentFiles) as file (file.name)}
                    <li>{file.name}</li>
                {/each}
            </ul>
        {/if}
    </FieldLabel>
</div>

<div class="space-y-6">
    <RichTextEditor
        name="detailedDescription"
        label={m['proposition-create.fields.detailed-description.label']()}
        info={m['proposition-create.fields.detailed-description.info']()}
        bind:value={detailedDescription}
        required
        max={1500}
    />
</div>
