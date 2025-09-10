<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import Form from '#components/Form.svelte';
    import { Input } from '#lib/components/ui/input';
    import { m } from '#lib/paraglide/messages';
    import { profile } from '#lib/stores/profileStore';
    import Meta from '#components/Meta.svelte';
    import * as zod from 'zod';

    const schema = zod.object({
        email: zod.email().max(100),
    });

    let email: string = $state('');
    let readonly: boolean = $state(false);
    const canSubmit: boolean = $derived(schema.safeParse({ email }).success);

    $effect((): void => {
        if ($profile && $profile.email) {
            email = $profile.email;
            readonly = true;
        }
    });
</script>

<Meta title={m['reset-password.meta.title']()} description={m['reset-password.meta.description']()} keywords={m['reset-password.meta.keywords']().split(', ')} pathname="/reset-password" />

<Title title={m['reset-password.title']()} hasBackground />

<Form isValid={canSubmit}>
    <Input label={m['common.email.label']()} placeholder={m['common.email.placeholder']()} type="email" name="email" bind:value={email} required {readonly} />
</Form>
