<script lang="ts">
    import { Button, buttonVariants } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import { cn } from '#lib/utils';
    import type { PropositionMandate } from '#lib/types/proposition';
    import type { SerializedUser } from 'backend/types';
    import { MandateStatusEnum, MandateApplicationStatusEnum, DeliverableVerdictEnum } from 'backend/types';
    import { Plus, Pencil, Trash2, Upload, Download, UserPlus, Check, X } from '@lucide/svelte';

    const {
        mandates,
        user,
        canManageMandates,
        canEvaluateDeliverable,
        onAddMandate,
        onEditMandate,
        onDeleteMandate,
        onApplyForMandate,
        onAcceptApplication,
        onRejectApplication,
        onUploadDeliverable,
        onEvaluateDeliverable,
        formatDateTime,
        formatFileSize,
        translateMandateStatus,
        deliverableUrl,
        getDeliverableProcedure,
        countNonConformEvaluations,
    } = $props<{
        mandates: PropositionMandate[];
        user?: SerializedUser;
        canManageMandates: boolean;
        canEvaluateDeliverable: boolean;
        onAddMandate: () => void;
        onEditMandate: (mandate: PropositionMandate) => void;
        onDeleteMandate: (mandateId: string) => void;
        onApplyForMandate: (mandateId: string) => void;
        onAcceptApplication: (mandateId: string, applicationId: string) => void;
        onRejectApplication: (mandateId: string, applicationId: string) => void;
        onUploadDeliverable: (mandateId: string) => void;
        onEvaluateDeliverable: (mandateId: string, deliverableId: string, verdict: DeliverableVerdictEnum) => void;
        formatDateTime: (value?: string) => string;
        formatFileSize: (size: number) => string;
        translateMandateStatus: (status: MandateStatusEnum) => string;
        deliverableUrl: (deliverableId: string) => string;
        getDeliverableProcedure: (deliverable: any) => any;
        countNonConformEvaluations: (deliverable: any) => number;
    }>();
</script>

<section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
    <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.mandates']()}</h2>
    {#if canManageMandates}
        <div class="mt-4 flex justify-end">
            <Button variant="outline" class="gap-2" onclick={onAddMandate}>
                <Plus class="size-4" />
                {m['proposition-detail.mandates.add']()}
            </Button>
        </div>
    {/if}
    {#if mandates.length}
        <ul class="mt-4 space-y-4">
            {#each mandates as mandate (mandate.id)}
                <li class="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p class="text-base font-semibold text-foreground">{mandate.title}</p>
                            {#if mandate.description}
                                <p class="text-sm text-muted-foreground">{mandate.description}</p>
                            {/if}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{translateMandateStatus(mandate.status as MandateStatusEnum)}</span>
                            {#if canManageMandates && mandate.status === MandateStatusEnum.TO_ASSIGN && !mandate.holderUserId && (!mandate.applications || mandate.applications.length === 0)}
                                <Button size="sm" variant="ghost" class="gap-1" onclick={() => onEditMandate(mandate)}>
                                    <Pencil class="size-3.5" />
                                    {m['common.edit']()}
                                </Button>
                                <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => onDeleteMandate(mandate.id)}>
                                    <Trash2 class="size-3.5" />
                                    {m['common.delete']()}
                                </Button>
                            {/if}
                        </div>
                    </div>
                    {#if mandate.holderUserId}
                        <p class="text-xs text-muted-foreground">{m['proposition-detail.mandate.holder']({ holder: mandate.holder?.username ?? mandate.holderUserId })}</p>
                    {/if}

                    {#if mandate.status === MandateStatusEnum.TO_ASSIGN && user}
                        {@const hasApplied = mandate.applications?.some((app) => app.applicantUserId === user.id)}
                        {#if !hasApplied}
                            <div class="flex justify-end">
                                <Button size="sm" variant="outline" class="gap-2" onclick={() => onApplyForMandate(mandate.id)}>
                                    <UserPlus class="size-4" />
                                    {m['proposition-detail.mandates.apply']()}
                                </Button>
                            </div>
                        {/if}
                    {/if}

                    {#if mandate.status === MandateStatusEnum.TO_ASSIGN && mandate.applications && mandate.applications.length > 0}
                        {@const pendingApplications = mandate.applications.filter((app) => app.status === MandateApplicationStatusEnum.PENDING)}
                        {#if pendingApplications.length > 0}
                            <div class="mt-4 space-y-3">
                                <h4 class="text-sm font-semibold">Candidatures ({pendingApplications.length})</h4>
                                <ul class="space-y-2">
                                    {#each pendingApplications as application (application.id)}
                                        <li class="rounded-lg border border-border/30 bg-background/80 p-3">
                                            <div class="space-y-2">
                                                <div class="flex items-start justify-between gap-2">
                                                    <div class="flex-1">
                                                        <p class="text-sm font-medium">
                                                            {application.applicant?.username ?? 'Utilisateur inconnu'}
                                                        </p>
                                                        <p class="text-xs text-muted-foreground">
                                                            Soumise le {formatDateTime(application.submittedAt)}
                                                        </p>
                                                    </div>
                                                    {#if canManageMandates}
                                                        <div class="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                class="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                                onclick={() => onAcceptApplication(mandate.id, application.id)}
                                                                title="Accepter la candidature"
                                                            >
                                                                <Check class="size-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                class="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onclick={() => onRejectApplication(mandate.id, application.id)}
                                                                title="Refuser la candidature"
                                                            >
                                                                <X class="size-4" />
                                                            </Button>
                                                        </div>
                                                    {/if}
                                                </div>
                                                {#if application.statement}
                                                    <p class="text-sm text-foreground/80 whitespace-pre-wrap">{application.statement}</p>
                                                {/if}
                                            </div>
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    {/if}

                    {#if user && mandate.holderUserId === user.id && mandate.status === MandateStatusEnum.ACTIVE}
                        <div class="flex justify-end">
                            <Button size="sm" variant="outline" class="gap-2" onclick={() => onUploadDeliverable(mandate.id)}>
                                <Upload class="size-4" />
                                {m['proposition-detail.mandates.deliverables.upload']()}
                            </Button>
                        </div>
                    {/if}
                    <div class="space-y-2">
                        {#if mandate.deliverables?.length}
                            <ul class="space-y-3">
                                {#each mandate.deliverables as deliverable (deliverable.id)}
                                    {#key deliverable.id}
                                        <li class="rounded-lg border border-border/30 bg-background/80 p-3">
                                            <div class="flex flex-wrap items-start justify-between gap-2">
                                                <div class="space-y-1">
                                                    <p class="text-sm font-medium text-foreground">
                                                        {deliverable.label ?? deliverable.file?.name ?? deliverable.autoFilename ?? m['proposition-detail.mandates.deliverables.unnamed']()}
                                                    </p>
                                                    <p class="text-xs text-muted-foreground">
                                                        {formatDateTime(deliverable.uploadedAt)}
                                                        {#if deliverable.file?.mimeType}
                                                            • {deliverable.file.mimeType}
                                                        {/if}
                                                        {#if typeof deliverable.file?.size === 'number'}
                                                            • {formatFileSize(deliverable.file.size)}
                                                        {/if}
                                                    </p>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <span
                                                        class={cn(
                                                            'rounded-full px-2 py-1 text-xs font-medium capitalize',
                                                            deliverable.status === 'non_conform'
                                                                ? 'bg-destructive/10 text-destructive'
                                                                : deliverable.status === 'escalated'
                                                                  ? 'bg-warning/10 text-warning-foreground'
                                                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                        )}
                                                    >
                                                        {(() => {
                                                            const key = `proposition_detail_mandates_deliverables_status_${deliverable.status}` as keyof typeof m;
                                                            const translator = m[key];
                                                            return typeof translator === 'function' ? (translator as () => string)() : deliverable.status;
                                                        })()}
                                                    </span>
                                                    <a
                                                        class={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-8')}
                                                        href={deliverableUrl(deliverable.id)}
                                                        download
                                                        aria-label={m['proposition-detail.mandates.deliverables.download']()}
                                                    >
                                                        <Download class="size-4" />
                                                    </a>
                                                </div>
                                            </div>
                                            {#if deliverable.nonConformityFlaggedAt}
                                                <p class="mt-2 text-xs text-red-500 dark:text-red-300">
                                                    {m['proposition-detail.mandates.deliverables.flagged']({ date: formatDateTime(deliverable.nonConformityFlaggedAt) })}
                                                </p>
                                            {/if}
                                            {#if getDeliverableProcedure(deliverable)}
                                                {@const procedure = getDeliverableProcedure(deliverable)}
                                                <p class="mt-2 text-xs text-muted-foreground">
                                                    {(() => {
                                                        const key = `proposition_detail_mandates_deliverables_procedure_${procedure?.status ?? 'pending'}` as keyof typeof m;
                                                        const translator = m[key];
                                                        return typeof translator === 'function' ? (translator as () => string)() : (procedure?.status ?? 'pending');
                                                    })()}
                                                </p>
                                            {/if}
                                            <p class="mt-2 text-xs text-muted-foreground">
                                                {m['proposition-detail.mandates.deliverables.evaluations']({
                                                    total: deliverable.evaluations?.length ?? 0,
                                                    nonConform: countNonConformEvaluations(deliverable),
                                                })}
                                            </p>
                                            {#if canEvaluateDeliverable}
                                                <div class="mt-3 flex flex-wrap gap-2">
                                                    <Button size="sm" variant="secondary" onclick={() => onEvaluateDeliverable(mandate.id, deliverable.id, DeliverableVerdictEnum.COMPLIANT)}>
                                                        {m['proposition-detail.mandates.deliverables.evaluate.compliant']()}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onclick={() => onEvaluateDeliverable(mandate.id, deliverable.id, DeliverableVerdictEnum.NON_COMPLIANT)}>
                                                        {m['proposition-detail.mandates.deliverables.evaluate.non-conform']()}
                                                    </Button>
                                                </div>
                                            {/if}
                                        </li>
                                    {/key}
                                {/each}
                            </ul>
                        {:else}
                            <p class="text-xs text-muted-foreground">{m['proposition-detail.mandates.deliverables.empty']()}</p>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {:else}
        <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.mandates.empty']()}</p>
    {/if}
</section>
