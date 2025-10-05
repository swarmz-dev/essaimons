<script lang="ts">
    import Form from '#components/Form.svelte';
    import { Input } from '#lib/components/ui/input';
    import { Title } from '#lib/components/ui/title';
    import { Link } from '#lib/components/ui/link';
    import { Button } from '#lib/components/ui/button';
    import { profile } from '#lib/stores/profileStore';
    import { m } from '#lib/paraglide/messages';
    import FileUpload from '#components/FileUpload.svelte';
    import { type SerializedUser } from 'backend/types';
    import Meta from '#components/Meta.svelte';
    import * as zod from 'zod';
    import { showToast } from '#lib/services/toastService';

    const schema = zod.object({
        username: zod.string().min(3).max(50),
        email: zod.email().max(100),
        profilePicture: zod.file().mime(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']).optional(),
    });

    let formValues: { username: string; email: string } = $state({
        username: $profile?.username || '',
        email: $profile?.email || '',
    });
    let profilePicture: File | undefined = $state();
    const canSubmit: boolean = $derived(schema.safeParse({ username: formValues.username, email: formValues.email, profilePicture }).success);

    let profileData: SerializedUser = $profile!;
    let isExporting: boolean = $state(false);

    const handleError = (): void => {
        formValues = {
            username: $profile!.username,
            email: $profile!.email,
        };
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

<Form isValid={canSubmit} onError={handleError}>
    <Input name="username" placeholder={m['common.username.label']()} label={m['common.username.label']()} min={3} max={50} bind:value={formValues.username} required />
    <Input name="email" placeholder={m['common.email.label']()} label={m['common.email.label']()} max={100} bind:value={formValues.email} readonly required />
    <FileUpload
        name="profilePicture"
        accept="png jpg jpeg gif webp svg"
        fileName={profileData.profilePicture?.name}
        title={m['profile.profile-picture.title']()}
        description={m['profile.profile-picture.description']()}
        pathPrefix="profile-picture"
        id={profileData.id}
        bind:file={profilePicture}
    />
</Form>

<section class="mt-10 space-y-4">
    <div>
        <h2 class="text-lg font-semibold text-foreground">{m['profile.export-data.title']()}</h2>
        <p class="text-sm text-muted-foreground">{m['profile.export-data.description']()}</p>
    </div>
    <Button type="button" onclick={downloadExport} loading={isExporting} loadingLabel={m['profile.export-data.loading']()} class="w-full sm:w-auto">
        {m['profile.export-data.cta']()}
    </Button>
</section>
