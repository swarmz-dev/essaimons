<script lang="ts">
    import AdminForm from '#lib/partials/admin/AdminForm.svelte';
    import type { SerializedUser } from 'backend/types';
    import { Input } from '#lib/components/ui/input';
    import { m } from '#lib/paraglide/messages';
    import FileUpload from '#components/FileUpload.svelte';
    import { Switch } from '#lib/components/ui/switch';
    import { onMount } from 'svelte';
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
    let profilePicture: File | undefined = $state();
    const canSubmit: boolean = $derived(schema.safeParse({ email: formValues.email, username: formValues.username, enabled: formValues.enabled, profilePicture }).success);

    onMount(() => {
        setInitialValues();
    });

    const setInitialValues = (): void => {
        formValues.email = user?.email || '';
        formValues.username = user?.username || '';
        formValues.enabled = user?.enabled || false;
    };

    const handleError = (): void => {
        setInitialValues();
    };
</script>

<AdminForm
    id={user?.id}
    {canSubmit}
    deleteTitle={m['admin.user.delete.title']({ users: [user?.email] })}
    deleteText={m['admin.user.delete.text']({ users: [user?.email], count: 1 })}
    onError={handleError}
>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-8">
            <Input name="username" label={m['admin.user.fields.username']()} min={3} max={50} bind:value={formValues.username} required />
            <Input name="email" label={m['admin.user.fields.email']()} min={3} max={100} bind:value={formValues.email} readonly={!!user} required />
            <Switch name="enabled" label={m['admin.user.fields.enabled']()} bind:checked={formValues.enabled} disabled />
        </div>
        <div>
            <FileUpload
                name="profilePicture"
                accept="png jpg jpeg gif webp svg"
                fileName={user?.profilePicture?.name}
                title={m['admin.user.new.profile-picture.title']()}
                description={m['admin.user.new.profile-picture.description']()}
                pathPrefix="profile-picture"
                id={user?.id || ''}
                bind:file={profilePicture}
            />
        </div>
    </div>
</AdminForm>
