<script lang="ts">
    import Form from '#components/Form.svelte';
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import OauthProviders from '#lib/partials/login/OauthProviders.svelte';
    import Meta from '#components/Meta.svelte';
    import { Input } from '#lib/components/ui/input';
    import { Link } from '#lib/components/ui/link';
    import { page } from '$app/state';
    import * as zod from 'zod';

    const schema = zod.object({
        identity: zod.string().trim().min(1).max(100),
        password: zod.string(),
    });

    let identity: string = $state('');
    let password: string = $state('');
    let showResendPrompt: boolean = $state(false);
    const canSubmit = $derived(schema.safeParse({ identity, password }).success);

    $effect((): void => {
        const formError = page.data.formError;
        if (!formError) {
            return;
        }

        const errorData = formError.data;
        if (errorData) {
            identity = errorData.identity ?? errorData.email ?? identity;
            password = '';
        }

        const meta = formError.meta;
        showResendPrompt = meta?.reason === 'account_inactive';
    });
</script>

<Meta title={m['login.meta.title']()} description={m['login.meta.description']()} keywords={m['login.meta.keywords']().split(', ')} pathname="/login" />

<Title title={m['login.title']()} hasBackground />

<Form isValid={canSubmit}>
    <Input type="text" name="identity" placeholder={m['common.identity.placeholder']()} label={m['common.identity.label']()} bind:value={identity} required />
    <Input type="password" name="password" placeholder={m['common.password.placeholder']()} label={m['common.password.label']()} bind:value={password} required />
    {#snippet links()}
        <div class="w-full flex justify-between flex-col sm:flex-row">
            <Link href="/reset-password">{m['login.forgot-password']()}</Link>
            <Link href="/create-account">{m['login.create-account']()}</Link>
        </div>
        {#if showResendPrompt}
            <div class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <p>{m['login.resend.info']()}</p>
                <Link href="/create-account" class="mt-2 inline-flex">{m['login.resend.cta']()}</Link>
            </div>
        {/if}
    {/snippet}
    {#snippet footer()}
        <OauthProviders />
    {/snippet}
</Form>
