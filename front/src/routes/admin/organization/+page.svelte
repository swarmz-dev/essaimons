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

    const { data } = $props<{ data: { settings: SerializedOrganizationSettings } }>();
    const settings = data.settings;

    const locales = settings.locales.length ? settings.locales : [{ code: settings.fallbackLocale ?? 'en', label: settings.fallbackLocale ?? 'en', isDefault: true }];

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

    const submitHandler: SubmitFunction = async ({ formData }) => {
        isSubmitting = true;

        formData.set('fallbackLocale', fallbackLocale);

        for (const locale of locales) {
            formData.set(`name[${locale.code}]`, nameByLocale[locale.code]?.trim() ?? '');
            formData.set(`description[${locale.code}]`, descriptionByLocale[locale.code]?.trim() ?? '');
            formData.set(`sourceCodeUrl[${locale.code}]`, sourceCodeUrlByLocale[locale.code]?.trim() ?? '');
            formData.set(`copyright[${locale.code}]`, copyrightByLocale[locale.code]?.trim() ?? '');
        }

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

        <form method="POST" action="?/update" enctype="multipart/form-data" class="grid gap-6 lg:grid-cols-[2fr,1fr]" use:enhance={submitHandler}>
            <div class="space-y-8">
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
                                    oninput={(event) => updateMapValue(descriptionByLocale, locale.code, (event.currentTarget as HTMLTextAreaElement).value, (next) => (descriptionByLocale = next))}
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
                                    oninput={(event) => updateMapValue(sourceCodeUrlByLocale, locale.code, (event.currentTarget as HTMLInputElement).value, (next) => (sourceCodeUrlByLocale = next))}
                                />
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

            <div class="space-y-6">
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

                <Button type="submit" class="w-full" loading={isSubmitting} loadingLabel={m['admin.organization.actions.save']()}>{m['admin.organization.actions.save']()}</Button>
            </div>
        </form>
    </CardContent>
</Card>

{#if showCropper && pendingLogoFile}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <LogoCropper file={pendingLogoFile} on:confirm={handleCropConfirm} on:cancel={handleCropCancel} />
    </div>
{/if}
