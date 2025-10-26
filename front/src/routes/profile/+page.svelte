<script lang="ts">
    import Form from '#components/Form.svelte';
    import { Input } from '#lib/components/ui/input';
    import { Title } from '#lib/components/ui/title';
    import { Link } from '#lib/components/ui/link';
    import { Button } from '#lib/components/ui/button';
    import { profile } from '#lib/stores/profileStore';
    import { m } from '#lib/paraglide/messages';
    import LogoCropper from '#lib/components/ui/image/LogoCropper.svelte';
    import { type SerializedUser } from 'backend/types';
    import Meta from '#components/Meta.svelte';
    import * as zod from 'zod';
    import { showToast } from '#lib/services/toastService';
    import { onDestroy } from 'svelte';

    const schema = zod.object({
        username: zod.string().min(3).max(50),
        email: zod.email().max(100),
        profilePicture: zod.file().mime(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']).optional(),
    });

    let formValues: { username: string; email: string } = $state({
        username: $profile?.username || '',
        email: $profile?.email || '',
    });

    // Profile picture cropping state
    let profileData: SerializedUser = $profile!;
    const initialProfilePictureUrl: string | null = profileData.profilePicture ? `/assets/profile-picture/${profileData.profilePicture.id}?no-cache=true` : null;
    let profilePicturePreview: string | null = $state(initialProfilePictureUrl);
    let profilePictureInputRef: HTMLInputElement | undefined = $state();
    let pendingProfilePictureFile: File | null = $state(null);
    let showCropper: boolean = $state(false);
    let croppedFile: File | null = $state(null);
    let croppedPreviewUrl: string | null = $state(null);

    let profilePicture: File | undefined = $derived(croppedFile || undefined);
    const canSubmit: boolean = $derived(schema.safeParse({ username: formValues.username, email: formValues.email, profilePicture }).success);

    let isExporting: boolean = $state(false);

    onDestroy(() => {
        if (croppedPreviewUrl && croppedPreviewUrl !== initialProfilePictureUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
    });

    const handleError = (): void => {
        formValues = {
            username: $profile!.username,
            email: $profile!.email,
        };
        profilePicturePreview = initialProfilePictureUrl;
    };

    const handleProfilePictureChange = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            pendingProfilePictureFile = null;
            return;
        }
        pendingProfilePictureFile = file;
        showCropper = true;
    };

    const handleCropConfirm = (event: CustomEvent<{ file: File; previewUrl: string }>): void => {
        const { file, previewUrl } = event.detail;
        if (croppedPreviewUrl && croppedPreviewUrl !== previewUrl && croppedPreviewUrl !== initialProfilePictureUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
        croppedFile = file;
        croppedPreviewUrl = previewUrl;
        profilePicturePreview = previewUrl;
        showCropper = false;
        pendingProfilePictureFile = null;
        if (profilePictureInputRef) {
            profilePictureInputRef.value = '';
        }
    };

    const handleCropCancel = (): void => {
        showCropper = false;
        pendingProfilePictureFile = null;
        if (profilePictureInputRef) {
            profilePictureInputRef.value = '';
        }
    };

    const removeProfilePicture = (): void => {
        if (croppedPreviewUrl && croppedPreviewUrl !== initialProfilePictureUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
        croppedFile = null;
        croppedPreviewUrl = null;
        profilePicturePreview = null;
        if (profilePictureInputRef) {
            profilePictureInputRef.value = '';
        }
    };

    const handleBeforeSubmit = (formData: FormData): void => {
        if (croppedFile) {
            formData.delete('profilePicture');
            formData.append('profilePicture', croppedFile, croppedFile.name);
        }
    };

    const downloadExport = async (): Promise<void> => {
        if (isExporting) {
            return;
        }

        isExporting = true;

        try {
            const response = await fetch('/profile/export');

            if (!response.ok) {
                let errorMessage = m['profile.export-data.error']();
                try {
                    const data = await response.json();
                    if (data?.error && typeof data.error === 'string') {
                        errorMessage = data.error;
                    }
                } catch (error) {
                    // Ignore parsing errors and use default message
                }

                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const disposition = response.headers.get('content-disposition');
            let fileName = `user-export-${new Date().toISOString()}.json`;

            if (disposition) {
                const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
                const extracted = match?.[1] ?? match?.[2];
                if (extracted) {
                    try {
                        fileName = decodeURIComponent(extracted);
                    } catch (error) {
                        fileName = extracted;
                    }
                }
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast(m['profile.export-data.success'](), 'success');
        } catch (error: any) {
            const message: string = typeof error?.message === 'string' ? error.message : m['profile.export-data.error']();
            showToast(message, 'error');
        } finally {
            isExporting = false;
        }
    };
</script>

<Meta title={m['profile.meta.title']()} description={m['profile.meta.description']()} keywords={m['profile.meta.keywords']().split(', ')} pathname="/profile" />

<Title title={m['profile.title']()} hasBackground />
<div class="flex flex-wrap gap-4">
    <Link href="/reset-password">
        {m['profile.reset-password']()}
    </Link>
    <Link href="/profile/notifications">
        {m['profile.notifications.title']()}
    </Link>
    <Link href="/profile/devices">
        {m['profile.devices.title']()}
    </Link>
</div>

<Form isValid={canSubmit} onError={handleError} onBeforeSubmit={handleBeforeSubmit}>
    <Input name="username" placeholder={m['common.username.label']()} label={m['common.username.label']()} min={3} max={50} bind:value={formValues.username} required />
    <Input name="email" placeholder={m['common.email.label']()} label={m['common.email.label']()} max={100} bind:value={formValues.email} readonly required />

    <div class="flex flex-col gap-4">
        <div>
            <label for="profilePicture" class="text-sm font-medium text-foreground">
                {m['profile.profile-picture.title']()}
            </label>
            <p class="text-xs text-muted-foreground mb-2">
                {m['profile.profile-picture.description']()}
            </p>
        </div>

        {#if profilePicturePreview}
            <div class="relative w-32 h-32 rounded-full overflow-hidden border-2 border-border">
                <img src={profilePicturePreview} alt="Profile preview" class="w-full h-full object-cover" />
            </div>
            <div class="flex gap-2">
                <Button type="button" variant="outline" size="sm" onclick={removeProfilePicture}>
                    {m['common.remove']()}
                </Button>
                <Button type="button" variant="outline" size="sm" onclick={() => profilePictureInputRef?.click()}>
                    {m['common.change']()}
                </Button>
            </div>
        {:else}
            <Button type="button" variant="outline" onclick={() => profilePictureInputRef?.click()}>
                {m['common.upload']()}
            </Button>
        {/if}

        <input
            bind:this={profilePictureInputRef}
            type="file"
            id="profilePicture"
            name="profilePicture"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            onchange={handleProfilePictureChange}
            class="hidden"
        />
    </div>
</Form>

{#if showCropper && pendingProfilePictureFile}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <LogoCropper
            file={pendingProfilePictureFile}
            previewWidth={320}
            previewHeight={320}
            outputWidth={512}
            outputHeight={512}
            showBackgroundPicker={true}
            title={m['profile.crop.title']()}
            instructions={m['profile.crop.instructions']()}
            zoomLabel={m['profile.crop.zoom']()}
            backgroundLabel={m['profile.crop.background']()}
            resetLabel={m['profile.crop.reset']()}
            cancelLabel={m['common.cancel']()}
            applyLabel={m['profile.crop.apply']()}
            outputMimeType="image/png"
            outputQuality={0.92}
            on:confirm={handleCropConfirm}
            on:cancel={handleCropCancel}
        />
    </div>
{/if}

<section class="mt-10 space-y-4">
    <div>
        <h2 class="text-lg font-semibold text-foreground">{m['profile.export-data.title']()}</h2>
        <p class="text-sm text-muted-foreground">{m['profile.export-data.description']()}</p>
    </div>
    <Button type="button" onclick={downloadExport} loading={isExporting} loadingLabel={m['profile.export-data.loading']()} class="w-full sm:w-auto">
        {m['profile.export-data.cta']()}
    </Button>
</section>
