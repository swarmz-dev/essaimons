<script lang="ts">
    import { onMount } from 'svelte';
    import { Title } from '#lib/components/ui/title';
    import { Button } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import { showToast } from '#lib/services/toastService';
    import { Loader2, Bell, Users, CheckCircle, Clock } from '@lucide/svelte';
    import { NotificationService, type Notification } from '$lib/services/notificationService';

    const notificationService = new NotificationService();

    let notifications = $state<Notification[]>([]);
    let loading = $state(true);
    let currentPage = $state(1);
    let totalPages = $state(1);
    let stats = $state({
        total: 0,
        unread: 0,
        today: 0,
    });

    onMount(async () => {
        await loadNotifications();
    });

    async function loadNotifications() {
        loading = true;
        try {
            const data = await notificationService.getNotifications(currentPage, 50);
            notifications = data.notifications;
            totalPages = data.meta.lastPage;

            // Calculate stats
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            stats.total = data.meta.total;
            stats.unread = notifications.filter((n) => !n.isRead).length;
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
            dateStyle: 'medium',
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
        <Title>Notifications système</Title>
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
                    <p class="text-sm font-medium text-muted-foreground">Non lues</p>
                    <p class="text-2xl font-bold">{stats.unread}</p>
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
            <div class="overflow-hidden rounded-lg border border-border bg-card">
                <!-- Header -->
                <div class="grid grid-cols-[auto,1fr,auto,auto,auto] gap-4 border-b border-border bg-muted/50 px-6 py-4">
                    <div class="text-sm font-semibold text-foreground">Statut</div>
                    <div class="text-sm font-semibold text-foreground">Type</div>
                    <div class="text-sm font-semibold text-foreground">Titre</div>
                    <div class="text-sm font-semibold text-foreground">Entité</div>
                    <div class="text-sm font-semibold text-foreground">Date</div>
                </div>

                <!-- Rows -->
                {#if notifications.length === 0}
                    <div class="px-6 py-12 text-center text-sm text-muted-foreground">Aucune notification trouvée</div>
                {:else}
                    {#each notifications as notification}
                        <div class="grid grid-cols-[auto,1fr,auto,auto,auto] gap-4 border-b border-border px-6 py-4 last:border-b-0">
                            <div class="flex items-center">
                                {#if notification.isRead}
                                    <CheckCircle class="size-5 text-green-600" />
                                {:else}
                                    <div class="size-2 rounded-full bg-primary"></div>
                                {/if}
                            </div>
                            <div class="flex items-center text-sm text-foreground">
                                <span class="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                                    {getNotificationTypeLabel(notification.type)}
                                </span>
                            </div>
                            <div class="flex items-center text-sm text-foreground">
                                {notification.titleKey}
                            </div>
                            <div class="flex items-center text-sm text-muted-foreground">
                                {#if notification.entityType}
                                    {notification.entityType}
                                {:else}
                                    -
                                {/if}
                            </div>
                            <div class="flex items-center text-sm text-muted-foreground">
                                {formatDate(notification.createdAt)}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

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
