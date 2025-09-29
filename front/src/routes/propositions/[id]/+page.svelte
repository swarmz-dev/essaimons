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
    import { m } from '#lib/paraglide/messages';
    import { cn } from '#lib/utils';
    import { wrappedFetch } from '#lib/services/requestService';
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
    } from 'backend/types';
    import type { PropositionComment, PropositionEvent, PropositionMandate, PropositionTimelinePhase, PropositionVote, WorkflowRole } from '#lib/types/proposition';
    import { ArrowLeft, Printer, Download, CalendarDays, Pencil, Trash2, Plus, RefreshCcw } from '@lucide/svelte';
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

    propositionDetailStore.setPayload({
        proposition: data.proposition,
        events: data.events,
        votes: data.votes,
        mandates: data.mandates,
        comments: data.comments,
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

    const currentStatusRank = $derived(statusOrder[currentStatus] ?? 0);

    const user = $derived(page.data.user as SerializedUser | undefined);
    const workflowRole: WorkflowRole = $derived(resolveWorkflowRole(proposition, user, mandates));

    const canEditProposition = $derived(workflowRole === 'admin' || isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'edit_proposition'));
    const canDeleteProposition = $derived(user?.role === 'admin');

    const canCommentClarification = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'comment_clarification') || workflowRole === 'admin');
    const canCommentAmendment = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'comment_amendment') || workflowRole === 'admin');
    const canManageEvents = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'manage_events') || workflowRole === 'admin');
    const canConfigureVote = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'configure_vote') || workflowRole === 'admin');
    const canManageMandates = $derived(isActionAllowed(perStatusPermissions, currentStatus, workflowRole, 'manage_mandates') || workflowRole === 'admin');

    const canManageStatus = $derived(workflowRole === 'admin' || workflowRole === 'initiator');

    const visualUrl = $derived(proposition.visual ? `/assets/propositions/visual/${proposition.id}` : undefined);

    const normalizeId = (value?: string | number | null): string | undefined => {
        if (value === undefined || value === null) {
            return undefined;
        }
        const normalized = value.toString().trim();
        return normalized.length ? normalized : undefined;
    };

    const attachmentUrl = (fileId: string): string => `/assets/propositions/attachments/${fileId}`;

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

    const HTML_TAG_PATTERN = /<\s*\/?\s*[a-zA-Z][^>]*>/;
    const containsHtml = (value?: string | null): boolean => {
        if (!value) {
            return false;
        }
        return HTML_TAG_PATTERN.test(value);
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
                label: m['proposition-detail.dates.improvement'](),
                deadline: proposition.improvementDeadline,
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

    const commentSchema = z.object({
        content: z.string().trim().min(1).max(2000),
    });

    let isClarificationDialogOpen: boolean = $state(false);
    let clarificationContent: string = $state('');
    let clarificationErrors: string[] = $state([]);
    let isClarificationSubmitting: boolean = $state(false);

    let isAmendmentDialogOpen: boolean = $state(false);
    let amendmentContent: string = $state('');
    let amendmentErrors: string[] = $state([]);
    let isAmendmentSubmitting: boolean = $state(false);

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

    const voteSchema = z.object({
        title: z.string().trim().min(1).max(255),
        description: z.string().trim().max(1000).optional(),
        phase: z.nativeEnum(PropositionVotePhaseEnum),
        method: z.nativeEnum(PropositionVoteMethodEnum),
        openAt: z.string().trim().optional(),
        closeAt: z.string().trim().optional(),
        maxSelections: z.number().min(0).optional(),
        options: z
            .array(
                z.object({
                    label: z.string().trim().min(1).max(255),
                    description: z.string().trim().max(1000).optional(),
                })
            )
            .min(1),
    });

    let isVoteDialogOpen: boolean = $state(false);
    let voteForm = $state({
        title: '',
        description: '',
        phase: PropositionVotePhaseEnum.VOTE,
        method: PropositionVoteMethodEnum.BINARY,
        openAt: '',
        closeAt: '',
        maxSelections: '',
        optionsText: 'For\nAgainst',
    });
    let voteErrors: string[] = $state([]);
    let isVoteSubmitting: boolean = $state(false);

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
        status: MandateStatusEnum.DRAFT,
        targetObjectiveRef: '',
        initialDeadline: '',
        currentDeadline: '',
    };

    let isMandateDialogOpen: boolean = $state(false);
    let mandateForm = $state({ ...defaultMandateForm });
    let mandateErrors: string[] = $state([]);
    let isMandateSubmitting: boolean = $state(false);

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
                `/propositions/${proposition.id}/comments`,
                {
                    method: 'POST',
                    body: {
                        scope: PropositionCommentScopeEnum.CLARIFICATION,
                        visibility: PropositionCommentVisibilityEnum.PUBLIC,
                        content: result.data.content,
                    },
                },
                ({ data: comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    clarificationContent = '';
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
                `/propositions/${proposition.id}/comments`,
                {
                    method: 'POST',
                    body: {
                        scope: PropositionCommentScopeEnum.AMENDMENT,
                        visibility: PropositionCommentVisibilityEnum.PUBLIC,
                        content: result.data.content,
                    },
                },
                ({ data: comment }) => {
                    propositionDetailStore.upsertComment(comment);
                    amendmentContent = '';
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

    const submitEvent = async (): Promise<void> => {
        eventErrors = [];
        const result = eventSchema.safeParse(eventForm);
        if (!result.success) {
            eventErrors = result.error.issues.map((issue) => issue.message);
            return;
        }

        isEventSubmitting = true;
        try {
            const response = await wrappedFetch(
                `/propositions/${proposition.id}/events`,
                {
                    method: 'POST',
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
                ({ data: event }) => {
                    propositionDetailStore.upsertEvent(event);
                    eventForm = { ...defaultEventForm };
                    isEventDialogOpen = false;
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

    const submitVote = async (): Promise<void> => {
        voteErrors = [];
        const optionLines = voteForm.optionsText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length);

        if (optionLines.length === 0) {
            voteErrors = [m['proposition-detail.votes.options-empty']()];
            return;
        }

        let maxSelectionsNumber: number | undefined;
        if (voteForm.maxSelections) {
            const parsed = Number(voteForm.maxSelections);
            if (!Number.isFinite(parsed) || parsed < 0) {
                voteErrors = [m['proposition-detail.votes.max-invalid']()];
                return;
            }
            maxSelectionsNumber = parsed;
        }

        const parsed = voteSchema.safeParse({
            title: voteForm.title,
            description: normalizeOptional(voteForm.description),
            phase: voteForm.phase,
            method: voteForm.method,
            openAt: voteForm.openAt,
            closeAt: voteForm.closeAt,
            maxSelections: maxSelectionsNumber,
            options: optionLines.map((label) => ({ label, description: undefined })),
        });

        if (!parsed.success) {
            voteErrors = parsed.error.issues.map((issue) => issue.message);
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
                ({ data: vote }) => {
                    propositionDetailStore.upsertVote(vote);
                    voteForm = {
                        title: '',
                        description: '',
                        phase: PropositionVotePhaseEnum.VOTE,
                        method: PropositionVoteMethodEnum.BINARY,
                        openAt: '',
                        closeAt: '',
                        maxSelections: '',
                        optionsText: 'For\nAgainst',
                    };
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
                ({ data: mandate }) => {
                    propositionDetailStore.upsertMandate(mandate);
                    mandateForm = { ...defaultMandateForm };
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
                ({ data: updated }) => {
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

    const handleAmendmentSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();
        await submitAmendmentComment();
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

    const detailedDescriptionHasHtml = $derived(containsHtml(proposition.detailedDescription));
    const smartObjectivesHasHtml = $derived(containsHtml(proposition.smartObjectives));
    const impactsHasHtml = $derived(containsHtml(proposition.impacts));
    const mandatesHasHtml = $derived(containsHtml(proposition.mandatesDescription));
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
                <Button variant="outline" class="gap-2" onclick={() => (isStatusDialogOpen = true)}>
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
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.description']()}</h2>
                    {#if detailedDescriptionHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.detailedDescription}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.detailedDescription}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.objectives']()}</h2>
                    {#if smartObjectivesHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.smartObjectives}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.smartObjectives}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.impacts']()}</h2>
                    {#if impactsHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.impacts}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.impacts}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.mandates']()}</h2>
                    {#if mandatesHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.mandatesDescription}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.mandatesDescription}</p>
                    {/if}
                </article>
                <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.expertise']()}</h2>
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
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.rescue']()}</h2>
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
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.associated']()}</h2>
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
                    <h2 class="text-lg font-semibold">{m['proposition-detail.sections.attachments']()}</h2>
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
                        <li class="space-y-2 rounded-xl border border-border/40 bg-card/60 p-4">
                            <div class="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                <span>{formatDateTime(comment.createdAt)}</span>
                            </div>
                            <p class="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
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
                        <Button variant="outline" class="gap-2" onclick={() => (isEventDialogOpen = true)}>
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
                            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span class="font-semibold text-foreground">{event.title}</span>
                                <span class="text-muted-foreground">{formatDateTime(event.startAt)}</span>
                            </div>
                            {#if event.description}
                                <p class="mt-2 text-sm text-foreground/80">{event.description}</p>
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
                            <li class="rounded-xl border border-border/40 bg-card/60 p-4">
                                <div class="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                    <span>{formatDateTime(comment.createdAt)}</span>
                                </div>
                                <p class="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
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
                                <div>
                                    <p class="font-semibold text-foreground">{vote.title}</p>
                                    <p class="text-xs text-muted-foreground">{m['proposition-detail.vote.method']({ method: translateVoteMethod(vote.method as PropositionVoteMethodEnum) })}</p>
                                </div>
                                <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{vote.status}</span>
                            </div>
                            {#if vote.description}
                                <p class="mt-2 text-sm text-foreground/80">{vote.description}</p>
                            {/if}
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
                        <li class="rounded-xl border border-border/40 bg-card/60 p-4 space-y-2">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p class="text-base font-semibold text-foreground">{mandate.title}</p>
                                    {#if mandate.description}
                                        <p class="text-sm text-muted-foreground">{mandate.description}</p>
                                    {/if}
                                </div>
                                <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{translateMandateStatus(mandate.status as MandateStatusEnum)}</span>
                            </div>
                            {#if mandate.holderUserId}
                                <p class="text-xs text-muted-foreground">{m['proposition-detail.mandate.holder']({ holder: mandate.holder?.username ?? mandate.holderUserId })}</p>
                            {/if}
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
                    <li>{m['proposition-detail.followup.automation.nonConformity']({ threshold: workflowAutomation.nonConformityThreshold })}</li>
                    <li>{m['proposition-detail.followup.automation.evaluationShift']({ days: workflowAutomation.evaluationAutoShiftDays })}</li>
                    <li>{m['proposition-detail.followup.automation.revocationDelay']({ days: workflowAutomation.revocationAutoTriggerDelayDays })}</li>
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
                                    <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
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
    <DialogContent class="max-w-lg">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleClarificationSubmit}>
            <Textarea name="clarification-content" label={m['proposition-detail.comments.dialog.label']()} rows={6} bind:value={clarificationContent} required />
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
                <Button type="submit" disabled={isClarificationSubmitting}>
                    {m['proposition-detail.comments.dialog.submit']()}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog open={isAmendmentDialogOpen} onOpenChange={(value: boolean) => (isAmendmentDialogOpen = value)}>
    <DialogContent class="max-w-lg">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.comments.amendment-dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.comments.amendment-dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" onsubmit={handleAmendmentSubmit}>
            <Textarea name="amendment-content" label={m['proposition-detail.comments.amendment-dialog.label']()} rows={6} bind:value={amendmentContent} required />
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
                <Button type="submit" disabled={isAmendmentSubmitting}>{m['proposition-detail.comments.amendment-dialog.submit']()}</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog open={isEventDialogOpen} onOpenChange={(value: boolean) => (isEventDialogOpen = value)}>
    <DialogContent class="max-w-2xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.events.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.events.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" onsubmit={handleEventSubmit}>
            <Input name="event-title" label={m['proposition-detail.events.form.title']()} bind:value={eventForm.title} required />
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.events.form.type']()}
                    <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={eventForm.type}>
                        {#each eventTypeOptions as option}
                            <option value={option}>{translateEventType(option)}</option>
                        {/each}
                    </select>
                </label>
                <Input type="datetime-local" name="event-start" label={m['proposition-detail.events.form.startAt']()} bind:value={eventForm.startAt} />
                <Input type="datetime-local" name="event-end" label={m['proposition-detail.events.form.endAt']()} bind:value={eventForm.endAt} />
                <Input name="event-location" label={m['proposition-detail.events.form.location']()} bind:value={eventForm.location} />
            </div>
            <Input name="event-video" label={m['proposition-detail.events.form.videoLink']()} bind:value={eventForm.videoLink} />
            <Textarea name="event-description" label={m['proposition-detail.events.form.description']()} rows={4} bind:value={eventForm.description} />
            {#if eventErrors.length}
                <ul class="space-y-1 text-sm text-destructive">
                    {#each eventErrors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <DialogFooter class="flex justify-end gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{m['common.cancel']()}</Button>
                </DialogClose>
                <Button type="submit" disabled={isEventSubmitting}>{m['proposition-detail.events.dialog.submit']()}</Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>

<Dialog open={isVoteDialogOpen} onOpenChange={(value: boolean) => (isVoteDialogOpen = value)}>
    <DialogContent class="max-w-2xl">
        <DialogHeader>
            <DialogTitle>{m['proposition-detail.votes.dialog.title']()}</DialogTitle>
            <DialogDescription>{m['proposition-detail.votes.dialog.description']()}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" onsubmit={handleVoteSubmit}>
            <Input name="vote-title" label={m['proposition-detail.votes.form.title']()} bind:value={voteForm.title} required />
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.votes.form.phase']()}
                    <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={voteForm.phase}>
                        {#each votePhaseOptions as option}
                            <option value={option}>{translateVotePhase(option)}</option>
                        {/each}
                    </select>
                </label>
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.votes.form.method']()}
                    <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={voteForm.method}>
                        {#each voteMethodOptions as option}
                            <option value={option}>{translateVoteMethod(option)}</option>
                        {/each}
                    </select>
                </label>
                <Input type="datetime-local" name="vote-open" label={m['proposition-detail.votes.form.openAt']()} bind:value={voteForm.openAt} />
                <Input type="datetime-local" name="vote-close" label={m['proposition-detail.votes.form.closeAt']()} bind:value={voteForm.closeAt} />
                <Input type="number" name="vote-max-selections" min="0" label={m['proposition-detail.votes.form.maxSelections']()} bind:value={voteForm.maxSelections} />
            </div>
            <Textarea name="vote-description" label={m['proposition-detail.votes.form.description']()} rows={3} bind:value={voteForm.description} />
            <Textarea name="vote-options" label={m['proposition-detail.votes.form.options']()} rows={4} bind:value={voteForm.optionsText} required />
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
                <Button type="submit" disabled={isVoteSubmitting}>{m['proposition-detail.votes.dialog.submit']()}</Button>
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
                <Input name="mandate-holder" label={m['proposition-detail.mandates.form.holder']()} bind:value={mandateForm.holderUserId} />
                <label class="flex flex-col gap-2 text-sm text-foreground">
                    {m['proposition-detail.mandates.form.status']()}
                    <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={mandateForm.status}>
                        {#each mandateStatusOptions as option}
                            <option value={option}>{translateMandateStatus(option)}</option>
                        {/each}
                    </select>
                </label>
                <Input name="mandate-target" label={m['proposition-detail.mandates.form.targetObjectiveRef']()} bind:value={mandateForm.targetObjectiveRef} />
                <Input type="date" name="mandate-initial" label={m['proposition-detail.mandates.form.initialDeadline']()} bind:value={mandateForm.initialDeadline} />
                <Input type="date" name="mandate-current" label={m['proposition-detail.mandates.form.currentDeadline']()} bind:value={mandateForm.currentDeadline} />
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
                <select class="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" bind:value={selectedStatus}>
                    {#each availableTransitions as status}
                        <option value={status}>{translateStatus(status)}</option>
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
