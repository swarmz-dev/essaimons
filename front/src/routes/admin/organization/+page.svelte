<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { Card, CardContent } from '#lib/components/ui/card';
    import { FieldLabel } from '#lib/components/forms';
    import { Input } from '#lib/components/ui/input';
    import { RichTextEditor } from '#lib/components/ui/rich-text';
    import { Button } from '#lib/components/ui/button';
    import { Tooltip, TooltipContent, TooltipTrigger } from '#lib/components/ui/tooltip';
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { m } from '#lib/paraglide/messages';
    import LogoCropper from '#lib/components/ui/image/LogoCropper.svelte';
    import EnglishFlag from '#icons/EnglishFlag.svelte';
    import FrenchFlag from '#icons/FrenchFlag.svelte';
    import { HelpCircle } from '@lucide/svelte';
    import type { SerializedOrganizationSettings } from 'backend/types';
    import { onDestroy } from 'svelte';
    import * as zod from 'zod';

    const { data } = $props<{ data: { settings: SerializedOrganizationSettings } }>();
    const settings = data.settings;

    type LocaleInfo = SerializedOrganizationSettings['locales'][number];

    const locales: LocaleInfo[] = settings.locales.length ? settings.locales : [{ code: settings.fallbackLocale ?? 'en', label: settings.fallbackLocale ?? 'en', isDefault: true }];

    const maxSourceCodeUrlLength = 2000;

    const isValidUrl = (value: string): boolean => {
        if (!value) {
            return false;
        }
        try {
            // eslint-disable-next-line no-new
            new URL(value);
            return true;
        } catch (error) {
            return false;
        }
    };

    const getLocaleLabel = (code: string): string => locales.find((locale) => locale.code === code)?.label ?? code.toUpperCase();

    const fallbackSourceCodeUrlSchema = zod
        .string()
        .trim()
        .min(1)
        .max(maxSourceCodeUrlLength)
        .superRefine((value, ctx) => {
            if (!isValidUrl(value)) {
                ctx.addIssue({ code: zod.ZodIssueCode.custom, message: 'invalid' });
            }
        });

    const optionalSourceCodeUrlSchema = zod
        .string()
        .trim()
        .max(maxSourceCodeUrlLength)
        .superRefine((value, ctx) => {
            if (!value) {
                return;
            }
            if (!isValidUrl(value)) {
                ctx.addIssue({ code: zod.ZodIssueCode.custom, message: 'invalid' });
            }
        });

    const resolveSourceCodeUrlError = (value: string, isFallback: boolean, localeLabel: string): string | null => {
        const schema = isFallback ? fallbackSourceCodeUrlSchema : optionalSourceCodeUrlSchema;
        const result = schema.safeParse(value);
        if (result.success) {
            return null;
        }

        const issue = result.error.issues[0];
        if (!issue) {
            return null;
        }

        if (isFallback && issue.code === zod.ZodIssueCode.too_small) {
            return m['admin.organization.validation.source-code-url.required']({ locale: localeLabel });
        }

        if (issue.code === zod.ZodIssueCode.too_big) {
            return m['admin.organization.validation.source-code-url.max']({ locale: localeLabel });
        }

        return m['admin.organization.validation.source-code-url.invalid']({ locale: localeLabel });
    };

    const ensureMap = (input: Record<string, string> | undefined): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const locale of locales) {
            result[locale.code] = input?.[locale.code] ?? '';
        }
        return result;
    };

    const localeIcon = (code: string) => {
        const normalized = code.split('-')[0].toLowerCase();
        switch (normalized) {
            case 'en':
                return EnglishFlag;
            case 'fr':
                return FrenchFlag;
            default:
                return null;
        }
    };

    const initialLogoUrl: string | null = settings.logo ? `/assets/organization/logo/${settings.logo.id}?no-cache=true` : null;

    let defaultLocale: string = $state(settings.defaultLocale ?? '');
    let fallbackLocale: string = $state(settings.fallbackLocale ?? locales[0]?.code ?? 'en');
    let nameByLocale: Record<string, string> = $state(ensureMap(settings.name));
    let descriptionByLocale: Record<string, string> = $state(ensureMap(settings.description));
    let sourceCodeUrlByLocale: Record<string, string> = $state(ensureMap(settings.sourceCodeUrl));
    let copyrightByLocale: Record<string, string> = $state(ensureMap(settings.copyright));
    let logoPreview: string | null = $state(initialLogoUrl);
    let logoInputRef: HTMLInputElement | undefined = $state();
    let pendingLogoFile: File | null = $state(null);
    let showCropper: boolean = $state(false);
    let croppedFile: File | null = $state(null);
    let croppedPreviewUrl: string | null = $state(null);
    let isSubmitting: boolean = $state(false);
    let activeTab: 'general' | 'propositions' = $state('general');
    let clarificationOffsetDays: string = $state(String(settings.propositionDefaults?.clarificationOffsetDays ?? 7));
    let amendmentOffsetDays: string = $state(String(settings.propositionDefaults?.amendmentOffsetDays ?? 15));
    let voteOffsetDays: string = $state(String(settings.propositionDefaults?.voteOffsetDays ?? 7));
    let mandateOffsetDays: string = $state(String(settings.propositionDefaults?.mandateOffsetDays ?? 15));
    let evaluationOffsetDays: string = $state(String(settings.propositionDefaults?.evaluationOffsetDays ?? 30));
    const defaultPermissionMatrix: Record<string, Record<string, Record<string, boolean>>> = {
        draft: {
            initiator: {
                edit_proposition: true,
                publish: true,
                manage_files: true,
                manage_comments: true,
            },
        },
        clarify: {
            initiator: {
                edit_proposition: true,
                manage_comments: true,
            },
            contributor: {
                comment_clarification: true,
            },
        },
        amend: {
            initiator: {
                edit_proposition: true,
                manage_events: true,
                manage_comments: true,
            },
            contributor: {
                comment_amendment: true,
            },
        },
        vote: {
            initiator: {
                configure_vote: true,
                manage_comments: true,
            },
            contributor: {
                participate_vote: true,
            },
        },
        mandate: {
            initiator: {
                manage_mandates: true,
                manage_comments: true,
            },
            contributor: {
                participate_vote: true,
                comment_mandate: true,
            },
            mandated: {
                candidate: true,
            },
        },
        evaluate: {
            initiator: {
                manage_deliverables: true,
                manage_comments: true,
            },
            mandated: {
                upload_deliverable: true,
                comment_evaluation: true,
            },
            contributor: {
                evaluate_deliverable: true,
                comment_evaluation: true,
                request_revocation: true,
            },
        },
        archived: {
            admin: {
                purge: true,
            },
        },
    };

    const clonePermissionMatrix = (matrix: Record<string, Record<string, Record<string, boolean>>>): Record<string, Record<string, Record<string, boolean>>> =>
        JSON.parse(JSON.stringify(matrix ?? {}));

    const mergePermissionMatrix = (
        base: Record<string, Record<string, Record<string, boolean>>>,
        overrides: Record<string, Record<string, Record<string, boolean>>>
    ): Record<string, Record<string, Record<string, boolean>>> => {
        const result = clonePermissionMatrix(base);

        for (const [status, roles] of Object.entries(overrides ?? {})) {
            if (!roles || typeof roles !== 'object') continue;

            if (!result[status]) {
                result[status] = {};
            }

            for (const [role, actions] of Object.entries(roles ?? {})) {
                if (!actions || typeof actions !== 'object') continue;

                if (!result[status][role]) {
                    result[status][role] = {};
                }

                for (const [actionKey, allowed] of Object.entries(actions)) {
                    if (typeof allowed === 'boolean') {
                        result[status][role][actionKey] = allowed;
                    }
                }
            }
        }

        return result;
    };

    const initialCatalogMatrix = mergePermissionMatrix(defaultPermissionMatrix, settings.permissionCatalog?.perStatus ?? {});
    let permissionCatalog: Record<string, Record<string, Record<string, boolean>>> = $state(initialCatalogMatrix);
    const initialPermissionsMatrix = mergePermissionMatrix(initialCatalogMatrix, settings.permissions?.perStatus ?? {});

    let permissionsPerStatus: Record<string, Record<string, Record<string, boolean>>> = $state(initialPermissionsMatrix);
    let deliverableRecalcCooldownMinutes: string = $state(String(settings.workflowAutomation?.deliverableRecalcCooldownMinutes ?? 10));
    let evaluationAutoShiftDays: string = $state(String(settings.workflowAutomation?.evaluationAutoShiftDays ?? 14));
    let nonConformityPercentThreshold: string = $state(String(settings.workflowAutomation?.nonConformityPercentThreshold ?? 10));
    let nonConformityAbsoluteFloor: string = $state(String(settings.workflowAutomation?.nonConformityAbsoluteFloor ?? 5));
    let revocationAutoTriggerDelayDays: string = $state(String(settings.workflowAutomation?.revocationAutoTriggerDelayDays ?? 7));
    let revocationCheckFrequencyHours: string = $state(String(settings.workflowAutomation?.revocationCheckFrequencyHours ?? 24));
    let deliverableNamingPattern: string = $state(settings.workflowAutomation?.deliverableNamingPattern ?? 'DELIV-{proposition}-{date}');

    let sourceCodeUrlErrors: Record<string, string | null> = $state({});
    let hasSourceCodeUrlErrors: boolean = $state(false);

    $effect(() => {
        const nextErrors: Record<string, string | null> = {};
        for (const locale of locales) {
            const value = sourceCodeUrlByLocale[locale.code] ?? '';
            nextErrors[locale.code] = resolveSourceCodeUrlError(value, fallbackLocale === locale.code, getLocaleLabel(locale.code));
        }
        sourceCodeUrlErrors = nextErrors;
        hasSourceCodeUrlErrors = Object.values(nextErrors).some((message) => Boolean(message));
    });

    const updateMapValue = (map: Record<string, string>, localeCode: string, value: string, setter: (next: Record<string, string>) => void): void => {
        setter({ ...map, [localeCode]: value });
    };

    const statusOrder = ['draft', 'clarify', 'amend', 'vote', 'mandate', 'evaluate', 'archived'];

    const getStatuses = (): string[] => {
        const merged = new Set<string>([...statusOrder, ...Object.keys(permissionCatalog ?? {}), ...Object.keys(permissionsPerStatus ?? {})]);
        return Array.from(merged);
    };

    const getRolesForStatus = (status: string): string[] => Object.keys(permissionsPerStatus?.[status] ?? {}).sort();

    const getActionsForRole = (status: string, role: string): string[] => Object.keys(permissionsPerStatus?.[status]?.[role] ?? {}).sort();

    const collectRolePoolForStatus = (status: string): Set<string> => {
        const pool = new Set<string>(['admin', 'initiator', 'contributor', 'mandated']);
        const collect = (matrix: Record<string, Record<string, Record<string, boolean>>>) => {
            const roles = Object.keys(matrix?.[status] ?? {});
            roles.forEach((role) => pool.add(role));
        };
        collect(defaultPermissionMatrix);
        collect(permissionCatalog);
        collect(permissionsPerStatus);
        return pool;
    };

    const collectActionPoolForStatus = (status: string): Set<string> => {
        const pool = new Set<string>();
        const collect = (matrix: Record<string, Record<string, Record<string, boolean>>>) => {
            const roles = matrix?.[status];
            for (const actions of Object.values(roles ?? {})) {
                Object.keys(actions ?? {}).forEach((action) => pool.add(action));
            }
        };
        collect(defaultPermissionMatrix);
        collect(permissionCatalog);
        collect(permissionsPerStatus);
        return pool;
    };

    const getAvailableRolesForStatus = (status: string): string[] => {
        const pool = collectRolePoolForStatus(status);
        const existing = new Set(Object.keys(permissionsPerStatus?.[status] ?? {}));
        return Array.from(pool)
            .filter((role) => !existing.has(role))
            .sort();
    };

    const getAvailableActionsForRole = (status: string, role: string): string[] => {
        const pool = collectActionPoolForStatus(status);
        const existing = new Set(Object.keys(permissionsPerStatus?.[status]?.[role] ?? {}));
        return Array.from(pool)
            .filter((action) => !existing.has(action))
            .sort();
    };

    const formatStatusLabel = (status: string): string =>
        status
            .split('_')
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ');

    const formatRoleLabel = (role: string): string =>
        role
            .split('_')
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ');

    const formatActionLabel = (action: string): string =>
        action
            .split('_')
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ');

    const slugifyKey = (input: string): string =>
        input
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

    const registerRoleInCatalog = (status: string, role: string): void => {
        const statusCatalog = permissionCatalog[status] ?? {};
        permissionCatalog = {
            ...permissionCatalog,
            [status]: {
                ...statusCatalog,
                [role]: { ...(statusCatalog[role] ?? {}) },
            },
        };
    };

    const registerActionInCatalog = (status: string, role: string, action: string): void => {
        const statusCatalog = permissionCatalog[status] ?? {};
        const roleCatalog = statusCatalog[role] ?? {};
        permissionCatalog = {
            ...permissionCatalog,
            [status]: {
                ...statusCatalog,
                [role]: {
                    ...roleCatalog,
                    [action]: true,
                },
            },
        };
    };

    let roleSelections: Record<string, string> = $state({});
    let actionSelections: Record<string, Record<string, string>> = $state({});

    const setRoleSelection = (status: string, value: string) => {
        roleSelections = { ...roleSelections, [status]: value };
    };

    const setActionSelection = (status: string, role: string, value: string) => {
        const current = actionSelections[status] ?? {};
        actionSelections = { ...actionSelections, [status]: { ...current, [role]: value } };
    };

    const confirmAddRole = (status: string): void => {
        const key = roleSelections[status];
        if (!key) return;
        const available = getAvailableRolesForStatus(status);
        if (!available.includes(key)) {
            window.alert(m['admin.organization.propositions.permissions.errors.role-unavailable']());
            return;
        }
        const existingStatus = permissionsPerStatus[status] ?? {};
        registerRoleInCatalog(status, key);
        permissionsPerStatus = {
            ...permissionsPerStatus,
            [status]: {
                ...existingStatus,
                [key]: {},
            },
        };
        roleSelections = { ...roleSelections, [status]: '' };
    };

    const confirmAddAction = (status: string, role: string): void => {
        const key = actionSelections[status]?.[role];
        if (!key) return;
        const available = getAvailableActionsForRole(status, role);
        if (!available.includes(key)) {
            window.alert(m['admin.organization.propositions.permissions.errors.action-unavailable']());
            return;
        }
        const statusPermissions = permissionsPerStatus[status] ?? {};
        const rolePermissions = statusPermissions[role] ?? {};
        registerActionInCatalog(status, role, key);
        permissionsPerStatus = {
            ...permissionsPerStatus,
            [status]: {
                ...statusPermissions,
                [role]: {
                    ...rolePermissions,
                    [key]: false,
                },
            },
        };
        setActionSelection(status, role, '');
    };

    const promptCustomRole = (status: string): void => {
        if (typeof window === 'undefined') return;
        const rawRole = window.prompt(m['admin.organization.propositions.permissions.prompts.role-name']({ status: formatStatusLabel(status) }));
        if (!rawRole) return;
        const roleKey = slugifyKey(rawRole);
        if (!roleKey) {
            window.alert(m['admin.organization.propositions.permissions.errors.role-invalid']());
            return;
        }
        if ((permissionCatalog[status] ?? {})[roleKey]) {
            window.alert(m['admin.organization.propositions.permissions.errors.role-exists']());
            return;
        }

        const rawAction = window.prompt(m['admin.organization.propositions.permissions.prompts.role-first-action']({ role: rawRole, status: formatStatusLabel(status) }));
        if (!rawAction) {
            window.alert(m['admin.organization.propositions.permissions.errors.role-needs-action']());
            return;
        }
        const actionKey = slugifyKey(rawAction);
        if (!actionKey) {
            window.alert(m['admin.organization.propositions.permissions.errors.action-invalid']());
            return;
        }

        registerRoleInCatalog(status, roleKey);
        registerActionInCatalog(status, roleKey, actionKey);

        const statusPermissions = permissionsPerStatus[status] ?? {};
        permissionsPerStatus = {
            ...permissionsPerStatus,
            [status]: {
                ...statusPermissions,
                [roleKey]: {
                    [actionKey]: false,
                },
            },
        };
    };

    const promptCustomAction = (status: string, role: string): void => {
        if (typeof window === 'undefined') return;
        const rawAction = window.prompt(m['admin.organization.propositions.permissions.prompts.action-name']({ role: formatRoleLabel(role), status: formatStatusLabel(status) }));
        if (!rawAction) return;
        const actionKey = slugifyKey(rawAction);
        if (!actionKey) {
            window.alert(m['admin.organization.propositions.permissions.errors.action-invalid']());
            return;
        }
        if ((permissionCatalog[status]?.[role] ?? {})[actionKey]) {
            window.alert(m['admin.organization.propositions.permissions.errors.action-exists']());
            return;
        }

        registerActionInCatalog(status, role, actionKey);

        const statusPermissions = permissionsPerStatus[status] ?? {};
        const rolePermissions = statusPermissions[role] ?? {};
        permissionsPerStatus = {
            ...permissionsPerStatus,
            [status]: {
                ...statusPermissions,
                [role]: {
                    ...rolePermissions,
                    [actionKey]: false,
                },
            },
        };
    };

    const handlePermissionToggle = (status: string, role: string, action: string, allowed: boolean): void => {
        const statusPermissions = permissionsPerStatus[status] ?? {};
        const rolePermissions = statusPermissions[role] ?? {};

        permissionsPerStatus = {
            ...permissionsPerStatus,
            [status]: {
                ...statusPermissions,
                [role]: {
                    ...rolePermissions,
                    [action]: allowed,
                },
            },
        };
    };

    const handleLogoChange = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            pendingLogoFile = null;
            return;
        }
        pendingLogoFile = file;
        showCropper = true;
    };

    const handleCropConfirm = (event: CustomEvent<{ file: File; previewUrl: string }>): void => {
        const { file, previewUrl } = event.detail;
        if (croppedPreviewUrl && croppedPreviewUrl !== previewUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
        croppedFile = file;
        croppedPreviewUrl = previewUrl;
        logoPreview = previewUrl;
        showCropper = false;
        pendingLogoFile = null;
        if (logoInputRef) {
            logoInputRef.value = '';
        }
    };

    const handleCropCancel = (): void => {
        showCropper = false;
        pendingLogoFile = null;
        if (logoInputRef) {
            logoInputRef.value = '';
        }
    };

    $effect(() => {
        if (!logoPreview) {
            if (croppedPreviewUrl) {
                logoPreview = croppedPreviewUrl;
            } else if (initialLogoUrl) {
                logoPreview = initialLogoUrl;
            }
        }
    });

    const submitHandler: SubmitFunction = async ({ formData, cancel }) => {
        if (hasSourceCodeUrlErrors) {
            cancel();
            return;
        }

        isSubmitting = true;

        const fallbackLabel = getLocaleLabel(fallbackLocale);

        // Helper function to clean HTML content from RichTextEditor
        const cleanHtml = (html: string | undefined): string => {
            if (!html) return '';
            const trimmed = html.trim();
            // Empty Quill editor produces '<p><br></p>' which should be treated as empty
            if (trimmed === '<p><br></p>' || trimmed === '<p></p>') return '';
            return trimmed;
        };

        const ensureFallbackValue = (map: Record<string, string>, fieldLabel: string, isHtml: boolean = false): boolean => {
            const value = map[fallbackLocale] ?? '';
            const cleanedValue = isHtml ? cleanHtml(value) : value.trim();
            if (cleanedValue.length === 0) {
                isSubmitting = false;
                cancel();
                window.alert(m['admin.organization.validation.fallback-required']({ field: fieldLabel, locale: fallbackLabel }));
                return false;
            }
            return true;
        };

        if (!ensureFallbackValue(nameByLocale, m['admin.organization.fields.name']())) return;
        if (!ensureFallbackValue(descriptionByLocale, m['admin.organization.fields.description'](), true)) return;
        if (!ensureFallbackValue(copyrightByLocale, m['admin.organization.fields.copyright']())) return;

        if (defaultLocale.trim()) {
            formData.set('defaultLocale', defaultLocale.trim());
        }
        formData.set('fallbackLocale', fallbackLocale);

        // Clean up FormData - remove all locale fields first, then add only non-empty ones
        const allFieldsToClean: string[] = [];
        for (const locale of locales) {
            allFieldsToClean.push(`name[${locale.code}]`);
            allFieldsToClean.push(`description[${locale.code}]`);
            allFieldsToClean.push(`description[${locale.code}]-source`); // RichTextEditor creates hidden source fields
            allFieldsToClean.push(`sourceCodeUrl[${locale.code}]`);
            allFieldsToClean.push(`copyright[${locale.code}]`);
        }

        for (const fieldName of allFieldsToClean) {
            formData.delete(fieldName);
        }

        // Now add back only non-empty values
        for (const locale of locales) {
            const nameValue = nameByLocale[locale.code]?.trim() ?? '';
            if (nameValue) {
                formData.set(`name[${locale.code}]`, nameValue);
            }

            const descriptionValue = cleanHtml(descriptionByLocale[locale.code]);
            if (descriptionValue) {
                formData.set(`description[${locale.code}]`, descriptionValue);
            }

            const sourceUrlValue = sourceCodeUrlByLocale[locale.code]?.trim() ?? '';
            if (sourceUrlValue) {
                formData.set(`sourceCodeUrl[${locale.code}]`, sourceUrlValue);
            }

            const copyrightValue = copyrightByLocale[locale.code]?.trim() ?? '';
            if (copyrightValue) {
                formData.set(`copyright[${locale.code}]`, copyrightValue);
            }
        }

        formData.set('propositionDefaults[clarificationOffsetDays]', clarificationOffsetDays.trim() || '0');
        formData.set('propositionDefaults[amendmentOffsetDays]', amendmentOffsetDays.trim() || '0');
        formData.set('propositionDefaults[voteOffsetDays]', voteOffsetDays.trim() || '0');
        formData.set('propositionDefaults[mandateOffsetDays]', mandateOffsetDays.trim() || '0');
        formData.set('propositionDefaults[evaluationOffsetDays]', evaluationOffsetDays.trim() || '0');

        for (const status of getStatuses()) {
            const roles = getRolesForStatus(status);
            for (const role of roles) {
                const actions = getActionsForRole(status, role);
                for (const action of actions) {
                    const allowed = Boolean(permissionsPerStatus?.[status]?.[role]?.[action]);
                    formData.set(`permissions[perStatus][${status}][${role}][${action}]`, allowed ? '1' : '0');
                }
            }
        }

        for (const [status, roles] of Object.entries(permissionCatalog ?? {})) {
            for (const [role, actions] of Object.entries(roles ?? {})) {
                for (const action of Object.keys(actions ?? {})) {
                    formData.set(`permissionCatalog[perStatus][${status}][${role}][${action}]`, 'true');
                }
            }
        }

        formData.set('workflowAutomation[deliverableRecalcCooldownMinutes]', deliverableRecalcCooldownMinutes.trim() || '0');
        formData.set('workflowAutomation[evaluationAutoShiftDays]', evaluationAutoShiftDays.trim() || '0');
        formData.set('workflowAutomation[nonConformityPercentThreshold]', nonConformityPercentThreshold.trim() || '0');
        formData.set('workflowAutomation[nonConformityAbsoluteFloor]', nonConformityAbsoluteFloor.trim() || '0');
        formData.set('workflowAutomation[revocationAutoTriggerDelayDays]', revocationAutoTriggerDelayDays.trim() || '0');
        formData.set('workflowAutomation[revocationCheckFrequencyHours]', revocationCheckFrequencyHours.trim() || '0');
        formData.set('workflowAutomation[deliverableNamingPattern]', deliverableNamingPattern.trim());

        if (croppedFile) {
            formData.delete('logo');
            formData.append('logo', croppedFile, croppedFile.name);
        }

        return async ({ result, update }) => {
            isSubmitting = false;
            if (result.type === 'failure') {
                await update({ reset: false });
            } else {
                await update();
            }
        };
    };

    onDestroy(() => {
        if (croppedPreviewUrl) {
            URL.revokeObjectURL(croppedPreviewUrl);
        }
    });
</script>

<Title title={m['admin.organization.title']()} hasBackground />

<Card class="bg-white/80 shadow-lg dark:bg-slate-950/70">
    <CardContent class="space-y-8 p-6">
        <div class="space-y-2">
            <p class="text-sm text-muted-foreground">{m['admin.organization.description']()}</p>
        </div>

        <div class="flex flex-wrap gap-2">
            <Button type="button" variant={activeTab === 'general' ? 'default' : 'outline'} onclick={() => (activeTab = 'general')}>
                {m['admin.organization.tabs.general']()}
            </Button>
            <Button type="button" variant={activeTab === 'propositions' ? 'default' : 'outline'} onclick={() => (activeTab = 'propositions')}>
                {m['admin.organization.tabs.propositions']()}
            </Button>
        </div>

        <form method="POST" action="?/update" enctype="multipart/form-data" class="grid gap-6 lg:grid-cols-[2fr,1fr]" use:enhance={submitHandler}>
            <div class="space-y-8">
                <div class:hidden={activeTab !== 'general'} class="space-y-8">
                    <div class="space-y-2">
                        <label for="defaultLocale" class="flex items-center gap-2 text-sm font-medium text-foreground">
                            <span>{m['admin.organization.fields.default-locale']()}</span>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle class="size-4 text-muted-foreground transition-colors hover:text-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={5}>
                                    <p class="max-w-xs">{m['admin.organization.fields.default-locale-tooltip']()}</p>
                                </TooltipContent>
                            </Tooltip>
                        </label>
                        <select
                            id="defaultLocale"
                            name="defaultLocale"
                            bind:value={defaultLocale}
                            class="h-11 w-full rounded-2xl border border-border/60 bg-white/80 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-slate-800/70 dark:bg-slate-900/70"
                        >
                            <option value="">{m['admin.organization.fields.fallback-locale']()} (auto)</option>
                            {#each locales as locale}
                                <option value={locale.code}>{locale.label}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="space-y-2">
                        <label for="fallbackLocale" class="flex items-center gap-2 text-sm font-medium text-foreground">
                            <span>{m['admin.organization.fields.fallback-locale']()}</span>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle class="size-4 text-muted-foreground transition-colors hover:text-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={5}>
                                    <p class="max-w-xs">{m['admin.organization.fields.fallback-locale-tooltip']()}</p>
                                </TooltipContent>
                            </Tooltip>
                        </label>
                        <select
                            id="fallbackLocale"
                            name="fallbackLocale"
                            bind:value={fallbackLocale}
                            class="h-11 w-full rounded-2xl border border-border/60 bg-white/80 px-4 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-slate-800/70 dark:bg-slate-900/70"
                            required
                        >
                            {#each locales as locale}
                                <option value={locale.code}>{locale.label}</option>
                            {/each}
                        </select>
                    </div>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.name']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <Input
                                        id={`name-${locale.code}`}
                                        name={`name[${locale.code}]`}
                                        placeholder={m['admin.organization.fields.name']()}
                                        value={nameByLocale[locale.code]}
                                        required={fallbackLocale === locale.code}
                                        oninput={(event) => updateMapValue(nameByLocale, locale.code, (event.currentTarget as HTMLInputElement).value, (next) => (nameByLocale = next))}
                                    />
                                </div>
                            </div>
                        {/each}
                    </section>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.description']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44 sm:pt-6">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <RichTextEditor
                                        name={`description[${locale.code}]`}
                                        label=""
                                        bind:value={descriptionByLocale[locale.code]}
                                        placeholder={m['admin.organization.fields.description']()}
                                        required={fallbackLocale === locale.code}
                                        max={5000}
                                    />
                                </div>
                            </div>
                        {/each}
                    </section>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.source-code']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <Input
                                        id={`source-${locale.code}`}
                                        type="url"
                                        name={`sourceCodeUrl[${locale.code}]`}
                                        placeholder="https://github.com/..."
                                        value={sourceCodeUrlByLocale[locale.code]}
                                        required={fallbackLocale === locale.code}
                                        aria-invalid={Boolean(sourceCodeUrlErrors[locale.code])}
                                        oninput={(event) =>
                                            updateMapValue(sourceCodeUrlByLocale, locale.code, (event.currentTarget as HTMLInputElement).value, (next) => (sourceCodeUrlByLocale = next))}
                                    />
                                    {#if sourceCodeUrlErrors[locale.code]}
                                        <p class="mt-1 text-sm text-destructive">{sourceCodeUrlErrors[locale.code]}</p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </section>

                    <section class="space-y-6">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.copyright']()}</h3>
                        {#each locales as locale}
                            {@const IconComponent = localeIcon(locale.code)}
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                <div class="flex items-center gap-2 sm:w-44">
                                    {#if IconComponent}
                                        <span class="grid size-7 place-items-center overflow-hidden rounded-full bg-muted">
                                            <IconComponent />
                                        </span>
                                    {:else}
                                        <span class="text-2xl">{locale.code.toUpperCase()}</span>
                                    {/if}
                                    <div class="flex flex-col leading-tight">
                                        <span class="text-sm font-semibold text-foreground/85">{locale.label}</span>
                                        {#if fallbackLocale === locale.code}
                                            <span class="text-xs text-muted-foreground">{m['admin.organization.fields.fallback-badge']()}</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <Input
                                        id={`copyright-${locale.code}`}
                                        name={`copyright[${locale.code}]`}
                                        placeholder="© 2025 Your Organization"
                                        value={copyrightByLocale[locale.code]}
                                        required={fallbackLocale === locale.code}
                                        oninput={(event) => updateMapValue(copyrightByLocale, locale.code, (event.currentTarget as HTMLInputElement).value, (next) => (copyrightByLocale = next))}
                                    />
                                </div>
                            </div>
                        {/each}
                    </section>
                </div>

                <div class:hidden={activeTab !== 'propositions'} class="space-y-6">
                    <p class="text-sm text-muted-foreground">{m['admin.organization.propositions.description']()}</p>

                    <FieldLabel forId="clarificationOffsetDays" label={m['admin.organization.propositions.clarification']()}>
                        <Input id="clarificationOffsetDays" type="number" name="propositionDefaults[clarificationOffsetDays]" min={0} bind:value={clarificationOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="amendmentOffsetDays" label={m['admin.organization.propositions.amendment']()}>
                        <Input id="amendmentOffsetDays" type="number" name="propositionDefaults[amendmentOffsetDays]" min={0} bind:value={amendmentOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="voteOffsetDays" label={m['admin.organization.propositions.vote']()}>
                        <Input id="voteOffsetDays" type="number" name="propositionDefaults[voteOffsetDays]" min={0} bind:value={voteOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="mandateOffsetDays" label={m['admin.organization.propositions.mandate']()}>
                        <Input id="mandateOffsetDays" type="number" name="propositionDefaults[mandateOffsetDays]" min={0} bind:value={mandateOffsetDays} required />
                    </FieldLabel>

                    <FieldLabel forId="evaluationOffsetDays" label={m['admin.organization.propositions.evaluation']()}>
                        <Input id="evaluationOffsetDays" type="number" name="propositionDefaults[evaluationOffsetDays]" min={0} bind:value={evaluationOffsetDays} required />
                    </FieldLabel>

                    <section class="space-y-4">
                        <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.propositions.automations.title']()}</h3>
                        <div class="grid gap-4 md:grid-cols-2">
                            <FieldLabel forId="deliverableRecalcCooldownMinutes" label={m['admin.organization.propositions.automations.recalc-cooldown']()}>
                                <Input
                                    id="deliverableRecalcCooldownMinutes"
                                    type="number"
                                    name="workflowAutomation[deliverableRecalcCooldownMinutes]"
                                    min={1}
                                    max={1440}
                                    bind:value={deliverableRecalcCooldownMinutes}
                                    required
                                />
                            </FieldLabel>

                            <FieldLabel forId="evaluationAutoShiftDays" label={m['admin.organization.propositions.automations.evaluation-shift']()}>
                                <Input id="evaluationAutoShiftDays" type="number" name="workflowAutomation[evaluationAutoShiftDays]" min={0} max={365} bind:value={evaluationAutoShiftDays} required />
                            </FieldLabel>

                            <FieldLabel forId="nonConformityPercentThreshold" label={m['admin.organization.propositions.automations.non-conformity-percent']()}>
                                <Input
                                    id="nonConformityPercentThreshold"
                                    type="number"
                                    name="workflowAutomation[nonConformityPercentThreshold]"
                                    min={0}
                                    max={100}
                                    bind:value={nonConformityPercentThreshold}
                                    required
                                />
                            </FieldLabel>

                            <FieldLabel forId="nonConformityAbsoluteFloor" label={m['admin.organization.propositions.automations.non-conformity-floor']()}>
                                <Input
                                    id="nonConformityAbsoluteFloor"
                                    type="number"
                                    name="workflowAutomation[nonConformityAbsoluteFloor]"
                                    min={0}
                                    max={1000}
                                    bind:value={nonConformityAbsoluteFloor}
                                    required
                                />
                            </FieldLabel>

                            <FieldLabel forId="revocationAutoTriggerDelayDays" label={m['admin.organization.propositions.automations.revocation-delay']()}>
                                <Input
                                    id="revocationAutoTriggerDelayDays"
                                    type="number"
                                    name="workflowAutomation[revocationAutoTriggerDelayDays]"
                                    min={0}
                                    max={365}
                                    bind:value={revocationAutoTriggerDelayDays}
                                    required
                                />
                            </FieldLabel>

                            <FieldLabel forId="revocationCheckFrequencyHours" label={m['admin.organization.propositions.automations.revocation-frequency']()}>
                                <Input
                                    id="revocationCheckFrequencyHours"
                                    type="number"
                                    name="workflowAutomation[revocationCheckFrequencyHours]"
                                    min={1}
                                    max={168}
                                    bind:value={revocationCheckFrequencyHours}
                                    required
                                />
                            </FieldLabel>

                            <FieldLabel forId="deliverableNamingPattern" label={m['admin.organization.propositions.automations.naming-pattern']()}>
                                <Input id="deliverableNamingPattern" type="text" name="workflowAutomation[deliverableNamingPattern]" maxlength={255} bind:value={deliverableNamingPattern} />
                            </FieldLabel>
                        </div>
                    </section>

                    <section class="space-y-4">
                        <div>
                            <h3 class="text-sm font-semibold text-muted-foreground">{m['admin.organization.propositions.permissions.title']()}</h3>
                            <p class="text-xs text-muted-foreground">{m['admin.organization.propositions.permissions.hint']()}</p>
                        </div>
                        <div class="space-y-5">
                            {#each getStatuses() as status}
                                <div class="overflow-hidden rounded-3xl border border-border/60 bg-white/80 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
                                    <div class="border-b border-border/60 bg-muted/40 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground dark:border-slate-800/70">
                                        {formatStatusLabel(status)}
                                    </div>
                                    <div class="space-y-4 p-4">
                                        {#if getRolesForStatus(status).length === 0}
                                            <p class="text-xs text-muted-foreground">{m['admin.organization.propositions.permissions.no-role']()}</p>
                                        {/if}
                                        {#each getRolesForStatus(status) as role}
                                            <div class="rounded-2xl border border-border/50 bg-white/80 shadow-inner dark:border-slate-800/70 dark:bg-slate-900/70">
                                                <div class="border-b border-border/50 px-4 py-2 text-sm font-semibold text-foreground/85 dark:border-slate-800/70">
                                                    {formatRoleLabel(role)}
                                                </div>
                                                <div class="space-y-2 p-4">
                                                    {#if getActionsForRole(status, role).length === 0}
                                                        <p class="text-xs text-muted-foreground">{m['admin.organization.propositions.permissions.no-action']()}</p>
                                                    {:else}
                                                        {#each getActionsForRole(status, role) as action}
                                                            <label
                                                                class="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm font-medium text-foreground/80 shadow-sm transition hover:bg-muted/40 dark:border-slate-800/70 dark:bg-slate-950/70 dark:text-slate-200"
                                                            >
                                                                <span>{formatActionLabel(action)}</span>
                                                                <input
                                                                    class="size-4 rounded border-border/60 accent-primary"
                                                                    type="checkbox"
                                                                    checked={Boolean(permissionsPerStatus?.[status]?.[role]?.[action])}
                                                                    onchange={(event) => handlePermissionToggle(status, role, action, (event.currentTarget as HTMLInputElement).checked)}
                                                                />
                                                            </label>
                                                        {/each}
                                                    {/if}
                                                    <div class="flex flex-wrap items-center justify-end gap-2 pt-2">
                                                        {#if getAvailableActionsForRole(status, role).length > 0}
                                                            <select
                                                                class="h-10 min-w-48 rounded-2xl border border-border/60 bg-white/80 px-3 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-slate-800/70 dark:bg-slate-900/70"
                                                                value={actionSelections[status]?.[role] ?? ''}
                                                                onchange={(event) => setActionSelection(status, role, (event.currentTarget as HTMLSelectElement).value)}
                                                            >
                                                                <option value="">{m['admin.organization.propositions.permissions.select-action']()}</option>
                                                                {#each getAvailableActionsForRole(status, role) as actionOption}
                                                                    <option value={actionOption}>{formatActionLabel(actionOption)}</option>
                                                                {/each}
                                                            </select>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={!actionSelections[status]?.[role]}
                                                                onclick={() => confirmAddAction(status, role)}
                                                            >
                                                                {m['admin.organization.propositions.permissions.add-action']()}
                                                            </Button>
                                                        {:else}
                                                            <select
                                                                class="h-10 min-w-48 rounded-2xl border border-border/60 bg-white/60 px-3 text-sm font-medium text-muted-foreground shadow-sm outline-none"
                                                                disabled
                                                            >
                                                                <option>{m['admin.organization.propositions.permissions.no-action-preset']()}</option>
                                                            </select>
                                                            <Button type="button" size="sm" variant="outline" disabled>
                                                                {m['admin.organization.propositions.permissions.add-action']()}
                                                            </Button>
                                                        {/if}
                                                        <Button type="button" size="sm" variant="ghost" onclick={() => promptCustomAction(status, role)}>
                                                            {m['admin.organization.propositions.permissions.create-action']()}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                        <div class="flex flex-wrap items-center justify-end gap-2 pt-3">
                                            {#if getAvailableRolesForStatus(status).length > 0}
                                                <select
                                                    class="h-10 min-w-48 rounded-2xl border border-border/60 bg-white/80 px-3 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-slate-800/70 dark:bg-slate-900/70"
                                                    value={roleSelections[status] ?? ''}
                                                    onchange={(event) => setRoleSelection(status, (event.currentTarget as HTMLSelectElement).value)}
                                                >
                                                    <option value="">{m['admin.organization.propositions.permissions.select-role']()}</option>
                                                    {#each getAvailableRolesForStatus(status) as roleOption}
                                                        <option value={roleOption}>{formatRoleLabel(roleOption)}</option>
                                                    {/each}
                                                </select>
                                                <Button type="button" size="sm" variant="outline" disabled={!roleSelections[status]} onclick={() => confirmAddRole(status)}>
                                                    {m['admin.organization.propositions.permissions.add-role']()}
                                                </Button>
                                            {:else}
                                                <select
                                                    class="h-10 min-w-48 rounded-2xl border border-border/60 bg-white/60 px-3 text-sm font-medium text-muted-foreground shadow-sm outline-none"
                                                    disabled
                                                >
                                                    <option>{m['admin.organization.propositions.permissions.no-role-preset']()}</option>
                                                </select>
                                                <Button type="button" size="sm" variant="outline" disabled>
                                                    {m['admin.organization.propositions.permissions.add-role']()}
                                                </Button>
                                            {/if}
                                            <Button type="button" size="sm" variant="ghost" onclick={() => promptCustomRole(status)}>
                                                {m['admin.organization.propositions.permissions.create-role']()}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </section>
                </div>
            </div>

            <div class="space-y-6">
                <div class:hidden={activeTab !== 'general'}>
                    <FieldLabel forId="logo" label={m['admin.organization.fields.logo.title']()} info={m['admin.organization.fields.logo.placeholder']()}>
                        <Input type="file" name="logo" id="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange={handleLogoChange} bind:ref={logoInputRef} />
                    </FieldLabel>

                    <div class="space-y-3">
                        <p class="text-sm font-semibold text-muted-foreground">{m['admin.organization.fields.logo.title']()}</p>
                        <div class="flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-white/70 shadow-inner dark:bg-slate-900/70">
                            {#if logoPreview}
                                <img src={logoPreview} alt={nameByLocale[fallbackLocale]?.trim() || m['admin.organization.fields.logo.title']()} class="h-full w-full object-cover" />
                            {:else}
                                <span class="text-xs text-muted-foreground">{m['common.logo.alt']()}</span>
                            {/if}
                        </div>
                    </div>
                </div>

                <Button type="submit" class="w-full" loading={isSubmitting} loadingLabel={m['admin.organization.actions.save']()} disabled={isSubmitting || hasSourceCodeUrlErrors}>
                    {m['admin.organization.actions.save']()}
                </Button>
            </div>
        </form>
    </CardContent>
</Card>

{#if showCropper && pendingLogoFile}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <LogoCropper file={pendingLogoFile} on:confirm={handleCropConfirm} on:cancel={handleCropCancel} />
    </div>
{/if}
