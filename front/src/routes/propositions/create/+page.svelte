<script lang="ts">
    import { enhance } from '$app/forms';
    import { page } from '$app/state';
    import { Title } from '#lib/components/ui/title';
    import Meta from '#components/Meta.svelte';
    import FormBackground from '#components/background/FormBackground.svelte';
    import { Button } from '#lib/components/ui/button';
    import { Input } from '#lib/components/ui/input';
    import { Textarea } from '#lib/components/ui/textarea';
    import { RichTextEditor } from '#lib/components/ui/rich-text';
    import { MultiSelect, type MultiSelectOption } from '#lib/components/ui/multi-select';
    import { FieldLabel } from '#lib/components/forms';
    import { m } from '#lib/paraglide/messages';
    import type { SubmitFunction } from '@sveltejs/kit';
    import type { FormError, PageDataError } from '../../../app';
    import { showToast } from '#lib/services/toastService';
    import * as zod from 'zod';
    import type { SerializedPropositionBootstrap, SerializedPropositionCategory, SerializedPropositionSummary, SerializedUserSummary } from 'backend/types';
    import { cn } from '#lib/utils';

    const tabs = [
        { id: 'concretization', title: m['proposition-create.tabs.concretization.title'](), description: m['proposition-create.tabs.concretization.description']() },
        { id: 'horizontality', title: m['proposition-create.tabs.horizontality.title'](), description: m['proposition-create.tabs.horizontality.description']() },
        { id: 'robustness', title: m['proposition-create.tabs.robustness.title'](), description: m['proposition-create.tabs.robustness.description']() },
    ] as const;

    const { data } = $props<{ data: SerializedPropositionBootstrap }>();

    const userOptions: MultiSelectOption[] = $derived(data.users.map((user: SerializedUserSummary) => ({ value: String(user.id), label: user.username })));
    const categoryOptions: MultiSelectOption[] = $derived(data.categories.map((category: SerializedPropositionCategory) => ({ value: category.id, label: category.name })));
    const propositionOptions: MultiSelectOption[] = $derived(data.propositions.map((proposal: SerializedPropositionSummary) => ({ value: proposal.id, label: proposal.title })));

    let activeTab: (typeof tabs)[number]['id'] = $state(tabs[0].id);

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

    let clarificationDeadline: string = $state('');
    let improvementDeadline: string = $state('');
    let voteDeadline: string = $state('');
    let mandateDeadline: string = $state('');
    let evaluationDeadline: string = $state('');

    let visualFiles: FileList | undefined = $state();
    let attachmentFiles: FileList | undefined = $state();

    let isSubmitting: boolean = $state(false);

    const concretizationValid: boolean = $derived(title.trim().length > 0 && detailedDescription.trim().length > 0 && smartObjectives.trim().length > 0 && categoryIds.length > 0);

    const horizontalityValid: boolean = $derived(
        summary.trim().length > 0 &&
            clarificationDeadline.trim().length > 0 &&
            improvementDeadline.trim().length > 0 &&
            voteDeadline.trim().length > 0 &&
            mandateDeadline.trim().length > 0 &&
            evaluationDeadline.trim().length > 0 &&
            mandatesDescription.trim().length > 0
    );

    const robustnessValid: boolean = $derived(impacts.trim().length > 0 && rescueInitiatorIds.length > 0);

    const schema = zod.object({
        title: zod.string().min(1).max(150),
        summary: zod.string().min(1).max(300),
        detailedDescription: zod.string().min(1).max(1500),
        smartObjectives: zod.string().min(1).max(1500),
        impacts: zod.string().min(1).max(1500),
        mandatesDescription: zod.string().min(1).max(1500),
        expertise: zod.string().max(150).optional(),
        categoryIds: zod.array(zod.string()).min(1),
        associatedPropositionIds: zod.array(zod.string()).optional(),
        rescueInitiatorIds: zod.array(zod.string()).min(1),
        clarificationDeadline: zod.string().min(1),
        improvementDeadline: zod.string().min(1),
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
            improvementDeadline,
            voteDeadline,
            mandateDeadline,
            evaluationDeadline,
        }).success
    );

    const submitHandler: SubmitFunction = async () => {
        isSubmitting = true;
        return async ({ result, update }) => {
            isSubmitting = false;
            if (result.type === 'failure') {
                await update({ reset: false });
            } else {
                await update();
            }
        };
    };

    const goToTab = (tabId: (typeof tabs)[number]['id']): void => {
        activeTab = tabId;
    };

    const handlePrevious = (): void => {
        const currentIndex: number = tabs.findIndex((tab) => tab.id === activeTab);
        if (currentIndex > 0) {
            activeTab = tabs[currentIndex - 1].id;
        }
    };

    const handleNext = (): void => {
        const currentIndex: number = tabs.findIndex((tab) => tab.id === activeTab);
        if (currentIndex < tabs.length - 1) {
            const nextTabId = tabs[currentIndex + 1].id;
            if ((nextTabId === 'horizontality' && concretizationValid) || (nextTabId === 'robustness' && horizontalityValid)) {
                activeTab = nextTabId;
            }
        }
    };

    $effect((): void => {
        const formError: FormError | undefined = page.data.formError;

        if (!formError) {
            return;
        }

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

        categoryIds = toArray(formData.categoryIds);
        associatedPropositionIds = toArray(formData.associatedPropositionIds);
        rescueInitiatorIds = toArray(formData.rescueInitiatorIds);

        clarificationDeadline = formData.clarificationDeadline ?? clarificationDeadline;
        improvementDeadline = formData.improvementDeadline ?? improvementDeadline;
        voteDeadline = formData.voteDeadline ?? voteDeadline;
        mandateDeadline = formData.mandateDeadline ?? mandateDeadline;
        evaluationDeadline = formData.evaluationDeadline ?? evaluationDeadline;

        page.data.formError = undefined;
    });

    const toArray = (value: unknown): string[] => {
        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {
            return value
                .flatMap((entry) => (entry ?? '').toString().split(','))
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0);
        }

        if (typeof value === 'string') {
            return value
                .split(',')
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0);
        }

        return [];
    };
</script>

<Meta
    title={m['proposition-create.meta.title']()}
    description={m['proposition-create.meta.description']()}
    keywords={m['proposition-create.meta.keywords']().split(', ')}
    pathname="/propositions/create"
/>

<FormBackground />

<section class="relative flex flex-col gap-12 px-4 pb-16 pt-12 md:px-8 lg:px-12">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div class="space-y-6">
            <Title title={m['proposition-create.title']()} hasBackground={false} />
            <p class="max-w-3xl text-base text-muted-foreground">{m['proposition-create.introduction']()}</p>
        </div>

        <div class="rounded-3xl border border-white/45 bg-white/80 p-4 shadow-2xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75">
            <div class="flex flex-col gap-6">
                <nav class="grid gap-3 sm:grid-cols-3">
                    {#each tabs as tab}
                        <button
                            type="button"
                            class={cn(
                                'group flex flex-col gap-2 rounded-2xl border border-white/45 bg-white/75 px-4 py-4 text-left shadow-md transition hover:border-primary/50 hover:bg-white/90 dark:border-slate-800/70 dark:bg-slate-900/70',
                                activeTab === tab.id ? 'border-primary/70 bg-primary/90 text-primary-foreground' : ''
                            )}
                            onclick={() => goToTab(tab.id)}
                        >
                            <span
                                class={cn(
                                    'text-sm font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-primary dark:group-hover:text-primary',
                                    activeTab === tab.id ? 'text-primary-foreground' : ''
                                )}
                            >
                                {tab.title}
                            </span>
                            <p class={cn('text-sm text-muted-foreground group-hover:text-foreground/90 dark:group-hover:text-foreground/90', activeTab === tab.id ? 'text-primary-foreground/90' : '')}>
                                {tab.description}
                            </p>
                        </button>
                    {/each}
                </nav>

                <form method="POST" enctype="multipart/form-data" use:enhance={submitHandler} class="flex flex-col gap-10">
                    <input type="hidden" name="activeTab" value={activeTab} />

                    {#if activeTab === 'concretization'}
                        <div class="grid gap-6 lg:grid-cols-2">
                            <div class="space-y-6">
                                <div class="space-y-2">
                                    <Input
                                        name="title"
                                        id="title"
                                        label={m['proposition-create.fields.title.label']()}
                                        bind:value={title}
                                        placeholder={m['proposition-create.fields.title.placeholder']()}
                                        required
                                        max={150}
                                    />
                                    <p class="text-xs leading-snug text-muted-foreground">{m['proposition-create.fields.title.info']()}</p>
                                </div>

                                <FieldLabel forId="visual" label={m['proposition-create.fields.visual.label']()} info={m['proposition-create.fields.visual.info']()}>
                                    <Input type="file" name="visual" id="visual" accept="image/*" bind:files={visualFiles} />
                                    {#if visualFiles?.length}
                                        <p class="mt-2 text-sm text-muted-foreground">{visualFiles[0].name}</p>
                                    {/if}
                                </FieldLabel>

                                <FieldLabel forId="categories" label={m['proposition-create.fields.categories.label']()} required info={m['proposition-create.fields.categories.info']()}>
                                    <MultiSelect placeholder={m['proposition-create.fields.categories.placeholder']()} bind:selectedValues={categoryIds} options={categoryOptions} />
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
                                    <Input type="file" name="attachments" id="attachments" multiple bind:files={attachmentFiles} />
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
                        </div>
                    {/if}

                    {#if activeTab === 'horizontality'}
                        <div class="grid gap-6 lg:grid-cols-2">
                            <div class="space-y-6">
                                <FieldLabel forId="summary" label={m['proposition-create.fields.summary.label']()} required info={m['proposition-create.fields.summary.info']()}>
                                    <Textarea name="summary" id="summary" bind:value={summary} max={300} rows={6} required />
                                </FieldLabel>

                                <RichTextEditor
                                    name="mandatesDescription"
                                    label={m['proposition-create.fields.mandates-description.label']()}
                                    info={m['proposition-create.fields.mandates-description.info']()}
                                    bind:value={mandatesDescription}
                                    required
                                    max={1500}
                                />
                            </div>

                            <div class="space-y-6">
                                <div class="grid gap-4">
                                    <FieldLabel
                                        forId="clarificationDeadline"
                                        label={m['proposition-create.fields.clarification-deadline.label']()}
                                        required
                                        info={m['proposition-create.fields.clarification-deadline.info']()}
                                    >
                                        <Input type="date" name="clarificationDeadline" id="clarificationDeadline" bind:value={clarificationDeadline} required />
                                    </FieldLabel>
                                    <FieldLabel
                                        forId="improvementDeadline"
                                        label={m['proposition-create.fields.improvement-deadline.label']()}
                                        required
                                        info={m['proposition-create.fields.improvement-deadline.info']()}
                                    >
                                        <Input type="date" name="improvementDeadline" id="improvementDeadline" bind:value={improvementDeadline} required />
                                    </FieldLabel>
                                    <FieldLabel forId="voteDeadline" label={m['proposition-create.fields.vote-deadline.label']()} required info={m['proposition-create.fields.vote-deadline.info']()}>
                                        <Input type="date" name="voteDeadline" id="voteDeadline" bind:value={voteDeadline} required />
                                    </FieldLabel>
                                    <FieldLabel
                                        forId="mandateDeadline"
                                        label={m['proposition-create.fields.mandate-deadline.label']()}
                                        required
                                        info={m['proposition-create.fields.mandate-deadline.info']()}
                                    >
                                        <Input type="date" name="mandateDeadline" id="mandateDeadline" bind:value={mandateDeadline} required />
                                    </FieldLabel>
                                    <FieldLabel
                                        forId="evaluationDeadline"
                                        label={m['proposition-create.fields.evaluation-deadline.label']()}
                                        required
                                        info={m['proposition-create.fields.evaluation-deadline.info']()}
                                    >
                                        <Input type="date" name="evaluationDeadline" id="evaluationDeadline" bind:value={evaluationDeadline} required />
                                    </FieldLabel>
                                </div>
                            </div>
                        </div>
                    {/if}

                    {#if activeTab === 'robustness'}
                        <div class="grid gap-6 lg:grid-cols-2">
                            <div class="space-y-6">
                                <FieldLabel forId="impacts" label={m['proposition-create.fields.impacts.label']()} required info={m['proposition-create.fields.impacts.info']()}>
                                    <Textarea name="impacts" id="impacts" bind:value={impacts} max={1500} rows={8} required />
                                </FieldLabel>

                                <FieldLabel forId="expertise" label={m['proposition-create.fields.expertise.label']()} info={m['proposition-create.fields.expertise.info']()}>
                                    <Textarea name="expertise" id="expertise" bind:value={expertise} max={150} rows={4} />
                                </FieldLabel>

                                <FieldLabel
                                    forId="associatedPropositions"
                                    label={m['proposition-create.fields.associated-propositions.label']()}
                                    info={m['proposition-create.fields.associated-propositions.info']()}
                                >
                                    <MultiSelect
                                        placeholder={m['proposition-create.fields.associated-propositions.placeholder']()}
                                        bind:selectedValues={associatedPropositionIds}
                                        options={propositionOptions}
                                    />
                                </FieldLabel>
                            </div>

                            <div class="space-y-6">
                                <FieldLabel
                                    forId="rescueInitiators"
                                    label={m['proposition-create.fields.rescue-initiators.label']()}
                                    required
                                    info={m['proposition-create.fields.rescue-initiators.info']()}
                                >
                                    <MultiSelect placeholder={m['proposition-create.fields.rescue-initiators.placeholder']()} bind:selectedValues={rescueInitiatorIds} options={userOptions} />
                                </FieldLabel>
                            </div>
                        </div>
                    {/if}

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
                                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                                    {#if isSubmitting}
                                        {m['proposition-create.navigation.submitting']()}
                                    {:else}
                                        {m['proposition-create.navigation.submit']()}
                                    {/if}
                                </Button>
                            {/if}
                        </div>
                    </div>

                    <input type="hidden" name="categoryIds" value={categoryIds.join(',')} />
                    <input type="hidden" name="associatedPropositionIds" value={associatedPropositionIds.join(',')} />
                    <input type="hidden" name="rescueInitiatorIds" value={rescueInitiatorIds.join(',')} />
                </form>
            </div>
        </div>
    </div>
</section>
