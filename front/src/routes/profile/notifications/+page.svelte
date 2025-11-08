<script lang="ts">
    import { onMount } from 'svelte';
    import { Title } from '#lib/components/ui/title';
    import { Button } from '#lib/components/ui/button';
    import { NotificationSettingsService, type NotificationSetting } from '$lib/services/notificationSettingsService';
    import { m } from '#lib/paraglide/messages';
    import Meta from '#components/Meta.svelte';
    import { showToast } from '#lib/services/toastService';
    import { Loader2, Bell, Mail, Smartphone } from '@lucide/svelte';

    const settingsService = new NotificationSettingsService();

    let settings = $state<NotificationSetting[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let error = $state<string | null>(null);
    let emailFrequency = $state<string>('daily');

    // Notification type metadata
    const notificationTypes = [
        { key: 'status_transition', labelKey: 'notifications.types.status_transition' },
        { key: 'mandate_assigned', labelKey: 'notifications.types.mandate_assigned' },
        { key: 'mandate_revoked', labelKey: 'notifications.types.mandate_revoked' },
        { key: 'deliverable_uploaded', labelKey: 'notifications.types.deliverable_uploaded' },
        { key: 'deliverable_evaluated', labelKey: 'notifications.types.deliverable_evaluated' },
        { key: 'comment_added', labelKey: 'notifications.types.comment_added' },
        { key: 'clarification_added', labelKey: 'notifications.types.clarification_added' },
        { key: 'clarification_updated', labelKey: 'notifications.types.clarification_updated' },
        { key: 'clarification_deleted', labelKey: 'notifications.types.clarification_deleted' },
        { key: 'exchange_scheduled', labelKey: 'notifications.types.exchange_scheduled' },
        { key: 'deadline_reminder_contributor', labelKey: 'notifications.types.deadline_reminder_contributor' },
        { key: 'deadline_reminder_initiator', labelKey: 'notifications.types.deadline_reminder_initiator' },
        { key: 'weekly_vote_digest', labelKey: 'notifications.types.weekly_vote_digest' },
        { key: 'vote_quorum_warning', labelKey: 'notifications.types.vote_quorum_warning' },
    ];

    onMount(async () => {
        try {
            const response = await settingsService.getSettings();
            settings = response.settings || [];
            emailFrequency = response.emailFrequency || 'daily';
            if (settings.length === 0) {
                error = "Aucun paramètre de notification trouvé. Vous n'êtes peut-être pas connecté.";
            }
        } catch (err) {
            console.error('Failed to load notification settings:', err);
            error = 'Erreur lors du chargement des paramètres. Vérifiez que vous êtes connecté.';
            showToast('Erreur lors du chargement des paramètres', 'error');
        } finally {
            loading = false;
        }
    });

    function getSetting(notificationType: string): NotificationSetting | undefined {
        const found = settings.find((s) => (s.type || s.notificationType) === notificationType);
        return found;
    }

    function toggleChannel(notificationType: string, channel: 'inApp' | 'email' | 'push') {
        const setting = getSetting(notificationType);
        if (!setting) return;

        const channelKey = `${channel}Enabled` as keyof NotificationSetting;
        // @ts-ignore
        setting[channelKey] = !setting[channelKey];
        settings = [...settings]; // Trigger reactivity
    }

    async function saveSettings() {
        if (saving) return;

        saving = true;
        try {
            const settingsPayload = settings
                .map((setting) => ({
                    type: setting.type || setting.notificationType,
                    inAppEnabled: setting.inAppEnabled,
                    emailEnabled: setting.emailEnabled,
                    pushEnabled: setting.pushEnabled,
                }))
                .filter((payload): payload is { type: string; inAppEnabled: boolean; emailEnabled: boolean; pushEnabled: boolean } => payload.type !== undefined);

            await settingsService.bulkUpdate({
                settings: settingsPayload,
                emailFrequency,
            });
            showToast('Paramètres enregistrés avec succès', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            showToast("Erreur lors de l'enregistrement", 'error');
        } finally {
            saving = false;
        }
    }
</script>

<Meta title="Paramètres de notifications - {m['home.meta.title']()}" description="Gérez vos préférences de notifications" keywords={['notifications', 'paramètres', 'préférences']} />

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <Title title={m['profile.notifications.title']()} />
    </div>

    <p class="text-sm text-muted-foreground">
        {m['profile.notifications.description']()}
    </p>

    <!-- Channel Explanations -->
    <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <h3 class="text-sm font-semibold text-foreground">{m['profile.notifications.channels_explanation.title']()}</h3>
        <div class="space-y-2 text-sm text-muted-foreground">
            <div class="flex gap-2">
                <Bell class="size-4 mt-0.5 flex-shrink-0" />
                <div>
                    <span class="font-medium text-foreground">{m['profile.notifications.in_app']()}:</span>
                    {m['profile.notifications.channels_explanation.in_app']()}
                </div>
            </div>
            <div class="flex gap-2">
                <Mail class="size-4 mt-0.5 flex-shrink-0" />
                <div>
                    <span class="font-medium text-foreground">{m['profile.notifications.email']()}:</span>
                    {m['profile.notifications.channels_explanation.email']()}
                </div>
            </div>
            <div class="flex gap-2">
                <Smartphone class="size-4 mt-0.5 flex-shrink-0" />
                <div>
                    <span class="font-medium text-foreground">{m['profile.notifications.push']()}:</span>
                    {m['profile.notifications.channels_explanation.push']()}
                </div>
            </div>
        </div>
    </div>

    <!-- Email Frequency Selector -->
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Mail class="size-4" />
            {m['profile.notifications.email_frequency.title']()}
        </h3>
        <p class="text-sm text-muted-foreground">
            {m['profile.notifications.email_frequency.description']()}
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label
                class="relative flex cursor-pointer rounded-lg border border-border bg-background p-4 hover:bg-muted/50 transition-colors {emailFrequency === 'instant' ? 'ring-2 ring-primary' : ''}"
            >
                <input type="radio" name="emailFrequency" value="instant" bind:group={emailFrequency} class="sr-only" />
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{m['profile.notifications.email_frequency.instant']()}</span>
                    <span class="text-xs text-muted-foreground">{m['profile.notifications.email_frequency.instant_desc']()}</span>
                </div>
            </label>
            <label
                class="relative flex cursor-pointer rounded-lg border border-border bg-background p-4 hover:bg-muted/50 transition-colors {emailFrequency === 'hourly' ? 'ring-2 ring-primary' : ''}"
            >
                <input type="radio" name="emailFrequency" value="hourly" bind:group={emailFrequency} class="sr-only" />
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{m['profile.notifications.email_frequency.hourly']()}</span>
                    <span class="text-xs text-muted-foreground">{m['profile.notifications.email_frequency.hourly_desc']()}</span>
                </div>
            </label>
            <label class="relative flex cursor-pointer rounded-lg border border-border bg-background p-4 hover:bg-muted/50 transition-colors {emailFrequency === 'daily' ? 'ring-2 ring-primary' : ''}">
                <input type="radio" name="emailFrequency" value="daily" bind:group={emailFrequency} class="sr-only" />
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{m['profile.notifications.email_frequency.daily']()}</span>
                    <span class="text-xs text-muted-foreground">{m['profile.notifications.email_frequency.daily_desc']()}</span>
                </div>
            </label>
            <label
                class="relative flex cursor-pointer rounded-lg border border-border bg-background p-4 hover:bg-muted/50 transition-colors {emailFrequency === 'weekly' ? 'ring-2 ring-primary' : ''}"
            >
                <input type="radio" name="emailFrequency" value="weekly" bind:group={emailFrequency} class="sr-only" />
                <div class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{m['profile.notifications.email_frequency.weekly']()}</span>
                    <span class="text-xs text-muted-foreground">{m['profile.notifications.email_frequency.weekly_desc']()}</span>
                </div>
            </label>
        </div>
    </div>

    {#if loading}
        <div class="flex items-center justify-center py-12">
            <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
    {:else if error}
        <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p class="text-sm text-destructive">{error}</p>
            <p class="mt-2 text-xs text-muted-foreground">Consultez la console du navigateur pour plus de détails.</p>
        </div>
    {:else}
        <div class="space-y-4">
            <div class="overflow-hidden rounded-lg border border-border bg-card">
                <table class="w-full">
                    <thead class="bg-muted/50">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-foreground">
                                {m['profile.notifications.type']()}
                            </th>
                            <th class="px-4 py-4 text-center text-sm font-semibold text-foreground">
                                <div class="flex items-center justify-center gap-2">
                                    <Bell class="size-4" />
                                    <span class="hidden sm:inline">{m['profile.notifications.in_app']()}</span>
                                </div>
                            </th>
                            <th class="px-4 py-4 text-center text-sm font-semibold text-foreground">
                                <div class="flex items-center justify-center gap-2">
                                    <Mail class="size-4" />
                                    <span class="hidden sm:inline">{m['profile.notifications.email']()}</span>
                                </div>
                            </th>
                            <th class="px-4 py-4 text-center text-sm font-semibold text-foreground">
                                <div class="flex items-center justify-center gap-2">
                                    <Smartphone class="size-4" />
                                    <span class="hidden sm:inline">{m['profile.notifications.push']()}</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each notificationTypes as notifType}
                            {@const setting = getSetting(notifType.key)}
                            {#if setting}
                                <tr class="border-t border-border hover:bg-muted/30 transition-colors">
                                    <td class="px-6 py-4 text-sm text-foreground">
                                        {(() => {
                                            const key = `notifications_types_${notifType.key}` as keyof typeof m;
                                            const translator = m[key];
                                            return typeof translator === 'function' ? (translator as () => string)() : notifType.key;
                                        })()}
                                    </td>
                                    <td class="px-4 py-4 text-center">
                                        <button
                                            type="button"
                                            onclick={() => toggleChannel(notifType.key, 'inApp')}
                                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {setting.inAppEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}"
                                            role="switch"
                                            aria-checked={setting.inAppEnabled}
                                            aria-label="Toggle in-app notifications for {notifType.key}"
                                        >
                                            <span class="inline-block size-4 transform rounded-full bg-white transition-transform {setting.inAppEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                                        </button>
                                    </td>
                                    <td class="px-4 py-4 text-center">
                                        <button
                                            type="button"
                                            onclick={() => toggleChannel(notifType.key, 'email')}
                                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {setting.emailEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}"
                                            role="switch"
                                            aria-checked={setting.emailEnabled}
                                            aria-label="Toggle email notifications for {notifType.key}"
                                        >
                                            <span class="inline-block size-4 transform rounded-full bg-white transition-transform {setting.emailEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                                        </button>
                                    </td>
                                    <td class="px-4 py-4 text-center">
                                        <button
                                            type="button"
                                            onclick={() => toggleChannel(notifType.key, 'push')}
                                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {setting.pushEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}"
                                            role="switch"
                                            aria-checked={setting.pushEnabled}
                                            aria-label="Toggle push notifications for {notifType.key}"
                                        >
                                            <span class="inline-block size-4 transform rounded-full bg-white transition-transform {setting.pushEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                                        </button>
                                    </td>
                                </tr>
                            {/if}
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Save Button -->
            <div class="flex justify-end">
                <Button onclick={saveSettings} disabled={saving}>
                    {#if saving}
                        <Loader2 class="mr-2 size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['profile.notifications.save']()}
                    {/if}
                </Button>
            </div>
        </div>
    {/if}
</div>
