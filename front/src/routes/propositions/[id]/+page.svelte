<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import Meta from '#components/Meta.svelte';
    import {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
    } from '#lib/components/ui/alert-dialog';
    import { Button, buttonVariants } from '#lib/components/ui/button';
    import Tabs, { type TabItem } from '#lib/components/ui/tabs/Tabs.svelte';
    import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#lib/components/ui/dialog';
    import { Input } from '#lib/components/ui/input';
    import { Textarea } from '#lib/components/ui/textarea';
    import { MultiSelect, type MultiSelectOption } from '#lib/components/ui/multi-select';
    import { m } from '#lib/paraglide/messages';
    import { cn } from '#lib/utils';
    import { wrappedFetch, extractFormErrors } from '#lib/services/requestService';
    import { showToast } from '#lib/services/toastService';
    import { propositionDetailStore } from '#lib/stores/propositionDetailStore';
    import { organizationSettings } from '#lib/stores/organizationStore';
    import { resolveWorkflowRole, isActionAllowed, buildRolePermissionMap } from '#lib/services/workflowPermissionService';
    import type { SerializedProposition, SerializedPropositionSummary, SerializedStatusPermissions, SerializedUser, SerializedUserSummary } from 'backend/types';
    import {
        MandateStatusEnum,
        PropositionCommentScopeEnum,
        PropositionCommentVisibilityEnum,
        PropositionEventTypeEnum,
        PropositionStatusEnum,
        PropositionVisibilityEnum,
        PropositionVoteMethodEnum,
        PropositionVotePhaseEnum,
        PropositionVoteStatusEnum,
        DeliverableVerdictEnum,
    } from 'backend/types';
    import type { PropositionComment, PropositionEvent, PropositionMandate, PropositionTimelinePhase, PropositionVote, WorkflowRole } from '#lib/types/proposition';
    import { ArrowLeft, Printer, Download, CalendarDays, Pencil, Trash2, Plus, RefreshCcw, Upload, Loader2, Eye, MessageCircle, CheckCircle, UserPlus } from '@lucide/svelte';
    import { z } from 'zod';

    const { data } = $props<{
        data: {
            proposition: SerializedProposition;
            events: PropositionEvent[];
            votes: PropositionVote[];
            mandates: PropositionMandate[];
            comments: PropositionComment[];
        };
    }>();

    // Only set payload when proposition ID changes (navigating to different proposition)
    // This preserves client-side updates like newly created votes when data refreshes
    let lastPropositionId = $state<string | null>(null);
    $effect(() => {
        if (data.proposition.id !== lastPropositionId) {
            propositionDetailStore.setPayload({
                proposition: data.proposition,
                events: data.events,
                votes: data.votes,
                mandates: data.mandates,
                comments: data.comments,
            });
            lastPropositionId = data.proposition.id;
        }
    });

    const detailState = $derived($propositionDetailStore);
    const proposition = $derived(detailState.proposition ?? data.proposition);
    const events = $derived(detailState.events);
    const votes = $derived(detailState.votes);
    const mandates = $derived(detailState.mandates);
    const comments = $derived(detailState.comments);

    const perStatusPermissions = $derived(($organizationSettings.permissions?.perStatus ?? {}) as SerializedStatusPermissions);

    const workflowAutomation = $derived($organizationSettings.workflowAutomation);

    const currentStatus = $derived((proposition.status ?? PropositionStatusEnum.DRAFT) as PropositionStatusEnum);

    const statusOrder: Record<PropositionStatusEnum, number> = {
        [PropositionStatusEnum.DRAFT]: 0,
        [PropositionStatusEnum.CLARIFY]: 1,
        [PropositionStatusEnum.AMEND]: 2,
        [PropositionStatusEnum.VOTE]: 3,
        [PropositionStatusEnum.MANDATE]: 4,
        [PropositionStatusEnum.EVALUATE]: 5,
        [PropositionStatusEnum.ARCHIVED]: 6,
    };

    const allStatuses = [
        PropositionStatusEnum.DRAFT,
        PropositionStatusEnum.CLARIFY,
        PropositionStatusEnum.AMEND,
        PropositionStatusEnum.VOTE,
        PropositionStatusEnum.MANDATE,
        PropositionStatusEnum.EVALUATE,
        PropositionStatusEnum.ARCHIVED,
    ];

    const currentStatusRank = $derived(statusOrder[currentStatus] ?? 0);

    const user = $derived(page.data.user as SerializedUser | undefined);
    const workflowRole: WorkflowRole = $derived(resolveWorkflowRole(proposition, user, mandates));

    // État pour le temps actuel, mis à jour toutes les secondes
    let currentTime = $state(new Date());
    let scheduledRefreshTimeouts: number[] = $state([]);

    // Mettre à jour le temps toutes les secondes et vérifier les transitions de statut
    $effect(() => {
        const interval = setInterval(() => {
            const oldTime = currentTime;
            currentTime = new Date();

            // Vérifier si un vote devrait changer de statut
            votes?.forEach((vote) => {
                const now = currentTime.getTime();
                const openAt = vote.openAt ? new Date(vote.openAt).getTime() : null;
                const closeAt = vote.closeAt ? new Date(vote.closeAt).getTime() : null;

                // Si le vote scheduled atteint son heure d'ouverture
                if (vote.status === 'scheduled' && openAt && openAt <= now && openAt > oldTime.getTime()) {
                    const timeoutId = window.setTimeout(() => refreshVotes(), 1000);
                    scheduledRefreshTimeouts.push(timeoutId);
                }

                // Si le vote open atteint son heure de clôture
                if (vote.status === 'open' && closeAt && closeAt <= now && closeAt > oldTime.getTime()) {
                    const timeoutId = window.setTimeout(() => refreshVotes(), 1000);
                    scheduledRefreshTimeouts.push(timeoutId);
                }
            });
        }, 1000);

        return () => {
            clearInterval(interval);
            scheduledRefreshTimeouts.forEach((id) => clearTimeout(id));
        };
    });

    // Rafraîchir les votes une seule fois au chargement initial
    let hasInitiallyRefreshed = $state(false);
    $effect(() => {
        if (votes && votes.length > 0 && !hasInitiallyRefreshed) {
            hasInitiallyRefreshed = true;
            refreshVotes();
        }
    });

    // Charger les bulletins et résultats lorsque les votes changent
    $effect(() => {
        if (votes && votes.length > 0) {
            votes.forEach((vote) => {
                // Charger le bulletin de l'utilisateur si connecté
                if (user && vote.status === 'open') {
                    fetchUserBallot(vote.id);
                }
                // Charger les résultats si le vote est clôturé
                if (vote.status === 'closed') {
                    fetchVoteResults(vote.id);
                }
            });
        }
    });

    const canEditProposition = $derived(workflowRole === 'admin' || isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'edit_proposition'));
    const canDeleteProposition = $derived(user?.role === 'admin');
    const canParticipateVote = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'participate_vote') || workflowRole === 'initiator' || workflowRole === 'admin');

    const canCommentClarification = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'comment_clarification') || workflowRole === 'admin' || workflowRole === 'initiator');
    const canCommentAmendment = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'comment_amendment') || workflowRole === 'admin' || workflowRole === 'initiator');
    const canManageEvents = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'manage_events') || workflowRole === 'admin');
    const canConfigureVote = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'configure_vote') || workflowRole === 'admin');
    const canManageMandates = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'manage_mandates') || workflowRole === 'admin');
    const canUploadDeliverable = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'upload_deliverable') || workflowRole === 'admin');
    const canEvaluateDeliverable = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'evaluate_deliverable') || workflowRole === 'admin');

    const canManageStatus = $derived(workflowRole === 'admin' || workflowRole === 'initiator');

    const isEventEditableByCurrentUser = (event: PropositionEvent): boolean => {
        if (!user) {
            return false;
        }
        if (user.role === 'admin') {
            return true;
        }
        return event.createdByUserId === user.id;
    };

    const visualUrl = $derived(proposition.visual ? `/assets/propositions/visual/${proposition.id}` : undefined);

    const normalizeId = (value?: string | number | null): string | undefined => {
        if (value === undefined || value === null) {
            return undefined;
        }
        const normalized = value.toString().trim();
        return normalized.length ? normalized : undefined;
    };

    const userOptions: MultiSelectOption[] = $derived(
        (data.users ?? []).flatMap((user: SerializedUserSummary) => {
            const value = normalizeId(user.id);
            return value ? [{ value, label: user.username }] : [];
        })
    );

    const attachmentUrl = (fileId: string): string => `/assets/propositions/attachments/${fileId}`;
    const deliverableUrl = (deliverableId: string): string => `/assets/propositions/deliverables/${deliverableId}`;

    const formatDate = (value?: string): string => {
        if (!value) {
            return m['proposition-detail.dates.empty']();
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const locale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';
        return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
    };

    const formatDateTime = (value?: string): string => {
        if (!value) {
            return m['proposition-detail.dates.empty']();
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const locale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    };

    const formatFileSize = (size: number): string => {
        if (!Number.isFinite(size) || size <= 0) {
            return '';
        }

        const units = ['bytes', 'KB', 'MB', 'GB'];
        let index = 0;
        let value = size;

        while (value >= 1024 && index < units.length - 1) {
            value /= 1024;
            index += 1;
        }

        const formatted = index === 0 ? Math.round(value).toString() : value.toFixed(1);
        return `${formatted} ${units[index]}`;
    };

    type DeliverableProcedureMeta = {
        status?: string;
        openedAt?: string;
        escalatedAt?: string;
        revocationRequestId?: string;
        revocationVoteId?: string;
    };

    const getDeliverableProcedure = (deliverable: PropositionMandate['deliverables'][number]): DeliverableProcedureMeta | null => {
        const metadata = deliverable.metadata as Record<string, unknown> | undefined;
        const raw = metadata && typeof metadata === 'object' ? (metadata as any).procedure : null;
        if (!raw || typeof raw !== 'object') {
            return null;
        }
        return raw as DeliverableProcedureMeta;
    };

    const countNonConformEvaluations = (deliverable: PropositionMandate['deliverables'][number]): number => {
        return (deliverable.evaluations ?? []).filter((evaluation) => evaluation.verdict === DeliverableVerdictEnum.NON_COMPLIANT).length;
    };

    const HTML_TAG_PATTERN = /<\s*\/?\s*[a-zA-Z][^>]*>/;
    const containsHtml = (value?: string | null): boolean => {
        if (!value) {
            return false;
        }
        // Always return true if there are any HTML tags, including Quill's default <p> tags
        return HTML_TAG_PATTERN.test(value);
    };

    // Fields that are always created with RichTextEditor should always be rendered as HTML
    const isRichTextField = (fieldName: string): boolean => {
        return ['detailedDescription', 'smartObjectives', 'impacts', 'mandatesDescription'].includes(fieldName);
    };

    const buildTimeline = (): PropositionTimelinePhase[] => {
        const deliverableCount = mandates.reduce((total, mandate) => total + (mandate.deliverables?.length ?? 0), 0);
        const phases: Array<{
            key: PropositionStatusEnum;
            label: string;
            deadline?: string | null;
            extra?: PropositionTimelinePhase['extra'];
        }> = [
            {
                key: PropositionStatusEnum.CLARIFY,
                label: m['proposition-detail.dates.clarification'](),
                deadline: proposition.clarificationDeadline,
            },
            {
                key: PropositionStatusEnum.AMEND,
                label: m['proposition-detail.dates.amendment'](),
                deadline: proposition.amendmentDeadline,
            },
            {
                key: PropositionStatusEnum.VOTE,
                label: m['proposition-detail.dates.vote'](),
                deadline: proposition.voteDeadline,
                extra: votes.length ? { voteStatus: votes[0].status } : undefined,
            },
            {
                key: PropositionStatusEnum.MANDATE,
                label: m['proposition-detail.dates.mandate'](),
                deadline: proposition.mandateDeadline,
                extra: deliverableCount ? { deliverableCount } : undefined,
            },
            {
                key: PropositionStatusEnum.EVALUATE,
                label: m['proposition-detail.dates.evaluation'](),
                deadline: proposition.evaluationDeadline,
                extra: deliverableCount ? { deliverableCount } : undefined,
            },
        ];

        return phases.map((phase) => {
            const rank = statusOrder[phase.key] ?? 0;
            return {
                key: phase.key,
                label: phase.label,
                deadline: phase.deadline,
                completed: currentStatusRank > rank,
                isCurrent: currentStatus === phase.key,
                extra: phase.extra,
            };
        });
    };

    const timelinePhases = $derived(buildTimeline());

    const getPhaseStatusLabel = (phase: PropositionTimelinePhase): string => {
        if (phase.isCurrent) {
            return m['proposition-detail.timeline.current']();
        }
        if (phase.completed) {
            return m['proposition-detail.timeline.completed']();
        }
        return m['proposition-detail.timeline.upcoming']();
    };

    const commentsByScope = $derived({
        clarification: comments.filter((comment) => comment.scope === PropositionCommentScopeEnum.CLARIFICATION && !comment.parentId),
        amendment: comments.filter((comment) => comment.scope === PropositionCommentScopeEnum.AMENDMENT && !comment.parentId),
        mandate: comments.filter((comment) => comment.scope === PropositionCommentScopeEnum.MANDATE && !comment.parentId),
        evaluation: comments.filter((comment) => comment.scope === PropositionCommentScopeEnum.EVALUATION && !comment.parentId),
    });

    const eventTypeOptions = Object.values(PropositionEventTypeEnum);
    const votePhaseOptions = Object.values(PropositionVotePhaseEnum);
    const voteMethodOptions = Object.values(PropositionVoteMethodEnum);
    const mandateStatusOptions = Object.values(MandateStatusEnum);

    const translateEventType = (type: PropositionEventTypeEnum): string => {
        const key = `proposition-detail.events.type.${type}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? translator() : type;
    };

    const translateVotePhase = (phase: PropositionVotePhaseEnum): string => {
        const key = `proposition-detail.votes.phase.${phase}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? translator() : phase;
    };

    const translateVoteMethod = (method: PropositionVoteMethodEnum): string => {
        const key = `proposition-detail.votes.method-label.${method}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? translator() : method;
    };

    const translateMandateStatus = (status: MandateStatusEnum): string => {
        const key = `proposition-detail.mandates.status.${status}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? translator() : status;
    };

    const translateStatus = (status: PropositionStatusEnum): string => {
        const key = `proposition-detail.status.label.${status}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? translator() : status;
    };

    const normalizeOptional = (value?: string | null): string | undefined => {
        if (!value) {
            return undefined;
        }
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    };

    const toIsoDateTime = (value?: string): string | undefined => {
        const normalized = normalizeOptional(value);
        if (!normalized) {
            return undefined;
        }
        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) {
            return undefined;
        }
        return parsed.toISOString();
    };

    const fromIsoToLocalInput = (value?: string | null): string => {
        if (!value) {
            return '';
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return '';
        }
        return parsed.toISOString().slice(0, 16);
    };

    const getVoteTimeRemaining = (vote: PropositionVote, currentTime: Date): { text: string; color: string } | null => {
        const now = currentTime.getTime();
        const openAt = vote.openAt ? new Date(vote.openAt).getTime() : null;
        const closeAt = vote.closeAt ? new Date(vote.closeAt).getTime() : null;

        // Si le vote est scheduled ou draft et a une date d'ouverture future
        if ((vote.status === 'scheduled' || vote.status === 'draft') && openAt && openAt > now) {
            const diff = openAt - now;
            return { text: formatTimeRemaining(diff, 'Ouvre dans'), color: 'text-blue-600 dark:text-blue-400' };
        }

        // Si le vote est open et a une date de clôture future
        if (vote.status === 'open' && closeAt && closeAt > now) {
            const diff = closeAt - now;
            return { text: formatTimeRemaining(diff, 'Ferme dans'), color: 'text-orange-600 dark:text-orange-400' };
        }

        // Si le vote est scheduled mais l'heure d'ouverture est dépassée
        if (vote.status === 'scheduled' && openAt && openAt <= now && closeAt && closeAt > now) {
            const diff = closeAt - now;
            return { text: formatTimeRemaining(diff, 'Ferme dans'), color: 'text-orange-600 dark:text-orange-400' };
        }

        return null;
    };

    const formatTimeRemaining = (ms: number, prefix: string): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${prefix} ${days}j ${hours % 24}h`;
        } else if (hours > 0) {
            return `${prefix} ${hours}h ${minutes % 60}min`;
        } else if (minutes > 0) {
            return `${prefix} ${minutes}min`;
        } else {
            return `${prefix} ${seconds}s`;
        }
    };

    const commentSchema = z.object({
        content: z.string().trim().min(1).max(2000),
    });

    const commentEndpoint = (commentId?: string | null): string => {
        const normalizedPropositionId = normalizeId(proposition.id) ?? '';
        const baseId = normalizedPropositionId.length ? encodeURIComponent(normalizedPropositionId) : 'unknown';
        const base = `/propositions/${baseId}/comments`;
        if (!commentId) {
            return base;
        }
        const trimmedCommentId = commentId.toString().trim();
        if (!trimmedCommentId) {
            return base;
        }
        return `${base}/${encodeURIComponent(trimmedCommentId)}`;
    };

    let isClarificationDialogOpen: boolean = $state(false);
    let clarificationContent: string = $state('');
    let clarificationErrors: string[] = $state([]);
    let isClarificationSubmitting: boolean = $state(false);
    let clarificationSection: string = $state('general');
    let amendmentSection: string = $state('general');
    let isClarificationReplyDialogOpen: boolean = $state(false);
    let clarificationReplyParentId: string | null = $state(null);
    let clarificationReplyContent: string = $state('');
    let clarificationReplyErrors: string[] = $state([]);
    let isClarificationReplySubmitting: boolean = $state(false);
    let isClarificationEditDialogOpen: boolean = $state(false);
    let clarificationEditCommentId: string | null = $state(null);
    let clarificationEditParentId: string | null = $state(null);
    let clarificationEditContent: string = $state('');
    let clarificationEditErrors: string[] = $state([]);
    let isClarificationEditSubmitting: boolean = $state(false);
    let isClarificationDeleteDialogOpen: boolean = $state(false);
    let clarificationDeleteCommentId: string | null = $state(null);
    let clarificationDeleteParentId: string | null = $state(null);
    let isClarificationDeleteSubmitting: boolean = $state(false);

    let isAmendmentDialogOpen: boolean = $state(false);
    let amendmentContent: string = $state('');
    let amendmentErrors: string[] = $state([]);
    let isAmendmentSubmitting: boolean = $state(false);
    let isAmendmentReplyDialogOpen: boolean = $state(false);
    let amendmentReplyParentId: string | null = $state(null);
    let amendmentReplyContent: string = $state('');
    let amendmentReplyErrors: string[] = $state([]);
    let isAmendmentReplySubmitting: boolean = $state(false);
    let isAmendmentEditDialogOpen: boolean = $state(false);
    let amendmentEditCommentId: string | null = $state(null);
    let amendmentEditParentId: string | null = $state(null);
    let amendmentEditContent: string = $state('');
    let amendmentEditErrors: string[] = $state([]);
    let isAmendmentEditSubmitting: boolean = $state(false);
    let isAmendmentDeleteDialogOpen: boolean = $state(false);
    let amendmentDeleteCommentId: string | null = $state(null);
    let amendmentDeleteParentId: string | null = $state(null);
    let isAmendmentDeleteSubmitting: boolean = $state(false);

    const eventSchema = z.object({
        title: z.string().trim().min(1).max(255),
        type: z.nativeEnum(PropositionEventTypeEnum),
        description: z.string().trim().max(1000).optional(),
        startAt: z.string().trim().optional(),
        endAt: z.string().trim().optional(),
        location: z.string().trim().max(255).optional(),
        videoLink: z.string().trim().max(255).optional(),
    });

    const defaultEventForm = {
        title: '',
        type: PropositionEventTypeEnum.EXCHANGE,
        description: '',
        startAt: '',
        endAt: '',
        location: '',
        videoLink: '',
    };

    let isEventDialogOpen: boolean = $state(false);
    let eventForm = $state({ ...defaultEventForm });
    let eventErrors: string[] = $state([]);
    let isEventSubmitting: boolean = $state(false);
    let isCreatingDiscordEvent: boolean = $state(false);
    let eventStartInput: HTMLInputElement | null = $state(null);
    let eventEndInput: HTMLInputElement | null = $state(null);
    let editingEventId: string | null = $state(null);
    let selectedEventId: string | null = $state(null);
    const selectedEvent = $derived(selectedEventId ? (events.find((event) => event.id === selectedEventId) ?? null) : null);
    let isEventDetailDialogOpen: boolean = $state(false);
    let isEventDeleteDialogOpen: boolean = $state(false);
    let eventDeleteId: string | null = $state(null);
    let isEventDeleteSubmitting: boolean = $state(false);

    const getVoteSchema = () =>
        z
            .object({
                title: z.string().trim().min(1, m['proposition-detail.votes.errors.title-required']()).max(255, m['proposition-detail.votes.errors.title-too-long']()),
                description: z.string().trim().max(1000, m['proposition-detail.votes.errors.description-too-long']()).optional(),
                phase: z.nativeEnum(PropositionVotePhaseEnum),
                method: z.nativeEnum(PropositionVoteMethodEnum),
                openAt: z.string().trim().min(1, m['proposition-detail.votes.errors.open-at-required']()),
                closeAt: z.string().trim().min(1, m['proposition-detail.votes.errors.close-at-required']()),
                maxSelections: z.number().min(0, m['proposition-detail.votes.errors.max-selections-invalid']()).optional(),
                options: z
                    .array(
                        z.object({
                            label: z.string().trim().min(1, m['proposition-detail.votes.errors.option-label-required']()).max(255, m['proposition-detail.votes.errors.option-label-too-long']()),
                            description: z.string().trim().max(1000, m['proposition-detail.votes.errors.option-description-too-long']()).optional(),
                        })
                    )
                    .min(1, m['proposition-detail.votes.errors.options-required']()),
            })
            .refine(
                (data) => {
                    if (data.openAt && data.closeAt) {
                        return new Date(data.openAt) < new Date(data.closeAt);
                    }
                    return true;
                },
                {
                    message: m['proposition-detail.votes.errors.close-before-open'](),
                    path: ['closeAt'],
                }
            );

    const defaultVoteForm = {
        title: '',
        description: '',
        phase: PropositionVotePhaseEnum.VOTE,
        openAt: '',
        closeAt: '',
        maxSelections: 1,
        isMajorityJudgment: false,
        optionsText: 'For\nAgainst',
    };

    let isVoteDialogOpen: boolean = $state(false);
    let voteForm = $state({ ...defaultVoteForm });
    let voteErrors: string[] = $state([]);
    let voteFieldErrors: Record<string, string | undefined> = $state({});
    let isVoteSubmitting: boolean = $state(false);
    let voteOpenInput: HTMLInputElement | null = $state(null);
    let voteCloseInput: HTMLInputElement | null = $state(null);

    // États pour voter
    let userBallots = $state<Record<string, any>>({});
    let isCastingVote = $state<Record<string, boolean>>({});
    let ballotSelections = $state<Record<string, any>>({});
    let voteResults = $state<Record<string, any>>({});

    const mandateSchema = z.object({
        title: z.string().trim().min(1).max(255),
        description: z.string().trim().max(1500).optional(),
        holderUserId: z.string().trim().optional(),
        status: z.nativeEnum(MandateStatusEnum),
        targetObjectiveRef: z.string().trim().max(255).optional(),
        initialDeadline: z.string().trim().optional(),
        currentDeadline: z.string().trim().optional(),
    });

    const defaultMandateForm = {
        title: '',
        description: '',
        holderUserId: '',
        status: MandateStatusEnum.TO_ASSIGN,
        targetObjectiveRef: '',
        initialDeadline: '',
        currentDeadline: '',
    };

    let isMandateDialogOpen: boolean = $state(false);
    let mandateForm = $state({ ...defaultMandateForm });
    let mandateErrors: string[] = $state([]);
    let isMandateSubmitting: boolean = $state(false);
    let mandateHolderSelection: string[] = $state([]);

    $effect(() => {
        const selected = mandateHolderSelection[0] ?? '';
        if ((mandateForm.holderUserId ?? '') !== selected) {
            mandateForm.holderUserId = selected;
        }
    });

    let isDeliverableDialogOpen: boolean = $state(false);
    let deliverableMandateId: string | null = $state(null);
    let deliverableForm = $state<{ label: string; objectiveRef: string; file: File | null }>({ label: '', objectiveRef: '', file: null });
    let deliverableErrors: string[] = $state([]);
    let isDeliverableSubmitting: boolean = $state(false);

    let isEvaluationDialogOpen: boolean = $state(false);
    let evaluationMandateId: string | null = $state(null);
    let evaluationDeliverableId: string | null = $state(null);

    let isApplicationDialogOpen: boolean = $state(false);
    let applicationMandateId: string | null = $state(null);
    let applicationForm = $state({ description: '', proposedStartDate: '', proposedEndDate: '' });
    let applicationErrors: string[] = $state([]);
    let isApplicationSubmitting: boolean = $state(false);
    let evaluationVerdict: DeliverableVerdictEnum = $state(DeliverableVerdictEnum.COMPLIANT);
    let evaluationComment: string = $state('');
    let evaluationErrors: string[] = $state([]);
    let isEvaluationSubmitting: boolean = $state(false);

    const transitionMap: Record<PropositionStatusEnum, PropositionStatusEnum[]> = {
        [PropositionStatusEnum.DRAFT]: [PropositionStatusEnum.CLARIFY, PropositionStatusEnum.ARCHIVED],
        [PropositionStatusEnum.CLARIFY]: [PropositionStatusEnum.AMEND, PropositionStatusEnum.ARCHIVED],
        [PropositionStatusEnum.AMEND]: [PropositionStatusEnum.VOTE, PropositionStatusEnum.CLARIFY, PropositionStatusEnum.ARCHIVED],
        [PropositionStatusEnum.VOTE]: [PropositionStatusEnum.MANDATE, PropositionStatusEnum.AMEND, PropositionStatusEnum.ARCHIVED],
        [PropositionStatusEnum.MANDATE]: [PropositionStatusEnum.EVALUATE, PropositionStatusEnum.VOTE, PropositionStatusEnum.ARCHIVED],
        [PropositionStatusEnum.EVALUATE]: [PropositionStatusEnum.MANDATE, PropositionStatusEnum.ARCHIVED],
        [PropositionStatusEnum.ARCHIVED]: [],
    };

    const availableTransitions = $derived(transitionMap[currentStatus] ?? []);

    let isStatusDialogOpen: boolean = $state(false);
    let selectedStatus: PropositionStatusEnum = $state(PropositionStatusEnum.DRAFT);
    let transitionReason: string = $state('');
    let statusErrors: string[] = $state([]);
    let isStatusSubmitting: boolean = $state(false);
    const hasReachedStatus = (status: PropositionStatusEnum): boolean => {
        return currentStatusRank >= (statusOrder[status] ?? 0);
    };

    const buildTabs = (): TabItem[] => [
        {
            id: 'overview',
            label: m['proposition-detail.tabs.overview'](),
        },
        {
            id: 'clarifications',
            label: m['proposition-detail.tabs.clarifications'](),
            badge: commentsByScope.clarification.length ? String(commentsByScope.clarification.length) : undefined,
            disabled: !hasReachedStatus(PropositionStatusEnum.CLARIFY) && commentsByScope.clarification.length === 0,
        },
        {
            id: 'amendments',
            label: m['proposition-detail.tabs.amendments'](),
            badge: events.length ? String(events.length) : undefined,
            disabled: !hasReachedStatus(PropositionStatusEnum.AMEND) && events.length === 0,
        },
        {
            id: 'vote',
            label: m['proposition-detail.tabs.vote'](),
            badge: votes.length ? String(votes.length) : undefined,
            disabled: !hasReachedStatus(PropositionStatusEnum.VOTE) && votes.length === 0,
        },
        {
            id: 'mandates',
            label: m['proposition-detail.tabs.mandates'](),
            badge: mandates.length ? String(mandates.length) : undefined,
            disabled: !hasReachedStatus(PropositionStatusEnum.MANDATE) && mandates.length === 0,
        },
        {
            id: 'followup',
            label: m['proposition-detail.tabs.followup'](),
            badge: commentsByScope.evaluation.length ? String(commentsByScope.evaluation.length) : undefined,
            disabled: !hasReachedStatus(PropositionStatusEnum.EVALUATE) && commentsByScope.evaluation.length === 0 && mandates.every((mandate) => (mandate.deliverables ?? []).length === 0),
        },
    ];

    const tabItems = $derived(buildTabs());

    let activeTab: string = $state('overview');

    $effect(() => {
        const isActiveAvailable = tabItems.some((tab) => tab.id === activeTab && !tab.disabled);
        if (!isActiveAvailable) {
            const firstAvailable = tabItems.find((tab) => !tab.disabled);
            if (firstAvailable) {
                activeTab = firstAvailable.id;
            }
        }
    });

    $effect(() => {
        if (isStatusDialogOpen) {
            if (!availableTransitions.includes(selectedStatus) && availableTransitions.length > 0) {
                selectedStatus = availableTransitions[0];
            }
        } else {
            selectedStatus = currentStatus;
        }
    });

    const rolePermissionMatrix = $derived(buildRolePermissionMap(perStatusPermissions, currentStatus));
    const openCommentForSection = (section: string): void => {
        if (currentStatus === PropositionStatusEnum.CLARIFY) {
            clarificationSection = section;
            isClarificationDialogOpen = true;
        } else if (currentStatus === PropositionStatusEnum.AMEND) {
            amendmentSection = section;
            isAmendmentDialogOpen = true;
        }
    };

    const getSectionLabel = (section?: string | null): string | null => {
        if (!section || section === 'general') {
            return null;
        }
        const key = `proposition-detail.comments.sections.${section}`;
        return m[key as keyof typeof m]?.() ?? null;
    };

    const canCommentOnSection = $derived(currentStatus === PropositionStatusEnum.CLARIFY || currentStatus === PropositionStatusEnum.AMEND);

    const submitClarificationComment = async (): Promise<void> => {
        clarificationErrors = [];
        const result = commentSchema.safeParse({ content: clarificationContent });
        if (!result.success) {
            clarificationErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isClarificationSubmitting = true;
        try {
            const response = await wrappedFetch(
                commentEndpoint(),
                {
                    method: 'POST',
                    body: {
                        scope: PropositionCommentScopeEnum.CLARIFICATION,
                        visibility: PropositionCommentVisibilityEnum.PUBLIC,
                        content: result.data.content,
                        section: clarificationSection,
                    },
                },
                ({ comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    clarificationContent = '';
                    clarificationSection = 'general';
                    clarificationErrors = [];
                    isClarificationDialogOpen = false;
                },
                ({ message }) => {
                    clarificationErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && clarificationErrors.length === 0) {
                clarificationErrors = [m['common.error.default-message']()];
            }
        } finally {
            isClarificationSubmitting = false;
        }
    };

    const openClarificationReply = (parentId: string): void => {
        clarificationReplyParentId = parentId;
        clarificationReplyContent = '';
        clarificationReplyErrors = [];
        isClarificationReplySubmitting = false;
        isClarificationReplyDialogOpen = true;
    };

    const submitClarificationReply = async (): Promise<void> => {
        if (!clarificationReplyParentId) {
            return;
        }

        clarificationReplyErrors = [];
        const result = commentSchema.safeParse({ content: clarificationReplyContent });
        if (!result.success) {
            clarificationReplyErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isClarificationReplySubmitting = true;

        try {
            const response = await wrappedFetch(
                commentEndpoint(),
                {
                    method: 'POST',
                    body: {
                        scope: PropositionCommentScopeEnum.CLARIFICATION,
                        visibility: PropositionCommentVisibilityEnum.PUBLIC,
                        content: result.data.content,
                        parentId: clarificationReplyParentId,
                    },
                },
                ({ comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    clarificationReplyContent = '';
                    clarificationReplyParentId = null;
                    clarificationReplyErrors = [];
                    isClarificationReplyDialogOpen = false;
                },
                ({ message }) => {
                    clarificationReplyErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && clarificationReplyErrors.length === 0) {
                clarificationReplyErrors = [m['common.error.default-message']()];
            }
        } finally {
            isClarificationReplySubmitting = false;
        }
    };

    const openClarificationEdit = (commentId: string, content: string, parentId: string | null = null): void => {
        clarificationEditCommentId = commentId;
        clarificationEditParentId = parentId;
        clarificationEditContent = content;
        clarificationEditErrors = [];
        isClarificationEditSubmitting = false;
        isClarificationEditDialogOpen = true;
    };

    const submitClarificationEdit = async (): Promise<void> => {
        if (!clarificationEditCommentId) {
            return;
        }

        clarificationEditErrors = [];
        const result = commentSchema.safeParse({ content: clarificationEditContent });
        if (!result.success) {
            clarificationEditErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isClarificationEditSubmitting = true;

        try {
            const response = await wrappedFetch(
                commentEndpoint(clarificationEditCommentId),
                {
                    method: 'PUT',
                    body: {
                        content: result.data.content,
                    },
                },
                ({ comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    clarificationEditContent = '';
                    clarificationEditCommentId = null;
                    clarificationEditParentId = null;
                    clarificationEditErrors = [];
                    isClarificationEditDialogOpen = false;
                },
                ({ message }) => {
                    clarificationEditErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && clarificationEditErrors.length === 0) {
                clarificationEditErrors = [m['common.error.default-message']()];
            }
        } finally {
            isClarificationEditSubmitting = false;
        }
    };

    const openClarificationDelete = (commentId: string, parentId: string | null = null): void => {
        clarificationDeleteCommentId = commentId;
        clarificationDeleteParentId = parentId;
        isClarificationDeleteSubmitting = false;
        isClarificationDeleteDialogOpen = true;
    };

    const submitClarificationDelete = async (): Promise<void> => {
        if (!clarificationDeleteCommentId || isClarificationDeleteSubmitting) {
            return;
        }

        isClarificationDeleteSubmitting = true;

        try {
            // Add a timeout to prevent infinite waiting
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
            });

            const fetchPromise = wrappedFetch(
                commentEndpoint(clarificationDeleteCommentId),
                {
                    method: 'DELETE',
                },
                () => {
                    propositionDetailStore.removeComment(clarificationDeleteCommentId!, clarificationDeleteParentId ?? undefined);
                    clarificationDeleteCommentId = null;
                    clarificationDeleteParentId = null;
                    isClarificationDeleteDialogOpen = false;
                },
                ({ message }) => {
                    showToast(message ?? m['common.error.default-message'](), 'error');
                }
            );

            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (!response?.isSuccess) {
                showToast(m['common.error.default-message'](), 'error');
            }
        } catch (error) {
            showToast(m['common.error.default-message'](), 'error');
        } finally {
            isClarificationDeleteSubmitting = false;
        }
    };

    const submitAmendmentComment = async (): Promise<void> => {
        amendmentErrors = [];
        const result = commentSchema.safeParse({ content: amendmentContent });
        if (!result.success) {
            amendmentErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isAmendmentSubmitting = true;
        try {
            const response = await wrappedFetch(
                commentEndpoint(),
                {
                    method: 'POST',
                    body: {
                        scope: PropositionCommentScopeEnum.AMENDMENT,
                        visibility: PropositionCommentVisibilityEnum.PUBLIC,
                        content: result.data.content,
                        section: amendmentSection,
                    },
                },
                ({ comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    amendmentContent = '';
                    amendmentSection = 'general';
                    isAmendmentDialogOpen = false;
                },
                ({ message }) => {
                    amendmentErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && amendmentErrors.length === 0) {
                amendmentErrors = [m['common.error.default-message']()];
            }
        } finally {
            isAmendmentSubmitting = false;
        }
    };

    const openAmendmentReply = (parentId: string): void => {
        amendmentReplyParentId = parentId;
        amendmentReplyContent = '';
        amendmentReplyErrors = [];
        isAmendmentReplySubmitting = false;
        isAmendmentReplyDialogOpen = true;
    };

    const submitAmendmentReply = async (): Promise<void> => {
        if (!amendmentReplyParentId) {
            return;
        }

        amendmentReplyErrors = [];
        const result = commentSchema.safeParse({ content: amendmentReplyContent });
        if (!result.success) {
            amendmentReplyErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isAmendmentReplySubmitting = true;
        try {
            const response = await wrappedFetch(
                commentEndpoint(),
                {
                    method: 'POST',
                    body: {
                        scope: PropositionCommentScopeEnum.AMENDMENT,
                        visibility: PropositionCommentVisibilityEnum.PUBLIC,
                        content: result.data.content,
                        parentId: amendmentReplyParentId,
                    },
                },
                ({ comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    amendmentReplyContent = '';
                    amendmentReplyParentId = null;
                    amendmentReplyErrors = [];
                    isAmendmentReplyDialogOpen = false;
                },
                ({ message }) => {
                    amendmentReplyErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && amendmentReplyErrors.length === 0) {
                amendmentReplyErrors = [m['common.error.default-message']()];
            }
        } finally {
            isAmendmentReplySubmitting = false;
        }
    };

    const openAmendmentEdit = (commentId: string, content: string, parentId: string | null = null): void => {
        amendmentEditCommentId = commentId;
        amendmentEditParentId = parentId;
        amendmentEditContent = content;
        amendmentEditErrors = [];
        isAmendmentEditSubmitting = false;
        isAmendmentEditDialogOpen = true;
    };

    const submitAmendmentEdit = async (): Promise<void> => {
        if (!amendmentEditCommentId) {
            return;
        }

        amendmentEditErrors = [];
        const result = commentSchema.safeParse({ content: amendmentEditContent });
        if (!result.success) {
            amendmentEditErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isAmendmentEditSubmitting = true;
        try {
            const response = await wrappedFetch(
                commentEndpoint(amendmentEditCommentId),
                {
                    method: 'PUT',
                    body: {
                        content: result.data.content,
                    },
                },
                ({ comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    amendmentEditContent = '';
                    amendmentEditCommentId = null;
                    amendmentEditParentId = null;
                    amendmentEditErrors = [];
                    isAmendmentEditDialogOpen = false;
                },
                ({ message }) => {
                    amendmentEditErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && amendmentEditErrors.length === 0) {
                amendmentEditErrors = [m['common.error.default-message']()];
            }
        } finally {
            isAmendmentEditSubmitting = false;
        }
    };

    const openAmendmentDelete = (commentId: string, parentId: string | null = null): void => {
        amendmentDeleteCommentId = commentId;
        amendmentDeleteParentId = parentId;
        isAmendmentDeleteSubmitting = false;
        isAmendmentDeleteDialogOpen = true;
    };

    const submitAmendmentDelete = async (): Promise<void> => {
        if (!amendmentDeleteCommentId) {
            return;
        }

        const targetId = amendmentDeleteCommentId;
        const targetParentId = amendmentDeleteParentId;

        isAmendmentDeleteSubmitting = true;
        try {
            const response = await wrappedFetch(
                commentEndpoint(targetId),
                { method: 'DELETE' },
                () => {
                    propositionDetailStore.removeComment(targetId, targetParentId ?? undefined);
                    amendmentDeleteCommentId = null;
                    amendmentDeleteParentId = null;
                    isAmendmentDeleteDialogOpen = false;
                },
                ({ message }) => {
                    showToast(message ?? m['common.error.default-message'](), 'error');
                }
            );

            if (!response?.isSuccess) {
                showToast(m['common.error.default-message'](), 'error');
            }
        } finally {
            isAmendmentDeleteSubmitting = false;
        }
    };

    const resetEventForm = (): void => {
        eventForm = { ...defaultEventForm };
        eventErrors = [];
    };

    const openEventCreate = (): void => {
        editingEventId = null;
        resetEventForm();
        isEventSubmitting = false;
        isEventDialogOpen = true;
    };

    const openEventDetail = (eventId: string): void => {
        selectedEventId = eventId;
        isEventDetailDialogOpen = true;
    };

    const populateEventForm = (event: PropositionEvent): void => {
        eventForm = {
            title: event.title ?? '',
            type: event.type,
            description: event.description ?? '',
            startAt: fromIsoToLocalInput(event.startAt),
            endAt: fromIsoToLocalInput(event.endAt),
            location: event.location ?? '',
            videoLink: event.videoLink ?? '',
        };
    };

    const openEventEdit = (event: PropositionEvent): void => {
        populateEventForm(event);
        editingEventId = event.id;
        eventErrors = [];
        isEventSubmitting = false;
        isEventDialogOpen = true;
        isEventDetailDialogOpen = false;
    };

    const confirmEventDelete = (eventId: string): void => {
        eventDeleteId = eventId;
        isEventDeleteSubmitting = false;
        isEventDeleteDialogOpen = true;
    };

    const submitEvent = async (): Promise<void> => {
        eventErrors = [];
        const result = eventSchema.safeParse(eventForm);
        if (!result.success) {
            eventErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isEventSubmitting = true;
        try {
            const targetEventId = editingEventId;
            const response = await wrappedFetch(
                `/propositions/${proposition.id}/events${targetEventId ? `/${targetEventId}` : ''}`,
                {
                    method: targetEventId ? 'PUT' : 'POST',
                    body: {
                        title: result.data.title,
                        type: result.data.type,
                        description: normalizeOptional(result.data.description),
                        startAt: toIsoDateTime(result.data.startAt),
                        endAt: toIsoDateTime(result.data.endAt),
                        location: normalizeOptional(result.data.location),
                        videoLink: normalizeOptional(result.data.videoLink),
                    },
                },
                ({ event }) => {
                    propositionDetailStore.upsertEvent(event);
                    const wasEdit = Boolean(targetEventId);
                    resetEventForm();
                    editingEventId = null;
                    isEventDialogOpen = false;
                    if (wasEdit) {
                        selectedEventId = event.id;
                        isEventDetailDialogOpen = true;
                    }
                },
                ({ message }) => {
                    eventErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && eventErrors.length === 0) {
                eventErrors = [m['common.error.default-message']()];
            }
        } finally {
            isEventSubmitting = false;
        }
    };

    const handleCreateDiscordEvent = async (): Promise<void> => {
        if (!eventForm.title || !eventForm.startAt) {
            return;
        }

        isCreatingDiscordEvent = true;
        eventErrors = [];

        try {
            const response = await wrappedFetch(
                '/discord/events',
                {
                    method: 'POST',
                    body: {
                        name: eventForm.title,
                        startTime: eventForm.startAt,
                        endTime: eventForm.endAt || undefined,
                        description: eventForm.description || undefined,
                    },
                },
                ({ inviteUrl }) => {
                    if (inviteUrl) {
                        eventForm.videoLink = inviteUrl;
                    }
                },
                ({ error }) => {
                    eventErrors = [error ?? "Erreur lors de la création de l'événement Discord"];
                }
            );

            if (!response?.isSuccess && eventErrors.length === 0) {
                eventErrors = ["Erreur lors de la création de l'événement Discord"];
            }
        } finally {
            isCreatingDiscordEvent = false;
        }
    };

    const submitEventDelete = async (): Promise<void> => {
        if (!eventDeleteId) {
            return;
        }

        isEventDeleteSubmitting = true;
        try {
            const response = await wrappedFetch(
                `/propositions/${proposition.id}/events/${eventDeleteId}`,
                { method: 'DELETE' },
                () => {
                    propositionDetailStore.removeEvent(eventDeleteId!);
                    if (selectedEventId === eventDeleteId) {
                        selectedEventId = null;
                        isEventDetailDialogOpen = false;
                    }
                    eventDeleteId = null;
                    isEventDeleteDialogOpen = false;
                },
                ({ message }) => {
                    showToast(message ?? m['common.error.default-message'](), 'error');
                }
            );

            if (!response?.isSuccess) {
                showToast(m['common.error.default-message'](), 'error');
            }
        } finally {
            isEventDeleteSubmitting = false;
        }
    };

    const openNativeDatePicker = (input: HTMLInputElement | null): void => {
        if (!input) {
            return;
        }
        const candidate = input as HTMLInputElement & { showPicker?: () => void };
        if (typeof candidate.showPicker === 'function') {
            candidate.showPicker();
            return;
        }
        input.focus();
        input.click();
    };

    const submitVote = async (): Promise<void> => {
        voteErrors = [];
        voteFieldErrors = {};
        const optionLines = voteForm.optionsText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length);

        if (optionLines.length === 0) {
            voteFieldErrors.optionsText = m['proposition-detail.votes.options-empty']();
            return;
        }

        let maxSelectionsNumber: number | undefined;
        if (voteForm.maxSelections) {
            const parsed = Number(voteForm.maxSelections);
            if (!Number.isFinite(parsed) || parsed < 1) {
                voteFieldErrors.maxSelections = m['proposition-detail.votes.max-invalid']();
                return;
            }
            maxSelectionsNumber = parsed;
        }

        // Déterminer automatiquement la méthode basée sur les paramètres
        let method: PropositionVoteMethodEnum;
        if (voteForm.isMajorityJudgment) {
            method = PropositionVoteMethodEnum.MAJORITY_JUDGMENT;
        } else if (maxSelectionsNumber === 1) {
            method = PropositionVoteMethodEnum.BINARY;
        } else {
            method = PropositionVoteMethodEnum.MULTI_CHOICE;
        }

        const parsed = getVoteSchema().safeParse({
            title: voteForm.title,
            description: normalizeOptional(voteForm.description),
            phase: voteForm.phase,
            method: method,
            openAt: voteForm.openAt,
            closeAt: voteForm.closeAt,
            maxSelections: maxSelectionsNumber,
            options: optionLines.map((label) => ({ label, description: undefined })),
        });

        if (!parsed.success) {
            parsed.error.issues.forEach((issue) => {
                const path = issue.path.join('.');
                voteFieldErrors[path] = issue.message;
            });
            return;
        }

        isVoteSubmitting = true;
        try {
            const response = await wrappedFetch(
                `/propositions/${proposition.id}/votes`,
                {
                    method: 'POST',
                    body: {
                        title: parsed.data.title,
                        description: parsed.data.description,
                        phase: parsed.data.phase,
                        method: parsed.data.method,
                        openAt: toIsoDateTime(parsed.data.openAt),
                        closeAt: toIsoDateTime(parsed.data.closeAt),
                        maxSelections: parsed.data.maxSelections,
                        options: parsed.data.options.map((option, index) => ({
                            label: option.label,
                            description: option.description,
                            position: index,
                        })),
                    },
                },
                ({ vote }) => {
                    propositionDetailStore.upsertVote(vote);
                    voteForm = { ...defaultVoteForm };
                    isVoteDialogOpen = false;
                },
                ({ message }) => {
                    voteErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && voteErrors.length === 0) {
                voteErrors = [m['common.error.default-message']()];
            }
        } finally {
            isVoteSubmitting = false;
        }
    };

    const openEditVote = (vote: PropositionVote): void => {
        // TODO: Populate form with vote data and open dialog
    };

    const publishVote = async (voteId: string): Promise<void> => {
        try {
            await wrappedFetch(
                `/propositions/${proposition.id}/votes/${voteId}/status`,
                {
                    method: 'POST',
                    body: {
                        status: PropositionVoteStatusEnum.SCHEDULED,
                    },
                },
                ({ vote }) => {
                    propositionDetailStore.upsertVote(vote);
                },
                ({ message }) => {
                    console.error('Failed to publish vote:', message);
                }
            );
        } catch (error) {
            console.error('Error publishing vote:', error);
        }
    };

    const openVote = async (voteId: string): Promise<void> => {
        try {
            await wrappedFetch(
                `/propositions/${proposition.id}/votes/${voteId}/status`,
                {
                    method: 'POST',
                    body: {
                        status: PropositionVoteStatusEnum.OPEN,
                    },
                },
                ({ vote }) => {
                    propositionDetailStore.upsertVote(vote);
                },
                ({ message }) => {
                    console.error('Failed to open vote:', message);
                }
            );
        } catch (error) {
            console.error('Error opening vote:', error);
        }
    };

    const closeVote = async (voteId: string): Promise<void> => {
        try {
            await wrappedFetch(
                `/propositions/${proposition.id}/votes/${voteId}/status`,
                {
                    method: 'POST',
                    body: {
                        status: PropositionVoteStatusEnum.CLOSED,
                    },
                },
                ({ vote }) => {
                    propositionDetailStore.upsertVote(vote);
                },
                ({ message }) => {
                    console.error('Failed to close vote:', message);
                }
            );
        } catch (error) {
            console.error('Error closing vote:', error);
        }
    };

    const deleteVote = async (voteId: string): Promise<void> => {
        try {
            await wrappedFetch(
                `/propositions/${proposition.id}/votes/${voteId}`,
                {
                    method: 'DELETE',
                },
                () => {
                    propositionDetailStore.removeVote(voteId);
                },
                ({ message }) => {
                    console.error('Failed to delete vote:', message);
                }
            );
        } catch (error) {
            console.error('Error deleting vote:', error);
        }
    };

    const fetchUserBallot = async (voteId: string): Promise<void> => {
        try {
            await wrappedFetch(`/propositions/${proposition.id}/votes/${voteId}/ballot`, { method: 'GET' }, ({ ballot }) => {
                userBallots[voteId] = ballot;
            });
        } catch (error) {
            console.error('Error fetching ballot:', error);
        }
    };

    const fetchVoteResults = async (voteId: string): Promise<void> => {
        try {
            await wrappedFetch(`/propositions/${proposition.id}/votes/${voteId}/results`, { method: 'GET' }, ({ results }) => {
                voteResults[voteId] = results;
            });
        } catch (error) {
            console.error('Error fetching results:', error);
        }
    };

    const refreshVotes = async (): Promise<void> => {
        try {
            await wrappedFetch(`/propositions/${proposition.id}/votes`, { method: 'GET' }, ({ votes: updatedVotes }) => {
                updatedVotes.forEach((vote: any) => {
                    propositionDetailStore.upsertVote(vote);
                });
            });
        } catch (error) {
            console.error('Error refreshing votes:', error);
        }
    };

    const castBallot = async (vote: PropositionVote): Promise<void> => {
        isCastingVote[vote.id] = true;

        try {
            let payload: any = {};

            if (vote.method === PropositionVoteMethodEnum.BINARY) {
                payload.optionId = ballotSelections[vote.id];
            } else if (vote.method === PropositionVoteMethodEnum.MULTI_CHOICE) {
                payload.optionIds = ballotSelections[vote.id] || [];
            } else if (vote.method === PropositionVoteMethodEnum.MAJORITY_JUDGMENT) {
                payload.ratings = ballotSelections[vote.id] || {};
            }

            await wrappedFetch(
                `/propositions/${proposition.id}/votes/${vote.id}/ballot`,
                {
                    method: 'POST',
                    body: payload,
                },
                ({ ballot }) => {
                    userBallots[vote.id] = ballot;
                    ballotSelections[vote.id] = null;
                },
                ({ error }) => {
                    console.error('Error casting ballot:', error);
                    alert(error || 'Erreur lors du vote');
                }
            );
        } catch (error) {
            console.error('Error casting ballot:', error);
        } finally {
            isCastingVote[vote.id] = false;
        }
    };

    const revokeBallot = async (voteId: string): Promise<void> => {
        if (!confirm('Voulez-vous vraiment révoquer votre vote ?')) {
            return;
        }

        try {
            await wrappedFetch(
                `/propositions/${proposition.id}/votes/${voteId}/ballot`,
                { method: 'DELETE' },
                () => {
                    userBallots[voteId] = null;
                },
                ({ error }) => {
                    console.error('Error revoking ballot:', error);
                    alert(error || 'Erreur lors de la révocation');
                }
            );
        } catch (error) {
            console.error('Error revoking ballot:', error);
        }
    };

    const submitMandate = async (): Promise<void> => {
        mandateErrors = [];
        const parsed = mandateSchema.safeParse(mandateForm);
        if (!parsed.success) {
            mandateErrors = parsed.error.issues.map((issue) => issue.message);
            return;
        }

        isMandateSubmitting = true;
        try {
            const response = await wrappedFetch(
                `/propositions/${proposition.id}/mandates`,
                {
                    method: 'POST',
                    body: {
                        title: parsed.data.title,
                        description: normalizeOptional(parsed.data.description),
                        holderUserId: normalizeOptional(parsed.data.holderUserId),
                        status: parsed.data.status,
                        targetObjectiveRef: normalizeOptional(parsed.data.targetObjectiveRef),
                        initialDeadline: toIsoDateTime(parsed.data.initialDeadline),
                        currentDeadline: toIsoDateTime(parsed.data.currentDeadline),
                    },
                },
                ({ mandate }) => {
                    propositionDetailStore.upsertMandate(mandate);
                    mandateForm = { ...defaultMandateForm };
                    mandateHolderSelection = [];
                    isMandateDialogOpen = false;
                },
                ({ message }) => {
                    mandateErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && mandateErrors.length === 0) {
                mandateErrors = [m['common.error.default-message']()];
            }
        } finally {
            isMandateSubmitting = false;
        }
    };

    const openEditMandate = (mandate: any): void => {
        // TODO: Populate form with mandate data and open dialog
    };

    const deleteMandate = async (mandateId: string): Promise<void> => {
        try {
            await wrappedFetch(`/propositions/${proposition.id}/mandates/${mandateId}`, { method: 'DELETE' }, () => {
                propositionDetailStore.removeMandate(mandateId);
            });
        } catch (error) {
            console.error('Error deleting mandate:', error);
        }
    };

    const openApplicationDialog = (mandateId: string): void => {
        applicationMandateId = mandateId;
        applicationForm = { description: '', proposedStartDate: '', proposedEndDate: '' };
        applicationErrors = [];
        isApplicationSubmitting = false;
        isApplicationDialogOpen = true;
    };

    const submitApplication = async (): Promise<void> => {
        if (!applicationMandateId) {
            return;
        }

        applicationErrors = [];

        if (!applicationForm.description.trim()) {
            applicationErrors = ['La description est obligatoire'];
            return;
        }

        isApplicationSubmitting = true;

        try {
            await wrappedFetch(
                `/propositions/${proposition.id}/mandates/${applicationMandateId}/applications`,
                {
                    method: 'POST',
                    body: {
                        description: applicationForm.description,
                    },
                },
                ({ application, mandate }) => {
                    propositionDetailStore.upsertMandate(mandate);
                    showToast('Candidature soumise avec succès', 'success');
                    applicationForm = { description: '', proposedStartDate: '', proposedEndDate: '' };
                    isApplicationDialogOpen = false;
                },
                (data) => {
                    applicationErrors = extractFormErrors(data).map((entry) => entry.message);
                }
            );
        } catch (error) {
            console.error('Exception in submitApplication:', error);
        } finally {
            isApplicationSubmitting = false;
        }
    };

    const openDeliverableDialog = (mandateId: string): void => {
        deliverableMandateId = mandateId;
        deliverableForm = { label: '', objectiveRef: '', file: null };
        deliverableErrors = [];
        isDeliverableSubmitting = false;
        isDeliverableDialogOpen = true;
    };

    const submitDeliverable = async (): Promise<void> => {
        if (!deliverableMandateId) {
            return;
        }

        deliverableErrors = [];

        if (!deliverableForm.file) {
            deliverableErrors = [m['proposition-detail.mandates.deliverables.file-required']()];
            return;
        }

        isDeliverableSubmitting = true;

        try {
            const formData = new FormData();
            if (deliverableForm.label.trim()) {
                formData.set('label', deliverableForm.label.trim());
            }
            if (deliverableForm.objectiveRef.trim()) {
                formData.set('objectiveRef', deliverableForm.objectiveRef.trim());
            }
            formData.set('file', deliverableForm.file);

            const url = `/propositions/${proposition.id}/mandates/${deliverableMandateId}/deliverables`;

            const response = await wrappedFetch(
                url,
                {
                    method: 'POST',
                    body: formData,
                },
                async ({ deliverable, mandate, proposition: updatedProposition }) => {
                    propositionDetailStore.upsertMandate(mandate);
                    propositionDetailStore.updateProposition(updatedProposition);
                    showToast(m['proposition-detail.mandates.deliverables.upload-success'](), 'success');
                    deliverableForm = { label: '', objectiveRef: '', file: null };
                    isDeliverableDialogOpen = false;
                },
                async (data) => {
                    deliverableErrors = extractFormErrors(data).map((entry) => entry.message);
                }
            );

            if (!response?.isSuccess && deliverableErrors.length === 0) {
                deliverableErrors = [m['common.error.default-message']()];
            }
        } catch (error) {
            console.error('Exception in submitDeliverable:', error);
        } finally {
            isDeliverableSubmitting = false;
        }
    };

    const openEvaluationDialog = (mandateId: string, deliverableId: string): void => {
        evaluationMandateId = mandateId;
        evaluationDeliverableId = deliverableId;
        evaluationVerdict = DeliverableVerdictEnum.COMPLIANT;
        evaluationComment = '';
        evaluationErrors = [];
        isEvaluationSubmitting = false;
        isEvaluationDialogOpen = true;
    };

    const submitEvaluation = async (): Promise<void> => {
        if (!evaluationMandateId || !evaluationDeliverableId) {
            return;
        }

        evaluationErrors = [];
        isEvaluationSubmitting = true;

        try {
            const response = await wrappedFetch(
                `/propositions/${proposition.id}/mandates/${evaluationMandateId}/deliverables/${evaluationDeliverableId}/evaluations`,
                {
                    method: 'POST',
                    body: {
                        verdict: evaluationVerdict,
                        comment: evaluationComment.trim() || undefined,
                    },
                },
                async ({ mandate }) => {
                    propositionDetailStore.upsertMandate(mandate);
                    showToast(m['proposition-detail.mandates.deliverables.evaluate-success'](), 'success');
                    evaluationComment = '';
                    isEvaluationDialogOpen = false;
                },
                async (data) => {
                    evaluationErrors = extractFormErrors(data).map((entry) => entry.message);
                }
            );

            if (!response?.isSuccess && evaluationErrors.length === 0) {
                evaluationErrors = [m['common.error.default-message']()];
            }
        } finally {
            isEvaluationSubmitting = false;
        }
    };

    const submitStatusChange = async (): Promise<void> => {
        statusErrors = [];
        if (!availableTransitions.includes(selectedStatus)) {
            statusErrors = [m['proposition-detail.status.invalid']()];
            return;
        }

        isStatusSubmitting = true;
        try {
            const response = await wrappedFetch(
                `/propositions/${proposition.id}/status`,
                {
                    method: 'POST',
                    body: {
                        status: selectedStatus,
                        reason: normalizeOptional(transitionReason),
                    },
                },
                ({ proposition: updated }) => {
                    propositionDetailStore.updateProposition(updated);
                    transitionReason = '';
                    isStatusDialogOpen = false;
                },
                ({ message }) => {
                    statusErrors = [message ?? m['common.error.default-message']()];
                }
            );

            if (!response?.isSuccess && statusErrors.length === 0) {
                statusErrors = [m['common.error.default-message']()];
            }
        } finally {
            isStatusSubmitting = false;
        }
    };

    const handleClarificationSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitClarificationComment();
    };

    const handleClarificationReplySubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitClarificationReply();
    };

    const handleClarificationEditSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitClarificationEdit();
    };

    const handleAmendmentSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitAmendmentComment();
    };

    const handleAmendmentReplySubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitAmendmentReply();
    };

    const handleAmendmentEditSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitAmendmentEdit();
    };

    const handleEventSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitEvent();
    };

    const handleVoteSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitVote();
    };

    const handleMandateSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitMandate();
    };

    const handleStatusSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitStatusChange();
    };

    let showDeleteDialog: boolean = $state(false);
    let isDeleteSubmitting: boolean = $state(false);

    const handleDeleteSubmit = (): void => {
        isDeleteSubmitting = true;
    };

    const printPage = (): void => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const goBack = async (): Promise<void> => {
        await goto('/propositions');
    };

    const openAssociated = async (linked: SerializedPropositionSummary): Promise<void> => {
        await goto(`/propositions/${linked.id}`);
    };

    const hasExpertise = $derived(Boolean(proposition.expertise && proposition.expertise.trim().length));
    const hasRescueInitiators = $derived((proposition.rescueInitiators ?? []).length > 0);
    const hasAssociated = $derived((proposition.associatedPropositions ?? []).length > 0);
    const hasAttachments = $derived((proposition.attachments ?? []).length > 0);

    // These fields are always created with RichTextEditor, so always render as HTML
    const detailedDescriptionHasHtml = $derived(true);
    const smartObjectivesHasHtml = $derived(true);
    const impactsHasHtml = $derived(true);
    const mandatesHasHtml = $derived(true);
    const expertiseHasHtml = $derived(containsHtml(proposition.expertise));
</script>

<Meta
    title={m['proposition-detail.meta.title']({ title: proposition.title })}
    description={m['proposition-detail.meta.description']({ summary: proposition.summary })}
    keywords={m['proposition-detail.meta.keywords']().split(', ')}
    pathname={`/propositions/${proposition.id}`}
/>

<div class="proposition-detail space-y-6 lg:space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-3 print-hidden">
        <div class="flex flex-wrap items-center gap-3">
            <Button variant="outline" class="gap-2" onclick={goBack}>
                <ArrowLeft class="size-4" />
                {m['proposition-detail.actions.back']()}
            </Button>
            {#if canEditProposition}
                <Button variant="outline" class="gap-2" onclick={() => goto(`/propositions/${proposition.id}/edit`)}>
                    <Pencil class="size-4" />
                    {m['common.edit']()}
                </Button>
            {/if}
            {#if canManageStatus && availableTransitions.length}
                <Button
                    variant="outline"
                    class="gap-2"
                    onclick={() => {
                        isStatusDialogOpen = true;
                        selectedStatus = availableTransitions[0];
                    }}
                >
                    <RefreshCcw class="size-4" />
                    {m['proposition-detail.status.change']()}
                </Button>
            {/if}
            {#if canDeleteProposition}
                <Button variant="destructive" class="gap-2" onclick={() => (showDeleteDialog = true)}>
                    <Trash2 class="size-4" />
                    {m['common.delete']()}
                </Button>
            {/if}
        </div>
        <Button variant="secondary" class="gap-2" onclick={printPage}>
            <Printer class="size-4" />
            {m['proposition-detail.actions.print']()}
        </Button>
    </div>

    {#if canDeleteProposition}
        <AlertDialog open={showDeleteDialog} onOpenChange={(value: boolean) => (showDeleteDialog = value)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{m['proposition-detail.delete.title']()}</AlertDialogTitle>
                    <AlertDialogDescription>{m['proposition-detail.delete.description']()}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{m['common.cancel']()}</AlertDialogCancel>
                    <form method="POST" action="?/delete" class="inline-flex" onsubmit={handleDeleteSubmit}>
                        <AlertDialogAction type="submit" disabled={isDeleteSubmitting}>
                            {m['proposition-detail.delete.confirm']()}
                        </AlertDialogAction>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    {/if}

    <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex-1 space-y-3">
                <h1 class="text-3xl font-semibold text-foreground sm:text-4xl">{proposition.title}</h1>
                <p class="text-base text-muted-foreground">{proposition.summary}</p>
                <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span class="font-semibold text-foreground">{m['proposition-detail.status.current']()}:</span>
                    <span>{translateStatus(currentStatus)}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each proposition.categories as category (category.id)}
                        <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {category.name}
                        </span>
                    {/each}
                </div>
            </div>
            <div class="flex flex-col gap-2 text-sm text-muted-foreground lg:w-64">
                <div>
                    <span class="font-semibold text-foreground">{m['proposition-detail.labels.creator']()}:</span>
                    <span class="ml-2">{proposition.creator.username}</span>
                </div>
                <div>
                    <span class="font-semibold text-foreground">{m['proposition-detail.labels.created']()}:</span>
                    <span class="ml-2">{formatDateTime(proposition.createdAt)}</span>
                </div>
                <div>
                    <span class="font-semibold text-foreground">{m['proposition-detail.labels.updated']()}:</span>
                    <span class="ml-2">{formatDateTime(proposition.updatedAt)}</span>
                </div>
            </div>
        </div>
        {#if visualUrl}
            <figure class="mt-6 overflow-hidden rounded-2xl border border-border/40 bg-muted/30">
                <img src={visualUrl} alt={m['proposition-detail.visual.alt']({ title: proposition.title })} class="w-full object-cover" loading="lazy" />
            </figure>
        {/if}
    </section>

    <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarDays class="size-5" />
            {m['proposition-detail.sections.timeline']()}
        </h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each timelinePhases as phase (phase.key)}
                <div
                    class={cn(
                        'rounded-xl border border-border/40 bg-card/70 p-4 text-sm print:border-0 print:bg-transparent',
                        phase.isCurrent ? 'ring-2 ring-primary/50' : '',
                        phase.completed ? 'opacity-90' : ''
                    )}
                >
                    <div class="flex items-center justify-between gap-2">
                        <p class="font-semibold text-foreground">{phase.label}</p>
                        <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{getPhaseStatusLabel(phase)}</span>
                    </div>
                    <p class="mt-2 text-muted-foreground">{formatDate(phase.deadline)}</p>
                    {#if phase.extra?.deliverableCount}
                        <p class="mt-2 text-xs text-muted-foreground">
                            {m['proposition-detail.timeline.deliverables']({ count: phase.extra.deliverableCount })}
                        </p>
                    {/if}
                    {#if phase.extra?.voteStatus}
                        <p class="mt-2 text-xs text-muted-foreground">
                            {m['proposition-detail.timeline.vote-status']({ status: phase.extra.voteStatus })}
                        </p>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <section class="rounded-2xl bg-background/60 p-4 shadow-sm ring-1 ring-border/40 print:hidden">
        <Tabs bind:value={activeTab} items={tabItems} ariaLabel={m['proposition-detail.tabs.aria-label']()} />
    </section>

    {#if activeTab === 'overview'}
        <section class="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div class="space-y-6">
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.description']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('description')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if detailedDescriptionHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.detailedDescription}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.detailedDescription}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.objectives']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('smart_objectives')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if smartObjectivesHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.smartObjectives}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.smartObjectives}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.impacts']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('impacts')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if impactsHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.impacts}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.impacts}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.mandates']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('mandates')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if mandatesHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.mandatesDescription}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.mandatesDescription}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.expertise']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('expertise')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if hasExpertise}
                        {#if expertiseHasHtml}
                            <div class="mt-3 text-sm leading-relaxed text-foreground">
                                {@html proposition.expertise}
                            </div>
                        {:else}
                            <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.expertise}</p>
                        {/if}
                    {:else}
                        <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.expertise']()}</p>
                    {/if}
                </article>
            </div>

            <aside class="space-y-6">
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.rescue']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('rescue')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if hasRescueInitiators}
                        <ul class="mt-3 space-y-2 text-sm text-foreground">
                            {#each proposition.rescueInitiators as user (user.id)}
                                <li class="rounded-lg border border-border/40 bg-muted/40 px-3 py-2 print:border-0 print:bg-transparent">
                                    {user.username}
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.rescue']()}</p>
                    {/if}
                </article>

                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.associated']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('associated')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if hasAssociated}
                        <ul class="mt-3 space-y-2 text-sm">
                            {#each proposition.associatedPropositions as linked (linked.id)}
                                <li>
                                    <Button variant="ghost" size="sm" class="px-0" onclick={() => openAssociated(linked)}>
                                        {linked.title}
                                    </Button>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.associated']()}</p>
                    {/if}
                </article>

                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <div class="flex items-start justify-between">
                        <h2 class="text-lg font-semibold">{m['proposition-detail.sections.attachments']()}</h2>
                        {#if canCommentOnSection}
                            <button
                                type="button"
                                class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                                onclick={() => openCommentForSection('attachments')}
                                title="Ajouter un commentaire"
                            >
                                <MessageCircle class="size-4" />
                            </button>
                        {/if}
                    </div>
                    {#if hasAttachments}
                        <ul class="mt-3 space-y-3 text-sm">
                            {#each proposition.attachments as attachment (attachment.id)}
                                <li class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/30 p-3 print:border-0 print:bg-transparent">
                                    <div>
                                        <p class="font-semibold text-foreground">{attachment.name}</p>
                                        <p class="text-xs text-muted-foreground">{attachment.mimeType} • {formatFileSize(attachment.size)}</p>
                                    </div>
                                    <a href={attachmentUrl(attachment.id)} download={attachment.name} class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
                                        <Download class="size-4" />
                                        {m['proposition-detail.actions.download']()}
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.attachments']()}</p>
                    {/if}
                </article>
            </aside>
        </section>
    {:else if activeTab === 'clarifications'}
        <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
            <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.clarifications']()}</h2>
            {#if canCommentClarification}
                <div class="mt-4 flex justify-end">
                    <Button variant="outline" class="gap-2" onclick={() => (isClarificationDialogOpen = true)}>
                        <Plus class="size-4" />
                        {m['proposition-detail.comments.add']()}
                    </Button>
                </div>
            {/if}
            {#if commentsByScope.clarification.length}
                <ul class="mt-4 space-y-4">
                    {#each commentsByScope.clarification as comment (comment.id)}
                        <li class="space-y-3 rounded-xl border border-border/40 bg-card/60 p-4">
                            <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <div class="flex items-center gap-2">
                                    <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                    {#if getSectionLabel(comment.section)}
                                        <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{getSectionLabel(comment.section)}</span>
                                    {/if}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span>{formatDateTime(comment.createdAt)}</span>
                                    {#if comment.editable}
                                        <Button size="sm" variant="ghost" class="gap-1" onclick={() => openClarificationEdit(comment.id, comment.content)}>
                                            <Pencil class="size-3.5" />
                                            {m['proposition-detail.comments.edit']()}
                                        </Button>
                                        {#if (comment.replies ?? []).length === 0}
                                            <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => openClarificationDelete(comment.id)}>
                                                <Trash2 class="size-3.5" />
                                                {m['proposition-detail.comments.delete']()}
                                            </Button>
                                        {/if}
                                    {/if}
                                </div>
                            </div>
                            <p class="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                            {#if canCommentClarification}
                                <div class="flex flex-wrap justify-end">
                                    <Button size="sm" variant="ghost" class="gap-1" onclick={() => openClarificationReply(comment.id)}>
                                        <Plus class="size-3.5" />
                                        {m['proposition-detail.comments.reply']()}
                                    </Button>
                                </div>
                            {/if}
                            {#if (comment.replies ?? []).length}
                                <ul class="ml-4 space-y-2 border-l border-border/30 pl-4">
                                    {#each comment.replies ?? [] as reply (reply.id)}
                                        <li class="space-y-1 rounded-lg bg-background/60 p-3">
                                            <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                <span>{reply.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                                <div class="flex items-center gap-2">
                                                    <span>{formatDateTime(reply.createdAt)}</span>
                                                    {#if reply.editable}
                                                        <Button size="sm" variant="ghost" class="gap-1" onclick={() => openClarificationEdit(reply.id, reply.content, comment.id)}>
                                                            <Pencil class="size-3" />
                                                            {m['proposition-detail.comments.edit']()}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            class="gap-1 text-destructive hover:text-destructive"
                                                            onclick={() => openClarificationDelete(reply.id, comment.id)}
                                                        >
                                                            <Trash2 class="size-3" />
                                                            {m['proposition-detail.comments.delete']()}
                                                        </Button>
                                                    {/if}
                                                </div>
                                            </div>
                                            <p class="text-sm text-foreground/85 whitespace-pre-wrap">{reply.content}</p>
                                        </li>
                                    {/each}
                                </ul>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.comments.empty']()}</p>
            {/if}
        </section>
    {:else if activeTab === 'amendments'}
        <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.amendments']()}</h2>
                <div class="flex flex-wrap justify-end gap-2">
                    {#if canManageEvents}
                        <Button variant="outline" class="gap-2" onclick={openEventCreate}>
                            <Plus class="size-4" />
                            {m['proposition-detail.events.add']()}
                        </Button>
                    {/if}
                    {#if canCommentAmendment}
                        <Button variant="outline" class="gap-2" onclick={() => (isAmendmentDialogOpen = true)}>
                            <Plus class="size-4" />
                            {m['proposition-detail.comments.add-amendment']()}
                        </Button>
                    {/if}
                </div>
            </div>
            {#if events.length}
                <ul class="mt-4 space-y-3">
                    {#each events as event (event.id)}
                        <li class="rounded-xl border border-border/40 bg-card/60 p-4">
                            <div class="flex flex-wrap items-start justify-between gap-3">
                                <div class="space-y-1">
                                    <p class="font-semibold text-foreground">{event.title}</p>
                                    <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <span>{translateEventType(event.type)}</span>
                                        {#if event.startAt && event.endAt}
                                            <span>{formatDateTime(event.startAt)} – {formatDateTime(event.endAt)}</span>
                                        {:else if event.startAt}
                                            <span>{formatDateTime(event.startAt)}</span>
                                        {:else if event.endAt}
                                            <span>{formatDateTime(event.endAt)}</span>
                                        {/if}
                                        {#if event.location}
                                            <span>{event.location}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <Button size="sm" variant="ghost" class="gap-1" onclick={() => openEventDetail(event.id)}>
                                        <Eye class="size-4" />
                                        {m['common.view']()}
                                    </Button>
                                    {#if isEventEditableByCurrentUser(event)}
                                        <Button size="sm" variant="ghost" class="gap-1" onclick={() => openEventEdit(event)}>
                                            <Pencil class="size-3.5" />
                                            {m['common.edit']()}
                                        </Button>
                                        <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => confirmEventDelete(event.id)}>
                                            <Trash2 class="size-3.5" />
                                            {m['common.delete']()}
                                        </Button>
                                    {/if}
                                </div>
                            </div>
                            {#if event.description}
                                <p class="mt-3 text-sm text-foreground/80 whitespace-pre-wrap">{event.description}</p>
                            {/if}
                            {#if event.videoLink}
                                <p class="mt-2 text-xs text-muted-foreground">
                                    <a href={event.videoLink} target="_blank" rel="noreferrer" class="underline underline-offset-2">
                                        {event.videoLink}
                                    </a>
                                </p>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.events.empty']()}</p>
            {/if}
            <div class="space-y-3">
                <h3 class="text-sm font-semibold text-foreground">{m['proposition-detail.comments.section.amendment']()}</h3>
                {#if commentsByScope.amendment.length}
                    <ul class="space-y-3">
                        {#each commentsByScope.amendment as comment (comment.id)}
                            <li class="space-y-3 rounded-xl border border-border/40 bg-card/60 p-4">
                                <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <div class="flex items-center gap-2">
                                        <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                        {#if getSectionLabel(comment.section)}
                                            <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{getSectionLabel(comment.section)}</span>
                                        {/if}
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span>{formatDateTime(comment.createdAt)}</span>
                                        {#if comment.editable}
                                            <Button size="sm" variant="ghost" class="gap-1" onclick={() => openAmendmentEdit(comment.id, comment.content)}>
                                                <Pencil class="size-3.5" />
                                                {m['proposition-detail.comments.edit']()}
                                            </Button>
                                            {#if (comment.replies ?? []).length === 0}
                                                <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => openAmendmentDelete(comment.id)}>
                                                    <Trash2 class="size-3.5" />
                                                    {m['proposition-detail.comments.delete']()}
                                                </Button>
                                            {/if}
                                        {/if}
                                    </div>
                                </div>
                                <p class="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                                {#if canCommentAmendment}
                                    <div class="flex flex-wrap justify-end">
                                        <Button size="sm" variant="ghost" class="gap-1" onclick={() => openAmendmentReply(comment.id)}>
                                            <Plus class="size-3.5" />
                                            {m['proposition-detail.comments.reply']()}
                                        </Button>
                                    </div>
                                {/if}
                                {#if (comment.replies ?? []).length}
                                    <ul class="ml-4 space-y-2 border-l border-border/30 pl-4">
                                        {#each comment.replies ?? [] as reply (reply.id)}
                                            <li class="space-y-1 rounded-lg bg-background/60 p-3">
                                                <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                    <span>{reply.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                                    <div class="flex items-center gap-2">
                                                        <span>{formatDateTime(reply.createdAt)}</span>
                                                        {#if reply.editable}
                                                            <Button size="sm" variant="ghost" class="gap-1" onclick={() => openAmendmentEdit(reply.id, reply.content, comment.id)}>
                                                                <Pencil class="size-3" />
                                                                {m['proposition-detail.comments.edit']()}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                class="gap-1 text-destructive hover:text-destructive"
                                                                onclick={() => openAmendmentDelete(reply.id, comment.id)}
                                                            >
                                                                <Trash2 class="size-3" />
                                                                {m['proposition-detail.comments.delete']()}
                                                            </Button>
                                                        {/if}
                                                    </div>
                                                </div>
                                                <p class="text-sm text-foreground/85 whitespace-pre-wrap">{reply.content}</p>
                                            </li>
                                        {/each}
                                    </ul>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="text-sm text-muted-foreground">{m['proposition-detail.comments.empty']()}</p>
                {/if}
            </div>
        </section>
    {:else if activeTab === 'vote'}
        <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
            <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.vote']()}</h2>
            {#if canConfigureVote}
                <div class="mt-4 flex justify-end">
                    <Button variant="outline" class="gap-2" onclick={() => (isVoteDialogOpen = true)}>
                        <Plus class="size-4" />
                        {m['proposition-detail.votes.add']()}
                    </Button>
                </div>
            {/if}
            {#if votes.length}
                <ul class="mt-4 space-y-4">
                    {#each votes as vote (vote.id)}
                        <li class="rounded-xl border border-border/40 bg-card/60 p-4">
                            <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
                                <div class="flex-1">
                                    <p class="font-semibold text-foreground">{vote.title}</p>
                                    <p class="text-xs text-muted-foreground">{m['proposition-detail.vote.method']({ method: translateVoteMethod(vote.method as PropositionVoteMethodEnum) })}</p>
                                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {#if vote.openAt}
                                            <span>Ouverture : {formatDateTime(vote.openAt)}</span>
                                        {/if}
                                        {#if vote.closeAt}
                                            <span>Clôture : {formatDateTime(vote.closeAt)}</span>
                                        {/if}
                                    </div>
                                    {#if getVoteTimeRemaining(vote, currentTime)}
                                        {@const timeInfo = getVoteTimeRemaining(vote, currentTime)}
                                        <p class="mt-1 text-xs font-medium {timeInfo.color}">{timeInfo.text}</p>
                                    {/if}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">{translateVotePhase(vote.phase)}</span>
                                    <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{vote.status}</span>
                                    {#if canConfigureVote}
                                        <Button size="sm" variant="ghost" class="gap-1" onclick={() => openEditVote(vote)}>
                                            <Pencil class="size-3.5" />
                                            {m['common.edit']()}
                                        </Button>
                                        {#if vote.status === 'draft'}
                                            <Button size="sm" variant="default" class="gap-1" onclick={() => publishVote(vote.id)}>
                                                <CheckCircle class="size-3.5" />
                                                Publier
                                            </Button>
                                        {/if}
                                        {#if workflowRole === 'admin' && vote.status === 'scheduled'}
                                            <Button size="sm" variant="default" class="gap-1" onclick={() => openVote(vote.id)}>
                                                <CheckCircle class="size-3.5" />
                                                Ouvrir
                                            </Button>
                                        {/if}
                                        {#if workflowRole === 'admin' && vote.status === 'open'}
                                            <Button size="sm" variant="outline" class="gap-1" onclick={() => closeVote(vote.id)}>Clôturer</Button>
                                        {/if}
                                        {#if workflowRole === 'admin'}
                                            <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => deleteVote(vote.id)}>
                                                <Trash2 class="size-3.5" />
                                                {m['common.delete']()}
                                            </Button>
                                        {/if}
                                    {/if}
                                </div>
                            </div>
                            {#if vote.description}
                                <p class="mt-2 text-sm text-foreground/80">{vote.description}</p>
                            {/if}

                            <!-- Show options list only if user can't vote or has already voted -->
                            {#if !(vote.status === 'open' && canParticipateVote && !userBallots[vote.id])}
                                <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
                                    {#each vote.options as option (option.id)}
                                        <li class="rounded border border-border/30 bg-background/80 px-3 py-2">
                                            <span class="font-medium text-foreground">{option.label}</span>
                                            {#if option.description}
                                                <p class="text-xs text-muted-foreground">{option.description}</p>
                                            {/if}
                                        </li>
                                    {/each}
                                </ul>
                            {/if}

                            <!-- Vote casting UI -->
                            {#if vote.status === 'open' && canParticipateVote}
                                {#if userBallots[vote.id]}
                                    <div class="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                                        ✓ Vous avez déjà voté
                                        <Button size="sm" variant="ghost" class="ml-2 text-xs text-destructive hover:text-destructive" onclick={() => revokeBallot(vote.id)}>Révoquer mon vote</Button>
                                    </div>
                                {:else}
                                    <div class="mt-4 rounded-lg border border-border/40 bg-background/50 p-4">
                                        <h4 class="mb-3 text-sm font-semibold text-foreground">Voter</h4>

                                        {#if vote.method === PropositionVoteMethodEnum.BINARY}
                                            <!-- Binary vote: radio buttons -->
                                            <div class="space-y-2">
                                                {#each vote.options as option (option.id)}
                                                    <label class="flex cursor-pointer items-center gap-3 rounded-md border border-border/30 bg-background px-3 py-2 hover:border-primary/40">
                                                        <input type="radio" name="vote-{vote.id}" value={option.id} bind:group={ballotSelections[vote.id]} class="size-4" />
                                                        <div class="flex-1">
                                                            <span class="text-sm font-medium text-foreground">{option.label}</span>
                                                            {#if option.description}
                                                                <p class="text-xs text-muted-foreground">{option.description}</p>
                                                            {/if}
                                                        </div>
                                                    </label>
                                                {/each}
                                            </div>
                                            <Button class="mt-3 w-full" onclick={() => castBallot(vote)} disabled={!ballotSelections[vote.id] || isCastingVote[vote.id]}>
                                                {isCastingVote[vote.id] ? 'Envoi...' : 'Confirmer mon vote'}
                                            </Button>
                                        {:else if vote.method === PropositionVoteMethodEnum.MULTI_CHOICE}
                                            <!-- Multi-choice: checkboxes with max selections -->
                                            <p class="mb-2 text-xs text-muted-foreground">Sélectionnez jusqu'à {vote.maxSelections} option{vote.maxSelections > 1 ? 's' : ''}</p>
                                            <div class="space-y-2">
                                                {#each vote.options as option (option.id)}
                                                    {@const selected = ballotSelections[vote.id] || []}
                                                    {@const isChecked = selected.includes(option.id)}
                                                    {@const canCheck = isChecked || selected.length < (vote.maxSelections || 1)}
                                                    <label
                                                        class="flex cursor-pointer items-center gap-3 rounded-md border border-border/30 bg-background px-3 py-2 {canCheck
                                                            ? 'hover:border-primary/40'
                                                            : 'opacity-50'}"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            value={option.id}
                                                            checked={isChecked}
                                                            disabled={!canCheck}
                                                            onchange={(e) => {
                                                                const target = e.target as HTMLInputElement;
                                                                if (!ballotSelections[vote.id]) ballotSelections[vote.id] = [];
                                                                if (target.checked) {
                                                                    ballotSelections[vote.id] = [...ballotSelections[vote.id], option.id];
                                                                } else {
                                                                    ballotSelections[vote.id] = ballotSelections[vote.id].filter((id: string) => id !== option.id);
                                                                }
                                                            }}
                                                            class="size-4"
                                                        />
                                                        <div class="flex-1">
                                                            <span class="text-sm font-medium text-foreground">{option.label}</span>
                                                            {#if option.description}
                                                                <p class="text-xs text-muted-foreground">{option.description}</p>
                                                            {/if}
                                                        </div>
                                                    </label>
                                                {/each}
                                            </div>
                                            <Button class="mt-3 w-full" onclick={() => castBallot(vote)} disabled={!ballotSelections[vote.id]?.length || isCastingVote[vote.id]}>
                                                {isCastingVote[vote.id] ? 'Envoi...' : 'Confirmer mon vote'}
                                            </Button>
                                        {:else if vote.method === PropositionVoteMethodEnum.MAJORITY_JUDGMENT}
                                            <!-- Majority judgment: rating dropdown for each option -->
                                            <p class="mb-2 text-xs text-muted-foreground">Évaluez chaque option de 0 (insuffisant) à 5 (excellent)</p>
                                            <div class="space-y-2">
                                                {#each vote.options as option (option.id)}
                                                    <div class="flex items-center gap-3 rounded-md border border-border/30 bg-background px-3 py-2">
                                                        <div class="flex-1">
                                                            <span class="text-sm font-medium text-foreground">{option.label}</span>
                                                            {#if option.description}
                                                                <p class="text-xs text-muted-foreground">{option.description}</p>
                                                            {/if}
                                                        </div>
                                                        <select
                                                            class="rounded border border-border/60 bg-background px-2 py-1 text-sm"
                                                            onchange={(e) => {
                                                                const target = e.target as HTMLSelectElement;
                                                                if (!ballotSelections[vote.id]) ballotSelections[vote.id] = {};
                                                                ballotSelections[vote.id][option.id] = Number(target.value);
                                                            }}
                                                        >
                                                            <option value="">--</option>
                                                            <option value="0">0</option>
                                                            <option value="1">1</option>
                                                            <option value="2">2</option>
                                                            <option value="3">3</option>
                                                            <option value="4">4</option>
                                                            <option value="5">5</option>
                                                        </select>
                                                    </div>
                                                {/each}
                                            </div>
                                            {@const ratings = ballotSelections[vote.id] || {}}
                                            {@const allRated = vote.options.every((opt) => ratings[opt.id] !== undefined)}
                                            <Button class="mt-3 w-full" onclick={() => castBallot(vote)} disabled={!allRated || isCastingVote[vote.id]}>
                                                {isCastingVote[vote.id] ? 'Envoi...' : 'Confirmer mon vote'}
                                            </Button>
                                        {/if}
                                    </div>
                                {/if}
                            {/if}

                            <!-- Vote results -->
                            {#if vote.status === 'closed' && voteResults[vote.id]}
                                {@const results = voteResults[vote.id]}
                                <div class="mt-4 rounded-lg border border-border/40 bg-background/50 p-4">
                                    <h4 class="mb-3 text-sm font-semibold text-foreground">Résultats ({results.totalVotes} vote{results.totalVotes > 1 ? 's' : ''})</h4>

                                    {#if vote.method === PropositionVoteMethodEnum.BINARY || vote.method === PropositionVoteMethodEnum.MULTI_CHOICE}
                                        {@const optionCounts = results.optionCounts || {}}
                                        <div class="space-y-2">
                                            {#each vote.options as option (option.id)}
                                                {@const count = optionCounts[option.id] || 0}
                                                {@const percentage = results.totalVotes > 0 ? Math.round((count / results.totalVotes) * 100) : 0}
                                                <div class="rounded-md border border-border/30 bg-background px-3 py-2">
                                                    <div class="flex items-center justify-between text-sm">
                                                        <span class="font-medium text-foreground">{option.label}</span>
                                                        <span class="text-xs text-muted-foreground">{count} ({percentage}%)</span>
                                                    </div>
                                                    <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                                                        <div class="h-full bg-primary transition-all" style="width: {percentage}%"></div>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    {:else if vote.method === PropositionVoteMethodEnum.MAJORITY_JUDGMENT}
                                        {@const optionRatings = results.optionRatings || {}}
                                        <div class="space-y-2">
                                            {#each vote.options as option (option.id)}
                                                {@const stats = optionRatings[option.id] || { median: 0, average: 0 }}
                                                {@const median = stats.median ?? 0}
                                                {@const average = stats.average ?? 0}
                                                <div class="rounded-md border border-border/30 bg-background px-3 py-2">
                                                    <div class="flex items-center justify-between text-sm">
                                                        <span class="font-medium text-foreground">{option.label}</span>
                                                        <span class="text-xs text-muted-foreground">Médiane: {median} | Moyenne: {average.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.votes.empty']()}</p>
            {/if}
        </section>
    {:else if activeTab === 'mandates'}
        <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
            <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.mandates']()}</h2>
            {#if canManageMandates}
                <div class="mt-4 flex justify-end">
                    <Button variant="outline" class="gap-2" onclick={() => (isMandateDialogOpen = true)}>
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
                                    {#if canManageMandates && mandate.status === MandateStatusEnum.TO_ASSIGN}
                                        <Button size="sm" variant="ghost" class="gap-1" onclick={() => openEditMandate(mandate)}>
                                            <Pencil class="size-3.5" />
                                            {m['common.edit']()}
                                        </Button>
                                        <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => deleteMandate(mandate.id)}>
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
                                <div class="flex justify-end">
                                    {#if hasApplied}
                                        <p class="text-sm text-muted-foreground italic">Candidature soumise</p>
                                    {:else}
                                        <Button size="sm" variant="outline" class="gap-2" onclick={() => openApplicationDialog(mandate.id)}>
                                            <UserPlus class="size-4" />
                                            {m['proposition-detail.mandates.apply']()}
                                        </Button>
                                    {/if}
                                </div>
                            {/if}

                            {#if canUploadDeliverable}
                                <div class="flex justify-end">
                                    <Button size="sm" variant="outline" class="gap-2" onclick={() => openDeliverableDialog(mandate.id)}>
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
                                                                {m[`proposition-detail.mandates.deliverables.status.${deliverable.status}` as keyof typeof m]()}
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
                                                            {m[`proposition-detail.mandates.deliverables.procedure.${procedure?.status ?? 'pending'}` as keyof typeof m]()}
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
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onclick={() => {
                                                                    evaluationVerdict = DeliverableVerdictEnum.COMPLIANT;
                                                                    openEvaluationDialog(mandate.id, deliverable.id);
                                                                }}
                                                            >
                                                                {m['proposition-detail.mandates.deliverables.evaluate.compliant']()}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onclick={() => {
                                                                    evaluationVerdict = DeliverableVerdictEnum.NON_COMPLIANT;
                                                                    openEvaluationDialog(mandate.id, deliverable.id);
                                                                }}
                                                            >
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
    {:else if activeTab === 'followup'}
        <section class="space-y-4">
            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
                <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.followup.permissions']()}</h2>
                {#if Object.keys(rolePermissionMatrix).length}
                    <div class="mt-3 overflow-auto">
                        <table class="w-full min-w-[320px] table-fixed border-collapse text-left text-sm">
                            <thead>
                                <tr class="text-xs uppercase tracking-wide text-muted-foreground">
                                    <th class="border-b border-border/40 px-3 py-2">{m['proposition-detail.followup.role']()}</th>
                                    <th class="border-b border-border/40 px-3 py-2">{m['proposition-detail.followup.actions']()}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each Object.entries(rolePermissionMatrix) as [role, actions]}
                                    <tr>
                                        <td class="border-b border-border/20 px-3 py-2 font-medium text-foreground">{role}</td>
                                        <td class="border-b border-border/20 px-3 py-2">
                                            <div class="flex flex-wrap gap-2 text-xs">
                                                {#each Object.entries(actions) as [action, allowed]}
                                                    {#if allowed}
                                                        <span class="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">{action}</span>
                                                    {/if}
                                                {/each}
                                            </div>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {:else}
                    <p class="mt-2 text-sm text-muted-foreground">{m['proposition-detail.followup.permissions-empty']()}</p>
                {/if}
            </article>

            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
                <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.followup.automation.title']()}</h2>
                <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>
                        {m['proposition-detail.followup.automation.recalcCooldown']({ minutes: workflowAutomation.deliverableRecalcCooldownMinutes })}
                    </li>
                    <li>
                        {m['proposition-detail.followup.automation.nonConformityPercent']({
                            percent: workflowAutomation.nonConformityPercentThreshold,
                        })}
                    </li>
                    <li>
                        {m['proposition-detail.followup.automation.nonConformityFloor']({
                            count: workflowAutomation.nonConformityAbsoluteFloor,
                        })}
                    </li>
                    <li>
                        {m['proposition-detail.followup.automation.evaluationShift']({
                            days: workflowAutomation.evaluationAutoShiftDays,
                        })}
                    </li>
                    <li>
                        {m['proposition-detail.followup.automation.revocationDelay']({
                            days: workflowAutomation.revocationAutoTriggerDelayDays,
                        })}
                    </li>
                    <li>
                        {m['proposition-detail.followup.automation.revocationFrequency']({
                            hours: workflowAutomation.revocationCheckFrequencyHours,
                        })}
                    </li>
                    <li>{m['proposition-detail.followup.automation.pattern']({ pattern: workflowAutomation.deliverableNamingPattern })}</li>
                </ul>
            </article>

            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
                <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.followup']()}</h2>
                {#if commentsByScope.evaluation.length}
                    <ul class="mt-4 space-y-3">
                        {#each commentsByScope.evaluation as comment (comment.id)}
                            <li class="rounded-xl border border-border/40 bg-card/60 p-4">
                                <div class="flex items-center justify-between text-xs text-muted-foreground">
                                    <div class="flex items-center gap-2">
                                        <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                        {#if getSectionLabel(comment.section)}
                                            <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{getSectionLabel(comment.section)}</span>
                                        {/if}
                                    </div>
                                    <span>{formatDateTime(comment.createdAt)}</span>
                                </div>
                                <p class="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.comments.empty']()}</p>
                {/if}
            </article>
        </section>
    {/if}
</div>

<Dialog open={isClarificationDialogOpen} onOpenChange={(value: boolean) => (isClarificationDialogOpen = value)}>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleClarificationSubmit}>
            <label class="flex flex-col gap-2 text-sm text-foreground">
                Section
                <select
                    name="section"
                    class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    bind:value={clarificationSection}
                >
                    <option value="general">Général</option>
                    <option value="description">Description détaillée</option>
                    <option value="smart_objectives">Objectifs SMART</option>
                    <option value="impacts">Impacts</option>
                    <option value="mandates">Description des mandats</option>
                    <option value="expertise">Expertises à impliquer</option>
                    <option value="rescue">Ressource initiatrice</option>
                    <option value="associated">Propositions liées</option>
                    <option value="attachments">Pièces jointes</option>
                </select>
            </label>

            <Textarea name="clarification-content" label={m['proposition-detail.comments.dialog.label']()} rows={10} bind:value={clarificationContent} required />
            {#if clarificationErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each clarificationErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isClarificationSubmitting} class="gap-2">
                    {#if isClarificationSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.dialog.submit']()}
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog
    open={isClarificationReplyDialogOpen}
    onOpenChange={(value: boolean) => {
        isClarificationReplyDialogOpen = value;
        if (!value) {
            clarificationReplyParentId = null;
            clarificationReplyContent = '';
            clarificationReplyErrors = [];
            isClarificationReplySubmitting = false;
        }
    }}
>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.reply-dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.reply-dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleClarificationReplySubmit}>
            <Textarea name="clarification-reply" label={m['proposition-detail.comments.reply-dialog.label']()} rows={8} bind:value={clarificationReplyContent} required />
            {#if clarificationReplyErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each clarificationReplyErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isClarificationReplySubmitting} class="gap-2">
                    {#if isClarificationReplySubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.reply-dialog.submit']()}
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog
    open={isClarificationEditDialogOpen}
    onOpenChange={(value: boolean) => {
        isClarificationEditDialogOpen = value;
        if (!value) {
            clarificationEditCommentId = null;
            clarificationEditParentId = null;
            clarificationEditContent = '';
            clarificationEditErrors = [];
            isClarificationEditSubmitting = false;
        }
    }}
>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.edit']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.edit-label']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleClarificationEditSubmit}>
            <Textarea name="clarification-edit" label={m['proposition-detail.comments.edit-label']()} rows={8} bind:value={clarificationEditContent} required />
            {#if clarificationEditErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each clarificationEditErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isClarificationEditSubmitting} class="gap-2">
                    {#if isClarificationEditSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.save']()}
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog
    open={isAmendmentReplyDialogOpen}
    onOpenChange={(value: boolean) => {
        isAmendmentReplyDialogOpen = value;
        if (!value) {
            amendmentReplyParentId = null;
            amendmentReplyContent = '';
            amendmentReplyErrors = [];
            isAmendmentReplySubmitting = false;
        }
    }}
>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.reply-dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.reply-dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleAmendmentReplySubmit}>
            <Textarea name="amendment-reply" label={m['proposition-detail.comments.reply-dialog.label']()} rows={8} bind:value={amendmentReplyContent} required />
            {#if amendmentReplyErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each amendmentReplyErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isAmendmentReplySubmitting} class="gap-2">
                    {#if isAmendmentReplySubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.reply-dialog.submit']()}
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog
    open={isAmendmentEditDialogOpen}
    onOpenChange={(value: boolean) => {
        isAmendmentEditDialogOpen = value;
        if (!value) {
            amendmentEditCommentId = null;
            amendmentEditParentId = null;
            amendmentEditContent = '';
            amendmentEditErrors = [];
            isAmendmentEditSubmitting = false;
        }
    }}
>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.edit']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.edit-label']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleAmendmentEditSubmit}>
            <Textarea name="amendment-edit" label={m['proposition-detail.comments.edit-label']()} rows={8} bind:value={amendmentEditContent} required />
            {#if amendmentEditErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each amendmentEditErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isAmendmentEditSubmitting} class="gap-2">
                    {#if isAmendmentEditSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.save']()}
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

{#if isAmendmentDeleteDialogOpen}
    <AlertDialog
        open={isAmendmentDeleteDialogOpen}
        onOpenChange={(value: boolean) => {
            isAmendmentDeleteDialogOpen = value;
            if (!value) {
                amendmentDeleteCommentId = null;
                amendmentDeleteParentId = null;
                isAmendmentDeleteSubmitting = false;
            }
        }}
    >
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {amendmentDeleteParentId ? m['proposition-detail.comments.delete-confirm-title-reply']() : m['proposition-detail.comments.delete-confirm-title']()}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {amendmentDeleteParentId ? m['proposition-detail.comments.delete-confirm-description-reply']() : m['proposition-detail.comments.delete-confirm-description']()}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isAmendmentDeleteSubmitting}>{m['common.cancel']()}</AlertDialogCancel>
                <AlertDialogAction onclick={submitAmendmentDelete} disabled={isAmendmentDeleteSubmitting} class="gap-2">
                    {#if isAmendmentDeleteSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.delete-confirm-submit']()}
                    {/if}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
{/if}

{#if selectedEvent}
    <Dialog
        open={isEventDetailDialogOpen}
        onOpenChange={(value: boolean) => {
            isEventDetailDialogOpen = value;
            if (!value) {
                selectedEventId = null;
            }
        }}
    >
        <DialogContent class="max-w-lg space-y-4">
            <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>{translateEventType(selectedEvent.type)}</DialogDescription>
            </DialogHeader>
            <div class="space-y-4 text-sm text-foreground/90">
                {#if selectedEvent.startAt || selectedEvent.endAt}
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {m['proposition-detail.events.detail.schedule']()}
                        </span>
                        <span>
                            {#if selectedEvent.startAt && selectedEvent.endAt}
                                {formatDateTime(selectedEvent.startAt)} – {formatDateTime(selectedEvent.endAt)}
                            {:else if selectedEvent.startAt}
                                {formatDateTime(selectedEvent.startAt)}
                            {:else if selectedEvent.endAt}
                                {formatDateTime(selectedEvent.endAt)}
                            {/if}
                        </span>
                    </div>
                {/if}
                {#if selectedEvent.location}
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {m['proposition-detail.events.form.location']()}
                        </span>
                        <span>{selectedEvent.location}</span>
                    </div>
                {/if}
                {#if selectedEvent.videoLink}
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {m['proposition-detail.events.form.videoLink']()}
                        </span>
                        <a href={selectedEvent.videoLink} target="_blank" rel="noreferrer" class="break-all underline underline-offset-2">
                            {selectedEvent.videoLink}
                        </a>
                    </div>
                {/if}
                {#if selectedEvent.description}
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {m['proposition-detail.events.form.description']()}
                        </span>
                        <p class="whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                {/if}
            </div>
            <DialogFooter class="flex flex-wrap items-center justify-between gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.close']()}</Button>
                </DialogClose>
                {#if isEventEditableByCurrentUser(selectedEvent)}
                    <div class="flex gap-2">
                        <Button type="button" variant="outline" class="gap-1" onclick={() => openEventEdit(selectedEvent)}>
                            <Pencil class="size-4" />
                            {m['common.edit']()}
                        </Button>
                        <Button type="button" variant="destructive" class="gap-1" onclick={() => confirmEventDelete(selectedEvent.id)}>
                            <Trash2 class="size-4" />
                            {m['common.delete']()}
                        </Button>
                    </div>
                {/if}
            </DialogFooter>
        </DialogContent>
    </Dialog>
{/if}

{#if isEventDeleteDialogOpen}
    <AlertDialog
        open={isEventDeleteDialogOpen}
        onOpenChange={(value: boolean) => {
            isEventDeleteDialogOpen = value;
            if (!value) {
                eventDeleteId = null;
                isEventDeleteSubmitting = false;
            }
        }}
    >
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{m['proposition-detail.events.delete.title']()}</AlertDialogTitle>
                <AlertDialogDescription>{m['proposition-detail.events.delete.description']()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isEventDeleteSubmitting}>{m['common.cancel']()}</AlertDialogCancel>
                <AlertDialogAction onclick={submitEventDelete} disabled={isEventDeleteSubmitting} class="gap-2">
                    {#if isEventDeleteSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.events.delete.confirm']()}
                    {/if}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
{/if}

{#if isClarificationDeleteDialogOpen}
    <Dialog
        open
        onOpenChange={(value: boolean) => {
            isClarificationDeleteDialogOpen = value;
            if (!value) {
                clarificationDeleteCommentId = null;
                clarificationDeleteParentId = null;
                isClarificationDeleteSubmitting = false;
            }
        }}
    >
        <DialogContent class="max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {clarificationDeleteParentId ? m['proposition-detail.comments.delete-confirm-title-reply']() : m['proposition-detail.comments.delete-confirm-title']()}
                </DialogTitle>
                <DialogDescription>
                    {clarificationDeleteParentId ? m['proposition-detail.comments.delete-confirm-description-reply']() : m['proposition-detail.comments.delete-confirm-description']()}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isClarificationDeleteSubmitting}>
                        {m['common.actions.cancel']()}
                    </Button>
                </DialogClose>
                <Button type="button" variant="destructive" onclick={submitClarificationDelete} disabled={isClarificationDeleteSubmitting} class="gap-2">
                    {#if isClarificationDeleteSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.delete-confirm-submit']()}
                    {/if}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
{/if}

<Dialog open={isDeliverableDialogOpen} onOpenChange={(value: boolean) => (isDeliverableDialogOpen = value)}>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.mandates.deliverables.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.mandates.deliverables.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4">
            <Input id="deliverable-label" name="deliverable-label" label={m['proposition-detail.mandates.deliverables.label']()} bind:value={deliverableForm.label} />
            <Input id="deliverable-objective" name="deliverable-objective" label={m['proposition-detail.mandates.deliverables.objective']()} bind:value={deliverableForm.objectiveRef} />
            <div class="space-y-2">
                <label class="text-sm font-medium text-foreground" for="deliverable-file">{m['proposition-detail.mandates.deliverables.file']()}</label>
                <input
                    id="deliverable-file"
                    name="deliverable-file"
                    type="file"
                    class="block w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onchange={(event) => (deliverableForm.file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
                />
            </div>
            {#if deliverableErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each deliverableErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">{m['common.actions.cancel']()}</Button>
            </DialogClose>
            <Button type="button" onclick={submitDeliverable} disabled={isDeliverableSubmitting} class="gap-2">
                {#if isDeliverableSubmitting}
                    <Loader2 class="size-4 animate-spin" />
                    {m['common.actions.loading']()}
                {:else}
                    {m['proposition-detail.mandates.deliverables.submit']()}
                {/if}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

<Dialog open={isEvaluationDialogOpen} onOpenChange={(value: boolean) => (isEvaluationDialogOpen = value)}>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.mandates.deliverables.evaluate.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.mandates.deliverables.evaluate.description']()}</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4">
            <div class="space-y-2">
                <label class="text-sm font-medium text-foreground" for="deliverable-verdict">{m['proposition-detail.mandates.deliverables.evaluate.verdict']()}</label>
                <select
                    id="deliverable-verdict"
                    name="deliverable-verdict"
                    class="rounded-md border border-border/40 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    bind:value={evaluationVerdict}
                >
                    <option value={DeliverableVerdictEnum.COMPLIANT}>{m['proposition-detail.mandates.deliverables.evaluate.compliant']()}</option>
                    <option value={DeliverableVerdictEnum.NON_COMPLIANT}>{m['proposition-detail.mandates.deliverables.evaluate.non-conform']()}</option>
                </select>
            </div>
            <Textarea id="deliverable-comment" name="deliverable-comment" label={m['proposition-detail.mandates.deliverables.evaluate.comment']()} rows={4} bind:value={evaluationComment} />
            {#if evaluationErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each evaluationErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">{m['common.actions.cancel']()}</Button>
            </DialogClose>
            <Button type="button" onclick={submitEvaluation} disabled={isEvaluationSubmitting} class="gap-2">
                {#if isEvaluationSubmitting}
                    <Loader2 class="size-4 animate-spin" />
                    {m['common.actions.loading']()}
                {:else}
                    {m['proposition-detail.mandates.deliverables.evaluate.submit']()}
                {/if}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

<Dialog open={isApplicationDialogOpen} onOpenChange={(value: boolean) => (isApplicationDialogOpen = value)}>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>Proposer une candidature</DialogTitle>
            <DialogDescription>Présentez votre candidature pour ce mandat</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4">
            <Textarea
                id="application-description"
                name="application-description"
                label="Description (obligatoire)"
                placeholder="Présentez-vous et expliquez pourquoi vous êtes le bon candidat pour ce mandat..."
                rows={6}
                bind:value={applicationForm.description}
            />
            <div class="space-y-2">
                <label class="text-sm font-medium text-foreground" for="application-start-date">Date de début proposée (optionnel)</label>
                <input
                    id="application-start-date"
                    name="application-start-date"
                    type="datetime-local"
                    class="rounded-md border border-border/40 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
                    bind:value={applicationForm.proposedStartDate}
                />
            </div>
            <div class="space-y-2">
                <label class="text-sm font-medium text-foreground" for="application-end-date">Date de fin proposée (optionnel)</label>
                <input
                    id="application-end-date"
                    name="application-end-date"
                    type="datetime-local"
                    class="rounded-md border border-border/40 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
                    bind:value={applicationForm.proposedEndDate}
                />
            </div>
            {#if applicationErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each applicationErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="button" onclick={submitApplication} disabled={isApplicationSubmitting} class="gap-2">
                {#if isApplicationSubmitting}
                    <Loader2 class="size-4 animate-spin" />
                    Envoi en cours...
                {:else}
                    Soumettre la candidature
                {/if}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

<Dialog open={isAmendmentDialogOpen} onOpenChange={(value: boolean) => (isAmendmentDialogOpen = value)}>
    <DialogContent class="sm:max-w-5xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.amendment-dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.amendment-dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleAmendmentSubmit}>
            <label class="flex flex-col gap-2 text-sm text-foreground">
                Section
                <select name="section" class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" bind:value={amendmentSection}>
                    <option value="general">Général</option>
                    <option value="description">Description détaillée</option>
                    <option value="smart_objectives">Objectifs SMART</option>
                    <option value="impacts">Impacts</option>
                    <option value="mandates">Description des mandats</option>
                    <option value="expertise">Expertises à impliquer</option>
                    <option value="rescue">Ressource initiatrice</option>
                    <option value="associated">Propositions liées</option>
                    <option value="attachments">Pièces jointes</option>
                </select>
            </label>

            <Textarea name="amendment-content" label={m['proposition-detail.comments.amendment-dialog.label']()} rows={10} bind:value={amendmentContent} required />
            {#if amendmentErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each amendmentErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isAmendmentSubmitting} class="gap-2">
                    {#if isAmendmentSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.comments.amendment-dialog.submit']()}
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog
    open={isEventDialogOpen}
    onOpenChange={(value: boolean) => {
        isEventDialogOpen = value;
        if (!value) {
            editingEventId = null;
            resetEventForm();
            isEventSubmitting = false;
            eventStartInput = null;
            eventEndInput = null;
        }
    }}
>
    <DialogContent class="sm:max-w-4xl p-8">
        <DialogHeader>
            <DialogTitle>
                {editingEventId ? m['proposition-detail.events.dialog.edit-title']() : m['proposition-detail.events.dialog.title']()}
            </DialogTitle>
            <DialogDescription>
                {editingEventId ? m['proposition-detail.events.dialog.edit-description']() : m['proposition-detail.events.dialog.description']()}
            </DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" onsubmit={handleEventSubmit}>
            <Input name="event-title" label={m['proposition-detail.events.form.title']()} bind:value={eventForm.title} required />
            <label class="flex flex-col gap-2 text-sm text-foreground">
                {m['proposition-detail.events.form.type']()}
                <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={eventForm.type}>
                    {#each eventTypeOptions as option}
                        <option value={option}>{translateEventType(option)}</option>
                    {/each}
                </select>
            </label>
            <label class="flex flex-col gap-2 text-sm text-foreground">
                {m['proposition-detail.events.form.startAt']()}
                <input
                    type="datetime-local"
                    name="event-start"
                    class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    bind:value={eventForm.startAt}
                    bind:this={eventStartInput}
                />
            </label>
            <label class="flex flex-col gap-2 text-sm text-foreground">
                {m['proposition-detail.events.form.endAt']()}
                <input
                    type="datetime-local"
                    name="event-end"
                    class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    bind:value={eventForm.endAt}
                    bind:this={eventEndInput}
                />
            </label>
            <Input name="event-location" label={m['proposition-detail.events.form.location']()} bind:value={eventForm.location} />
            <Input name="event-video" label={m['proposition-detail.events.form.videoLink']()} bind:value={eventForm.videoLink} />
            <Textarea name="event-description" label={m['proposition-detail.events.form.description']()} rows={4} bind:value={eventForm.description} />
            {#if eventErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each eventErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-between gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onclick={handleCreateDiscordEvent}
                    disabled={isEventSubmitting || isCreatingDiscordEvent || !eventForm.title || !eventForm.startAt}
                    class="gap-2"
                >
                    {#if isCreatingDiscordEvent}
                        <Loader2 class="size-4 animate-spin" />
                        Création Discord...
                    {:else}
                        <MessageCircle class="size-4" />
                        Créer événement Discord
                    {/if}
                </Button>
                <div class="flex gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isEventSubmitting} class="gap-2">
                        {#if isEventSubmitting}
                            <Loader2 class="size-4 animate-spin" />
                            {m['common.actions.loading']()}
                        {:else}
                            {editingEventId ? m['proposition-detail.events.dialog.update']() : m['proposition-detail.events.dialog.submit']()}
                        {/if}
                    </Button>
                </div>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog
    open={isVoteDialogOpen}
    onOpenChange={(value: boolean) => {
        isVoteDialogOpen = value;
        if (!value) {
            voteForm = { ...defaultVoteForm };
            voteErrors = [];
            voteFieldErrors = {};
            isVoteSubmitting = false;
            voteOpenInput = null;
            voteCloseInput = null;
        }
    }}
>
    <DialogContent class="max-w-2xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.votes.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.votes.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" onsubmit={handleVoteSubmit}>
            <div>
                <Input name="vote-title" label={m['proposition-detail.votes.form.title']()} bind:value={voteForm.title} required />
                {#if voteFieldErrors.title}
                    <p class="mt-1 text-xs text-destructive">{voteFieldErrors.title}</p>
                {/if}
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.votes.form.phase']()}
                    <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={voteForm.phase}>
                        {#each votePhaseOptions as option}
                            <option value={option}>{translateVotePhase(option)}</option>
                        {/each}
                    </select>
                </label>
                <div>
                    <Input type="number" name="vote-max-selections" min="1" label={m['proposition-detail.votes.form.maxSelections']()} bind:value={voteForm.maxSelections} required />
                    {#if voteFieldErrors.maxSelections}
                        <p class="mt-1 text-xs text-destructive">{voteFieldErrors.maxSelections}</p>
                    {/if}
                </div>
                <div>
                    <label class="flex flex-col gap-2 text-sm text-foreground">
                        {m['proposition-detail.votes.form.openAt']()}
                        <input
                            type="datetime-local"
                            name="vote-open"
                            class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            bind:value={voteForm.openAt}
                            bind:this={voteOpenInput}
                            required
                        />
                    </label>
                    {#if voteFieldErrors.openAt}
                        <p class="mt-1 text-xs text-destructive">{voteFieldErrors.openAt}</p>
                    {/if}
                </div>
                <div>
                    <label class="flex flex-col gap-2 text-sm text-foreground">
                        {m['proposition-detail.votes.form.closeAt']()}
                        <input
                            type="datetime-local"
                            name="vote-close"
                            class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            bind:value={voteForm.closeAt}
                            bind:this={voteCloseInput}
                            required
                        />
                    </label>
                    {#if voteFieldErrors.closeAt}
                        <p class="mt-1 text-xs text-destructive">{voteFieldErrors.closeAt}</p>
                    {/if}
                </div>
            </div>
            <label class="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="vote-majority-judgment" class="size-4 rounded border-border/60" bind:checked={voteForm.isMajorityJudgment} />
                {m['proposition-detail.votes.form.majorityJudgment']()}
            </label>
            <div>
                <Textarea name="vote-description" label={m['proposition-detail.votes.form.description']()} rows={3} bind:value={voteForm.description} />
                {#if voteFieldErrors.description}
                    <p class="mt-1 text-xs text-destructive">{voteFieldErrors.description}</p>
                {/if}
            </div>
            <div>
                <Textarea name="vote-options" label={m['proposition-detail.votes.form.options']()} rows={4} bind:value={voteForm.optionsText} required />
                {#if voteFieldErrors.optionsText || voteFieldErrors.options}
                    <p class="mt-1 text-xs text-destructive">{voteFieldErrors.optionsText || voteFieldErrors.options}</p>
                {/if}
            </div>
            {#if voteErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each voteErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isVoteSubmitting} class="gap-2">
                    {#if isVoteSubmitting}
                        <Loader2 class="size-4 animate-spin" />
                        {m['common.actions.loading']()}
                    {:else}
                        {m['proposition-detail.votes.dialog.submit']()}
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog open={isMandateDialogOpen} onOpenChange={(value: boolean) => (isMandateDialogOpen = value)}>
    <DialogContent class="max-w-2xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.mandates.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.mandates.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" onsubmit={handleMandateSubmit}>
            <Input name="mandate-title" label={m['proposition-detail.mandates.form.title']()} bind:value={mandateForm.title} required />
            <Textarea name="mandate-description" label={m['proposition-detail.mandates.form.description']()} rows={4} bind:value={mandateForm.description} />
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.mandates.form.holder']()}
                    <MultiSelect
                        class="text-sm"
                        options={userOptions}
                        placeholder={m['proposition-detail.mandates.form.holderPlaceholder']()}
                        bind:selectedValues={mandateHolderSelection}
                        maxSelections={1}
                    />
                </label>
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.mandates.form.status']()}
                    <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={mandateForm.status}>
                        {#each mandateStatusOptions as option}
                            <option value={option}>{translateMandateStatus(option)}</option>
                        {/each}
                    </select>
                </label>
                <Input name="mandate-target" label={m['proposition-detail.mandates.form.targetObjectiveRef']()} bind:value={mandateForm.targetObjectiveRef} />
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.mandates.form.initialDeadline']()}
                    <input
                        type="date"
                        name="mandate-initial"
                        class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        bind:value={mandateForm.initialDeadline}
                    />
                </label>
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.mandates.form.currentDeadline']()}
                    <input
                        type="date"
                        name="mandate-current"
                        class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        bind:value={mandateForm.currentDeadline}
                    />
                </label>
            </div>
            {#if mandateErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each mandateErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isMandateSubmitting}>{m['proposition-detail.mandates.dialog.submit']()}</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog open={isStatusDialogOpen} onOpenChange={(value: boolean) => (isStatusDialogOpen = value)}>
    <DialogContent class="max-w-lg">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.status.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.status.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleStatusSubmit}>
            <label class="flex flex-col gap-2 text-sm text-foreground">
                {m['proposition-detail.status.dialog.target']()}
                <select class="status-select rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" bind:value={selectedStatus}>
                    {#each allStatuses as status}
                        {@const isCurrentStatus = status === currentStatus}
                        {@const isAvailable = availableTransitions.includes(status)}
                        <option value={status} disabled={!isAvailable} class:font-bold={isCurrentStatus}>
                            {translateStatus(status)}{isCurrentStatus ? ' (actuel)' : ''}
                        </option>
                    {/each}
                </select>
            </label>
            <Textarea name="status-reason" label={m['proposition-detail.status.dialog.reason']()} rows={3} bind:value={transitionReason} />
            {#if statusErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each statusErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isStatusSubmitting}>{m['proposition-detail.status.dialog.submit']()}</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<style>
    /* Style for status select dropdown */
    .status-select option.font-bold {
        font-weight: 700;
    }

    .status-select option:disabled {
        color: #999;
    }

    /* Quill HTML content styles */
    :global(.proposition-detail article div:has(> p)) {
        font-size: 0.875rem;
        line-height: 1.25;
    }

    :global(.proposition-detail article p) {
        margin-bottom: 0.5rem;
        line-height: 1.25;
    }

    :global(.proposition-detail article p:last-child) {
        margin-bottom: 0;
    }

    :global(.proposition-detail article h1) {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        margin-top: 1rem;
    }

    :global(.proposition-detail article h2) {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        margin-top: 0.75rem;
    }

    :global(.proposition-detail article h3) {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        margin-top: 0.75rem;
    }

    :global(.proposition-detail article ul),
    :global(.proposition-detail article ol) {
        margin-left: 1.5rem;
        margin-bottom: 0.75rem;
    }

    :global(.proposition-detail article ul) {
        list-style-type: disc;
    }

    :global(.proposition-detail article ol) {
        list-style-type: decimal;
    }

    :global(.proposition-detail article li) {
        margin-bottom: 0.25rem;
    }

    :global(.proposition-detail article blockquote) {
        border-left: 4px solid hsl(var(--primary));
        padding-left: 1rem;
        margin-left: 0;
        margin-bottom: 0.75rem;
        font-style: italic;
        color: hsl(var(--muted-foreground));
    }

    :global(.proposition-detail article pre) {
        background-color: hsl(var(--muted));
        border-radius: 0.375rem;
        padding: 1rem;
        margin-bottom: 0.75rem;
        overflow-x: auto;
        font-family: monospace;
        font-size: 0.875rem;
    }

    :global(.proposition-detail article code) {
        background-color: hsl(var(--muted));
        border-radius: 0.25rem;
        padding: 0.125rem 0.25rem;
        font-family: monospace;
        font-size: 0.875rem;
    }

    :global(.proposition-detail article pre code) {
        background-color: transparent;
        padding: 0;
    }

    :global(.proposition-detail article a) {
        color: hsl(var(--primary));
        text-decoration: underline;
    }

    :global(.proposition-detail article a:hover) {
        opacity: 0.8;
    }

    :global(.proposition-detail article strong) {
        font-weight: 600;
    }

    :global(.proposition-detail article em) {
        font-style: italic;
    }

    :global(.proposition-detail article u) {
        text-decoration: underline;
    }

    @media print {
        :global(body) {
            background: #fff !important;
            color: #000 !important;
        }

        :global(nav),
        :global(header),
        :global(footer),
        :global([data-slot='sidebar']),
        :global([data-slot='sidebar-gap']),
        :global([data-slot='sidebar-container']),
        :global(main[data-slot='sidebar-inset'] > div:first-child),
        .print-hidden,
        :global(.menu-toggle) {
            display: none !important;
        }

        .proposition-detail {
            gap: 1.5rem !important;
        }

        .proposition-detail section,
        .proposition-detail article,
        .proposition-detail aside {
            box-shadow: none !important;
            background: transparent !important;
        }

        a {
            color: inherit !important;
            text-decoration: underline !important;
        }
    }
</style>
