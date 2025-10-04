<script lang="ts">
    import { enhance } from '$app/forms';
    import Meta from '#components/Meta.svelte';
    import { Title } from '#lib/components/ui/title';
    import { Input } from '#lib/components/ui/input';
    import { Button } from '#lib/components/ui/button';
    import { Switch } from '#lib/components/ui/switch';
    import { m } from '#lib/paraglide/messages';
    import { wrappedFetch } from '#lib/services/requestService';
    import { Loader2 } from '@lucide/svelte';

    const { data, form } = $props();

    let enabled = $state(data.settings?.enabled ?? false);
    let botToken = $state('');
    let guildId = $state(data.settings?.guildId ?? '');
    let defaultChannelId = $state(data.settings?.defaultChannelId ?? '');
    let isSubmitting = $state(false);
    let guilds = $state<Array<{ id: string; name: string }>>([]);
    let channels = $state<Array<{ id: string; name: string }>>([]);
    let isLoadingGuilds = $state(false);
    let isLoadingChannels = $state(false);

    const loadGuilds = async () => {
        if (!botToken) return;

        isLoadingGuilds = true;
        try {
            const response = await wrappedFetch('/admin/discord/guilds', {
                method: 'POST',
                body: { botToken },
            });

            if (response?.guilds) {
                guilds = response.guilds;
            }
        } catch (error) {
            console.error('Failed to load guilds:', error);
        } finally {
            isLoadingGuilds = false;
        }
    };

    const loadChannels = async () => {
        if (!botToken || !guildId) return;

        isLoadingChannels = true;
        try {
            const response = await wrappedFetch('/admin/discord/channels', {
                method: 'POST',
                body: { botToken, guildId },
            });

            if (response?.channels) {
                channels = response.channels;
            }
        } catch (error) {
            console.error('Failed to load channels:', error);
        } finally {
            isLoadingChannels = false;
        }
    };

    $effect(() => {
        if (guildId && botToken) {
            loadChannels();
        }
    });
</script>

<Meta title="Discord Settings - Admin" />

<div class="container mx-auto max-w-4xl py-8">
    <Title title="Paramètres Discord" />

    <div class="mt-8 rounded-lg border bg-card p-6">
        <form
            method="POST"
            use:enhance={() => {
                isSubmitting = true;
                return async ({ update }) => {
                    await update();
                    isSubmitting = false;
                };
            }}
        >
            <div class="space-y-6">
                <!-- Enable/Disable Toggle -->
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-medium">Activer l'intégration Discord</h3>
                        <p class="text-sm text-muted-foreground">Permet de créer des événements Discord directement depuis l'application</p>
                    </div>
                    <Switch bind:checked={enabled} name="enabled" value={enabled ? 'true' : 'false'} />
                </div>

                {#if enabled}
                    <!-- Bot Token -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium">
                            Bot Token
                            <span class="text-red-600">*</span>
                        </label>
                        <div class="flex gap-2">
                            <Input type="password" name="botToken" bind:value={botToken} placeholder="MTQyMzE0Njg1MjgxMDg4NzE4OA..." required class="flex-1" />
                            <Button type="button" variant="outline" onclick={loadGuilds} disabled={!botToken || isLoadingGuilds}>
                                {#if isLoadingGuilds}
                                    <Loader2 class="size-4 animate-spin" />
                                {:else}
                                    Charger les serveurs
                                {/if}
                            </Button>
                        </div>
                        <p class="text-xs text-muted-foreground">
                            Token du bot Discord (trouvable dans Discord Developer Portal > Bot > Token)
                            {#if data.settings?.hasBotToken}
                                <span class="text-green-600">✓ Token configuré</span>
                            {/if}
                        </p>
                    </div>

                    <!-- Guild ID -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium">
                            Serveur Discord
                            <span class="text-red-600">*</span>
                        </label>
                        {#if guilds.length > 0}
                            <select name="guildId" bind:value={guildId} class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" required>
                                <option value="">Sélectionnez un serveur</option>
                                {#each guilds as guild}
                                    <option value={guild.id}>{guild.name}</option>
                                {/each}
                            </select>
                        {:else}
                            <Input type="text" name="guildId" bind:value={guildId} placeholder="1234567890123456789" required />
                        {/if}
                        <p class="text-xs text-muted-foreground">ID du serveur Discord où créer les événements</p>
                    </div>

                    <!-- Default Channel ID -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium">Canal vocal par défaut</label>
                        {#if channels.length > 0}
                            <select name="defaultChannelId" bind:value={defaultChannelId} class="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                                <option value="">Aucun canal par défaut</option>
                                {#each channels as channel}
                                    <option value={channel.id}>{channel.name}</option>
                                {/each}
                            </select>
                        {:else}
                            <Input type="text" name="defaultChannelId" bind:value={defaultChannelId} placeholder="1234567890123456789 (optionnel)" />
                        {/if}
                        <p class="text-xs text-muted-foreground">Canal vocal utilisé par défaut pour les événements</p>
                    </div>
                {/if}

                {#if form?.error}
                    <div class="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {form.error}
                    </div>
                {/if}

                <!-- Submit -->
                <div class="flex justify-end gap-3 border-t pt-4">
                    <Button type="submit" disabled={isSubmitting || (enabled && !botToken)}>
                        {#if isSubmitting}
                            <Loader2 class="mr-2 size-4 animate-spin" />
                        {/if}
                        Enregistrer
                    </Button>
                </div>
            </div>
        </form>
    </div>

    <!-- Instructions -->
    <div class="mt-6 rounded-lg border border-border/50 bg-muted/50 p-6">
        <h3 class="mb-3 text-lg font-semibold">Comment configurer Discord ?</h3>
        <ol class="space-y-2 text-sm">
            <li>
                1. Créez un bot sur <a href="https://discord.com/developers/applications" target="_blank" class="text-primary underline">Discord Developer Portal</a>
            </li>
            <li>
                2. Copiez le <strong>Bot Token</strong>
                 depuis l'onglet "Bot"
            </li>
            <li>
                3. Invitez le bot sur votre serveur avec les permissions : <code class="rounded bg-muted px-1">Manage Events</code>
                ,
                <code class="rounded bg-muted px-1">View Channels</code>
            </li>
            <li>4. Collez le Bot Token ci-dessus et cliquez sur "Charger les serveurs"</li>
            <li>5. Sélectionnez votre serveur et un canal vocal par défaut</li>
        </ol>
    </div>
</div>
