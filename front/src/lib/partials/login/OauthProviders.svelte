<script lang="ts">
    import Icon from '#components/Icon.svelte';
    import { showToast } from '#lib/services/toastService';
    import { PUBLIC_API_REAL_URI } from '$env/static/public';
    import { Button } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';

    type Provider = 'google' | 'github' | 'discord';

    const handleOauthClick = async (provider: Provider): Promise<void> => {
        try {
            window.location.href = `${PUBLIC_API_REAL_URI}/api/auth/${provider}`;
        } catch (error: any) {
            showToast(error.response.data.error, 'error');
        }
    };
</script>

<div class="flex flex-col gap-1 items-center px-8">
    <Button type="button" size="icon" class="w-full" onclick={() => handleOauthClick('google')}>
        <Icon name="google" size={42} />
        <p>{m['login.login-with']()} Google</p>
    </Button>
    <Button type="button" size="icon" class="w-full" onclick={() => handleOauthClick('github')}>
        <Icon name="github" size={42} />
        <p>{m['login.login-with']()} Github</p>
    </Button>
    <Button type="button" size="icon" class="w-full" onclick={() => handleOauthClick('discord')}>
        <Icon name="discord" size={54} />
        <p>{m['login.login-with']()} Discord</p>
    </Button>
</div>
