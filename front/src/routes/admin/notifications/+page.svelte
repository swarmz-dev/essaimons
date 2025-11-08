<script lang="ts">
    import { onMount } from 'svelte';
    import { Title } from '#lib/components/ui/title';
    import { Button } from '#lib/components/ui/button';
    import { showToast } from '#lib/services/toastService';
    import { Loader2, Bell, Users, Clock, CheckCircle, XCircle, Mail, Smartphone } from '@lucide/svelte';
    import { NotificationService, type AdminNotification, type NotificationRecipient } from '$lib/services/notificationService';
    import * as m from '#lib/paraglide/messages';

    const notificationService = new NotificationService();

    let notifications = $state<AdminNotification[]>([]);
    let loading = $state(true);
    let currentPage = $state(1);
    let totalPages = $state(1);
    let expandedNotification = $state<string | null>(null);
    let stats = $state({
        total: 0,
        totalRecipients: 0,
        today: 0,
    });

    onMount(async () => {
        await loadNotifications();
    });

    async function loadNotifications() {
        loading = true;
        try {
            const data = await notificationService.getAdminNotifications(currentPage, 20);
            notifications = data.notifications;
            totalPages = data.meta.lastPage;

            // Calculate stats
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            stats.total = data.meta.total;
            stats.totalRecipients = notifications.reduce((sum, n) => sum + n.recipients.length, 0);
            stats.today = notifications.filter((n) => new Date(n.createdAt) >= todayStart).length;
        } catch (error) {
            console.error('Failed to load notifications:', error);
            showToast('Erreur lors du chargement des notifications', 'error');
        } finally {
            loading = false;
        }
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(date);
    }

    function getNotificationTypeLabel(type: string): string {
        const typeLabels: Record<string, string> = {
            status_transition: 'Changement de statut',
            mandate_assigned: 'Mandat assigné',
            mandate_revoked: 'Mandat révoqué',
            deliverable_uploaded: 'Livrable uploadé',
            deliverable_evaluated: 'Livrable évalué',
            comment_added: 'Commentaire ajouté',
            clarification_added: 'Clarification ajoutée',
            clarification_updated: 'Clarification mise à jour',
            clarification_deleted: 'Clarification supprimée',
            exchange_scheduled: 'Échange planifié',
        };
        return typeLabels[type] || type;
    }

    function translateKey(key: string, interpolationData?: Record<string, any>): string {
        // The key format from backend is: "notifications.clarification_added.title"
        // Paraglide exposes functions with dot notation: m['notifications.clarification_added.title']()
        const messageFunc = (m as any)[key];

        if (typeof messageFunc === 'function') {
            return messageFunc(interpolationData || {});
        }

        // Fallback to the key if translation not found
        return key;
    }

    function toggleExpanded(notificationId: string) {
        expandedNotification = expandedNotification === notificationId ? null : notificationId;
    }

    function getDeliveryStatusIcon(recipient: NotificationRecipient, channel: 'inApp' | 'email' | 'push') {
        if (channel === 'inApp') {
            return recipient.inAppSent ? CheckCircle : XCircle;
        } else if (channel === 'email') {
            if (recipient.emailError) return XCircle;
            return recipient.emailSent ? CheckCircle : Clock;
        } else {
            if (recipient.pushError) return XCircle;
            return recipient.pushSent ? CheckCircle : Clock;
        }
    }

    function getDeliveryStatusColor(recipient: NotificationRecipient, channel: 'inApp' | 'email' | 'push'): string {
        if (channel === 'inApp') {
            return recipient.inAppSent ? 'text-green-600' : 'text-red-600';
        } else if (channel === 'email') {
            if (recipient.emailError) return 'text-red-600';
            return recipient.emailSent ? 'text-green-600' : 'text-yellow-600';
        } else {
            if (recipient.pushError) return 'text-red-600';
            return recipient.pushSent ? 'text-green-600' : 'text-yellow-600';
        }
    }

    async function nextPage() {
        if (currentPage < totalPages) {
            currentPage++;
            await loadNotifications();
        }
    }

    async function previousPage() {
        if (currentPage > 1) {
            currentPage--;
            await loadNotifications();
        }
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <Title title="Notifications système" />
    </div>

    <p class="text-sm text-muted-foreground">Vue d'ensemble de toutes les notifications envoyées aux utilisateurs</p>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-border bg-card p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-muted-foreground">Total notifications</p>
                    <p class="text-2xl font-bold">{stats.total}</p>
                </div>
                <Bell class="size-8 text-muted-foreground" />
            </div>
        </div>

        <div class="rounded-lg border border-border bg-card p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-muted-foreground">Total destinataires</p>
                    <p class="text-2xl font-bold">{stats.totalRecipients}</p>
                </div>
                <Users class="size-8 text-muted-foreground" />
            </div>
        </div>

        <div class="rounded-lg border border-border bg-card p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-muted-foreground">Aujourd'hui</p>
                    <p class="text-2xl font-bold">{stats.today}</p>
                </div>
                <Clock class="size-8 text-muted-foreground" />
            </div>
        </div>
    </div>

    <!-- Notifications List -->
    {#if loading}
        <div class="flex items-center justify-center py-12">
            <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
    {:else}
        <div class="space-y-4">
            {#if notifications.length === 0}
                <div class="rounded-lg border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">Aucune notification trouvée</div>
            {:else}
                {#each notifications as notification}
                    <div class="overflow-hidden rounded-lg border border-border bg-card">
                        <!-- Notification Header -->
                        <button onclick={() => toggleExpanded(notification.id)} class="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                            <div class="grid grid-cols-[auto,1fr,auto,auto] gap-4 items-center">
                                <div class="flex items-center">
                                    <span class="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                        {getNotificationTypeLabel(notification.type)}
                                    </span>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-sm font-medium text-foreground">{translateKey(notification.titleKey, notification.interpolationData)}</span>
                                    <span class="text-xs text-muted-foreground">{translateKey(notification.bodyKey, notification.interpolationData)}</span>
                                </div>
                                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users class="size-4" />
                                    <span>{notification.recipients.length} destinataire{notification.recipients.length > 1 ? 's' : ''}</span>
                                </div>
                                <div class="text-sm text-muted-foreground">
                                    {formatDate(notification.createdAt)}
                                </div>
                            </div>
                        </button>

                        <!-- Expanded Details -->
                        {#if expandedNotification === notification.id}
                            <div class="border-t border-border bg-muted/20 px-6 py-4">
                                <h4 class="mb-3 text-sm font-semibold text-foreground">Destinataires et statuts de livraison</h4>
                                <div class="space-y-2">
                                    {#each notification.recipients as recipient}
                                        <div class="rounded-lg border border-border bg-card p-3">
                                            <div class="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 items-center">
                                                <!-- User Info -->
                                                <div class="flex flex-col">
                                                    <span class="text-sm font-medium text-foreground">{recipient.username}</span>
                                                    <span class="text-xs text-muted-foreground">{recipient.email}</span>
                                                </div>

                                                <!-- Read Status -->
                                                <div class="flex items-center gap-1">
                                                    {#if recipient.read}
                                                        <CheckCircle class="size-4 text-green-600" />
                                                        <span class="text-xs text-muted-foreground">Lu</span>
                                                    {:else}
                                                        <Clock class="size-4 text-yellow-600" />
                                                        <span class="text-xs text-muted-foreground">Non lu</span>
                                                    {/if}
                                                </div>

                                                <!-- In-App Status -->
                                                <div class="flex items-center gap-1" title={recipient.inAppSent ? 'In-app envoyé' : 'In-app non envoyé'}>
                                                    <Bell class="size-4 {getDeliveryStatusColor(recipient, 'inApp')}" />
                                                </div>

                                                <!-- Email Status -->
                                                <div class="flex items-center gap-1" title={recipient.emailError || (recipient.emailSent ? 'Email envoyé' : 'Email en attente')}>
                                                    <Mail class="size-4 {getDeliveryStatusColor(recipient, 'email')}" />
                                                </div>

                                                <!-- Push Status -->
                                                <div class="flex items-center gap-1" title={recipient.pushError || (recipient.pushSent ? 'Push envoyé' : 'Push en attente')}>
                                                    <Smartphone class="size-4 {getDeliveryStatusColor(recipient, 'push')}" />
                                                </div>
                                            </div>

                                            <!-- Show Errors if any -->
                                            {#if recipient.emailError || recipient.pushError}
                                                <div class="mt-2 space-y-1">
                                                    {#if recipient.emailError}
                                                        <p class="text-xs text-red-600">Email error: {recipient.emailError}</p>
                                                    {/if}
                                                    {#if recipient.pushError}
                                                        <p class="text-xs text-red-600">Push error: {recipient.pushError}</p>
                                                    {/if}
                                                </div>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            {/if}

            <!-- Pagination -->
            {#if totalPages > 1}
                <div class="flex items-center justify-between">
                    <Button variant="outline" onclick={previousPage} disabled={currentPage === 1}>Précédent</Button>
                    <span class="text-sm text-muted-foreground">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <Button variant="outline" onclick={nextPage} disabled={currentPage === totalPages}>Suivant</Button>
                </div>
            {/if}
        </div>
    {/if}
</div>
