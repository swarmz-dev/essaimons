import { describe, expect, it } from 'vitest';
import { isActionAllowed, resolveWorkflowRole } from './workflowPermissionService';
import { MandateStatusEnum, PropositionStatusEnum, PropositionVisibilityEnum, UserRoleEnum } from 'backend/types';

const baseProposition: any = {
    id: 'prop-1',
    title: 'Test',
    summary: '',
    detailedDescription: '',
    smartObjectives: '',
    impacts: '',
    mandatesDescription: '',
    expertise: '',
    status: PropositionStatusEnum.CLARIFY,
    statusStartedAt: new Date().toISOString(),
    visibility: PropositionVisibilityEnum.PRIVATE,
    clarificationDeadline: '',
    amendmentDeadline: '',
    voteDeadline: '',
    mandateDeadline: '',
    evaluationDeadline: '',
    settingsSnapshot: {},
    creator: { id: 'user-1', username: 'alice' },
    categories: [],
    rescueInitiators: [],
    associatedPropositions: [],
    attachments: [],
    visual: null,
};

describe('workflowPermissionService', () => {
    it('grants admin role access to any action', () => {
        const adminUser: any = { id: 'admin', role: UserRoleEnum.ADMIN };
        const allowed = isActionAllowed(
            {
                [PropositionStatusEnum.CLARIFY]: {
                    admin: {
                        edit_proposition: true,
                    },
                },
            },
            PropositionStatusEnum.CLARIFY,
            'admin',
            'edit_proposition'
        );
        const role = resolveWorkflowRole(baseProposition, adminUser, []);
        expect(role).toBe('admin');
        expect(allowed).toBe(true);
    });

    it('evaluates per-status permissions for initiator role', () => {
        const proposition = {
            ...baseProposition,
            rescueInitiators: [{ id: 'user-2' }],
        };
        const initiator: any = { id: 'user-2', role: UserRoleEnum.USER };
        const permissions = {
            [PropositionStatusEnum.CLARIFY]: {
                initiator: {
                    manage_events: true,
                },
            },
        };
        const role = resolveWorkflowRole(proposition, initiator, []);
        expect(role).toBe('initiator');
        expect(isActionAllowed(permissions, PropositionStatusEnum.CLARIFY, role, 'manage_events')).toBe(true);
        expect(isActionAllowed(permissions, PropositionStatusEnum.CLARIFY, role, 'unknown')).toBe(false);
    });

    it('identifies mandated role based on active mandate', () => {
        const mandates: any[] = [
            {
                id: 'mandate-1',
                holderUserId: 'user-3',
                status: MandateStatusEnum.ACTIVE,
            },
        ];
        const mandatedUser: any = { id: 'user-3', role: UserRoleEnum.USER };
        const role = resolveWorkflowRole(baseProposition, mandatedUser, mandates);
        expect(role).toBe('mandated');
    });
});
