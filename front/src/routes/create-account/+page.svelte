<script lang="ts">
    import Form from '#components/Form.svelte';
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { Input } from '#lib/components/ui/input';
    import OauthProviders from '#lib/partials/login/OauthProviders.svelte';
    import Meta from '#components/Meta.svelte';
    import { Switch } from '#lib/components/ui/switch';
    import { page } from '$app/state';
    import * as zod from 'zod';

    const passwordPattern: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

    const schema = zod
        .object({
            username: zod.string().min(3).max(50),
            email: zod.email().max(100),
            password: zod.string().min(8).max(100).regex(passwordPattern),
            confirmPassword: zod.string().min(8).max(100),
            consent: zod.literal(true),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: m['common.password.match'](),
            path: ['confirmPassword'],
        });

    let username: string = $state('');
    let email: string = $state('');
    let password: string = $state('');
    let confirmPassword: string = $state('');
    let consent: boolean = $state(false);

    let passwordTouched: boolean = $state(false);
    let confirmTouched: boolean = $state(false);
    let passwordErrors: string[] = $state([]);
    let passwordsMismatch: boolean = $state(false);

    const canSubmit: boolean = $derived(schema.safeParse({ username, email, password, confirmPassword, consent }).success);

    $effect((): void => {
        if (password.length > 0) {
            passwordTouched = true;
        }
    });

    $effect((): void => {
        if (confirmPassword.length > 0) {
            confirmTouched = true;
        }
    });

    $effect((): void => {
        if (!password) {
            passwordErrors = [];
            return;
        }

        const errors: string[] = [];

        if (password.length < 8) {
            errors.push(m['common.password.length']());
        }

        if (!/[a-z]/.test(password)) {
            errors.push(m['common.password.lowercase']());
        }

        if (!/[A-Z]/.test(password)) {
            errors.push(m['common.password.uppercase']());
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push(m['common.password.special-character']());
        }

        passwordErrors = errors;
    });

    $effect((): void => {
        passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
    });

    $effect((): void => {
        const errorData = page.data.formError?.data;
        if (errorData) {
            username = errorData.username ?? '';
            email = errorData.email ?? '';
            password = errorData.password ?? '';
            confirmPassword = errorData.confirmPassword ?? '';
            consent = errorData.consent ?? false;
            passwordTouched = true;
            confirmTouched = true;
        }
    });
</script>

<Meta title={m['create-account.meta.title']()} description={m['create-account.meta.description']()} keywords={m['create-account.meta.keywords']().split(', ')} pathname="/create-account" />

<Title title={m['create-account.title']()} hasBackground />

<Form isValid={canSubmit}>
    <Input name="username" placeholder={m['common.username.placeholder']()} label={m['common.username.label']()} bind:value={username} required />
    <Input type="email" name="email" placeholder={m['common.email.placeholder']()} label={m['common.email.label']()} bind:value={email} required />
    <Input
        type="password"
        name="password"
        placeholder={m['common.password.placeholder']()}
        label={m['common.password.label']()}
        bind:value={password}
        aria-invalid={passwordTouched && passwordErrors.length > 0}
        required
    />
    {#if passwordTouched && passwordErrors.length > 0}
        <div class="mt-2 text-sm text-destructive">
            <p class="font-medium">{m['common.password.requirements-title']()}</p>
            <ul class="list-disc list-inside">
                {#each passwordErrors as error}
                    <li>{error}</li>
                {/each}
            </ul>
        </div>
    {/if}
    <Input
        type="password"
        name="confirm-password"
        placeholder={m['common.confirm-password.placeholder']()}
        label={m['common.confirm-password.label']()}
        bind:value={confirmPassword}
        aria-invalid={confirmTouched && passwordsMismatch}
        required
    />
    {#if confirmTouched && passwordsMismatch}
        <p class="mt-2 text-sm text-destructive">{m['common.password.match']()}</p>
    {/if}
    <Switch name="consent" label={m['common.consent']()} bind:checked={consent} required />
    {#snippet footer()}
        <OauthProviders />
    {/snippet}
</Form>
