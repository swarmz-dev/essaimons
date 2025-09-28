<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { Card, CardContent } from '#lib/components/ui/card';
    import { FieldLabel } from '#lib/components/forms';
    import { Input } from '#lib/components/ui/input';
    import { Textarea } from '#lib/components/ui/textarea';
    import { Button } from '#lib/components/ui/button';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { m } from '#lib/paraglide/messages';
    import LogoCropper from '#lib/components/ui/image/LogoCropper.svelte';
    import { translateField } from '#lib/stores/organizationStore';
    import EnglishFlag from '#icons/EnglishFlag.svelte';
    import FrenchFlag from '#icons/FrenchFlag.svelte';
    import type { SerializedOrganizationSettings } from 'backend/types';
    import { onDestroy } from 'svelte';
    import * as zod from 'zod';

    const { data } = $props<{ data: { settings: SerializedOrganizationSettings } }>();
    const settings = data.settings;

    type LocaleInfo = SerializedOrganizationSettings['locales'][number];

    const locales: LocaleInfo[] = settings.locales.length ? settings.locales : [{ code: settings.fallbackLocale ?? 'en', label: settings.fallbackLocale ?? 'en', isDefault: true }];

    const maxSourceCodeUrlLength = 2000;

    const isValidUrl = (value: string): boolean => {
        if (!value) {
            return false;
        }
        try {
            // eslint-disable-next-line no-new
            new URL(value);
            return true;
        } catch (error) {
            return false;
        }
    };

    const getLocaleLabel = (code: string): string => locales.find((locale) => locale.code === code)?.label ?? code.toUpperCase();

    const fallbackSourceCodeUrlSchema = zod
        .string()
        .trim()
        .min(1)
        .max(maxSourceCodeUrlLength)
        .superRefine((value, ctx) => {
            if (!isValidUrl(value)) {
                ctx.addIssue({ code: zod.ZodIssueCode.custom, message: 'invalid' });
            }
        });

    const optionalSourceCodeUrlSchema = zod
        .string()
        .trim()
        .max(maxSourceCodeUrlLength)
        .superRefine((value, ctx) => {
            if (!value) {
                return;
            }
            if (!isValidUrl(value)) {
                ctx.addIssue({ code: zod.ZodIssueCode.custom, message: 'invalid' });
            }
        });

    const resolveSourceCodeUrlError = (value: string, isFallback: boolean, localeLabel: string): string | null => {
        const schema = isFallback ? fallbackSourceCodeUrlSchema : optionalSourceCodeUrlSchema;
        const result = schema.safeParse(value);
        if (result.success) {
            return null;
        }

        const issue = result.error.issues[0];
        if (!issue) {
            return null;
        }

        if (isFallback && issue.code === zod.ZodIssueCode.too_small) {
            return m['admin.organization.validation.source-code-url.required']({ locale: localeLabel });
        }

        if (issue.code === zod.ZodIssueCode.too_big) {
            return m['admin.organization.validation.source-code-url.max']({ locale: localeLabel });
        }

        return m['admin.organization.validation.source-code-url.invalid']({ locale: localeLabel });
    };

    const ensureMap = (input: Record<string, string> | undefined): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const locale of locales) {
            result[locale.code] = input?.[locale.code] ?? '';
        }
        return result;
    };

    const localeIcon = (code: string) => {
        const normalized = code.split('-')[0].toLowerCase();
        switch (normalized) {
            case 'en':
                return EnglishFlag;
            case 'fr':
                return FrenchFlag;
            default:
                return null;
        }
    };

    const initialLogoUrl: string | null = settings.logo ? `/assets/organization/logo/${settings.logo.id}?no-cache=true` : null;

    let fallbackLocale: string = $state(settings.fallbackLocale ?? locales[0]?.code ?? 'en');
    let nameByLocale: Record<string, string> = $state(ensureMap(settings.name));
    let descriptionByLocale: Record<string, string> = $state(ensureMap(settings.description));
    let sourceCodeUrlByLocale: Record<string, string> = $state(ensureMap(settings.sourceCodeUrl));
    let copyrightByLocale: Record<string, string> = $state(ensureMap(settings.copyright));
    let logoPreview: string | null = $state(initialLogoUrl);
    let logoInputRef: HTMLInputElement | undefined = $state();
    let pendingLogoFile: File | null = $state(null);
    let showCropper: boolean = $state(false);
    let croppedFile: File | null = $state(null);
    let croppedPreviewUrl: string | null = $state(null);
    let isSubmitting: boolean = $state(false);
    let activeTab: 'general' | 'propositions' = $state('general');
    let clarificationOffsetDays: string = $state(String(settings.propositionDefaults?.clarificationOffsetDays ?? 7));
    let improvementOffsetDays: string = $state(String(settings.propositionDefaults?.improvementOffsetDays ?? 15));
    let voteOffsetDays: string = $state(String(settings.propositionDefaults?.voteOffsetDays ?? 7));
    let mandateOffsetDays: string = $state(String(settings.propositionDefaults?.mandateOffsetDays ?? 15));
    let evaluationOffsetDays: string = $state(String(settings.propositionDefaults?.evaluationOffsetDays ?? 30));

    let sourceCodeUrlErrors: Record<string, string | null> = $state({});
    let hasSourceCodeUrlErrors: boolean = $state(false);

    $effect(() => {
        const nextErrors: Record<string, string | null> = {};
        for (const locale of locales) {
            const value = sourceCodeUrlByLocale[locale.code] ?? '';
            nextErrors[locale.code] = resolveSourceCodeUrlError(value, fallbackLocale === locale.code, getLocaleLabel(locale.code));
        }
        sourceCodeUrlErrors = nextErrors;
        hasSourceCodeUrlErrors = Object.values(nextErrors).some((message) => Boolean(message));
    });

    const updateMapValue = (map: Record<string, string>, localeCode: string, value: string, setter: (next: Record<string, string>) => void): void => {
        setter({ ...map, [localeCode]: value });
    };

    const handleLogoChange = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            pendingLogoFile = null;
            return;
        }
        pendingLogoFile = file;
        showCropper = true;
    };

    const handleCropConfirm = (event: CustomEvent<{ file: File; previewUrl: string }>): void => {
        const { file, previewUrl } = event.detail;
        if (croppedPreviewUrl && croppedPreviewUrl !== previewUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
        croppedFile = file;
        croppedPreviewUrl = previewUrl;
        logoPreview = previewUrl;
        showCropper = false;
        pendingLogoFile = null;
        if (logoInputRef) {
            logoInputRef.value = '';
        }
    };

    const handleCropCancel = (): void => {
        showCropper = false;
        pendingLogoFile = null;
        if (logoInputRef) {
            logoInputRef.value = '';
        }
    };

    $effect(() => {
        if (!logoPreview) {
            if (croppedPreviewUrl) {
                logoPreview = croppedPreviewUrl;
            } else if (initialLogoUrl) {
                logoPreview = initialLogoUrl;
            }
        }
    });

    const submitHandler: SubmitFunction = async ({ formData, cancel }) => {
        if (hasSourceCodeUrlErrors) {
            cancel();
            return;
        }

        isSubmitting = true;

        formData.set('fallbackLocale', fallbackLocale);

        for (const locale of locales) {
            formData.set(`name[${locale.code}]`, nameByLocale[locale.code]?.trim() ?? '');
            formData.set(`description[${locale.code}]`, descriptionByLocale[locale.code]?.trim() ?? '');
            const sourceUrlField = `sourceCodeUrl[${locale.code}]`;
            const sourceUrlValue = sourceCodeUrlByLocale[locale.code]?.trim() ?? '';
            if (sourceUrlValue || fallbackLocale === locale.code) {
                formData.set(sourceUrlField, sourceUrlValue);
            } else {
                formData.delete(sourceUrlField);
            }
            formData.set(`copyright[${locale.code}]`, copyrightByLocale[locale.code]?.trim() ?? '');
        }

        formData.set('propositionDefaults[clarificationOffsetDays]', clarificationOffsetDays.trim() || '0');
        formData.set('propositionDefaults[improvementOffsetDays]', improvementOffsetDays.trim() || '0');
        formData.set('propositionDefaults[voteOffsetDays]', voteOffsetDays.trim() || '0');
        formData.set('propositionDefaults[mandateOffsetDays]', mandateOffsetDays.trim() || '0');
        formData.set('propositionDefaults[evaluationOffsetDays]', evaluationOffsetDays.trim() || '0');

        if (croppedFile) {
            formData.delete('logo');
            formData.append('logo', croppedFile, croppedFile.name);
        }

        return async ({ result, update }) => {
            isSubmitting = false;
            if (result.type === 'failure') {
                await update({ reset: false });
            } else {
                await update();
            }
        };
    };

    onDestroy(() => {
        if (croppedPreviewUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
    });
</script>

<Title title={m['admin.organization.title']()} hasBackground />

<Card class="bg-white/80 shadow-lg dark:bg-slate-950/70">
    <CardContent class="space-y-8 p-6">
        <div class="space-y-2">
            <p class="text-sm text-muted-foreground">{m['admin.organization.description']()}</p>
        </div>

        <div class="flex flex-wrap gap-2">
            <Button type="button" variant={activeTab === 'general' ? 'default' : 'outline'} onclick={() => (activeTab = 'general')}>
                {m['admin.organization.tabs.general']()}
            </Button>
            <Button type="button" variant={activeTab === 'propositions' ? 'default' : 'outline'} onclick={() => (activeTab = 'propositions')}>
                {m['admin.organization.tabs.propositions']()}
            </Button>
        </div>

        <form method="POST" action="?/update" enctype="multipart/form-data" class="grid gap-6 lg:grid-cols-[2fr,1fr]" use:enhance={submitHandler}>
            <div class="space-y-8">
                <div class:hidden={activeTab !== 'general'} class="space-y-8">
                    <FieldLabel forId="fallbackLocale" label={m['admin.organization.fields.fallback-locale']()}>
                        <select
                            id="fallbackLocale"
                            name="fallbackLocale"
                            bind:value={fallbackLocale}
                            class="h-11 w-full rounded-2xl border border-border/60 bg-white/80 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-slate-800/70 dark:bg-slate-900/70"
                            required
                        >
                            {#each locales as locale}
                                <option value={locale.code}>{locale.label}</option>
                            {/each}
                        </select>
                    </FieldLabel>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.name']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <Input
                                        id={`name-${locale.code}`}
                                        name={`name[${locale.code}]`}
                                        placeholder={m['admin.organization.fields.name']()}
                                        value={nameByLocale[locale.code]}
                                        required={fallbackLocale === locale.code}
                                        oninput={(event) => updateMapValue(nameByLocale, locale.code, (event.currentTarget as HTMLInputElement).value, (next) => (nameByLocale = next))}
                                    />
                                </div>
                            </div>
                        {/each}
                    </section>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.description']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <Textarea
                                        id={`description-${locale.code}`}
                                        name={`description[${locale.code}]`}
                                        rows={4}
                                        required={fallbackLocale === locale.code}
                                        value={descriptionByLocale[locale.code]}
                                        oninput={(event) =>
                                            updateMapValue(descriptionByLocale, locale.code, (event.currentTarget as HTMLTextAreaElement).value, (next) => (descriptionByLocale = next))}
                                    />
                                </div>
                            </div>
                        {/each}
                    </section>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.source-code']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <Input
                                        id={`source-${locale.code}`}
                                        type="url"
                                        name={`sourceCodeUrl[${locale.code}]`}
                                        placeholder="https://github.com/..."
                                        value={sourceCodeUrlByLocale[locale.code]}
                                        required={fallbackLocale === locale.code}
                                        aria-invalid={Boolean(sourceCodeUrlErrors[locale.code])}
                                        oninput={(event) =>
                                            updateMapValue(sourceCodeUrlByLocale, locale.code, (event.currentTarget as HTMLInputElement).value, (next) => (sourceCodeUrlByLocale = next))}
                                    />
                                    {#if sourceCodeUrlErrors[locale.code]}
                                        <p class="mt-1 text-sm text-destructive">{sourceCodeUrlErrors[locale.code]}</p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </section>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.copyright']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <Input
                                        id={`copyright-${locale.code}`}
                                        name={`copyright[${locale.code}]`}
                                        placeholder="© 2025 Your Organization"
                                        value={copyrightByLocale[locale.code]}
                                        required={fallbackLocale === locale.code}
                                        oninput={(event) => updateMapValue(copyrightByLocale, locale.code, (event.currentTarget as HTMLInputElement).value, (next) => (copyrightByLocale = next))}
                                    />
                                </div>
                            </div>
                        {/each}
                    </section>
                </div>

                <div class:hidden={activeTab !== 'propositions'} class="space-y-6">
                    <p class="text-sm text-muted-foreground">{m['admin.organization.propositions.description']()}</p>

                    <FieldLabel forId="clarificationOffsetDays" label={m['admin.organization.propositions.clarification']()}>
                        <Input id="clarificationOffsetDays" type="number" name="propositionDefaults[clarificationOffsetDays]" min={0} bind:value={clarificationOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="improvementOffsetDays" label={m['admin.organization.propositions.improvement']()}>
                        <Input id="improvementOffsetDays" type="number" name="propositionDefaults[improvementOffsetDays]" min={0} bind:value={improvementOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="voteOffsetDays" label={m['admin.organization.propositions.vote']()}>
                        <Input id="voteOffsetDays" type="number" name="propositionDefaults[voteOffsetDays]" min={0} bind:value={voteOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="mandateOffsetDays" label={m['admin.organization.propositions.mandate']()}>
                        <Input id="mandateOffsetDays" type="number" name="propositionDefaults[mandateOffsetDays]" min={0} bind:value={mandateOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="evaluationOffsetDays" label={m['admin.organization.propositions.evaluation']()}>
                        <Input id="evaluationOffsetDays" type="number" name="propositionDefaults[evaluationOffsetDays]" min={0} bind:value={evaluationOffsetDays} required />
                    </FieldLabel>
                </div>
            </div>

            <div class="space-y-6" class:hidden={activeTab !== 'general'}>
                <FieldLabel forId="logo" label={m['admin.organization.fields.logo.title']()} info={m['admin.organization.fields.logo.placeholder']()}>
                    <Input type="file" name="logo" id="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange={handleLogoChange} bind:ref={logoInputRef} />
                </FieldLabel>

                <div class="space-y-3">
                    <p class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.logo.title']()}</p>
                    <div class="flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-white/70 shadow-inner dark:bg-slate-900/70">
                        {#if logoPreview}
                            <img src={logoPreview} alt={nameByLocale[fallbackLocale]?.trim() || m['admin.organization.fields.logo.title']()} class="h-full w-full object-cover" />
                        {:else}
                            <span class="text-xs text-muted-foreground">{m['common.logo.alt']()}</span>
                        {/if}
                    </div>
                </div>

                <Button type="submit" class="w-full" loading={isSubmitting} loadingLabel={m['admin.organization.actions.save']()} disabled={isSubmitting || hasSourceCodeUrlErrors}>
                    {m['admin.organization.actions.save']()}
                </Button>
            </div>
        </form>
    </CardContent>
</Card>

{#if showCropper && pendingLogoFile}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <LogoCropper file={pendingLogoFile} on:confirm={handleCropConfirm} on:cancel={handleCropCancel} />
    </div>
{/if}
