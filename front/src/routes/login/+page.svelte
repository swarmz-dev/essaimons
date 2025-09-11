<script lang="ts">
    import Form from '#components/Form.svelte';
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import OauthProviders from '#lib/partials/login/OauthProviders.svelte';
    import Meta from '#components/Meta.svelte';
    import { Input } from '#lib/components/ui/input';
    import { Link } from '#lib/components/ui/link';
    import * as zod from 'zod';

    const schema = zod.object({
        email: zod.email().max(100),
        password: zod.string(),
    });

    let email: string = $state('');
    let password: string = $state('');
    const canSubmit = $derived(schema.safeParse({ email, password }).success);
</script>

<Meta title={m['login.meta.title']()} description={m['login.meta.description']()} keywords={m['login.meta.keywords']().split(', ')} pathname="/login" />

<Title title={m['login.title']()} hasBackground />

<Form isValid={canSubmit}>
    <Input type="email" name="email" placeholder={m['common.email.placeholder']()} label={m['common.email.label']()} bind:value={email} required />
    <Input type="password" name="password" placeholder={m['common.password.placeholder']()} label={m['common.password.label']()} bind:value={password} required />
    {#snippet links()}
        <div class="w-full flex justify-between flex-col sm:flex-row">
            <Link href="/reset-password">{m['login.forgot-password']()}</Link>
            <Link href="/create-account">{m['login.create-account']()}</Link>
        </div>
    {/snippet}
    {#snippet footer()}
        <OauthProviders />
    {/snippet}
</Form>
