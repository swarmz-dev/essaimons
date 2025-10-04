<script lang="ts">
    import { enhance } from '$app/forms';
    import { page } from '$app/state';
    import Meta from '#components/Meta.svelte';
    import FormBackground from '#components/background/FormBackground.svelte';
    import { Title } from '#lib/components/ui/title';
    import { Button } from '#lib/components/ui/button';
    import LogoCropper from '#lib/components/ui/image/LogoCropper.svelte';
    import { m } from '#lib/paraglide/messages';
    import { showToast } from '#lib/services/toastService';
    import PropositionFormConcretization from './components/PropositionFormConcretization.svelte';
    import PropositionFormHorizontality from './components/PropositionFormHorizontality.svelte';
    import PropositionFormRobustness from './components/PropositionFormRobustness.svelte';
    import PropositionFormTabs from './components/PropositionFormTabs.svelte';
    import type { MultiSelectOption } from '#lib/components/ui/multi-select';
    import { organizationSettings } from '#lib/stores/organizationStore';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { onDestroy, tick } from 'svelte';
    import type { FormError, PageDataError } from '../../../app';
    import * as zod from 'zod';
    import type { SerializedProposition, SerializedPropositionBootstrap, SerializedPropositionCategory, SerializedPropositionSummary, SerializedUserSummary } from 'backend/types';

    const tabs = [
        { id: 'concretization', title: m['proposition-create.tabs.concretization.title'](), description: m['proposition-create.tabs.concretization.description']() },
        { id: 'horizontality', title: m['proposition-create.tabs.horizontality.title'](), description: m['proposition-create.tabs.horizontality.description']() },
        { id: 'robustness', title: m['proposition-create.tabs.robustness.title'](), description: m['proposition-create.tabs.robustness.description']() },
    ] as const;

    type TabId = (typeof tabs)[number]['id'];

    const ALLOWED_ATTACHMENT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'odt', 'ods', 'txt'] as const;
    const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',');
    const ATTACHMENT_EXTENSION_LABEL = ALLOWED_ATTACHMENT_EXTENSIONS.map((extension) => extension.toUpperCase()).join(', ');

    const EMPTY_DATA: SerializedPropositionBootstrap = { users: [], categories: [], propositions: [] };
    let {
        bootstrap: bootstrapInput = EMPTY_DATA,
        initialProposition = null,
        mode = 'create',
    }: {
        bootstrap?: SerializedPropositionBootstrap;
        initialProposition?: SerializedProposition | null;
        mode?: 'create' | 'edit';
    } = $props();

    const bootstrap = $derived(bootstrapInput ?? EMPTY_DATA);
    const isEditing = $derived(mode === 'edit');

    const toOptionValue = (value: unknown): string | undefined => {
        if (value === undefined || value === null) {
            return undefined;
        }

        const normalized = value.toString().trim();
        return normalized.length ? normalized : undefined;
    };

    const addDays = (input: Date, days: number): Date => {
        const result = new Date(input);
        result.setDate(result.getDate() + days);
        return result;
    };

    const formatDate = (input: Date): string => {
        const year = input.getFullYear();
        const month = String(input.getMonth() + 1).padStart(2, '0');
        const day = String(input.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const normalizeOffset = (value: unknown): number => {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.floor(value));
    };

    let baseUserOptions: MultiSelectOption[] = $state([]);
    let rescueOptionsFromInitial: MultiSelectOption[] = $state([]);
    let userOptions: MultiSelectOption[] = $state([]);
    let categoryOptions: MultiSelectOption[] = $state([]);
    let initialPropositionId: string | undefined = $state(undefined);
    let propositionOptions: MultiSelectOption[] = $state([]);

    let metaTitle: string = $state('');
    let metaDescription: string = $state('');
    let metaKeywords: string[] = $state([]);
    let metaPathname: string = $state('');
    let pageTitleText: string = $state('');
    let submitLabel: string = $state('');
    let submittingLabel: string = $state('');
    let saveDraftLabel: string = $state('');
    let savingDraftLabel: string = $state('');
    let isDraft: boolean = $state(false);

    $effect(() => {
        baseUserOptions = (bootstrap.users ?? []).flatMap((user: SerializedUserSummary) => {
            const value = toOptionValue(user.id);
            return value !== undefined ? [{ value, label: user.username }] : [];
        });
    });

    $effect(() => {
        if (!isEditing || !initialProposition) {
            rescueOptionsFromInitial = [];
            return;
        }

        rescueOptionsFromInitial = (initialProposition.rescueInitiators ?? []).flatMap((rescue: SerializedUserSummary) => {
            const value = toOptionValue(rescue.id);
            return value !== undefined ? [{ value, label: rescue.username }] : [];
        });
    });

    $effect(() => {
        const seen = new Set<string>();
        const combined: MultiSelectOption[] = [];

        for (const option of [...baseUserOptions, ...rescueOptionsFromInitial]) {
            if (!option.value || seen.has(option.value)) {
                continue;
            }
            seen.add(option.value);
            combined.push(option);
        }

        userOptions = combined;
    });

    $effect(() => {
        categoryOptions = (bootstrap.categories ?? []).flatMap((category: SerializedPropositionCategory) => {
            const value = toOptionValue(category.id);
            return value !== undefined ? [{ value, label: category.name }] : [];
        });
    });

    $effect(() => {
        initialPropositionId = toOptionValue(initialProposition?.id);
    });

    $effect(() => {
        propositionOptions = (bootstrap.propositions ?? []).flatMap((proposal: SerializedPropositionSummary) => {
            const value = toOptionValue(proposal.id);
            if (!value) {
                return [];
            }

            if (isEditing && initialPropositionId && value === initialPropositionId) {
                return [];
            }

            return [{ value, label: proposal.title }];
        });
    });

    let activeTab: TabId = $state(tabs[0].id);

    let title: string = $state('');
    let summary: string = $state('');
    let detailedDescription: string = $state('');
    let smartObjectives: string = $state('');
    let impacts: string = $state('');
    let mandatesDescription: string = $state('');
    let expertise: string = $state('');

    let categoryIds: string[] = $state([]);
    let associatedPropositionIds: string[] = $state([]);
    let rescueInitiatorIds: string[] = $state([]);

    let categoryIdsStrings: string[] = $state([]);
    let associatedPropositionStrings: string[] = $state([]);
    let rescueInitiatorStrings: string[] = $state([]);

    const toIdentifierArray = (value: unknown): string[] => {
        if (!value) return [];

        const collect = (input: unknown): string[] => {
            if (input === undefined || input === null) {
                return [];
            }
            return input
                .toString()
                .split(',')
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0);
        };

        const entries: string[] = Array.isArray(value) ? value.flatMap(collect) : collect(value);
        const seen = new Set<string>();

        return entries.filter((entry) => {
            if (seen.has(entry)) {
                return false;
            }
            seen.add(entry);
            return true;
        });
    };

    $effect(() => {
        categoryIds = toIdentifierArray(categoryIdsStrings);
        associatedPropositionIds = toIdentifierArray(associatedPropositionStrings);
        rescueInitiatorIds = toIdentifierArray(rescueInitiatorStrings);
    });

    let clarificationDeadline: string = $state('');
    let amendmentDeadline: string = $state('');
    let voteDeadline: string = $state('');
    let mandateDeadline: string = $state('');
    let evaluationDeadline: string = $state('');

    let visualInputRef: HTMLInputElement | undefined = $state();
    let pendingVisualFile: File | null = $state(null);
    let croppedVisualFile: File | null = $state(null);
    let visualFileName: string | null = $state(null);
    let visualPreviewUrl: string | null = $state(null);
    let showVisualCropper: boolean = $state(false);
    let initialVisualPreviewUrl: string | null = null;
    let initialVisualFileName: string | null = null;

    let attachmentFiles: FileList | undefined = $state();
    let attachmentsInputRef: HTMLInputElement | undefined = $state();

    let isSubmitting: boolean = $state(false);
    let hasAppliedPropositionDefaults: boolean = $state(false);
    let hasInitializedFromProposition: boolean = $state(false);

    const concretizationValid: boolean = $derived(title.trim().length > 0 && detailedDescription.trim().length > 0 && smartObjectives.trim().length > 0 && categoryIds.length > 0);

    const horizontalityValid: boolean = $derived(
        summary.trim().length > 0 &&
            clarificationDeadline.trim().length > 0 &&
            amendmentDeadline.trim().length > 0 &&
            voteDeadline.trim().length > 0 &&
            mandateDeadline.trim().length > 0 &&
            evaluationDeadline.trim().length > 0 &&
            mandatesDescription.trim().length > 0
    );

    const schema = zod.object({
        title: zod.string().min(1).max(150),
        summary: zod.string().min(1).max(600),
        detailedDescription: zod.string().min(1).max(1500),
        smartObjectives: zod.string().min(1).max(1500),
        impacts: zod.string().min(1).max(1500),
        mandatesDescription: zod.string().min(1).max(1500),
        expertise: zod.string().max(150).optional(),
        categoryIds: zod.array(zod.string().trim().min(1)).min(1),
        associatedPropositionIds: zod.array(zod.string().trim().min(1)).optional(),
        rescueInitiatorIds: zod.array(zod.string().trim().min(1)).min(1),
        clarificationDeadline: zod.string().min(1),
        amendmentDeadline: zod.string().min(1),
        voteDeadline: zod.string().min(1),
        mandateDeadline: zod.string().min(1),
        evaluationDeadline: zod.string().min(1),
    });

    const canSubmit: boolean = $derived(
        schema.safeParse({
            title,
            summary,
            detailedDescription,
            smartObjectives,
            impacts,
            mandatesDescription,
            expertise,
            categoryIds,
            associatedPropositionIds,
            rescueInitiatorIds,
            clarificationDeadline,
            amendmentDeadline,
            voteDeadline,
            mandateDeadline,
            evaluationDeadline,
        }).success
    );

    $effect(() => {
        if (isEditing || hasAppliedPropositionDefaults) {
            return;
        }

        if (page.data.formError) {
            hasAppliedPropositionDefaults = true;
            return;
        }

        const defaults = $organizationSettings.propositionDefaults ?? {
            clarificationOffsetDays: 0,
            amendmentOffsetDays: 0,
            voteOffsetDays: 0,
            mandateOffsetDays: 0,
            evaluationOffsetDays: 0,
        };

        const clarificationOffset = normalizeOffset(defaults.clarificationOffsetDays);
        const amendmentOffset = normalizeOffset(defaults.amendmentOffsetDays);
        const voteOffset = normalizeOffset(defaults.voteOffsetDays);
        const mandateOffset = normalizeOffset(defaults.mandateOffsetDays);
        const evaluationOffset = normalizeOffset(defaults.evaluationOffsetDays);

        const today = new Date();
        const clarificationDate = addDays(today, clarificationOffset);
        const amendmentDate = addDays(clarificationDate, amendmentOffset);
        const voteDate = addDays(amendmentDate, voteOffset);
        const mandateDate = addDays(voteDate, mandateOffset);
        const evaluationDate = addDays(mandateDate, evaluationOffset);

        if (!clarificationDeadline.trim()) {
            clarificationDeadline = formatDate(clarificationDate);
        }
        if (!amendmentDeadline.trim()) {
            amendmentDeadline = formatDate(amendmentDate);
        }
        if (!voteDeadline.trim()) {
            voteDeadline = formatDate(voteDate);
        }
        if (!mandateDeadline.trim()) {
            mandateDeadline = formatDate(mandateDate);
        }
        if (!evaluationDeadline.trim()) {
            evaluationDeadline = formatDate(evaluationDate);
        }

        hasAppliedPropositionDefaults = true;
    });

    $effect(() => {
        if (isEditing && initialProposition) {
            metaTitle = m['proposition-edit.meta.title']({ title: initialProposition.title });
            metaDescription = m['proposition-edit.meta.description']({ title: initialProposition.title });
            metaKeywords = m['proposition-edit.meta.keywords']().split(', ');
            metaPathname = `/propositions/${initialProposition.id}/edit`;
            pageTitleText = m['proposition-edit.title']();
            submitLabel = m['proposition-edit.navigation.submit']();
            submittingLabel = m['proposition-edit.navigation.submitting']();
        } else {
            metaTitle = m['proposition-create.meta.title']();
            metaDescription = m['proposition-create.meta.description']();
            metaKeywords = m['proposition-create.meta.keywords']().split(', ');
            metaPathname = '/propositions/create';
            pageTitleText = m['proposition-create.title']();
            submitLabel = m['proposition-create.navigation.submit']();
            submittingLabel = m['proposition-create.navigation.submitting']();
            saveDraftLabel = m['proposition-create.navigation.save-draft']();
            savingDraftLabel = m['proposition-create.navigation.saving-draft']();
        }
    });

    $effect(() => {
        if (!isEditing || !initialProposition || hasInitializedFromProposition) {
            return;
        }

        title = initialProposition.title ?? '';
        summary = initialProposition.summary ?? '';
        detailedDescription = initialProposition.detailedDescription ?? '';
        smartObjectives = initialProposition.smartObjectives ?? '';
        impacts = initialProposition.impacts ?? '';
        mandatesDescription = initialProposition.mandatesDescription ?? '';
        expertise = initialProposition.expertise ?? '';

        clarificationDeadline = initialProposition.clarificationDeadline ?? '';
        amendmentDeadline = initialProposition.amendmentDeadline ?? '';
        voteDeadline = initialProposition.voteDeadline ?? '';
        mandateDeadline = initialProposition.mandateDeadline ?? '';
        evaluationDeadline = initialProposition.evaluationDeadline ?? '';

        categoryIdsStrings = (initialProposition.categories ?? []).map((category: SerializedPropositionCategory) => toOptionValue(category.id)).filter((value): value is string => Boolean(value));
        associatedPropositionStrings = (initialProposition.associatedPropositions ?? [])
            .map((proposal: SerializedPropositionSummary) => toOptionValue(proposal.id))
            .filter((value): value is string => Boolean(value));
        rescueInitiatorStrings = (initialProposition.rescueInitiators ?? []).map((rescue: SerializedUserSummary) => toOptionValue(rescue.id)).filter((value): value is string => Boolean(value));

        if (initialProposition.visual) {
            initialVisualPreviewUrl = `/assets/propositions/visual/${initialProposition.id}?no-cache=true`;
            initialVisualFileName = initialProposition.visual.name ?? null;
            visualPreviewUrl = initialVisualPreviewUrl;
            visualFileName = initialVisualFileName;
        }

        hasInitializedFromProposition = true;
    });

    const submitHandler: SubmitFunction = async ({ formData }) => {
        isSubmitting = true;

        if (croppedVisualFile) {
            formData.delete('visual');
            formData.append('visual', croppedVisualFile, croppedVisualFile.name);
        }

        formData.set('isDraft', String(isDraft));

        return async ({ result, update }) => {
            isSubmitting = false;
            if (result.type === 'failure') {
                await update({ reset: false });
            } else {
                await update();
            }
        };
    };

    const handleSaveDraft = () => {
        isDraft = true;
    };

    const handlePublish = () => {
        isDraft = false;
    };

    const validateAttachmentSelection = (files?: FileList | null): boolean => {
        if (!files?.length) {
            return true;
        }

        for (const file of Array.from(files)) {
            const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
            if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension as (typeof ALLOWED_ATTACHMENT_EXTENSIONS)[number])) {
                showToast(m['proposition-create.validation.attachments.invalid-extension']({ extensions: ATTACHMENT_EXTENSION_LABEL }), 'error');
                return false;
            }
        }

        return true;
    };

    const revokePreviewUrl = (url: string | null): void => {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };

    const handleVisualChange = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        if (!file) {
            pendingVisualFile = null;
            showVisualCropper = false;
            return;
        }

        pendingVisualFile = file;
        showVisualCropper = true;
    };

    const handleVisualCropConfirm = (event: CustomEvent<{ file: File; previewUrl: string }>): void => {
        const { file, previewUrl } = event.detail;
        revokePreviewUrl(visualPreviewUrl);
        croppedVisualFile = file;
        visualFileName = file.name;
        visualPreviewUrl = previewUrl;
        showVisualCropper = false;
        pendingVisualFile = null;
        if (visualInputRef) {
            visualInputRef.value = '';
        }
    };

    const handleVisualCropCancel = (): void => {
        pendingVisualFile = null;
        showVisualCropper = false;
        if (visualInputRef) {
            visualInputRef.value = '';
        }
    };

    const clearVisual = (): void => {
        if (croppedVisualFile) {
            revokePreviewUrl(visualPreviewUrl);
        }
        croppedVisualFile = null;
        pendingVisualFile = null;
        showVisualCropper = false;
        if (visualInputRef) {
            visualInputRef.value = '';
        }
        if (initialVisualPreviewUrl) {
            visualPreviewUrl = initialVisualPreviewUrl;
            visualFileName = initialVisualFileName;
        } else {
            visualPreviewUrl = null;
            visualFileName = null;
        }
    };

    const handleAttachmentsChange = (event: Event): void => {
        if (validateAttachmentSelection(attachmentFiles)) {
            return;
        }

        attachmentFiles = undefined;
        const target = event.currentTarget as HTMLInputElement | null;
        if (target) {
            target.value = '';
        }
        if (attachmentsInputRef) {
            attachmentsInputRef.value = '';
        }
    };

    const focusTabFirstField = async (tabId: TabId): Promise<void> => {
        await tick();

        if (typeof document === 'undefined') {
            return;
        }

        let targetId: string | null = null;
        switch (tabId) {
            case 'concretization':
                targetId = 'title';
                break;
            case 'horizontality':
                targetId = 'summary';
                break;
            case 'robustness':
                targetId = 'impacts';
                break;
        }

        if (!targetId) {
            return;
        }

        const element = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;
        element?.focus();
    };

    const goToTabWithFocus = async (tabId: TabId): Promise<void> => {
        if (!tabs.some((tab) => tab.id === tabId)) {
            return;
        }
        activeTab = tabId;
        await focusTabFirstField(tabId);
    };

    const goToTab = (tabId: string): void => {
        void goToTabWithFocus(tabId as TabId);
    };

    const handlePrevious = async (): Promise<void> => {
        const currentIndex: number = tabs.findIndex((tab) => tab.id === activeTab);
        if (currentIndex > 0) {
            const previousTabId = tabs[currentIndex - 1].id as TabId;
            await goToTabWithFocus(previousTabId);
        }
    };

    const handleNext = async (): Promise<void> => {
        const currentIndex: number = tabs.findIndex((tab) => tab.id === activeTab);
        if (currentIndex < tabs.length - 1) {
            const nextTabId = tabs[currentIndex + 1].id as TabId;
            if ((nextTabId === 'horizontality' && concretizationValid) || (nextTabId === 'robustness' && horizontalityValid)) {
                await goToTabWithFocus(nextTabId);
            }
        }
    };

    let hasHydratedFormError = $state(false);

    $effect((): void => {
        if (hasHydratedFormError) {
            return;
        }

        const formError: FormError | undefined = page.data.formError;

        if (!formError) {
            return;
        }

        hasHydratedFormError = true;

        formError.errors.forEach((error: PageDataError) => {
            showToast(error.message, error.type);
        });

        const formData = formError.data ?? {};

        title = formData.title ?? title;
        summary = formData.summary ?? summary;
        detailedDescription = formData.detailedDescription ?? detailedDescription;
        smartObjectives = formData.smartObjectives ?? smartObjectives;
        impacts = formData.impacts ?? impacts;
        mandatesDescription = formData.mandatesDescription ?? mandatesDescription;
        expertise = formData.expertise ?? expertise;

        categoryIdsStrings = Array.isArray(formData.categoryIds) ? formData.categoryIds : (formData.categoryIds ?? '').toString().split(',').filter(Boolean);
        associatedPropositionStrings = Array.isArray(formData.associatedPropositionIds)
            ? formData.associatedPropositionIds
            : (formData.associatedPropositionIds ?? '').toString().split(',').filter(Boolean);
        rescueInitiatorStrings = Array.isArray(formData.rescueInitiatorIds) ? formData.rescueInitiatorIds : (formData.rescueInitiatorIds ?? '').toString().split(',').filter(Boolean);
        categoryIds = toIdentifierArray(categoryIdsStrings);
        associatedPropositionIds = toIdentifierArray(associatedPropositionStrings);
        rescueInitiatorIds = toIdentifierArray(rescueInitiatorStrings);

        clarificationDeadline = formData.clarificationDeadline ?? clarificationDeadline;
        amendmentDeadline = formData.amendmentDeadline ?? amendmentDeadline;
        voteDeadline = formData.voteDeadline ?? voteDeadline;
        mandateDeadline = formData.mandateDeadline ?? mandateDeadline;
        evaluationDeadline = formData.evaluationDeadline ?? evaluationDeadline;
    });

    onDestroy(() => {
        revokePreviewUrl(visualPreviewUrl);
    });
</script>

<Meta title={metaTitle} description={metaDescription} keywords={metaKeywords} pathname={metaPathname} />

<FormBackground />

<section class="relative flex flex-col gap-12 px-4 pb-16 pt-12 md:px-8 lg:px-12">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div class="space-y-6">
            <Title title={pageTitleText} hasBackground={false} />
            <p class="max-w-3xl text-base text-muted-foreground">{m['proposition-create.introduction']()}</p>
        </div>

        <div class="rounded-3xl border border-white/45 bg-white/80 p-4 shadow-2xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75">
            <div class="flex flex-col gap-6">
                <PropositionFormTabs {tabs} {activeTab} selectTab={goToTab} />

                <form method="POST" enctype="multipart/form-data" use:enhance={submitHandler} class="flex flex-col gap-10">
                    <input type="hidden" name="activeTab" value={activeTab} />

                    <div class="grid gap-6 lg:grid-cols-2" hidden={activeTab !== 'concretization'} aria-hidden={activeTab !== 'concretization'}>
                        <PropositionFormConcretization
                            bind:title
                            bind:smartObjectives
                            bind:detailedDescription
                            bind:categoryIdsStrings
                            {categoryOptions}
                            bind:visualInputRef
                            {visualFileName}
                            {visualPreviewUrl}
                            onVisualChange={handleVisualChange}
                            onVisualRemove={clearVisual}
                            showVisualRemove={Boolean(croppedVisualFile)}
                            bind:attachmentFiles
                            bind:attachmentsInputRef
                            attachmentAccept={ATTACHMENT_ACCEPT}
                            onAttachmentsChange={handleAttachmentsChange}
                        />
                    </div>

                    <div class="grid gap-6 lg:grid-cols-2" hidden={activeTab !== 'horizontality'} aria-hidden={activeTab !== 'horizontality'}>
                        <PropositionFormHorizontality
                            bind:summary
                            bind:mandatesDescription
                            bind:clarificationDeadline
                            bind:amendmentDeadline
                            bind:voteDeadline
                            bind:mandateDeadline
                            bind:evaluationDeadline
                        />
                    </div>

                    <div class="grid gap-6 lg:grid-cols-2" hidden={activeTab !== 'robustness'} aria-hidden={activeTab !== 'robustness'}>
                        <PropositionFormRobustness bind:impacts bind:expertise bind:associatedPropositionStrings {propositionOptions} bind:rescueInitiatorStrings {userOptions} />
                    </div>

                    <div class="flex flex-col gap-4 border-t border-white/40 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/70">
                        <div class="text-sm text-muted-foreground">
                            {#if activeTab === 'concretization'}
                                <p>{m['proposition-create.navigation.concretization-hint']()}</p>
                            {:else if activeTab === 'horizontality'}
                                <p>{m['proposition-create.navigation.horizontality-hint']()}</p>
                            {:else}
                                <p>{m['proposition-create.navigation.robustness-hint']()}</p>
                            {/if}
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <Button type="button" variant="outline" onclick={handlePrevious} disabled={activeTab === tabs[0].id}>
                                {m['proposition-create.navigation.previous']()}
                            </Button>
                            {#if activeTab !== 'robustness'}
                                <Button
                                    type="button"
                                    onclick={handleNext}
                                    disabled={(activeTab === 'concretization' && !concretizationValid) || (activeTab === 'horizontality' && !horizontalityValid)}
                                >
                                    {m['proposition-create.navigation.next']()}
                                </Button>
                            {:else}
                                {#if !isEditing}
                                    <Button type="submit" variant="outline" disabled={!canSubmit} loading={isSubmitting && isDraft} loadingLabel={savingDraftLabel} onclick={handleSaveDraft}>
                                        {saveDraftLabel}
                                    </Button>
                                {/if}
                                <Button type="submit" disabled={!canSubmit} loading={isSubmitting && !isDraft} loadingLabel={submittingLabel} onclick={handlePublish}>
                                    {submitLabel}
                                </Button>
                            {/if}
                        </div>
                    </div>

                    <input type="hidden" name="categoryIds" value={categoryIdsStrings.join(',')} />
                    <input type="hidden" name="associatedPropositionIds" value={associatedPropositionStrings.join(',')} />
                    <input type="hidden" name="rescueInitiatorIds" value={rescueInitiatorStrings.join(',')} />
                </form>
            </div>
        </div>
    </div>
</section>

{#if showVisualCropper && pendingVisualFile}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <LogoCropper
            file={pendingVisualFile}
            previewWidth={480}
            previewHeight={270}
            outputWidth={1280}
            outputHeight={720}
            showBackgroundPicker={false}
            title={m['proposition-create.crop.title']()}
            instructions={m['proposition-create.crop.instructions']()}
            zoomLabel={m['proposition-create.crop.zoom']()}
            resetLabel={m['proposition-create.crop.reset']()}
            cancelLabel={m['common.cancel']()}
            applyLabel={m['proposition-create.crop.apply']()}
            outputMimeType="image/jpeg"
            outputQuality={0.9}
            on:confirm={handleVisualCropConfirm}
            on:cancel={handleVisualCropCancel}
        />
    </div>
{/if}
