<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { Card, CardContent } from '#lib/components/ui/card';
    import { FieldLabel } from '#lib/components/forms';
    import { Input } from '#lib/components/ui/input';
    import { Textarea } from '#lib/components/ui/textarea';
    import { Button } from '#lib/components/ui/button';
    import { Checkbox } from '#lib/components/ui/checkbox';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { m } from '#lib/paraglide/messages';
    import LogoCropper from '#lib/components/ui/image/LogoCropper.svelte';
    import type { SerializedOrganizationSettings } from 'backend/types';
    import { onDestroy } from 'svelte';

    const { data } = $props<{ data: { settings: SerializedOrganizationSettings } }>();
    const settings = data.settings;

    const initialLogoUrl: string | null = settings.logo ? `/assets/organization/logo/${settings.logo.id}?no-cache=true` : null;

    let name: string = $state(settings.name ?? '');
    let description: string = $state(settings.description ?? '');
    let sourceCodeUrl: string = $state(settings.sourceCodeUrl ?? '');
    let copyright: string = $state(settings.copyright ?? '');
    let logoPreview: string | null = $state(initialLogoUrl);
    let logoInputRef: HTMLInputElement | undefined = $state();
    let pendingLogoFile: File | null = $state(null);
    let showCropper: boolean = $state(false);
    let croppedFile: File | null = $state(null);
    let croppedPreviewUrl: string | null = $state(null);
    let isSubmitting: boolean = $state(false);

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
            <div class="space-y-6">
                <FieldLabel forId="name" label={m['admin.organization.fields.name']()}>
                    <Input name="name" id="name" bind:value={name} placeholder={m['admin.organization.fields.name']()} />
                </FieldLabel>

                <FieldLabel forId="description" label={m['admin.organization.fields.description']()}>
                    <Textarea name="description" id="description" bind:value={description} rows={4} />
                </FieldLabel>

                <FieldLabel forId="sourceCodeUrl" label={m['admin.organization.fields.source-code']()}>
                    <Input type="url" name="sourceCodeUrl" id="sourceCodeUrl" bind:value={sourceCodeUrl} placeholder="https://github.com/..." />
                </FieldLabel>

                <FieldLabel forId="copyright" label={m['admin.organization.fields.copyright']()}>
                    <Input name="copyright" id="copyright" bind:value={copyright} placeholder="© 2025 Your Organization" />
                </FieldLabel>
            </div>

            <div class="space-y-6">
                <FieldLabel forId="logo" label={m['admin.organization.fields.logo.title']()} info={m['admin.organization.fields.logo.placeholder']()}>
                    <Input type="file" name="logo" id="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange={handleLogoChange} bind:ref={logoInputRef} />
                </FieldLabel>

                <div class="space-y-3">
                    <p class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.logo.title']()}</p>
                    <div class="flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-white/70 shadow-inner dark:bg-slate-900/70">
                        {#if logoPreview}
                            <img src={logoPreview} alt={name || m['admin.organization.fields.logo.title']()} class="h-full w-full object-cover" />
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
        <LogoCropper file={pendingLogoFile as File} on:confirm={handleCropConfirm} on:cancel={handleCropCancel} />
    </div>
{/if}
