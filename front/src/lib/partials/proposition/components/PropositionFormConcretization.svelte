<script lang="ts">
    import { FieldLabel } from '#lib/components/forms';
    import { Button } from '#lib/components/ui/button';
    import { Input } from '#lib/components/ui/input';
    import { MultiSelect, type MultiSelectOption } from '#lib/components/ui/multi-select';
    import { RichTextEditor } from '#lib/components/ui/rich-text';
    import { m } from '#lib/paraglide/messages';
    import type { SerializedFile } from 'backend/types';
    import { Download, X } from '@lucide/svelte';

    type Props = {
        title: string;
        smartObjectives: string;
        detailedDescription: string;
        categoryIdsStrings: string[];
        categoryOptions?: MultiSelectOption[];
        visualInputRef?: HTMLInputElement | undefined;
        visualFileName?: string | null;
        visualPreviewUrl?: string | null;
        onVisualChange?: (event: Event) => void;
        onVisualRemove?: () => void;
        showVisualRemove?: boolean;
        attachmentFiles?: FileList | undefined;
        attachmentsInputRef?: HTMLInputElement | undefined;
        attachmentAccept: string;
        onAttachmentsChange?: (event: Event) => void;
        existingAttachments?: SerializedFile[];
        propositionId?: string | null;
        deletedAttachmentIds?: string[];
        onDeleteAttachment?: (attachmentId: string) => void;
    };

    let {
        title = $bindable(),
        smartObjectives = $bindable(),
        detailedDescription = $bindable(),
        categoryIdsStrings = $bindable(),
        categoryOptions = [],
        visualInputRef = $bindable(),
        visualFileName = null,
        visualPreviewUrl = null,
        onVisualChange = () => {},
        onVisualRemove = () => {},
        showVisualRemove = false,
        attachmentFiles = $bindable(),
        attachmentsInputRef = $bindable(),
        attachmentAccept,
        onAttachmentsChange = () => {},
        existingAttachments = [],
        propositionId = null,
        deletedAttachmentIds = $bindable([]),
        onDeleteAttachment = () => {},
    }: Props = $props();

    const attachmentUrl = (fileId: string): string => `/assets/propositions/attachments/${fileId}`;

    const visibleAttachments = $derived(existingAttachments.filter((att) => !deletedAttachmentIds.includes(att.id)));
</script>

<div class="space-y-6">
    <div class="space-y-2">
        <Input name="title" id="title" label={m['proposition-create.fields.title.label']()} bind:value={title} placeholder={m['proposition-create.fields.title.placeholder']()} required max={150} />
        <p class="text-xs leading-snug text-muted-foreground">{m['proposition-create.fields.title.info']()}</p>
    </div>

    <FieldLabel forId="visual" label={m['proposition-create.fields.visual.label']()} info={m['proposition-create.fields.visual.info']()}>
        <Input type="file" name="visual" id="visual" accept="image/*" bind:ref={visualInputRef} onchange={onVisualChange} />
        {#if visualFileName}
            <p class="mt-2 text-sm text-muted-foreground">{visualFileName}</p>
        {/if}
        {#if visualPreviewUrl}
            <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div class="overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-inner">
                    <img src={visualPreviewUrl} alt={m['proposition-create.fields.visual.preview-alt']()} class="max-h-48 w-auto object-cover" />
                </div>
                {#if showVisualRemove}
                    <Button type="button" variant="ghost" size="sm" onclick={onVisualRemove}>
                        {m['proposition-create.fields.visual.remove']()}
                    </Button>
                {/if}
            </div>
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
        {#if visibleAttachments.length > 0}
            <div class="mb-3">
                <p class="mb-2 text-sm font-medium text-foreground">Pièces jointes actuelles :</p>
                <ul class="space-y-2">
                    {#each visibleAttachments as attachment (attachment.id)}
                        <li class="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 p-2">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium text-foreground">{attachment.name}</span>
                                <span class="text-xs text-muted-foreground">({(attachment.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <div class="flex items-center gap-1">
                                <a
                                    href={attachmentUrl(attachment.id)}
                                    download
                                    class="inline-flex items-center gap-1 rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10"
                                    title="Télécharger"
                                >
                                    <Download class="size-4" />
                                </a>
                                <button
                                    type="button"
                                    onclick={() => onDeleteAttachment(attachment.id)}
                                    class="inline-flex items-center gap-1 rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                                    title="Supprimer"
                                >
                                    <X class="size-4" />
                                </button>
                            </div>
                        </li>
                    {/each}
                </ul>
                {#if deletedAttachmentIds.length > 0}
                    <p class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        {deletedAttachmentIds.length} pièce{deletedAttachmentIds.length > 1 ? 's' : ''} jointe{deletedAttachmentIds.length > 1 ? 's' : ''} sera{deletedAttachmentIds.length > 1
                            ? 'ont'
                            : ''} supprimée{deletedAttachmentIds.length > 1 ? 's' : ''} lors de l'enregistrement.
                    </p>
                {/if}
                <p class="mt-2 text-xs text-muted-foreground">Pour ajouter d'autres pièces jointes, sélectionnez des fichiers ci-dessous :</p>
            </div>
        {/if}
        <Input type="file" name="attachments" id="attachments" multiple bind:files={attachmentFiles} bind:ref={attachmentsInputRef} accept={attachmentAccept} onchange={onAttachmentsChange} />
        {#if attachmentFiles?.length}
            <div class="mt-2">
                <p class="mb-1 text-sm font-medium text-foreground">Nouvelles pièces jointes à ajouter :</p>
                <ul class="list-disc pl-5 text-sm text-muted-foreground">
                    {#each Array.from(attachmentFiles) as file (file.name)}
                        <li>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                    {/each}
                </ul>
            </div>
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
