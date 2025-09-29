import type { SerializedProposition, SerializedStatusPermissions, SerializedUser } from 'backend/types';
import { MandateStatusEnum, UserRoleEnum } from 'backend/types';
import type { PropositionMandate, WorkflowRole } from '#lib/types/proposition';

const FALLBACK_ROLE_KEYS = ['global', '*', 'any'];

const normalizeId = (value?: string | number | null | undefined): string | null => {
    if (value === null || value === undefined) {
        return null;
    }
    const str = value.toString().trim();
    return str.length ? str : null;
};

export const resolveWorkflowRole = (proposition: SerializedProposition, user: SerializedUser | undefined, mandates: PropositionMandate[]): WorkflowRole => {
    if (!user) {
        return 'contributor';
    }

    if (user.role === UserRoleEnum.ADMIN) {
        return 'admin';
    }

    const normalizedUserId = normalizeId(user.id);
    if (!normalizedUserId) {
        return 'contributor';
    }

    const creatorId = normalizeId(proposition.creator?.id);
    if (creatorId && creatorId === normalizedUserId) {
        return 'initiator';
    }

    const rescueMatch = (proposition.rescueInitiators ?? []).some((initiator) => normalizeId(initiator.id) === normalizedUserId);
    if (rescueMatch) {
        return 'initiator';
    }

    const hasMandate = (mandates ?? []).some((mandate) => normalizeId(mandate.holderUserId) === normalizedUserId && mandate.status !== MandateStatusEnum.REVOKED);
    if (hasMandate) {
        return 'mandated';
    }

    return 'contributor';
};

export const isActionAllowed = (permissions: SerializedStatusPermissions | undefined, status: string, role: WorkflowRole, action: string): boolean => {
    if (!permissions) {
        return false;
    }

    const statusPermissions = permissions[status];
    if (!statusPermissions) {
        return false;
    }

    if (statusPermissions.admin && statusPermissions.admin[action] && role === 'admin') {
        return true;
    }

    const directRolePermissions = statusPermissions[role];
    if (directRolePermissions && Object.prototype.hasOwnProperty.call(directRolePermissions, action)) {
        return directRolePermissions[action] === true;
    }

    for (const fallbackKey of FALLBACK_ROLE_KEYS) {
        const fallback = statusPermissions[fallbackKey];
        if (fallback && Object.prototype.hasOwnProperty.call(fallback, action)) {
            return fallback[action] === true;
        }
    }

    for (const [key, value] of Object.entries(statusPermissions)) {
        if (typeof value === 'boolean') {
            if (key === action || key === `${role}.${action}`) {
                return value;
            }
        }
    }

    return false;
};

export const listAllowedActions = (permissions: SerializedStatusPermissions | undefined, status: string, role: WorkflowRole): string[] => {
    if (!permissions) {
        return [];
    }

    const statusPermissions = permissions[status];
    if (!statusPermissions) {
        return [];
    }

    const actionEntries: Array<[string, boolean]> = [];

    const directRolePermissions = statusPermissions[role] ?? {};
    for (const [action, allowed] of Object.entries(directRolePermissions)) {
        actionEntries.push([action, allowed === true]);
    }

    for (const fallbackKey of FALLBACK_ROLE_KEYS) {
        const fallbackPermissions = statusPermissions[fallbackKey];
        if (!fallbackPermissions) {
            continue;
        }
        for (const [action, allowed] of Object.entries(fallbackPermissions)) {
            if (!actionEntries.some(([existing]) => existing === action)) {
                actionEntries.push([action, allowed === true]);
            }
        }
    }

    for (const [key, value] of Object.entries(statusPermissions)) {
        if (typeof value === 'boolean') {
            const action = key.includes('.') ? (key.split('.').pop() ?? key) : key;
            if (!actionEntries.some(([existing]) => existing === action)) {
                actionEntries.push([action, value]);
            }
        }
    }

    return actionEntries.filter(([, allowed]) => allowed).map(([action]) => action);
};

export const buildRolePermissionMap = (permissions: SerializedStatusPermissions | undefined, status: string): Record<WorkflowRole | string, Record<string, boolean>> => {
    const map: Record<string, Record<string, boolean>> = {};
    if (!permissions) {
        return map;
    }

    const statusPermissions = permissions[status];
    if (!statusPermissions) {
        return map;
    }

    for (const [roleKey, actions] of Object.entries(statusPermissions)) {
        if (typeof actions === 'boolean') {
            map[roleKey] = { '*': actions };
            continue;
        }
        map[roleKey] = {};
        for (const [action, allowed] of Object.entries(actions)) {
            map[roleKey][action] = allowed === true;
        }
    }

    return map;
};
