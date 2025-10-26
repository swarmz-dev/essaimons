<script lang="ts">
    import AdminForm from '#lib/partials/admin/AdminForm.svelte';
    import type { SerializedUser } from 'backend/types';
    import { Input } from '#lib/components/ui/input';
    import { m } from '#lib/paraglide/messages';
    import { Switch } from '#lib/components/ui/switch';
    import { Button } from '#lib/components/ui/button';
    import LogoCropper from '#lib/components/ui/image/LogoCropper.svelte';
    import { onMount, onDestroy } from 'svelte';
    import * as zod from 'zod';

    const schema = zod.object({
        username: zod.string().min(3).max(50),
        email: zod.email().max(100),
        enabled: zod.boolean(),
        profilePicture: zod.file().mime(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']).optional(),
    });

    type Props = {
        user?: SerializedUser;
    };

    let { user }: Props = $props();

    let formValues = $state({
        email: '',
        username: '',
        enabled: false,
    });

    // Profile picture cropping state
    const initialProfilePictureUrl: string | null = user?.profilePicture ? `/assets/profile-picture/${user.profilePicture.id}?no-cache=true` : null;
    let profilePicturePreview: string | null = $state(initialProfilePictureUrl);
    let profilePictureInputRef: HTMLInputElement | undefined = $state();
    let pendingProfilePictureFile: File | null = $state(null);
    let showCropper: boolean = $state(false);
    let croppedFile: File | null = $state(null);
    let croppedPreviewUrl: string | null = $state(null);

    let profilePicture: File | undefined = $derived(croppedFile || undefined);
    const canSubmit: boolean = $derived(schema.safeParse({ email: formValues.email, username: formValues.username, enabled: formValues.enabled, profilePicture }).success);

    onMount(() => {
        setInitialValues();
    });

    onDestroy(() => {
        if (croppedPreviewUrl && croppedPreviewUrl !== initialProfilePictureUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
    });

    const setInitialValues = (): void => {
        formValues.email = user?.email || '';
        formValues.username = user?.username || '';
        formValues.enabled = user?.enabled || false;
        profilePicturePreview = initialProfilePictureUrl;
    };

    const handleError = (): void => {
        setInitialValues();
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

    // Custom form submit handler to inject the cropped file
    const handleBeforeSubmit = (formData: FormData): void => {
        if (croppedFile) {
            // Remove the empty file input and add the cropped file
            formData.delete('profilePicture');
            formData.append('profilePicture', croppedFile, croppedFile.name);
        }
    };
</script>

<AdminForm
    id={user?.id}
    {canSubmit}
    deleteTitle={m['admin.user.delete.title']({ users: [user?.email] })}
    deleteText={m['admin.user.delete.text']({ users: [user?.email], count: 1 })}
    onError={handleError}
    onBeforeSubmit={handleBeforeSubmit}
>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-8">
            <Input name="username" label={m['admin.user.fields.username']()} min={3} max={50} bind:value={formValues.username} required />
            <Input name="email" label={m['admin.user.fields.email']()} min={3} max={100} bind:value={formValues.email} readonly={!!user} required />
            <Switch name="enabled" label={m['admin.user.fields.enabled']()} bind:checked={formValues.enabled} />
        </div>
        <div class="flex flex-col gap-4">
            <div>
                <label for="profilePicture" class="text-sm font-medium text-foreground">
                    {m['admin.user.new.profile-picture.title']()}
                </label>
                <p class="text-xs text-muted-foreground mb-2">
                    {m['admin.user.new.profile-picture.description']()}
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
    </div>
</AdminForm>

{#if showCropper && pendingProfilePictureFile}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <LogoCropper
            file={pendingProfilePictureFile}
            previewWidth={320}
            previewHeight={320}
            outputWidth={512}
            outputHeight={512}
            showBackgroundPicker={true}
            title={m['admin.user.crop.title']()}
            instructions={m['admin.user.crop.instructions']()}
            zoomLabel={m['admin.user.crop.zoom']()}
            backgroundLabel={m['admin.user.crop.background']()}
            resetLabel={m['admin.user.crop.reset']()}
            cancelLabel={m['common.cancel']()}
            applyLabel={m['admin.user.crop.apply']()}
            outputMimeType="image/png"
            outputQuality={0.92}
            on:confirm={handleCropConfirm}
            on:cancel={handleCropCancel}
        />
    </div>
{/if}
