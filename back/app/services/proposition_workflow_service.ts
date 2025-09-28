import { inject } from '@adonisjs/core';
import { DateTime } from 'luxon';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import Proposition from '#models/proposition';
import PropositionStatusHistory from '#models/proposition_status_history';
import type User from '#models/user';
import { MandateStatusEnum, PropositionStatusEnum, PropositionVisibilityEnum, UserRoleEnum } from '#types';
import SettingsService from '#services/settings_service';

export class PropositionWorkflowException extends Error {
    constructor(public readonly code: 'invalid_transition' | 'forbidden') {
        super(code);
        this.name = 'PropositionWorkflowException';
    }
}

type WorkflowRole = 'admin' | 'initiator' | 'mandated' | 'contributor';

interface TransitionOptions {
    reason?: string | null;
    metadata?: Record<string, unknown>;
    transaction?: TransactionClientContract;
}

const ALLOWED_TRANSITIONS: Record<PropositionStatusEnum, PropositionStatusEnum[]> = {
    [PropositionStatusEnum.DRAFT]: [PropositionStatusEnum.CLARIFY, PropositionStatusEnum.ARCHIVED],
    [PropositionStatusEnum.CLARIFY]: [PropositionStatusEnum.AMEND, PropositionStatusEnum.ARCHIVED],
    [PropositionStatusEnum.AMEND]: [PropositionStatusEnum.VOTE, PropositionStatusEnum.CLARIFY, PropositionStatusEnum.ARCHIVED],
    [PropositionStatusEnum.VOTE]: [PropositionStatusEnum.MANDATE, PropositionStatusEnum.AMEND, PropositionStatusEnum.ARCHIVED],
    [PropositionStatusEnum.MANDATE]: [PropositionStatusEnum.EVALUATE, PropositionStatusEnum.VOTE, PropositionStatusEnum.ARCHIVED],
    [PropositionStatusEnum.EVALUATE]: [PropositionStatusEnum.MANDATE, PropositionStatusEnum.ARCHIVED],
    [PropositionStatusEnum.ARCHIVED]: [],
};

const ROLE_TRANSITIONS: Partial<Record<PropositionStatusEnum, Partial<Record<WorkflowRole, PropositionStatusEnum[]>>>> = {
    [PropositionStatusEnum.DRAFT]: {
        initiator: [PropositionStatusEnum.CLARIFY, PropositionStatusEnum.ARCHIVED],
    },
    [PropositionStatusEnum.CLARIFY]: {
        initiator: [PropositionStatusEnum.AMEND, PropositionStatusEnum.ARCHIVED],
    },
    [PropositionStatusEnum.AMEND]: {
        initiator: [PropositionStatusEnum.VOTE, PropositionStatusEnum.CLARIFY, PropositionStatusEnum.ARCHIVED],
    },
    [PropositionStatusEnum.VOTE]: {
        initiator: [PropositionStatusEnum.MANDATE, PropositionStatusEnum.AMEND, PropositionStatusEnum.ARCHIVED],
    },
    [PropositionStatusEnum.MANDATE]: {
        initiator: [PropositionStatusEnum.EVALUATE, PropositionStatusEnum.VOTE, PropositionStatusEnum.ARCHIVED],
    },
    [PropositionStatusEnum.EVALUATE]: {
        initiator: [PropositionStatusEnum.MANDATE, PropositionStatusEnum.ARCHIVED],
    },
};

@inject()
export default class PropositionWorkflowService {
    constructor(private readonly settingsService: SettingsService) {}
    public getAllowedTransitions(currentStatus: PropositionStatusEnum): PropositionStatusEnum[] {
        return ALLOWED_TRANSITIONS[currentStatus] ?? [];
    }

    public async recordInitialHistory(proposition: Proposition, actor: User, trx?: TransactionClientContract): Promise<void> {
        const now = DateTime.now();
        proposition.status = proposition.status ?? PropositionStatusEnum.DRAFT;
        proposition.statusStartedAt = proposition.statusStartedAt ?? now;
        proposition.visibility = proposition.visibility ?? PropositionVisibilityEnum.PRIVATE;
        proposition.archivedAt = proposition.archivedAt ?? null;
        proposition.settingsSnapshot = proposition.settingsSnapshot ?? {};

        if (trx) {
            proposition.useTransaction(trx);
        }

        await proposition.save();

        await PropositionStatusHistory.create(
            {
                propositionId: proposition.id,
                fromStatus: proposition.status,
                toStatus: proposition.status,
                triggeredByUserId: actor.id,
                reason: 'initial creation',
                metadata: {},
            },
            trx ? { client: trx } : undefined
        );
    }

    public async transition(proposition: Proposition, actor: User, targetStatus: PropositionStatusEnum, options: TransitionOptions = {}): Promise<Proposition> {
        const currentStatus: PropositionStatusEnum = proposition.status;
        if (currentStatus === targetStatus) {
            return proposition;
        }

        if (!this.getAllowedTransitions(currentStatus).includes(targetStatus)) {
            throw new PropositionWorkflowException('invalid_transition');
        }

        const actorRole = await this.resolveActorRole(proposition, actor);
        if (!(await this.isRoleAllowedToTransition(currentStatus, actorRole, targetStatus))) {
            throw new PropositionWorkflowException('forbidden');
        }

        const now = DateTime.now();
        if (options.transaction) {
            proposition.useTransaction(options.transaction);
        }

        proposition.status = targetStatus;
        proposition.statusStartedAt = now;
        if (targetStatus === PropositionStatusEnum.ARCHIVED) {
            proposition.archivedAt = now;
        } else if (currentStatus === PropositionStatusEnum.ARCHIVED) {
            proposition.archivedAt = null;
        }

        await proposition.save();

        await PropositionStatusHistory.create(
            {
                propositionId: proposition.id,
                fromStatus: currentStatus,
                toStatus: targetStatus,
                triggeredByUserId: actor.id,
                reason: options.reason ?? null,
                metadata: options.metadata ?? {},
            },
            options.transaction ? { client: options.transaction } : undefined
        );

        return proposition;
    }

    public async resolveActorRole(proposition: Proposition, actor: User): Promise<WorkflowRole> {
        if (actor.role === UserRoleEnum.ADMIN) {
            return 'admin';
        }

        const rescueInitiators = await this.ensureRescueInitiators(proposition);
        if (proposition.creatorId === actor.id || rescueInitiators.some((user) => user.id === actor.id)) {
            return 'initiator';
        }

        const mandates = await this.ensureMandates(proposition);
        if (mandates.some((mandate) => mandate.holderUserId === actor.id && mandate.status !== MandateStatusEnum.REVOKED)) {
            return 'mandated';
        }

        return 'contributor';
    }

    public async canPerform(proposition: Proposition, actor: User, action: string): Promise<boolean> {
        const role = await this.resolveActorRole(proposition, actor);
        if (role === 'admin') {
            return true;
        }

        const permissions = await this.settingsService.getWorkflowPermissions();
        const statusKey = (proposition.status ?? PropositionStatusEnum.DRAFT) as string;
        const statusPermissions = permissions[statusKey] ?? {};

        const roleKey = `${role}.${action}`;
        if (roleKey in statusPermissions) {
            return statusPermissions[roleKey];
        }

        if (action in statusPermissions) {
            return statusPermissions[action];
        }

        return false;
    }

    private async isRoleAllowedToTransition(currentStatus: PropositionStatusEnum, role: WorkflowRole, targetStatus: PropositionStatusEnum): Promise<boolean> {
        if (role === 'admin') {
            return true;
        }

        const roleTransitions = ROLE_TRANSITIONS[currentStatus]?.[role];
        return roleTransitions ? roleTransitions.includes(targetStatus) : false;
    }

    private async ensureRescueInitiators(proposition: Proposition): Promise<User[]> {
        if (Array.isArray(proposition.rescueInitiators)) {
            return proposition.rescueInitiators as User[];
        }
        const related = await proposition.related('rescueInitiators').query();
        proposition.rescueInitiators = related as any;
        return related;
    }

    private async ensureMandates(proposition: Proposition) {
        if (Array.isArray((proposition as any).mandates)) {
            return (proposition as any).mandates;
        }
        const related = await proposition.related('mandates').query();
        (proposition as any).mandates = related;
        return related;
    }
}
