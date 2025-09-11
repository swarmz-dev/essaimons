<script lang="ts">
    import Form from '#components/Form.svelte';
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import Meta from '#components/Meta.svelte';
    import { Input } from '#lib/components/ui/input';
    import * as zod from 'zod';

    const schema = zod
        .object({
            password: zod.string().min(8).max(100),
            confirmPassword: zod.string().min(8).max(100),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: m['common.password.match'](),
            path: ['confirmPassword'],
        });

    interface Props {
        token: string;
    }

    let { token }: Props = $props();

    let password: string = $state('');
    let confirmPassword: string = $state('');
    const canSubmit: boolean = $derived(schema.safeParse({ password, confirmPassword }).success);
</script>

<meta name="robots" content="noindex, nofollow" />
<Meta
    title={m['reset-password.confirm.meta.title']()}
    description={m['reset-password.confirm.meta.description']()}
    keywords={m['reset-password.confirm.meta.keywords']().split(', ')}
    pathname={`/reset-password/confirm/${token}`}
/>

<Title title={m['reset-password.confirm.title']()} hasBackground />

<Form isValid={canSubmit}>
    <Input type="password" name="password" placeholder={m['common.password.placeholder']()} label={m['common.password.label']()} bind:value={password} required />
    <Input type="password" name="confirm-password" placeholder={m['common.confirm-password.placeholder']()} label={m['common.confirm-password.label']()} bind:value={confirmPassword} required />
</Form>
